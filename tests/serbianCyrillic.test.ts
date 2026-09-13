import assert from 'node:assert/strict';
import test from 'node:test';
import { toSerbianCyrillic } from '../src/lib/serbianCyrillic';

test('Serbian text keeps the brand Latin across repeated conversion', () => {
  for (const name of ['Freightbook.ai', 'Freightbook', 'Фреигхтбоок.аи', 'Фрејтбоок.аи']) {
    const result = toSerbianCyrillic(`Pitanja o ${name}`);
    assert.equal(result, 'Питања о Freightbook.ai');
    assert.equal(toSerbianCyrillic(result), result);
  }
  assert.equal(toSerbianCyrillic('[[LENA_OPTIONS:free]] :name'), '[[LENA_OPTIONS:free]] :name');
});
