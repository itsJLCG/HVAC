const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function readFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach((f) => {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(readFiles(full));
    else if (/\.jsx?$/.test(f)) results.push(full);
  });
  return results;
}

function parseImports(code) {
  const imports = [];
  const re = /import\s+([^;]+)\s+from\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(code))) {
    imports.push({ raw: m[0], spec: m[1].trim(), source: m[2].trim() });
  }
  return imports;
}

function getExports(code) {
  const exports = { default: false, named: new Set() };
  if (/export\s+default\s+/m.test(code)) exports.default = true;
  const re = /export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(code))) exports.named.add(m[1]);
  // export { A, B as C }
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(code))) {
    m[1].split(',').forEach((part) => {
      const name = part.split('as')[0].trim();
      if (name) exports.named.add(name);
    });
  }
  return exports;
}

function resolveImport(source, importerDir) {
  if (source.startsWith('.')) {
    let p = path.resolve(importerDir, source);
    // try .js, .jsx, /index.js
    const candidates = [p, p + '.js', p + '.jsx', path.join(p, 'index.js'), path.join(p, 'index.jsx')];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return null;
  }
  // treat as alias to src (baseUrl)
  const p = path.join(SRC, source);
  const candidates = [p + '.js', p + '.jsx', path.join(p, 'index.js'), path.join(p, 'index.jsx')];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function check() {
  const files = readFiles(SRC);
  const errors = [];
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const imports = parseImports(code);
    for (const imp of imports) {
      const resolved = resolveImport(imp.source, path.dirname(file));
      if (!resolved) continue; // could be external dependency
      const exported = getExports(fs.readFileSync(resolved, 'utf8'));
      // parse spec: default and named
      const spec = imp.spec;
      if (spec.startsWith('{')) {
        // named imports
        const names = spec.replace(/[{}]/g, '').split(',').map(s=>s.trim().split(' as ')[0].trim());
        for (const n of names) {
          if (!exported.named.has(n)) {
            errors.push({ importer: file, source: imp.source, name: n, target: resolved });
          }
        }
      } else {
        // could be default or namespace or mixed
        if (spec.startsWith('*')) continue;
        if (spec.includes(',')) {
          // default, {named}
          const parts = spec.split(',');
          const def = parts[0].trim();
          const named = parts[1].replace(/[{}]/g,'').split(',').map(s=>s.trim().split(' as ')[0].trim());
          if (!exported.default) {
            errors.push({ importer: file, source: imp.source, name: 'default', target: resolved });
          }
          for (const n of named) if (!exported.named.has(n)) errors.push({ importer: file, source: imp.source, name: n, target: resolved });
        } else {
          // default import
          if (!exported.default) {
            errors.push({ importer: file, source: imp.source, name: 'default', target: resolved });
          }
        }
      }
    }
  }
  if (errors.length === 0) {
    console.log('No import/export mismatches detected (quick check).');
    return 0;
  }
  console.log('Found potential mismatches:');
  for (const e of errors) {
    console.log('-', e.importer, 'imports', e.name, 'from', e.source, '->', e.target);
  }
  return 1;
}

process.exit(check());
