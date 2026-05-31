"""
Build alien-index.json and starship-index.json from the scraped JSON files.
Run from repo root: python scraper/create_index.py
"""
import json, os, glob

def parse_cr(cr_str):
    if not cr_str:
        return 0.0
    s = str(cr_str).strip()
    if '/' in s:
        parts = s.split('/')
        try:
            return int(parts[0]) / int(parts[1])
        except:
            return 0.0
    try:
        return float(s)
    except:
        return 0.0

script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.join(script_dir, '..', 'src', 'assets', 'data', 'starfinder')

for category in ['alien', 'starship']:
    dir_path = os.path.join(base_dir, category)
    index = []
    type_set, env_set = set(), set()

    for f in sorted(glob.glob(os.path.join(dir_path, '*.json'))):
        try:
            with open(f, encoding='utf-8') as fh:
                data = json.load(fh)
            slug = os.path.splitext(os.path.basename(f))[0]
            entry_type = data.get('type', data.get('creature_type', '')).strip()
            environment = data.get('environment', '').strip()

            entry = {
                'name':        data.get('name', slug),
                'cr':          data.get('cr', ''),
                'crValue':     parse_cr(data.get('cr', '')),
                'type':        entry_type,
                'environment': environment,
                'slug':        slug,
            }
            index.append(entry)
            if entry_type:   type_set.add(entry_type)
            if environment:  env_set.add(environment)
        except Exception as e:
            print(f'  Error {os.path.basename(f)}: {e}')

    out = os.path.join(base_dir, f'{category}-index.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, separators=(',', ':'))

    print(f'{category}: {len(index)} entries | {len(type_set)} types | {len(env_set)} environments')
    print(f'  -> {out}')

