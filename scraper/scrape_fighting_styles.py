"""
Scrape all Starfinder Fighting Styles from aonsrd.com.
Saves the result as a single JSON file:
  src/assets/data/starfinder/fighting-styles.json

Run from the repo root:
  python scraper/scrape_fighting_styles.py
"""

import json
import os
import re
import time
from urllib.parse import parse_qs, unquote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

BASE_URL = "https://www.aonsrd.com/"
LIST_URL = "https://www.aonsrd.com/FightingStyles.aspx?ItemName=All"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "src", "assets", "data", "starfinder")
OUT_FILE = os.path.join(OUT_DIR, "fighting-styles.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; StarfinderScraper/1.0)"
}
DELAY = 0.4
ABILITY_TITLE_RE = re.compile(r"^(.+?) \((\w+)\) - (\d+)(?:st|nd|rd|th) Level$")


def get_soup(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def get_main_content(soup: BeautifulSoup) -> Tag:
    return (
        soup.find("div", id="ctl00_MainContent_DetailedOutput")
        or soup.find("div", id="main")
        or soup.find("body")
    )


def to_slug(name: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def parse_item_name(href: str) -> str:
    params = parse_qs(urlparse(href).query)
    return unquote_plus(params.get("ItemName", [""])[0]).strip()


def clean_html_fragment(html: str) -> str:
    html = html.strip()
    html = re.sub(r"^(?:<br\s*/?>\s*)+", "", html, flags=re.IGNORECASE)
    html = re.sub(r"(?:\s*<br\s*/?>)+$", "", html, flags=re.IGNORECASE)
    return html.strip()


def collect_until_next_heading(start_node, stop_name: str | None = None) -> str:
    parts: list[str] = []
    for sibling in start_node.next_siblings:
        if isinstance(sibling, Tag):
            if sibling.name == "h2" and "title" in sibling.get("class", []):
                break
            if stop_name and sibling.name == stop_name:
                break
            parts.append(str(sibling))
        elif isinstance(sibling, NavigableString):
            parts.append(str(sibling))
    return clean_html_fragment("".join(parts))


def collect_links_from_listing(soup: BeautifulSoup) -> list[dict]:
    main = get_main_content(soup)
    entries = []
    seen: set[str] = set()

    for heading in main.find_all("h2", class_="title"):
        link = heading.find("a", href=True)
        if link is None:
            continue

        name = parse_item_name(link["href"]) or link.get_text(" ", strip=True)
        if not name or name == "All" or name in seen:
            continue

        seen.add(name)
        entries.append(
            {
                "name": name,
                "url": urljoin(BASE_URL, link["href"]),
            }
        )

    return entries


def find_style_container(content: Tag, style_name: str) -> Tag:
    for heading in content.find_all("h1", class_="title"):
        link = heading.find("a", href=True)
        if link and parse_item_name(link["href"]) == style_name:
            return heading.parent if isinstance(heading.parent, Tag) else content
    raise ValueError(f"Could not find detail block for {style_name}")


def parse_special_abilities(container: Tag) -> list[dict]:
    abilities = []

    for heading in container.find_all("h2", class_="title"):
        full_title = heading.get_text(" ", strip=True)
        match = ABILITY_TITLE_RE.match(full_title)
        if not match:
            continue

        name, ability_type, level = match.groups()
        description_html = collect_until_next_heading(heading)

        abilities.append(
            {
                "name": name,
                "full_title": full_title,
                "ability_type": ability_type,
                "level": int(level),
                "description": description_html,
            }
        )

    return abilities


def parse_detail(entry: dict) -> dict:
    soup = get_soup(entry["url"])
    content = get_main_content(soup)
    container = find_style_container(content, entry["name"])

    source_b = container.find(lambda tag: tag.name == "b" and tag.get_text(strip=True) == "Source")
    if source_b is None:
        raise ValueError(f"Could not find Source block for {entry['name']}")

    source_a = source_b.find_next("a", href=True)
    if source_a is None:
        raise ValueError(f"Could not find Source link for {entry['name']}")

    first_ability = container.find("h2", class_="title")
    description_parts: list[str] = []
    for sibling in source_a.next_siblings:
        if sibling == first_ability:
            break
        description_parts.append(str(sibling))

    description_html = clean_html_fragment("".join(description_parts))

    return {
        "name": entry["name"],
        "slug": to_slug(entry["name"]),
        "source": source_a.get_text(" ", strip=True),
        "source_url": entry["url"],
        "book_url": urljoin(BASE_URL, source_a["href"]),
        "description": description_html,
        "special_abilities": parse_special_abilities(container),
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Fetching listing page: {LIST_URL}")
    listing_soup = get_soup(LIST_URL)
    entries = collect_links_from_listing(listing_soup)
    print(f"Found {len(entries)} fighting styles")

    results = []
    failures = []

    for index, entry in enumerate(entries, 1):
        print(f"[{index}/{len(entries)}] {entry['name']}", end="  ", flush=True)
        try:
            detail = parse_detail(entry)
            if not detail["special_abilities"]:
                raise ValueError("No special abilities parsed")
            results.append(detail)
            print(f"OK ({len(detail['special_abilities'])} abilities)")
        except Exception as exc:
            failures.append({"name": entry["name"], "url": entry["url"], "error": str(exc)})
            print(f"ERROR: {exc}")

        time.sleep(DELAY)

    results.sort(key=lambda item: item["name"].lower())

    with open(OUT_FILE, "w", encoding="utf-8") as file:
        json.dump(results, file, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(results)} fighting styles to {OUT_FILE}")
    if failures:
        print(f"Skipped {len(failures)} failed styles")
        for failure in failures:
            print(f"  - {failure['name']}: {failure['error']}")


if __name__ == "__main__":
    main()
