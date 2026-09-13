// Web Speech exposes names and locales, but no gender field. Never use an
// unidentified/default voice when the user has requested a female speaker.
const femaleName = /\b(female|woman|gabrijela|vesna|lada|sara|ana|marija|milena|jovana|helena|sophie|amelie|laura|anna|maria|katja|zuzana|olivia|emma|jenny|aria|samantha|zira|hazel|susan|katrin|hedda|petra|ava|sonia|libby|natasha|clara)\b/i;
const prefix = (locale: string) => locale.toLowerCase().split(/[-_]/)[0];
const balkan = ['bs', 'hr', 'sr'];

// A shared Croatian/Bosnian or English fallback cannot reliably read Serbian
// Cyrillic. Transliterate only the spoken copy; preserve the displayed message.
export function speechTextForVoice(text: string, language: string, voiceLanguage: string): string {
  if (prefix(language) !== 'sr' || prefix(voiceLanguage) === 'sr') return text;
  const letters = 'абвгдђежзијклљмнњопрстћуфхцчџш';
  const latin = ['a','b','v','g','d','đ','e','ž','z','i','j','k','l','lj','m','n','nj','o','p','r','s','t','ć','u','f','h','c','č','dž','š'];
  return text.replace(/[а-яђјљњћџ]/gi, (letter) => {
    const index = letters.indexOf(letter.toLowerCase());
    if (index < 0) return letter;
    const value = latin[index];
    return letter === letter.toUpperCase() ? value[0].toUpperCase() + value.slice(1) : value;
  });
}

export function preferredVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  const requested = prefix(language);
  const score = (voice: SpeechSynthesisVoice) => {
    const voiceLanguage = prefix(voice.lang);
    const match = voiceLanguage === requested ? 300
      : balkan.includes(requested) && balkan.includes(voiceLanguage) ? 250
      : voiceLanguage === 'en' ? 100 : 0;
    return match + (/neural|natural|premium|enhanced/i.test(voice.name) ? 30 : 0)
      + (voice.lang.toLowerCase().replace('_', '-') === language.toLowerCase().replace('_', '-') ? 10 : 0);
  };
  return voices.filter((voice) => femaleName.test(voice.name)).sort((a, b) => score(b) - score(a))[0];
}

export type PlaybackFailure = 'unavailable' | 'failed';

/** Both the play button and automatic replies wait for the browser's voice list. */
export function playSpeech(
  synthesis: SpeechSynthesis,
  text: string,
  language: string,
  onError: (reason: PlaybackFailure) => void,
  createUtterance = (value: string) => new SpeechSynthesisUtterance(value),
): () => void {
  let disposed = false;
  let started = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearWait = () => {
    clearTimeout(timer);
    synthesis.removeEventListener('voiceschanged', trySpeak);
  };
  const trySpeak = () => {
    if (disposed || started) return;
    const voice = preferredVoice(synthesis.getVoices(), language);
    if (!voice) return;
    started = true;
    clearWait();
    synthesis.cancel();
    synthesis.resume();
    const utterance = createUtterance(speechTextForVoice(text, language, voice.lang));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.98;
    utterance.onerror = (event) => {
      if (!disposed && event.error !== 'canceled' && event.error !== 'interrupted') onError('failed');
    };
    try { synthesis.speak(utterance); } catch { onError('failed'); }
  };
  synthesis.addEventListener('voiceschanged', trySpeak);
  timer = setTimeout(() => {
    trySpeak();
    if (!started && !disposed) { clearWait(); onError('unavailable'); }
  }, 3000);
  trySpeak();
  return () => { disposed = true; clearWait(); };
}

export function speechErrorText(language: string, reason: PlaybackFailure): string {
  const messages: Record<string, [string, string]> = {
    en: ['No female speech voice is available in this browser. Enable a female voice in your device speech settings and retry.', 'Audio playback failed. Press play to try again.'],
    de: ['In diesem Browser ist keine weibliche Stimme verfügbar. Aktivieren Sie eine weibliche Stimme in den Spracheinstellungen Ihres Geräts und versuchen Sie es erneut.', 'Die Audiowiedergabe ist fehlgeschlagen. Drücken Sie auf Wiedergabe, um es erneut zu versuchen.'],
    bs: ['U ovom pregledniku nije dostupan ženski glas. Uključite ženski glas u govornim postavkama uređaja i pokušajte ponovo.', 'Reprodukcija zvuka nije uspjela. Pritisnite reprodukciju da pokušate ponovo.'],
    hr: ['U ovom pregledniku nije dostupan ženski glas. Uključite ženski glas u govornim postavkama uređaja i pokušajte ponovno.', 'Reprodukcija zvuka nije uspjela. Pritisnite reprodukciju da pokušate ponovno.'],
    sr: ['У овом прегледачу није доступан женски глас. Укључите женски глас у говорним подешавањима уређаја и покушајте поново.', 'Репродукција звука није успела. Притисните репродукцију да покушате поново.'],
  };
  return (messages[prefix(language)] || messages.en)[reason === 'unavailable' ? 0 : 1];
}
