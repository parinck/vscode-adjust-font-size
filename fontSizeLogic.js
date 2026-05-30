'use strict';

function normalizeBound(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function adjustFontSizes(current, options) {
  const minimum = normalizeBound(options.minimum, 1);
  const maximum = Math.max(minimum, normalizeBound(options.maximum, 72));
  const step = Math.max(0, normalizeBound(options.step, 1));

  if (options.direction === 'set') {
    const value = clamp(normalizeBound(options.value, minimum), minimum, maximum);
    return {
      editorFontSize: value,
      markdownPreviewFontSize: value
    };
  }

  if (options.direction !== 'increase' && options.direction !== 'decrease') {
    throw new Error(`Unsupported font size direction: ${options.direction}`);
  }

  const delta = options.direction === 'increase' ? step : -step;

  return {
    editorFontSize: clamp(current.editorFontSize + delta, minimum, maximum),
    markdownPreviewFontSize: clamp(current.markdownPreviewFontSize + delta, minimum, maximum)
  };
}

function parseFontSizeInput(input, minimum, maximum) {
  const trimmed = input.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    return null;
  }

  return value;
}

module.exports = {
  adjustFontSizes,
  parseFontSizeInput
};
