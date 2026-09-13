const PAIRS: Array<[RegExp, string]> = [
  [/DŽ/g, 'Џ'], [/Dž/g, 'Џ'], [/dž/g, 'џ'],
  [/LJ/g, 'Љ'], [/Lj/g, 'Љ'], [/lj/g, 'љ'],
  [/NJ/g, 'Њ'], [/Nj/g, 'Њ'], [/nj/g, 'њ'],
  [/Đ/g, 'Ђ'], [/đ/g, 'ђ'], [/Č/g, 'Ч'], [/č/g, 'ч'],
  [/Ć/g, 'Ћ'], [/ć/g, 'ћ'], [/Ž/g, 'Ж'], [/ž/g, 'ж'],
  [/Š/g, 'Ш'], [/š/g, 'ш'], [/A/g, 'А'], [/B/g, 'Б'], [/C/g, 'Ц'],
  [/D/g, 'Д'], [/E/g, 'Е'], [/F/g, 'Ф'], [/G/g, 'Г'], [/H/g, 'Х'],
  [/I/g, 'И'], [/J/g, 'Ј'], [/K/g, 'К'], [/L/g, 'Л'], [/M/g, 'М'],
  [/N/g, 'Н'], [/O/g, 'О'], [/P/g, 'П'], [/R/g, 'Р'], [/S/g, 'С'],
  [/T/g, 'Т'], [/U/g, 'У'], [/V/g, 'В'], [/W/g, 'В'], [/X/g, 'Кс'],
  [/Y/g, 'Ј'], [/Z/g, 'З'], [/a/g, 'а'], [/b/g, 'б'], [/c/g, 'ц'],
  [/d/g, 'д'], [/e/g, 'е'], [/f/g, 'ф'], [/g/g, 'г'], [/h/g, 'х'],
  [/i/g, 'и'], [/j/g, 'ј'], [/k/g, 'к'], [/l/g, 'л'], [/m/g, 'м'],
  [/n/g, 'н'], [/o/g, 'о'], [/p/g, 'п'], [/r/g, 'р'], [/s/g, 'с'],
  [/t/g, 'т'], [/u/g, 'у'], [/v/g, 'в'], [/w/g, 'в'], [/x/g, 'кс'],
  [/y/g, 'ј'], [/z/g, 'з'],
];

export const toSerbianCyrillic = (value: string): string => {
  const tokens: string[] = [];
  const protectedValue = value.replace(/\[\[.*?\]\]|:[a-z_]+|freightbook(?:\.ai)?|фре(?:и|ј)г?х?тбоок(?:\.(?:аи|ај|ai))?/gi, (token) => {
    const marker = `\uE000${tokens.length}\uE001`;
    tokens.push(/^(?:freightbook|фре)/i.test(token) ? 'Freightbook.ai' : token);
    return marker;
  });
  const converted = PAIRS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), protectedValue);
  return converted.replace(/\uE000(\d+)\uE001/g, (_, index: string) => tokens[Number(index)]);
};
