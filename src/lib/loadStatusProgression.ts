import type { Language } from '../types';

export const isBackwardLoadStatus = (from: string, to: string) => {
  const rank: Record<string, number> = { pending: 0, posted: 1, sent: 2, booked: 2, opened: 3, in_delivery: 4, received: 5, review: 6, finished: 7, cancelled: 8 };
  const normalize = (value: string) => value.toLowerCase().replaceAll(' ', '_');
  return rank[normalize(to)] < rank[normalize(from)];
};

const COPY = {
  en: { title: 'An earlier status requires admin support', body: 'You cannot move this load to an earlier status. If you have a valid reason for this change, explain it to admin support in the chat.', open: 'Open support chat', cancel: 'Cancel', error: 'Support chat could not be opened. Please try again.' },
  de: { title: 'Ein früherer Status erfordert Admin-Support', body: 'Sie können diese Ladung nicht auf einen früheren Status zurücksetzen. Wenn Sie einen triftigen Grund haben, erläutern Sie ihn dem Admin-Support im Chat.', open: 'Support-Chat öffnen', cancel: 'Abbrechen', error: 'Der Support-Chat konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.' },
  bs: { title: 'Za prethodni status kontaktirajte administratora', body: 'Teret ne možete vratiti na prethodni status. Ako imate opravdan razlog za ovu promjenu, objasnite ga administratoru u chatu s podrškom.', open: 'Otvori chat s podrškom', cancel: 'Odustani', error: 'Chat s podrškom nije moguće otvoriti. Pokušajte ponovo.' },
  hr: { title: 'Za prethodni status kontaktirajte administratora', body: 'Teret ne možete vratiti na prethodni status. Ako imate opravdan razlog za ovu promjenu, objasnite ga administratoru u chatu s podrškom.', open: 'Otvori chat s podrškom', cancel: 'Odustani', error: 'Chat s podrškom nije moguće otvoriti. Pokušajte ponovno.' },
  sr: { title: 'Za prethodni status kontaktirajte administratora', body: 'Teret ne možete vratiti na prethodni status. Ako imate opravdan razlog za ovu promenu, objasnite ga administratoru u chatu s podrškom.', open: 'Otvori chat s podrškom', cancel: 'Odustani', error: 'Chat s podrškom nije moguće otvoriti. Pokušajte ponovo.' },
};
export const statusSupportCopy = (lang: Language) => COPY[lang as keyof typeof COPY] || COPY.en;
