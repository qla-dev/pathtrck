import { api } from '../services/api';
import { localTimestampForApi } from './dates';
import { LENA_AI_GENERAL_SUBJECT } from './useLenaAiChat';

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
    onConversationCreated?.(activeConversationId);
    return activeConversationId;
  };

  const ask = async (question: string, action?: string): Promise<string> => {
    const id = await ensureConversation();

    await api.messages.create({
      conversation_id: id,
      sender_user_id: userId,
      // A button press goes in as the marker the text chat uses, so the backend switches mode and
      // creates the draft exactly as a tap does - a narrated description would only talk about it.
      body: action ? `[[LENA_ACTION:${action}]]` : question,
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
    const spoken = stripChatMarkers(String((reply as { body?: unknown })?.body ?? ''));

    // An empty reply would leave the model with nothing to say and the caller with silence.
    return spoken || 'Lena had no answer for that. Ask the caller to put it a different way.';
  };
  // Exposed so a call can create its thread the moment it is placed, rather than only when the
  // model first delegates a question - otherwise a call that is pure conversation leaves nothing behind.
  return { ask, ensureConversation };
};
