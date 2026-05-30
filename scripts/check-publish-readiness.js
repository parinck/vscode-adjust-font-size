'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const excludedDirectories = new Set([
  '.git',
  '.vscode',
  'coverage',
  'dist',
  'node_modules'
]);
const excludedFiles = new Set([
  'package-lock.json'
]);
const excludedExtensions = new Set([
  '.png',
  '.vsix'
]);

const checks = [
  {
    name: 'local absolute path',
    pattern: new RegExp([
      String.raw`/` + 'Users' + String.raw`/`,
      String.raw`[A-Za-z]:\\` + 'Users' + String.raw`\\`
    ].join('|'))
  },
  {
    name: 'email address',
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
  },
  {
    name: 'phone-like number',
    pattern: /\b(?:\+?\d[\d ().-]{7,}\d)\b/
  },
  {
    name: 'private key',
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/
  },
  {
    name: 'AWS access key',
    pattern: /AKIA[0-9A-Z]{16}/
  },
  {
    name: 'GitHub token',
    pattern: /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/
  },
  {
    name: 'Slack token',
    pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/
  },
  {
    name: 'OpenAI API key',
    pattern: new RegExp('s' + 'k-' + String.raw`[A-Za-z0-9_-]{20,}`)
  },
  {
    name: 'secret-like assignment',
    pattern: /\b(?:api[_-]?key|password|secret|token)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i
  }
];

const findings = [];

for (const filePath of walk(root)) {
  const relativePath = path.relative(root, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const check of checks) {
      if (check.pattern.test(line)) {
        findings.push(`${relativePath}:${index + 1}: ${check.name}`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Publish readiness scan found blocked content:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

function* walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) {
        continue;
      }

      yield* walk(path.join(directory, entry.name));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.join(directory, entry.name);
    const extension = path.extname(entry.name);

    if (excludedFiles.has(entry.name) || excludedExtensions.has(extension)) {
      continue;
    }

    yield filePath;
  }
}
