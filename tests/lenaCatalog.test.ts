import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { installLenaCatalog, lenaField, lenaFieldChoices, lenaLoadWelcome, lenaOptionDescription, lenaOptions, lenaText, lenaTranslation, type LenaCatalogData, type LenaCatalogField, type LenaCatalogText } from '../src/lib/lenaCatalog';

const schema = JSON.parse(readFileSync(new URL('../../backend/resources/lena/schema.json', import.meta.url), 'utf8'));

const field = (overrides: Partial<LenaCatalogField>): LenaCatalogField => ({
  label: 'server label', question: 'server question', example: 'server example', step: 'title',
  label_key: 'postLoadModal.loadTitleLabel', choices: [], choices_by_transport: {},
  multiple: false, mask: null, unit: '', ...overrides,
});

const serverText = (locale: string): LenaCatalogText => ({
  ui: { 'field.test': `${locale}:server field` },
  actions: { add: `${locale}:server action` },
  welcome: { general: `${locale}:server greeting`, load: `${locale}:server load greeting`, load_named: `${locale}:server greeting for :load` },
  draft_created: `${locale}:server draft greeting`,
  labels: {},
  option_descriptions: { GDP: `${locale}:server option description` },
  location: {},
  steps: {},
  form_fields: {
    weightKg: field({ label: `${locale}:server weight`, example: '1200', step: 'weight', unit: 'kg', mask: 'integer' }),
    containerSelections: field({
      step: 'containers',
      choices: schema.option_groups.CONTAINER_TYPE_OPTIONS.map((code: string) => ({ value: code, label: `${locale}:${code}`, category: schema.container_categories[code] })),
    }),
    pickupPlaceType: field({
      step: 'pickup',
      choices: [],
      choices_by_transport: {
        road: schema.option_groups.PICKUP_PLACE_TYPE_OPTIONS.map((value: string) => ({ value, label: value })),
        sea: schema.option_groups.CONTAINER_PICKUP_PLACE_TYPE_OPTIONS.map((value: string) => ({ value, label: value })),
      },
    }),
  },
});

const locales: LenaCatalogData['locales'] = { en: serverText('en'), de: serverText('de'), bs: serverText('bs') };

test('web renders server wording and canonical form choices without a local translation copy', () => {
  installLenaCatalog({ ...schema, revision: 'test', locales });
  assert.equal(lenaText('bs').welcome.general, 'bs:server greeting');
  assert.equal(lenaTranslation('de', 'field.test', 'stale local wording'), 'de:server field');
  assert.equal(lenaText('unsupported').welcome.general, 'en:server greeting');
  assert.deepEqual(lenaOptions('BODY_TYPE_OPTIONS'), schema.option_groups.BODY_TYPE_OPTIONS);
  assert.throws(() => installLenaCatalog({ ...schema, version: 999, locales }), /Unsupported/);
  assert.equal(lenaText('bs').welcome.general, 'bs:server greeting');
});

test('a load chat greets by name when the load is known, and plainly when it is not', () => {
  installLenaCatalog({ ...schema, revision: 'test', locales });

  assert.equal(lenaLoadWelcome('bs', 'FB-L-26064'), 'bs:server greeting for FB-L-26064');
  assert.equal(lenaLoadWelcome('bs', null), 'bs:server load greeting');
  assert.equal(lenaLoadWelcome('bs'), 'bs:server load greeting');
});

test('a form field takes its label, example and picker from the catalog', () => {
  installLenaCatalog({ ...schema, revision: 'test', locales });

  assert.equal(lenaField('de', 'weightKg')?.label, 'de:server weight');
  assert.equal(lenaField('de', 'weightKg')?.example, '1200');
  assert.equal(lenaField('de', 'weightKg')?.unit, 'kg');
  assert.equal(lenaOptionDescription('bs', 'GDP'), 'bs:server option description');
  assert.equal(lenaOptionDescription('bs', 'not an option'), '');
  // A place type differs per transport type; everything else falls back to the one list.
  assert.deepEqual(lenaFieldChoices('en', 'pickupPlaceType', 'sea').map((choice) => choice.value), ['Port to Port', 'Door to Port']);
  assert.deepEqual(lenaFieldChoices('en', 'pickupPlaceType', 'road').map((choice) => choice.value), schema.option_groups.PICKUP_PLACE_TYPE_OPTIONS);
  assert.deepEqual(lenaFieldChoices('en', 'weightKg', 'road'), []);
});

test('the container registry is the catalog list, not a second copy in the client', async () => {
  installLenaCatalog({ ...schema, revision: 'test', locales });
  const { SEA_CONTAINER_TYPES, SEA_CONTAINER_CATEGORIES, containerLabel } = await import('../src/data/seaContainers');

  assert.deepEqual(SEA_CONTAINER_TYPES.map((container) => container.code), schema.option_groups.CONTAINER_TYPE_OPTIONS);
  assert.deepEqual(SEA_CONTAINER_CATEGORIES, ['Standard', 'Open Top', 'Reefer', 'Flat Rack', 'Platform']);
  assert.equal(containerLabel('40RH', 'de'), 'de:40RH');
  assert.equal(containerLabel('not a container', 'de'), 'not a container');
});
