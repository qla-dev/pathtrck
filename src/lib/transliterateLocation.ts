const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J',
  К: 'K', Л: 'L', Љ: 'Lj', М: 'M', Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R', С: 'S',
  Т: 'T', Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č', Џ: 'Dž', Ш: 'Š',
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j',
  к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
  Ѓ: 'Gj', ѓ: 'gj', Ѕ: 'Dz', ѕ: 'dz', Ќ: 'Kj', ќ: 'kj', Ў: 'U', ў: 'u',
  І: 'I', і: 'i', Ї: 'Ji', ї: 'ji', Є: 'Je', є: 'je', Ґ: 'G', ґ: 'g',
  Ё: 'Jo', ё: 'jo', Й: 'J', й: 'j', Ы: 'Y', ы: 'y', Э: 'E', э: 'e',
  Ю: 'Ju', ю: 'ju', Я: 'Ja', я: 'ja', Щ: 'Šč', щ: 'šč', Ъ: '', ъ: '', Ь: '', ь: '',
};

export const transliterateLocation = (value: string): string =>
  value.replace(/[\u0400-\u04FF]/g, (character) => CYRILLIC_TO_LATIN[character] ?? character);
