import assert from 'node:assert/strict';
import { reportHtml } from './reportPreview';

const html = reportHtml({ title: '<script>alert(1)</script>', subtitle: 'Driver & vehicle', fields: [
  { label: 'Name', value: '<img src=x onerror=alert(1)>' },
  { label: 'Missing', value: null },
  { label: 'Zero', value: 0 },
] }, 'bs');
assert.ok(html.includes('Preuzmi PDF'));
assert.ok(html.includes('id="print-document"'));
assert.ok(html.includes('@page{size:A4'));
assert.ok(html.includes('&lt;script&gt;'));
assert.ok(html.includes('&lt;img'));
assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('<img'));
assert.ok(html.includes('<td>0</td>'));
assert.ok(html.includes('<td>—</td>'));
assert.ok(reportHtml({ title: 'Report', fields: [] }, 'de').includes('PDF herunterladen'));
assert.ok(reportHtml({ title: 'Report', fields: [] }, 'en').includes('Download PDF'));
console.log('Report preview checks passed.');
