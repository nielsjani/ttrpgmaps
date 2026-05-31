"""
Fetch the image URL from each aonsrd detail page and add it to the JSON file.
Run from repo root: python scraper/add_images.py

Safe to re-run: already-processed files (imageUrl present) are skipped.
"""
import requests
from bs4 import BeautifulSoup
import json
import os
import glob
import time
import sys

BASE_URL = "https://www.aonsrd.com/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; StarfinderImageScraper/1.0)"}
DELAY = 0.3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SF_DIR = os.path.join(SCRIPT_DIR, '..', 'src', 'assets', 'data', 'starfinder')


def find_image_url(soup: BeautifulSoup) -> str | None:
    """Return the specific creature image URL from a detail page, or None."""
    for img in soup.find_all('img'):
        src = img.get('src', '').replace('\\', '/')
        # Skip site chrome / nav images
        if not src or any(x in src.lower() for x in
                          ['heading_flourish', 'logo', 'facebook', 'infinite',
                           'icon', 'button', 'nav', 'arrow', 'bg', '.gif']):
            continue
        # Generic combatant placeholders
        if 'Combatant' in src or 'Generic' in src:
            continue
        # Creature-specific image folders
        if any(seg in src for seg in ['/Aliens/', '/Starship', '/NPC/', '/Creature/']):
            url = BASE_URL + src.lstrip('/') if not src.startswith('http') else src
            return url
    return None


def process_file(filepath: str) -> str:
    with open(filepath, encoding='utf-8') as f:
        data = json.load(f)

    if data.get('imageUrl'):          # already done
        return 'skip'

    source_url = data.get('source_url', '')
    if not source_url:
        return 'no_url'

    try:
        resp = requests.get(source_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')
        img_url = find_image_url(soup)

        if img_url:
            data['imageUrl'] = img_url
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return f'OK  {img_url}'
        return 'no_img'
    except Exception as exc:
        return f'ERR {exc}'


def main():
    categories = sys.argv[1:] if sys.argv[1:] else ['alien', 'starship']

    for category in categories:
        dir_path = os.path.join(SF_DIR, category)
        files = sorted(glob.glob(os.path.join(dir_path, '*.json')))
        total = len(files)
        found = skipped = no_img = errors = 0

        print(f'\n=== {category.upper()} ({total} files) ===')
        for i, fp in enumerate(files, 1):
            name = os.path.splitext(os.path.basename(fp))[0]
            result = process_file(fp)

            if result == 'skip':
                skipped += 1
            elif result.startswith('OK'):
                found += 1
                print(f'  [{i}/{total}] {name} -> {result[3:]}')
            elif result == 'no_img':
                no_img += 1
                if i <= 10 or no_img <= 5:
                    print(f'  [{i}/{total}] {name}: no image found')
            else:
                errors += 1
                print(f'  [{i}/{total}] {name}: {result}')

            if result != 'skip':
                time.sleep(DELAY)

        print(f'Done: {found} images added, {skipped} skipped, '
              f'{no_img} no image, {errors} errors')


if __name__ == '__main__':
    main()

