const assert = require('node:assert/strict');
const test = require('node:test');

const {
  adjustFontSizes,
  parseFontSizeInput
} = require('../fontSizeLogic');

test('increase updates editor and markdown preview font sizes together', () => {
  assert.deepEqual(
    adjustFontSizes(
      { editorFontSize: 16, markdownPreviewFontSize: 16 },
      { direction: 'increase', step: 2, minimum: 1, maximum: 72 }
    ),
    { editorFontSize: 18, markdownPreviewFontSize: 18 }
  );
});

test('decrease clamps both font sizes at the configured minimum', () => {
  assert.deepEqual(
    adjustFontSizes(
      { editorFontSize: 2, markdownPreviewFontSize: 1 },
      { direction: 'decrease', step: 2, minimum: 1, maximum: 72 }
    ),
    { editorFontSize: 1, markdownPreviewFontSize: 1 }
  );
});

test('set applies one explicit size to both settings within bounds', () => {
  assert.deepEqual(
    adjustFontSizes(
      { editorFontSize: 16, markdownPreviewFontSize: 14 },
      { direction: 'set', value: 20, step: 1, minimum: 1, maximum: 72 }
    ),
    { editorFontSize: 20, markdownPreviewFontSize: 20 }
  );
});

test('parseFontSizeInput rejects partial numbers and values outside bounds', () => {
  assert.equal(parseFontSizeInput('18', 1, 72), 18);
  assert.equal(parseFontSizeInput('18.5', 1, 72), 18.5);
  assert.equal(parseFontSizeInput('18px', 1, 72), null);
  assert.equal(parseFontSizeInput('0', 1, 72), null);
  assert.equal(parseFontSizeInput('100', 1, 72), null);
});

test('adjustFontSizes rejects unsupported directions', () => {
  assert.throws(
    () => adjustFontSizes(
      { editorFontSize: 16, markdownPreviewFontSize: 16 },
      { direction: 'reset', step: 1, minimum: 1, maximum: 72 }
    ),
    /Unsupported font size direction/
  );
});
