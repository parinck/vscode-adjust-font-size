# Font Size Pair Adjuster

Keep VS Code's editor font size and Markdown preview font size in sync from the status bar or command palette. Markdown previews also get zoom controls for rendered diagrams.

This extension adds lightweight status bar controls and command palette commands for updating these settings together:

```json
{
  "editor.fontSize": 16,
  "markdown.preview.fontSize": 16
}
```

## Features

- Increase both editor and Markdown preview font sizes together.
- Decrease both font sizes together.
- Set both font sizes to one explicit value.
- See the current editor and Markdown preview sizes in the status bar.
- Configure step size, minimum size, and maximum size.
- Zoom, pan, reset, and pop out Mermaid/SVG diagrams in Markdown preview.

## Usage

After activation, the status bar shows three controls:

- The minus icon decreases both font sizes.
- `16/16` shows `editor.fontSize` / `markdown.preview.fontSize`; click it to set both values.
- The plus icon increases both font sizes.

You can also run these commands from the command palette:

- `Font Size Pair: Increase`
- `Font Size Pair: Decrease`
- `Font Size Pair: Set`

### Markdown Diagram Preview

Open any Markdown preview that contains rendered Mermaid diagrams or SVG images. Diagram controls appear automatically in the upper right of each detected diagram:

- `-` zooms out.
- `+` zooms in.
- `1:1` resets zoom.
- `[]` opens an in-preview diagram viewer.

Drag inside a zoomed diagram to pan around it.

## Settings

```json
{
  "fontSizePairAdjuster.step": 1,
  "fontSizePairAdjuster.minimum": 1,
  "fontSizePairAdjuster.maximum": 72
}
```

## Setup

Prerequisites:

- VS Code 1.80.0 or newer
- Node.js 20 or newer
- Git

Clone the repository:

```bash
git clone https://github.com/parinck/vscode-adjust-font-size.git
cd vscode-adjust-font-size
```

Open it in VS Code:

```bash
code .
```

Install development dependencies:

```bash
npm ci
```

Run validation:

```bash
npm run check
npm test
```

## Run Locally

Launch an Extension Development Host from VS Code:

1. Open Run and Debug.
2. Select `Run Extension`.
3. Press the play button or `F5`.

This opens a second VS Code window with the extension loaded.

## Install Locally From VSIX

Create a VSIX package:

```bash
npm run package
```

Install it in VS Code:

1. Open Extensions.
2. Open the `...` menu.
3. Choose `Install from VSIX...`.
4. Select the generated `vscode-font-size-pair-adjuster-*.vsix` file.

## Publish

Before publishing, confirm that `publisher` in `package.json` matches your Visual Studio Marketplace publisher identifier.

Package before publishing:

```bash
npm run package
```

Publish to the Marketplace:

```bash
npm run publish:marketplace
```

Repository: https://github.com/parinck/vscode-adjust-font-size

Issues: https://github.com/parinck/vscode-adjust-font-size/issues

## Privacy And Security

This extension has no runtime dependencies. It does not use network access, filesystem access, shell execution, telemetry, secrets, or environment variables.

The status bar commands only update these user settings when you run one of its commands or click one of its status bar controls:

```json
{
  "editor.fontSize": 16,
  "markdown.preview.fontSize": 16
}
```

The extension also contributes a local Markdown preview script and stylesheet to add diagram controls inside VS Code's Markdown preview. The preview script only inspects and wraps diagram elements already rendered in the preview document.

The extension declares support for trusted, untrusted, and virtual workspaces because it does not inspect workspace files, execute workspace code, or load remote resources.
