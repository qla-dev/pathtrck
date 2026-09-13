const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/dispatch-chat/speech', async route => {
      const { lang } = route.request().postDataJSON();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({ status: 200, contentType: 'audio/wav', body: fs.readFileSync(path.join(__dirname, '../../backend/storage/app/private/speech-smoke', lang + '.wav')) });
    });
    await page.addInitScript(() => {
      window.testSpoken = [];
      window.SpeechRecognition = class {
        constructor() { window.testRecognition = this; }
        start() {}
        stop() { this.onend?.(); }
      };
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        let duration = 0;
        this.addEventListener('loadedmetadata', () => { duration = this.duration; }, { once: true });
        this.addEventListener('ended', () => window.testSpoken.push({ duration }), { once: true });
        return original.call(this);
      };
    });
    for (const lang of ['bs-BA', 'hr-HR', 'sr-RS', 'en-US', 'de-DE']) {
      await page.goto(`http://localhost:3000/tests/speech-harness.html?lang=${lang}`);
      const mic = page.getByRole('button', { name: 'Voice mode', exact: true });
      await mic.waitFor();
      await page.getByRole('button', { name: 'Play message', exact: true }).click();
      await page.waitForFunction(() => window.testSpoken.length === 1);
      await mic.click();
      assert.equal(await page.getByRole('button', { name: 'Stop voice mode', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.evaluate(() => {
        const result = [{ transcript: 'test message' }];
        result.isFinal = true;
        window.testRecognition.onresult({ results: [result] });
        window.testRecognition.onend();
      });
      await mic.waitFor();
      assert.equal(await mic.getAttribute('aria-pressed'), 'false');
      assert.ok(!(await mic.getAttribute('class')).split(' ').includes('text-white'));
      const thinking = page.getByRole('status', { name: 'Thinking', exact: true });
      await thinking.waitFor({ state: 'visible' });
      await thinking.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => window.testSpoken.length === 2);
      assert.ok(await page.evaluate(() => window.testSpoken.every(s => s.duration > 1)));
      await mic.click();
      await page.evaluate(() => window.testRecognition.onerror());
      await mic.waitFor();
      assert.equal(await mic.getAttribute('aria-pressed'), 'false');
      console.log(`PASS ${lang}: playback, thinking until audio starts, microphone end/error reset`);
    }
    const realPage = await browser.newPage();
    await realPage.goto('http://localhost:3000/tests/speech-harness.html');
    await realPage.waitForTimeout(1500);
    console.log('Actual browser voices:', await realPage.evaluate(() => speechSynthesis.getVoices().map(v => ({ name: v.name, lang: v.lang }))));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
