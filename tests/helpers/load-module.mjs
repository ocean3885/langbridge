import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
export function loadModules(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const localRequire = name => Object.hasOwn(mocks,name) ? mocks[name] : name.startsWith('@/') ? load(name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(filename),name)) : require(name);
    new Function('require','module','exports',source)(localRequire,module,module.exports);
    return module.exports;
  }
  return load;
}
