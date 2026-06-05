const assert = require('node:assert/strict');
const test = require('node:test');

const manifest = require('../package.json');

let diagramPreview = {};
try {
  diagramPreview = require('../media/diagramPreview');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

test('extension contributes diagram controls to the markdown preview', () => {
  assert.deepEqual(
    manifest.contributes['markdown.previewScripts'],
    ['./media/diagramPreview.js']
  );
  assert.deepEqual(
    manifest.contributes['markdown.previewStyles'],
    ['./media/diagramPreview.css']
  );
});

test('diagram zoom helpers step, clamp, and format preview zoom levels', () => {
  assert.equal(typeof diagramPreview.adjustZoom, 'function');
  assert.equal(typeof diagramPreview.formatZoom, 'function');

  assert.equal(diagramPreview.adjustZoom(1, 'increase'), 1.2);
  assert.equal(diagramPreview.adjustZoom(1, 'decrease'), 0.8);
  assert.equal(diagramPreview.adjustZoom(3.95, 'increase'), 4);
  assert.equal(diagramPreview.adjustZoom(0.3, 'decrease'), 0.25);
  assert.equal(diagramPreview.adjustZoom(2, 'reset'), 1);
  assert.equal(diagramPreview.formatZoom(1.25), '125%');
});
