'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Guards the Dependency Rule: source code dependencies point only inwards.
 *
 *   domain  <-  application  <-  interfaces/http
 *                    ^
 *              infrastructure
 *
 * Only the composition root (container.js, server.js) may depend on everything.
 */
const SRC = path.join(__dirname, '..', 'src');

const layerOf = (file) => {
  const rel = path.relative(SRC, file).split(path.sep);
  return ['domain', 'application', 'infrastructure', 'interfaces'].includes(rel[0]) ? rel[0] : 'root';
};

const ALLOWED = {
  domain: ['domain'],
  application: ['domain', 'application'],
  infrastructure: ['domain', 'application', 'infrastructure'],
  interfaces: ['domain', 'application', 'interfaces'],
  root: ['domain', 'application', 'infrastructure', 'interfaces', 'root']
};

// External modules allowed per layer (node: built-ins are listed explicitly)
const ALLOWED_PACKAGES = {
  domain: [],
  application: [],
  infrastructure: ['pg', 'node:crypto', 'node:fs', 'node:path'],
  interfaces: [],
  root: ['node:http']
};

const listJs = (dir) => fs.readdirSync(dir, {withFileTypes: true}).flatMap((d) =>
  d.isDirectory() ? listJs(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []);

const requiresOf = (file) =>
  [...fs.readFileSync(file, 'utf8').matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);

test('Architecture: Dependency Rule', async (t) => {
  const files = listJs(SRC);

  await t.test('layers import only from allowed inner layers', () => {
    const violations = [];
    for (const file of files) {
      const from = layerOf(file);
      for (const spec of requiresOf(file)) {
        if (!spec.startsWith('.')) continue;
        const to = layerOf(path.resolve(path.dirname(file), spec));
        if (!ALLOWED[from].includes(to)) violations.push(`${path.relative(SRC, file)} (${from}) -> ${spec} (${to})`);
      }
    }
    assert.deepStrictEqual(violations, []);
  });

  await t.test('inner layers use no external packages and no process.env', () => {
    const violations = [];
    for (const file of files) {
      const layer = layerOf(file);
      const source = fs.readFileSync(file, 'utf8');
      for (const spec of requiresOf(file)) {
        if (!spec.startsWith('.') && !ALLOWED_PACKAGES[layer].includes(spec)) {
          violations.push(`${path.relative(SRC, file)} requires '${spec}'`);
        }
      }
      if (['domain', 'application', 'interfaces'].includes(layer) && /process\.env/.test(source.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''))) {
        violations.push(`${path.relative(SRC, file)} reads process.env`);
      }
    }
    assert.deepStrictEqual(violations, []);
  });
});
