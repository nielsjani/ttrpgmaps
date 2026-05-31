"""
Scrape all Starfinder aliens and starships from aonsrd.com
Saves each entry as a JSON file in:
  src/assets/data/starfinder/alien/<Name>.json
  src/assets/data/starfinder/starship/<Name>.json

Run from the repo root:
  python scraper/scrape_starfinder.py
"""

import requests
from bs4 import BeautifulSoup, NavigableString, Tag
import json
import os
import re
import time
import sys

BASE_URL = "https://www.aonsrd.com/"
LIST_URL = "https://www.aonsrd.com/Aliens.aspx?Letter=All"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_BASE = os.path.join(SCRIPT_DIR, "..", "src", "assets", "data", "starfinder")
ALIEN_DIR = os.path.join(OUT_BASE, "alien")
STARSHIP_DIR = os.path.join(OUT_BASE, "starship")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; StarfinderScraper/1.0)"
}
DELAY = 0.35  # seconds between requests


def safe_filename(name: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "_", name).strip()


def get_soup(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


# ---------------------------------------------------------------------------
# 1. Parse the listing table
# ---------------------------------------------------------------------------

def parse_listing():
    print(f"Fetching listing page: {LIST_URL}")
    soup = get_soup(LIST_URL)

    table = None
    for t in soup.find_all("table"):
        ths = [th.get_text(strip=True).lower() for th in t.find_all("th")]
        if "name" in ths and "type" in ths:
            table = t
            break

    if table is None:
        print("ERROR: Could not find the listing table.")
        sys.exit(1)

    headers = [th.get_text(strip=True).lower() for th in table.find("tr").find_all(["th", "td"])]
    name_idx = headers.index("name")
    type_idx = headers.index("type")
    cr_idx = headers.index("cr") if "cr" in headers else None
    env_idx = headers.index("environment") if "environment" in headers else None

    entries = []
    for row in table.find_all("tr")[1:]:
        cells = row.find_all(["td", "th"])
        if not cells or len(cells) <= name_idx:
            continue

        name_cell = cells[name_idx]
        name = name_cell.get_text(strip=True)
        if not name:
            continue

        link_tag = name_cell.find("a", href=True)
        href = link_tag["href"] if link_tag else None
        if href and not href.startswith("http"):
            href = BASE_URL + href.lstrip("/")

        raw_type = cells[type_idx].get_text(strip=True) if len(cells) > type_idx else ""
        category = "starship" if "starship" in raw_type.lower() else "alien"
        cr = cells[cr_idx].get_text(strip=True) if cr_idx is not None and len(cells) > cr_idx else ""
        environment = cells[env_idx].get_text(strip=True) if env_idx is not None and len(cells) > env_idx else ""

        entries.append({
            "name": name,
            "url": href,
            "category": category,
            "cr": cr,
            "type": raw_type,
            "environment": environment,
        })

    aliens = sum(1 for e in entries if e["category"] == "alien")
    ships = sum(1 for e in entries if e["category"] == "starship")
    print(f"Found {len(entries)} entries: {aliens} aliens, {ships} starships")
    return entries


# ---------------------------------------------------------------------------
# 2. Parse a detail page
# ---------------------------------------------------------------------------

def parse_detail(url: str, name: str) -> dict:
    if not url:
        return {"name": name, "error": "no url"}

    soup = get_soup(url)
    main_div = soup.find("div", id="main") or soup.find("body")

    data: dict = {"name": name, "source_url": url}

    full_text = main_div.get_text(separator="\n", strip=True)
    # Condense blank lines
    full_text = re.sub(r'\n{3,}', '\n\n', full_text)

    # ---- Source ----
    src_m = re.search(r"Source\s+([^\n]+)", full_text)
    if src_m:
        data["source"] = src_m.group(1).strip()

    # ---- CR / XP ----
    cr_m = re.search(r"\bCR\s+([\d/]+)", full_text)
    if cr_m:
        data["cr"] = cr_m.group(1)
    xp_m = re.search(r"\bXP\s+([\d,]+)", full_text)
    if xp_m:
        data["xp"] = xp_m.group(1)

    # ---- Alignment / Size / Creature type ----
    align_m = re.search(
        r"\b(LG|LN|LE|NG|N\b|NE|CG|CN|CE)\s+(Fine|Diminutive|Tiny|Small|Medium|Large|Huge|Gargantuan|Colossal)\s+([^\n]+)",
        full_text
    )
    if align_m:
        data["alignment"] = align_m.group(1)
        data["size"] = align_m.group(2)
        data["creature_type"] = align_m.group(3).strip()

    # ---- Init / Senses / Perception ----
    init_m = re.search(r"Init\s+([+\-\d]+)", full_text)
    if init_m:
        data["init"] = init_m.group(1)
    senses_m = re.search(r"Senses\s+([^\n]+)", full_text)
    if senses_m:
        data["senses"] = senses_m.group(1).strip()
    perc_m = re.search(r"Perception\s+([+\-\d]+)", full_text)
    if perc_m:
        data["perception"] = perc_m.group(1)

    # ---- Defense ----
    hp_m = re.search(r"\bHP\s+([\d,]+)", full_text)
    if hp_m:
        data["hp"] = hp_m.group(1)
    eac_m = re.search(r"\bEAC\s+([\d]+)", full_text)
    if eac_m:
        data["eac"] = eac_m.group(1)
    kac_m = re.search(r"\bKAC\s+([\d]+)", full_text)
    if kac_m:
        data["kac"] = kac_m.group(1)
    saves_m = re.search(r"Fort\s+([+\-\d]+);\s*Ref\s+([+\-\d]+);\s*Will\s+([+\-\d]+)", full_text)
    if saves_m:
        data["fort"] = saves_m.group(1)
        data["ref"] = saves_m.group(2)
        data["will"] = saves_m.group(3)
    dr_m = re.search(r"\bDR\s+([^\n;,]+)", full_text)
    if dr_m:
        data["dr"] = dr_m.group(1).strip()
    sr_m = re.search(r"\bSR\s+([\d]+)", full_text)
    if sr_m:
        data["sr"] = sr_m.group(1)
    immune_m = re.search(r"Immunities\s+([^\n]+)", full_text)
    if immune_m:
        data["immunities"] = immune_m.group(1).strip()
    resist_m = re.search(r"Resistances\s+([^\n]+)", full_text)
    if resist_m:
        data["resistances"] = resist_m.group(1).strip()
    weak_m = re.search(r"Weaknesses\s+([^\n]+)", full_text)
    if weak_m:
        data["weaknesses"] = weak_m.group(1).strip()

    # ---- Offense ----
    speed_m = re.search(r"Speed\s+([^\n]+)", full_text)
    if speed_m:
        data["speed"] = speed_m.group(1).strip()
    melee_m = re.search(r"Melee\s+([^\n]+)", full_text)
    if melee_m:
        data["melee"] = melee_m.group(1).strip()
    ranged_m = re.search(r"Ranged\s+([^\n]+)", full_text)
    if ranged_m:
        data["ranged"] = ranged_m.group(1).strip()
    space_m = re.search(r"Space\s+([^;]+);\s*Reach\s+([^\n]+)", full_text)
    if space_m:
        data["space"] = space_m.group(1).strip()
        data["reach"] = space_m.group(2).strip()
    off_m = re.search(r"Offensive Abilities\s+([^\n]+)", full_text)
    if off_m:
        data["offensive_abilities"] = off_m.group(1).strip()
    sla_m = re.search(r"Spell-Like Abilities\s*\(([^\)]+)\)(.*?)(?=\nStatistics|\nStat Block|\Z)", full_text, re.DOTALL)
    if sla_m:
        data["spell_like_abilities"] = {
            "caster_info": sla_m.group(1).strip(),
            "spells": sla_m.group(2).strip()
        }
    spells_m = re.search(r"(?:Spells Known|Spells Prepared)\s+([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\nStatistics|\Z)", full_text, re.DOTALL)
    if spells_m:
        data["spells"] = spells_m.group(1).strip()

    # ---- Statistics ----
    ability_m = re.search(
        r"STR\s+([+\-\d]+);\s*DEX\s+([+\-\d]+);\s*CON\s+([+\-\d]+|—);\s*INT\s+([+\-\d]+|—);\s*WIS\s+([+\-\d]+|—);\s*CHA\s+([+\-\d]+|—)",
        full_text
    )
    if ability_m:
        data["ability_scores"] = {
            "str": ability_m.group(1), "dex": ability_m.group(2),
            "con": ability_m.group(3), "int": ability_m.group(4),
            "wis": ability_m.group(5), "cha": ability_m.group(6),
        }
    skills_m = re.search(r"Skills\s+([^\n]+)", full_text)
    if skills_m:
        data["skills"] = skills_m.group(1).strip()
    feat_m = re.search(r"Feats\s+([^\n]+)", full_text)
    if feat_m:
        data["feats"] = feat_m.group(1).strip()
    lang_m = re.search(r"Languages\s+([^\n]+)", full_text)
    if lang_m:
        data["languages"] = lang_m.group(1).strip()
    other_m = re.search(r"Other Abilities\s+([^\n]+)", full_text)
    if other_m:
        data["other_abilities"] = other_m.group(1).strip()
    gear_m = re.search(r"(?:Gear|Equipment)\s+([^\n]+)", full_text)
    if gear_m:
        data["gear"] = gear_m.group(1).strip()

    # ---- Ecology ----
    env_m = re.search(r"Environment\s+([^\n]+)", full_text)
    if env_m:
        data["environment"] = env_m.group(1).strip()
    org_m = re.search(r"Organization\s+([^\n]+)", full_text)
    if org_m:
        data["organization"] = org_m.group(1).strip()

    # ---- Special Abilities ----
    special_abilities = []
    sa_m = re.search(
        r"Special Abilities?\s*\n(.*?)(?=\nDescription\b|\nExtra Content\b|\Z)",
        full_text, re.DOTALL
    )
    if sa_m:
        sa_block = sa_m.group(1).strip()
        # Each ability starts with a title line like "Name (Type)"
        ab_parts = re.split(r"(?m)^(?=[A-Z][^\n]+ \([A-Za-z ]+\)\s*$)", sa_block)
        for part in ab_parts:
            part = part.strip()
            if not part:
                continue
            lines = part.split("\n", 1)
            ability_name = lines[0].strip()
            ability_desc = lines[1].strip() if len(lines) > 1 else ""
            special_abilities.append({"name": ability_name, "description": ability_desc})
    if special_abilities:
        data["special_abilities"] = special_abilities

    # ---- Description ----
    desc_m = re.search(r"\nDescription\s*\n(.*?)(?=\nExtra Content\b|\Z)", full_text, re.DOTALL)
    if desc_m:
        data["description"] = desc_m.group(1).strip()

    # ---- Extra Content ----
    extra_m = re.search(r"Extra Content\s*\n(.*?)$", full_text, re.DOTALL)
    if extra_m:
        data["extra_content"] = extra_m.group(1).strip()

    # ---- Full raw text ----
    data["full_text"] = full_text

    return data


# ---------------------------------------------------------------------------
# 3. Main
# ---------------------------------------------------------------------------

def main():
    os.makedirs(ALIEN_DIR, exist_ok=True)
    os.makedirs(STARSHIP_DIR, exist_ok=True)

    entries = parse_listing()

    total = len(entries)
    done = 0
    skipped = 0
    errors = []

    for i, entry in enumerate(entries, 1):
        name = entry["name"]
        category = entry["category"]
        url = entry["url"]
        out_dir = STARSHIP_DIR if category == "starship" else ALIEN_DIR
        filename = safe_filename(name) + ".json"
        out_path = os.path.join(out_dir, filename)

        if os.path.exists(out_path):
            skipped += 1
            if i % 100 == 0:
                print(f"[{i}/{total}] ... {skipped} already scraped ...")
            continue

        print(f"[{i}/{total}] {category:8s}  {name}", end="  ", flush=True)
        try:
            detail = parse_detail(url, name)
            # Merge listing metadata as defaults
            detail.setdefault("cr", entry["cr"])
            detail.setdefault("type", entry["type"])
            detail.setdefault("environment", entry["environment"])
            detail["category"] = category

            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(detail, f, indent=2, ensure_ascii=False)
            done += 1
            print("OK")
        except Exception as exc:
            print(f"ERROR: {exc}")
            errors.append({"name": name, "url": url, "error": str(exc)})

        time.sleep(DELAY)

    print(f"\n{'='*60}")
    print(f"Done! {done} scraped, {skipped} skipped, {len(errors)} errors.")
    print(f"Aliens    → {ALIEN_DIR}")
    print(f"Starships → {STARSHIP_DIR}")

    if errors:
        err_path = os.path.join(OUT_BASE, "scrape_errors.json")
        with open(err_path, "w", encoding="utf-8") as f:
            json.dump(errors, f, indent=2)
        print(f"Errors saved to: {err_path}")


if __name__ == "__main__":
    main()

