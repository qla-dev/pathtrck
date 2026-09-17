import { api, type LoadScanResult } from '../services/api';
import { localTimestampForApi } from './dates';
import { LENA_AI_GENERAL_SUBJECT } from './useLenaAiChat';
import { MASKABLE_GUIDED_STEPS } from './lenaStepInputMask';

/**
 * Runs one turn of a live call through the real Lena and returns what she said.
 *
 * This is the whole reason a call can do everything the text chat can: it does not reimplement any
 * of Lena's work, it posts the caller's question as an ordinary message and asks for an ordinary
 * reply. The load questionnaire, tracking, booking, HS codes and the legal modes all run exactly
 * as they do when the question is typed - because, as far as the server is concerned, it was.
 *
 * A call therefore leaves a normal conversation behind: the caller can open the thread afterwards,
 * read it, and carry on typing where the call left off.
 */

/** Markers drive buttons and canvas state in the chat UI. Read aloud they are gibberish. */

/**
 * The step the questionnaire is waiting on, read straight out of the reply that asked it - the
 * same marker the chat UI reads to decide how to handle what the user types next.
 */
const LENA_STEP_MARKER_PATTERN = /\[\[LENA_STEP:([a-zA-Z]+)\]\]/;

/** A step with a fixed answer shape, which the chat answers structurally rather than as prose. */
const stepIsMaskable = (step: string): boolean => MASKABLE_GUIDED_STEPS.includes(step);
const stripChatMarkers = (text: string): string => text
  .replace(/\[\[[\s\S]*?\]\]/g, ' ')
  // The realtime model reads markdown emphasis out as the literal characters.
  .replace(/\*\*([^*\n]+)\*\*/g, '$1')
  .replace(/\*([^*\n]+)\*/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

export type LenaCallDelegateOptions = {
  userId: number;
  companyId?: number;
  lang: string;
  /** The thread the call belongs to, when one already exists. */
  conversationId?: number;
  /** Names the skills the pending reply will use, so the call can say what it is waiting on. */
  onSkills?: (skills: string[]) => void;
  /** After a turn is saved and answered, so a thread open on screen can refresh itself. */
  onTurnComplete?: () => void;
  /** Called with the conversation id the first time a call creates one, so the caller can adopt it. */
  onConversationCreated?: (id: number) => void;
};

export const createLenaCallDelegate = ({
  userId,
  companyId,
  lang,
  conversationId,
  onConversationCreated,
  onSkills,
  onTurnComplete,
}: LenaCallDelegateOptions) => {
  // Held across turns so a call creates at most one thread, no matter how much is asked.
  let activeConversationId = conversationId;

  const ensureConversation = async (): Promise<number> => {
    if (activeConversationId) return activeConversationId;
    const created = await api.conversations.create({
      company_id: companyId,
      created_by_user_id: userId,
      channel: 'inapp',
      subject: LENA_AI_GENERAL_SUBJECT,
      last_message_at: localTimestampForApi(),
      participant_ids: [userId],
    });
    activeConversationId = Number(created.data.id);

    // The thread is put into free roam before a word is spoken - the gateway mode whose skill can
    // reach every other one, which is where a call placed from the header button belongs. The backend reads a conversation's
    // mode from the last mode marker in its messages, so writing one here is what guarantees a call
    // starts as conversation - rather than leaving the mode to whatever the first exchange looks
    // like, which is how a call once opened a load questionnaire nobody had asked for.
    try {
      await api.messages.create({
        conversation_id: activeConversationId,
        sender_user_id: userId,
        body: '[[LENA_ACTION:freeroam]]',
        sent_at: localTimestampForApi(),
      });
    } catch {
      // Free roam is the server's default for a thread with no mode marker anyway, so a failure
      // here costs nothing worth failing the call over.
    }

    onConversationCreated?.(activeConversationId);
    return activeConversationId;
  };

  /**
   * The step the last reply asked for, so the next spoken answer can be given the way a click
   * gives it. Without this a call only ever posts prose, and the draft panel stays empty while the
   * questionnaire appears to be working.
   */
  let pendingStep: string | null = null;

  /**
   * Everything extracted from this call so far. It is carried into the next scan as the starting
   * point, which is what makes each answer a patch: without it every turn re-reads one sentence
   * from a blank slate, and the result overwrites the draft with only the fields that sentence
   * happened to mention - emptying every field the caller had already given.
   */
  let scanSoFar: LoadScanResult | undefined;

  /** True when this call had no thread to join, which is what makes it a free-chat call. */

  /**
   * Whether this call is still just talking. A call placed from no conversation starts that way,
   * and stays that way until a task is entered - after which questions belong to that task's mode
   * and must reach it, not be handed back for her to answer out of her own head.
   *
   * Only the load questionnaire sets a pending step, so without this a call that entered training,
   * tracking, HS, booking, storage or legal would look identical to free roam on the very next
   * question and never reach any of them.
   */
  let inFreeRoam = ! conversationId;

  /** The modes that ARE free conversation, so leaving a task returns the call to talking. */
  const FREE_ROAM_ACTIONS = ['freeroam', 'free'];
  const ask = async (question: string, action?: string): Promise<string> => {
    const id = await ensureConversation();

    // A call placed from no conversation is free chat: the two of you talking, recorded by the
    // transcript, with nothing else in the loop. Answering it through dispatch-chat would make
    // every sentence a round trip and would write a paraphrase over what was actually said, so a
    // plain question here is handed straight back for her to answer herself. Entering a task
    // (an action) or working one already under way still goes through the real pipeline.
    if (inFreeRoam && !action && !pendingStep) {
      return 'This is ordinary conversation, not a task. Answer the caller yourself, in your own '
        + 'words, without looking anything up. Use this tool only when they ask for one of your '
        + 'tasks - posting a load, storage, tracking, booking, HS codes, or a legal question.';
    }

    // Entering a task leaves free roam; picking free roam again returns to it.
    if (action) inFreeRoam = FREE_ROAM_ACTIONS.includes(action);

    // A step with a fixed answer shape is answered through the guided endpoint - the same one the
    // buttons and the masked input use. This is what writes the value into the load draft; a plain
    // message would only be prose about the answer.
    if (!action && pendingStep && stepIsMaskable(pendingStep)) {
      const answered = pendingStep;
      pendingStep = null;
      const reply = await api.dispatchChat.answerStep(id, answered, question, question, false, lang, 'voice');
      onTurnComplete?.();
      return replyText(reply);
    }

    // Free-text answers still have to reach the draft. Scanning the text is what turns "palete
    // kafe, Beč to Sarajevo" into fields, and it is attached to the message exactly as the typed
    // path attaches it.
    let attachments: Array<Record<string, unknown>> | undefined;
    if (!action && pendingStep) {
      try {
        const scan = await api.loads.scanText(question, scanSoFar, id, pendingStep);
        scanSoFar = scan.data;
        attachments = [{ name: 'LenaAI call', type: 'text/plain', size: new Blob([question]).size, loadScan: scan.data }];
      } catch {
        // The turn must still be sent if structured extraction is unavailable.
      }
    }

    await api.messages.create({
      conversation_id: id,
      sender_user_id: userId,
      // A button press goes in as the marker the text chat uses, so the backend switches mode and
      // creates the draft exactly as a tap does - a narrated description would only talk about it.
      body: action ? `[[LENA_ACTION:${action}]]` : question,
      attachments: attachments as never,
      sent_at: localTimestampForApi(),
    });

    // 'voice' is what the existing billing and usage reporting already use to price a spoken turn
    // at two units instead of one - a call is charged exactly like any other voice reply.
    // Fetched alongside the reply rather than before it: naming the skill is worth doing, but not
    // worth making the caller wait through a second round trip before Lena answers.
    if (onSkills) void api.dispatchChat.skills(id, lang).then((rows) => onSkills(rows.map((row) => row.name))).catch(() => undefined);

    const reply = await api.dispatchChat.reply(id, lang, 'voice');
    onSkills?.([]);
    onTurnComplete?.();
    return replyText(reply);
  };

  /** Remembers the step the reply is asking for, then hands back what is safe to speak. */
  const replyText = (reply: unknown): string => {
    const body = String((reply as { body?: unknown })?.body ?? '');
    pendingStep = body.match(LENA_STEP_MARKER_PATTERN)?.[1] ?? null;
    const spoken = stripChatMarkers(body);

    // An empty reply would leave the model with nothing to say and the caller with silence.
    return spoken || 'There was no answer for that. Ask the caller to put it a different way.';
  };
  // Exposed so a call can create its thread the moment it is placed, rather than only when the
  // model first delegates a question - otherwise a call that is pure conversation leaves nothing behind.
  return { ask, ensureConversation };
};
