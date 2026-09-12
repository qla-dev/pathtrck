import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { installLenaCatalog, lenaOptions, lenaText, lenaTranslation, type LenaCatalogData, type LenaCatalogText } from '../src/lib/lenaCatalog';

test('web renders server wording and canonical form choices without a local translation copy', () => {
  const schema = JSON.parse(readFileSync(new URL('../../backend/resources/lena/schema.json', import.meta.url), 'utf8'));
  const serverText = (locale: string): LenaCatalogText => ({
    ui: { 'field.test': `${locale}:server field` },
    actions: { add: `${locale}:server action` },
    welcome: { general: `${locale}:server greeting`, load: `${locale}:server load greeting` },
    draft_created: `${locale}:server draft greeting`, labels: {}, location: {}, steps: {}, form_fields: {},
  });
  const locales: LenaCatalogData['locales'] = { en: serverText('en'), de: serverText('de'), bs: serverText('bs') };
  installLenaCatalog({ ...schema, revision: 'test', locales });
  assert.equal(lenaText('bs').welcome.general, 'bs:server greeting');
  assert.equal(lenaTranslation('de', 'field.test', 'stale local wording'), 'de:server field');
  assert.equal(lenaText('unsupported').welcome.general, 'en:server greeting');
  assert.deepEqual(lenaOptions('BODY_TYPE_OPTIONS'), schema.option_groups.BODY_TYPE_OPTIONS);
  assert.throws(() => installLenaCatalog({ ...schema, version: 999, locales }), /Unsupported/);
  assert.equal(lenaText('bs').welcome.general, 'bs:server greeting');
});
