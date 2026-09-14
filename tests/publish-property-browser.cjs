const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PUBLISH_TEST_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.goto(`${base}/tests/publish-property-harness.html`);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    assert.equal(await page.getByRole('radio', { name: /Freight exchange/ }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByRole('radio', { name: /Private warehouse/ }).isDisabled(), true);
    assert.equal(await page.getByRole('radio', { name: /^Tracking/ }).isDisabled(), true);
    assert.equal(await page.locator('output').textContent(), '', 'Opening does not publish');
    await page.getByRole('button', { name: 'Create warehouse', exact: true }).click();
    await page.getByRole('radio', { name: /Private warehouse/ }).click();
    assert.equal(await page.getByRole('button', { name: 'Confirm', exact: true }).isDisabled(), true);
    await page.getByRole('combobox', { name: 'Select warehouse' }).selectOption('7');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    assert.equal(await page.locator('output').textContent(), 'warehouse:7:');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('button', { name: 'Add vehicle', exact: true }).click();
    await page.getByRole('radio', { name: /^Tracking/ }).click();
    assert.equal(await page.getByRole('button', { name: 'Confirm', exact: true }).isDisabled(), true);
    await page.getByRole('combobox', { name: 'Select vehicle' }).selectOption('9');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    assert.equal(await page.locator('output').textContent(), 'tracking:7:9');
    await page.goto(`${base}/tests/publish-property-harness.html?storage`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    assert.equal(await page.getByRole('radio', { name: /Storage exchange/ }).isEnabled(), true);
    assert.equal(await page.getByRole('radio', { name: /^Tracking/ }).isDisabled(), true);
    const panel = await page.getByRole('dialog').boundingBox();
    assert.ok(panel.width <= 391, `Sidebar fits mobile viewport (${panel.width}px)`);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('output').textContent(), '', 'Cancel does not publish');

    // The real form must reject invalid input before showing the publishing sidebar.
    const fs = require('node:fs');
    const schema = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../../backend/resources/lena/schema.json'), 'utf8'));
    const containers = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../../backend/resources/lena/container-types.json'), 'utf8'));
    schema.option_groups.CONTAINER_TYPE_OPTIONS = Object.keys(containers.types);
    schema.container_categories = Object.fromEntries(Object.entries(containers.types).map(([code, type]) => [code, type.category]));
    const locale = { ui: { 'common.postLoad': 'Post a load', 'postLoadModal.requiredField': 'This field is required.' }, actions: {}, welcome: { general: 'Hello', load: 'Load', load_named: 'Load' }, draft_created: 'Draft', labels: {}, option_descriptions: {}, location: {}, steps: {}, form_fields: {} };
    const catalog = { ...schema, version: 1, revision: 'test', welcome_actions: [], container_categories: schema.container_categories || {}, locales: Object.fromEntries(['en', 'de', 'bs', 'hr', 'sr'].map(lang => [lang, locale])) };
    await page.route('**/tests/publish-catalog.json', route => route.fulfill({ json: catalog }));
    const writes = [];
    const receipts = [];
    let failReceipt = true;
    await page.route('**/api/**', route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'POST' && path.endsWith('/loads')) writes.push({ url: request.url(), body: request.postDataJSON() });
      if (request.method() === 'POST' && path.endsWith('/warehouse-movements')) {
        receipts.push(request.postDataJSON());
        if (failReceipt) { failReceipt = false; return route.fulfill({ status: 500, json: { message: 'Test receipt failure' } }); }
      }
      const data = path.endsWith('/me') ? { id: 1, name: 'Test' }
        : path.endsWith('/loads') && request.method() === 'POST' ? { id: 900 + writes.length }
        : path.endsWith('/vehicles') ? [{ id: 9, owner_user_id: 1, registration_number: 'TEST-9' }, { id: 10, owner_user_id: 99, registration_number: 'OTHER-10' }]
        : path.includes('warehouse') ? { warehouses: [{ id: 7, name: 'Test warehouse', city: 'Sarajevo', country_code: 'BA' }] } : [];
      return route.fulfill({ json: { data, meta: {}, message: 'Test' } });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/tests/publish-property-harness.html?form`);
    await page.getByRole('button', { name: 'Post a load', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: 'Publication destination' }).count(), 0);
    await page.locator('.border-rose-200').first().waitFor();
    assert.equal(writes.length, 0, 'Invalid form must not publish');
    await page.goto(`${base}/tests/publish-property-harness.html?form&valid`);
    await page.getByRole('button', { name: 'Post a load', exact: true }).click();
    await page.getByRole('dialog', { name: 'Publication destination' }).waitFor();
    assert.equal(writes.length, 0, 'Valid form opens sidebar without publishing');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.swal2-popup'));
    assert.equal(writes.length, 1, 'Only confirmation publishes');
    assert.equal(writes[0].body.status, 'posted');
    await page.goto(`${base}/tests/publish-property-harness.html?form&valid`);
    await page.getByRole('button', { name: 'Post a load', exact: true }).click();
    await page.getByRole('radio', { name: /^Tracking/ }).click();
    assert.equal(await page.getByRole('option', { name: 'OTHER-10' }).count(), 0, 'Other accounts do not count as own fleet');
    await page.getByRole('combobox', { name: 'Select vehicle' }).selectOption('9');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.swal2-popup'));
    assert.equal(writes.length, 2);
    assert.equal(writes[1].body.status, 'pending');
    assert.equal(writes[1].body.vehicle_id, 9);
    assert.equal(writes[1].body.published_at, null);
    await page.goto(`${base}/tests/publish-property-harness.html?form&valid`);
    await page.getByRole('button', { name: 'Post a load', exact: true }).click();
    await page.getByRole('radio', { name: /Private warehouse/ }).click();
    await page.getByRole('combobox', { name: 'Select warehouse' }).selectOption('7');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'The load was created' }).waitFor();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.swal2-popup'));
    assert.equal(writes.length, 3, 'Receipt retry reuses the existing load');
    assert.equal(writes[2].body.transport_type, 'road', 'Private receipt preserves the form transport');
    assert.equal(writes[2].body.status, 'pending');
    assert.equal(receipts.length, 2);
    assert.equal(receipts[1].warehouse_id, 7);
    assert.equal(receipts[1].load_id, 903);
    assert.deepEqual(errors, []);
    console.log('PublishPropery: destinations, shortcuts, mobile layout, form validation before opening and publish only after confirmation passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
