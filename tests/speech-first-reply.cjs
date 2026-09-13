const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/dispatch-chat/speech', async route => {
      await new Promise(resolve => setTimeout(resolve, 6000));
      await route.fulfill({ contentType: 'audio/wav', body: fs.readFileSync(path.join(__dirname, '../../backend/storage/app/private/speech-smoke/en.wav')) });
    });
    await page.addInitScript(() => {
      window.SpeechRecognition = class {
        constructor() { window.recognition = this; }
        start() {} stop() { this.onend?.(); }
      };
      window.mediaResults = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        return play.call(this).then(() => window.mediaResults.push('started'), error => { window.mediaResults.push(error.name); throw error; });
      };
    });
    await page.goto('http://localhost:3000/tests/speech-harness.html?lang=en-US');
    await page.getByRole('button', { name: 'Voice mode', exact: true }).click();
    await page.evaluate(() => {
      const result = [{ transcript: 'Hello' }]; result.isFinal = true;
      window.recognition.onresult({ results: [result] }); window.recognition.onend();
    });
    await page.waitForFunction(() => window.mediaResults.length > 0);
    const results = await page.evaluate(() => window.mediaResults);
    console.log(results);
    assert.deepEqual(results, ['started']);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
