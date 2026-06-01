"""
Scrape all Starfinder Template Grafts from aonsrd.com.
Saves the result as a single JSON file:
  src/assets/data/starfinder/template-grafts.json

Run from the repo root:
  python scraper/scrape_template_grafts.py
"""

import requests
from bs4 import BeautifulSoup, NavigableString, Tag
import json
import os
import re
import time
from urllib.parse import urlparse, parse_qs, unquote_plus

BASE_URL = "https://aonsrd.com/"
LIST_URL = "https://aonsrd.com/TemplateGrafts.aspx?ItemName=All&Family=None"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "src", "assets", "data", "starfinder")
OUT_FILE = os.path.join(OUT_DIR, "template-grafts.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; StarfinderScraper/1.0)"
}
DELAY = 0.4  # seconds between requests

CATEGORY_ORDER = [
    "Class",
    "Creature Type",
    "Creature Subtype",
    "Environmental",
    "Simple",
    "Summoning",
    "Other",
]


def get_soup(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def get_main_content(soup: BeautifulSoup) -> Tag:
    """Get the primary content element from an aonsrd.com page."""
    return (
        soup.find("div", id="ctl00_MainContent_DetailedOutput")
        or soup.find("div", id="main")
        or soup.find("body")
    )


def to_slug(name: str) -> str:
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', name.lower()))


def parse_url_params(href: str) -> dict:
    """Extract ItemName and Family from a TemplateGrafts URL."""
    parsed = urlparse(href)
    params = parse_qs(parsed.query)
    return {
        "item_name": unquote_plus(params.get("ItemName", [""])[0]),
        "family": unquote_plus(params.get("Family", [""])[0]),
    }


def collect_links_from_listing(soup: BeautifulSoup) -> list[dict]:
    """
    Parse the listing page to collect all graft entries with their category.

    The page uses <h1 class="title"> tags as section headings (e.g. "Class Grafts"),
    followed by <a> links for each graft within that section.
    """
    main = get_main_content(soup)

    entries = []
    seen: set[tuple] = set()   # (item_name, family) pairs to avoid duplicates
    current_category = "Other"

    for el in main.find_all(["h1", "a"]):
        # Section heading: <h1 class="title">Class Grafts</h1>
        if el.name == "h1" and "title" in el.get("class", []):
            heading = el.get_text(strip=True)
            # "Class Grafts" → "Class", "Creature Type Grafts" → "Creature Type"
            current_category = heading.replace(" Grafts", "").strip()
            continue

        if el.name != "a":
            continue

        href = el.get("href", "")
        if "TemplateGrafts.aspx" not in href:
            continue

        params = parse_url_params(href)
        item_name = params["item_name"]
        family = params["family"]

        # Skip the "All" link and links without a real Family value
        if not item_name or item_name == "All" or not family or family == "None":
            continue

        key = (item_name, family)
        if key in seen:
            continue
        seen.add(key)

        full_url = BASE_URL + href.lstrip("/") if not href.startswith("http") else href

        entries.append({
            "name": item_name,
            "url": full_url,
            "family": family,
            "category": current_category,
        })

    return entries


def extract_graft_html(content: Tag, entry_name: str, entry_family: str) -> str:
    """
    Find the graft-specific section on a detail page and return its inner HTML.

    Detail pages show: [category intro] … [graft heading] [source] [description]
    The graft heading is a <h1 class="title"> containing a link back to the graft.
    """
    # Find the <a> tag linking to this specific graft (by ItemName + Family)
    graft_link = None
    for a in content.find_all("a"):
        href = a.get("href", "")
        if "TemplateGrafts.aspx" not in href:
            continue
        params = parse_url_params(href)
        if params["item_name"] == entry_name and params["family"] == entry_family:
            graft_link = a
            break

    if graft_link is None:
        # Fallback: match by ItemName only
        for a in content.find_all("a"):
            href = a.get("href", "")
            if "TemplateGrafts.aspx" not in href:
                continue
            params = parse_url_params(href)
            if params["item_name"] == entry_name and params["family"]:
                graft_link = a
                break

    if graft_link is None:
        return content.get_text(separator="\n", strip=True)

    # Find the block-level container (the heading element)
    heading_el = graft_link
    while heading_el.parent and heading_el.name not in ("h1", "h2", "h3", "body"):
        heading_el = heading_el.parent

    # Collect all siblings after the heading until the next section heading (h1.title or h2.title)
    # Use next_siblings (not find_next_siblings) to include text nodes (NavigableStrings)
    html_parts = []
    for sibling in heading_el.next_siblings:
        if isinstance(sibling, NavigableString):
            html_parts.append(str(sibling))
            continue
        sib_class = sibling.get("class", [])
        if sibling.name in ("h1", "h2", "h3") and "title" in sib_class:
            break
        html_parts.append(str(sibling))

    return "".join(html_parts).strip()


def parse_detail(entry: dict) -> dict:
    """Scrape a single graft detail page and return structured data."""
    url = entry["url"]
    name = entry["name"]
    family = entry["family"]

    soup = get_soup(url)
    content = get_main_content(soup)

    result: dict = {
        "name": name,
        "family": family,
        "category": entry["category"],
        "source_url": url,
    }

    description_html = extract_graft_html(content, name, family)

    # Extract source text and book URL from the HTML fragment
    frag_soup = BeautifulSoup(description_html, "lxml")
    source_b = frag_soup.find(lambda tag: tag.name == "b" and tag.get_text(strip=True) == "Source")
    if source_b:
        source_a = source_b.find_next("a")
        if source_a:
            result["source"] = source_a.get_text(strip=True)
            result["book_url"] = source_a.get("href", "")

    result["description"] = description_html
    return result


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Fetching listing page: {LIST_URL}")
    soup = get_soup(LIST_URL)

    entries = collect_links_from_listing(soup)
    print(f"Found {len(entries)} template grafts across all categories")

    from collections import Counter
    cat_counts = Counter(e["category"] for e in entries)
    for cat in CATEGORY_ORDER:
        if cat in cat_counts:
            print(f"  {cat}: {cat_counts[cat]}")

    results = []
    total = len(entries)

    for i, entry in enumerate(entries, 1):
        print(f"[{i}/{total}] {entry['category']:20s}  {entry['name']}", end="  ", flush=True)
        try:
            detail = parse_detail(entry)
            detail["slug"] = to_slug(entry["name"])
            results.append(detail)
            print("OK")
        except Exception as exc:
            print(f"ERROR: {exc}")
            results.append({
                "name": entry["name"],
                "slug": to_slug(entry["name"]),
                "family": entry["family"],
                "category": entry["category"],
                "source_url": entry["url"],
                "description": "",
                "error": str(exc),
            })

        time.sleep(DELAY)

    results.sort(key=lambda r: (
        CATEGORY_ORDER.index(r.get("category", "Other"))
        if r.get("category", "Other") in CATEGORY_ORDER else 99,
        r.get("name", "").lower(),
    ))

    print(f"\nWriting {len(results)} entries to: {OUT_FILE}")
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("Done!")


if __name__ == "__main__":
    main()
