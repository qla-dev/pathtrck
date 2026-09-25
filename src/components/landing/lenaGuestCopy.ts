import type { Language } from '../../types';

const en = {
  title: 'LIVE CALL LenaAI', subtitle: 'Your cargo. Your voice. Lena takes it from there.',
  description: 'Calculate CBM together, talk freely, or prepare a load for posting.', call: 'Call Lena',
  auth: 'A conversation starts here.', code: 'Guest access code', enter: 'Connect with Lena',
  notice: 'Microphone access is needed. A transcript is saved for the platform administrator.',
  cbm: 'CBM demo', free: 'Free talk', close: 'Close', connecting: 'Connecting', listening: 'Listening',
  speaking: 'Lena is speaking', consulting: 'Checking with Lena', hangup: 'Hang up', mute: 'Mute microphone',
  unmute: 'Unmute microphone', draft: 'Review load', empty: 'Tell Lena you would like to post a load. She will collect the details here.',
  publish: 'Confirm and publish load', published: 'Load published', refresh: 'Refresh', error: 'The call could not be started. Check your microphone permission and try again.',
  invalid: 'Incorrect access code.', failed: 'Unable to complete the request.', saved: 'Guest conversations', noCalls: 'No guest conversations yet.',
  transcript: 'Conversation transcript', previous: 'Previous', next: 'Next', guest: 'Guest', resume: 'Call again',
  review: 'Review all details below. To change anything, tell Lena before publishing.', using: 'is using skill',
};
type Copy = typeof en;
const bs: Copy = {
  title: 'LIVE CALL LenaAI', subtitle: 'Vaš teret. Vaš glas. Lena vodi dalje.',
  description: 'Izračunajte CBM zajedno, razgovarajte slobodno ili pripremite teret za objavu.', call: 'Pozovi Lenu',
  auth: 'Ovdje počinje razgovor.', code: 'Pristupni kod za goste', enter: 'Poveži se s Lenom',
  notice: 'Potreban je pristup mikrofonu. Transkript se čuva za administratora platforme.',
  cbm: 'CBM demonstracija', free: 'Slobodni razgovor', close: 'Zatvori', connecting: 'Povezivanje', listening: 'Slušam',
  speaking: 'Lena govori', consulting: 'Lena provjerava', hangup: 'Završi poziv', mute: 'Isključi mikrofon',
  unmute: 'Uključi mikrofon', draft: 'Pregledaj teret', empty: 'Recite Leni da želite objaviti teret. Ovdje će prikupiti podatke.',
  publish: 'Potvrdi i objavi teret', published: 'Teret je objavljen', refresh: 'Osvježi', error: 'Poziv nije pokrenut. Provjerite dozvolu za mikrofon i pokušajte ponovo.',
  invalid: 'Pogrešan pristupni kod.', failed: 'Zahtjev nije uspio.', saved: 'Gostujući razgovori', noCalls: 'Još nema gostujućih razgovora.',
  transcript: 'Transkript razgovora', previous: 'Prethodna', next: 'Sljedeća', guest: 'Gost', resume: 'Pozovi ponovo',
  review: 'Pregledajte sve podatke ispod. Ako nešto treba promijeniti, recite Leni prije objave.', using: 'koristi vještinu',
};
const copy: Record<'en' | 'de' | 'bs' | 'hr' | 'sr', Copy> = {
  en, bs,
  hr: { ...bs, enter: 'Poveži se s Lenom', error: 'Poziv nije pokrenut. Provjerite dopuštenje za mikrofon i pokušajte ponovno.', resume: 'Pozovi ponovno' },
  sr: { ...bs, subtitle: 'Vaš teret. Vaš glas. Lena vodi dalje.', notice: 'Potreban je pristup mikrofonu. Transkript se čuva za administratora platforme.', empty: 'Recite Leni da želite da objavite teret. Ovdje će prikupiti podatke.', refresh: 'Osveži', next: 'Sljedeća' },
  de: {
    title: 'LIVE CALL LenaAI', subtitle: 'Ihre Ladung. Ihre Stimme. Lena übernimmt.', description: 'CBM gemeinsam berechnen, frei sprechen oder eine Ladung zur Veröffentlichung vorbereiten.',
    call: 'Lena anrufen', auth: 'Hier beginnt das Gespräch.', code: 'Gastzugangscode', enter: 'Mit Lena verbinden', notice: 'Mikrofonzugriff erforderlich. Das Transkript wird für den Plattformadministrator gespeichert.',
    cbm: 'CBM-Demo', free: 'Freies Gespräch', close: 'Schließen', connecting: 'Verbindung wird hergestellt', listening: 'Hört zu', speaking: 'Lena spricht', consulting: 'Lena prüft',
    hangup: 'Auflegen', mute: 'Mikrofon ausschalten', unmute: 'Mikrofon einschalten', draft: 'Ladung prüfen', empty: 'Sagen Sie Lena, dass Sie eine Ladung veröffentlichen möchten. Sie sammelt hier die Angaben.',
    publish: 'Bestätigen und veröffentlichen', published: 'Ladung veröffentlicht', refresh: 'Aktualisieren', error: 'Anruf fehlgeschlagen. Prüfen Sie den Mikrofonzugriff und versuchen Sie es erneut.',
    invalid: 'Falscher Zugangscode.', failed: 'Anfrage fehlgeschlagen.', saved: 'Gastgespräche', noCalls: 'Noch keine Gastgespräche.', transcript: 'Gesprächstranskript', previous: 'Zurück', next: 'Weiter', guest: 'Gast', resume: 'Erneut anrufen',
    review: 'Prüfen Sie alle Angaben. Teilen Sie Lena Änderungen vor der Veröffentlichung mit.', using: 'verwendet Fähigkeit',
  },
};
export const lenaGuestCopy = (lang: Language) => copy[lang as keyof typeof copy] ?? en;
