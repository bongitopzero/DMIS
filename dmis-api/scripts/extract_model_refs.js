import fs from 'fs';
import path from 'path';
const dir = path.resolve('models');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
const results = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const modelMatch = text.match(/export default mongoose\.model\(['\"](.*?)['\"]/);
  const model_name = modelMatch ? modelMatch[1] : file.replace('.js', '');
  const collectionMatch = text.match(/collection\s*:\s*['\"](.*?)['\"]/);
  const collection = collectionMatch ? collectionMatch[1] : null;
  const refs = Array.from(new Set([...text.matchAll(/ref\s*:\s*['\"](.*?)['\"]/g)].map(m => m[1])));
  const idx_count = [...text.matchAll(/\.index\(|index\(/g)].length;
  results.push({ file, model: model_name, collection, refs, indexCount: idx_count });
}
console.log(JSON.stringify(results, null, 2));
