'use strict';

const vscode = require('vscode');
const {
  adjustFontSizes,
  parseFontSizeInput
} = require('./fontSizeLogic');

const DEFAULT_FONT_SIZE = 16;
const SETTINGS = {
  editor: { section: 'editor', key: 'fontSize' },
  markdownPreview: { section: 'markdown.preview', key: 'fontSize' }
};

let decreaseItem;
let displayItem;
let increaseItem;

function activate(context) {
  decreaseItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 13);
  displayItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 12);
  increaseItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 11);

  context.subscriptions.push(
    decreaseItem,
    displayItem,
    increaseItem,
    vscode.commands.registerCommand('fontSizePairAdjuster.increase', () => updateFontSizes('increase')),
    vscode.commands.registerCommand('fontSizePairAdjuster.decrease', () => updateFontSizes('decrease')),
    vscode.commands.registerCommand('fontSizePairAdjuster.set', setFontSizes),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('editor.fontSize') ||
        event.affectsConfiguration('markdown.preview.fontSize') ||
        event.affectsConfiguration('fontSizePairAdjuster')
      ) {
        updateStatusBar();
      }
    })
  );

  updateStatusBar();
}

async function updateFontSizes(direction) {
  const options = getAdjustmentOptions(direction);
  const next = adjustFontSizes(getCurrentFontSizes(), options);
  await applyFontSizes(next);
  updateStatusBar();
}

async function setFontSizes() {
  const { minimum, maximum } = getBounds();
  const current = getCurrentFontSizes();
  const input = await vscode.window.showInputBox({
    prompt: 'Set editor and Markdown preview font size',
    value: String(current.editorFontSize),
    validateInput: (value) => {
      if (parseFontSizeInput(value, minimum, maximum) === null) {
        return `Enter a number from ${minimum} to ${maximum}`;
      }

      return null;
    }
  });

  if (input === undefined) {
    return;
  }

  const value = parseFontSizeInput(input, minimum, maximum);

  if (value === null) {
    return;
  }

  const next = adjustFontSizes(current, {
    direction: 'set',
    value,
    step: getStep(),
    minimum,
    maximum
  });

  await applyFontSizes(next);
  updateStatusBar();
}

function getAdjustmentOptions(direction) {
  return {
    direction,
    step: getStep(),
    ...getBounds()
  };
}

function getCurrentFontSizes() {
  return {
    editorFontSize: getConfiguredFontSize(SETTINGS.editor),
    markdownPreviewFontSize: getConfiguredFontSize(SETTINGS.markdownPreview)
  };
}

function getConfiguredFontSize(setting) {
  const value = vscode.workspace.getConfiguration(setting.section).get(setting.key);
  return Number.isFinite(value) ? value : DEFAULT_FONT_SIZE;
}

function getStep() {
  const value = vscode.workspace.getConfiguration('fontSizePairAdjuster').get('step');
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getBounds() {
  const config = vscode.workspace.getConfiguration('fontSizePairAdjuster');
  const minimum = config.get('minimum');
  const maximum = config.get('maximum');
  const normalizedMinimum = Number.isFinite(minimum) && minimum > 0 ? minimum : 1;

  return {
    minimum: normalizedMinimum,
    maximum: Number.isFinite(maximum) && maximum >= normalizedMinimum ? maximum : 72
  };
}

async function applyFontSizes(fontSizes) {
  await Promise.all([
    vscode.workspace
      .getConfiguration(SETTINGS.editor.section)
      .update(SETTINGS.editor.key, fontSizes.editorFontSize, vscode.ConfigurationTarget.Global),
    vscode.workspace
      .getConfiguration(SETTINGS.markdownPreview.section)
      .update(SETTINGS.markdownPreview.key, fontSizes.markdownPreviewFontSize, vscode.ConfigurationTarget.Global)
  ]);
}

function updateStatusBar() {
  const current = getCurrentFontSizes();

  decreaseItem.text = '$(dash)';
  decreaseItem.tooltip = 'Decrease editor and Markdown preview font sizes';
  decreaseItem.command = 'fontSizePairAdjuster.decrease';

  displayItem.text = `$(text-size) ${current.editorFontSize}/${current.markdownPreviewFontSize}`;
  displayItem.tooltip = 'Set editor and Markdown preview font sizes';
  displayItem.command = 'fontSizePairAdjuster.set';

  increaseItem.text = '$(plus)';
  increaseItem.tooltip = 'Increase editor and Markdown preview font sizes';
  increaseItem.command = 'fontSizePairAdjuster.increase';

  decreaseItem.show();
  displayItem.show();
  increaseItem.show();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
