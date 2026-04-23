import os
import json
import re
from pathlib import Path

dir_path = Path(__file__).resolve().parent.parent / 'models'
results = []
for file in sorted(dir_path.glob('*.js')):
    text = file.read_text(encoding='utf-8')
    model_match = re.search(r"export default mongoose\.model\(['\"](.*?)['\"]", text)
    model_name = model_match.group(1) if model_match else file.stem
    collection_match = re.search(r"collection\s*:\s*['\"](.*?)['\"]", text)
    collection = collection_match.group(1) if collection_match else None
    refs = sorted(set(re.findall(r"ref\s*:\s*['\"](.*?)['\"]", text)))
    idx_count = len(re.findall(r"\.index\(|index\(", text))
    results.append({
        'file': file.name,
        'model': model_name,
        'collection': collection,
        'refs': refs,
        'indexCount': idx_count,
    })
print(json.dumps(results, indent=2))
