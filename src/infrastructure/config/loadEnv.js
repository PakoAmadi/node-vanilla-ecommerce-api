'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Default locations, first existing wins: project root (documented), then src/ (legacy)
const DEFAULT_PATHS = () => [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'src', '.env')
];

const loadEnv = (customPath = null) => {
  try {
    const envPath = customPath || DEFAULT_PATHS().find((p) => fs.existsSync(p));
    if (!envPath || !fs.existsSync(envPath)) return;

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [rawKey, ...valueParts] = trimmed.split('=');
      const key = rawKey.trim();
      const value = valueParts.join('=').trim();

      if (key) {
        process.env[key] = value.replace(/(^["']|["']$)/g, '');
      }
    }
  } catch (e) {
    console.error('.env file loading error:', e.message);
  }
};

module.exports = loadEnv;
