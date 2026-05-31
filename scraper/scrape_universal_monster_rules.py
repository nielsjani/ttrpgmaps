"""
Scrape all Universal Monster Rules from aonsrd.com
Saves the result as a single JSON file:
  src/assets/data/starfinder/universal-monster-rules.json

Run from the repo root:
  python scraper/scrape_universal_monster_rules.py
"""

import requests
from bs4 import BeautifulSoup, NavigableString, Tag
import json
import os
import re
import time

BASE_URL = "https://www.aonsrd.com/"
LIST_URL = "https://www.aonsrd.com/UniversalMonsterRules.aspx?ItemName=All"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "src", "assets", "data", "starfinder")
OUT_FILE = os.path.join(OUT_DIR, "universal-monster-rules.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; StarfinderScraper/1.0)"
}
DELAY = 0.35


def get_soup(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def element_to_text(el) -> str:
    """Recursively convert an element to plain text, preserving some structure."""
    if isinstance(el, NavigableString):
        return str(el)
    parts = []
    for child in el.children:
        parts.append(element_to_text(child))
    return "".join(parts)


def parse_rules_from_page(soup: BeautifulSoup) -> list[dict]:
    """
    The page lists all rules in a single page when ?ItemName=All.
    Each rule entry is typically structured with a header (h2/h3 or bold)
    followed by description paragraphs. We try multiple strategies.
    """
    rules = []

    # Strategy: find the main content div
    main = (
        soup.find("div", id="main")
        or soup.find("div", class_="main")
        or soup.find("div", id="ctl00_MainContent_DetailedOutput")
        or soup.find("body")
    )

    # Try to find all rule blocks: each block typically starts with a span or div
    # containing the rule name (often bold/h2/h3), followed by description text.
    # On aonsrd.com the content is usually in a flat sequence of tags inside the main div.

    full_text = main.get_text(separator="\n", strip=True)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text)

    # -----------------------------------------------------------------------
    # Approach 1: look for <h2> or <h3> tags as rule name markers
    # -----------------------------------------------------------------------
    headers_found = main.find_all(["h2", "h3"])

    if headers_found:
        print(f"  Found {len(headers_found)} h2/h3 headers — using header strategy")
        for header in headers_found:
            name = header.get_text(strip=True)
            if not name:
                continue

            # Collect sibling content until the next header of same/higher level
            description_parts = []
            source = ""
            tag_level = int(header.name[1])

            for sibling in header.find_next_siblings():
                sib_name = sibling.name if hasattr(sibling, 'name') else None
                # Stop at next header of same or higher level
                if sib_name in ["h1", "h2", "h3", "h4"] and int(sib_name[1]) <= tag_level:
                    break
                text = sibling.get_text(separator=" ", strip=True) if hasattr(sibling, 'get_text') else str(sibling).strip()
                if text:
                    # Check if it's a source line
                    if text.startswith("Source"):
                        source = text
                    else:
                        description_parts.append(text)

            description = "\n\n".join(description_parts).strip()
            rule = {"name": name, "description": description}
            if source:
                rule["source"] = source
            rules.append(rule)

        if rules:
            return rules

    # -----------------------------------------------------------------------
    # Approach 2: look for bold/span patterns that act as titles
    # Each rule on this site often uses a <b> tag or a span with class for the title
    # -----------------------------------------------------------------------
    print("  Falling back to bold-title strategy")

    # Collect all direct children and look for bold titles
    children = list(main.children)
    i = 0
    while i < len(children):
        child = children[i]
        if not hasattr(child, 'get_text'):
            i += 1
            continue

        # Check if this element contains a bold title at the start
        bold = child.find("b") if hasattr(child, 'find') else None
        if bold and bold == child.find("b"):
            possible_name = bold.get_text(strip=True)
            # Filter out noise: names should be title-case-ish and not too long
            if possible_name and len(possible_name) < 80 and not possible_name.startswith("Source"):
                # Gather description from remaining content in this element + following elements
                rest_in_el = bold.find_next_siblings()
                desc_from_el = " ".join(s.get_text(strip=True) for s in rest_in_el if hasattr(s, 'get_text'))

                desc_parts = [desc_from_el] if desc_from_el else []
                j = i + 1
                while j < len(children):
                    next_child = children[j]
                    if not hasattr(next_child, 'get_text'):
                        j += 1
                        continue
                    # Stop if next child also has a bold title (= next rule)
                    next_bold = next_child.find("b") if hasattr(next_child, 'find') else None
                    if next_bold and len(next_bold.get_text(strip=True)) < 80:
                        break
                    text = next_child.get_text(separator=" ", strip=True)
                    if text:
                        desc_parts.append(text)
                    j += 1

                description = "\n\n".join(p for p in desc_parts if p).strip()
                rules.append({"name": possible_name, "description": description})
                i = j
                continue
        i += 1

    if rules:
        return rules

    # -----------------------------------------------------------------------
    # Approach 3: parse the raw full_text using regex patterns
    # Rules on this page appear as "Rule Name (Ex/Su/Sp)" or just "Rule Name"
    # followed by indented/paragraph text.
    # -----------------------------------------------------------------------
    print("  Falling back to regex strategy on full text")
    # Split on lines that look like a rule heading: Title Case words, possibly with (Ex)/(Su)/(Sp)
    # Typically each rule name ends with an optional type marker.
    blocks = re.split(
        r'\n(?=[A-Z][A-Za-z ,\'\-]+(?:\s+\((?:Ex|Su|Sp|Ex|Extraordinary|Supernatural|Spell-Like)\))?\s*\n)',
        full_text
    )

    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = block.split("\n", 1)
        name = lines[0].strip()
        desc = lines[1].strip() if len(lines) > 1 else ""
        if name and len(name) < 100:
            rules.append({"name": name, "description": desc})

    return rules


def parse_rule_detail_page(url: str, name: str) -> dict:
    """Parse a single rule's detail page for richer data."""
    soup = get_soup(url)
    main = (
        soup.find("div", id="ctl00_MainContent_DetailedOutput")
        or soup.find("div", id="main")
        or soup.find("body")
    )

    text = main.get_text(separator="\n", strip=True)
    text = re.sub(r'\n{3,}', '\n\n', text)

    rule = {"name": name, "source_url": url}

    # Source
    src_m = re.search(r"Source\s+(.+)", text)
    if src_m:
        rule["source"] = src_m.group(1).strip()

    # Type (Ex/Su/Sp)
    type_m = re.search(r'\((' + name.replace('(', r'\(').replace(')', r'\)') + r'[^)]*)\)', text)
    # Simpler: look for (Ex), (Su), (Sp) near the name
    type_m2 = re.search(r'\((Ex|Su|Sp|Extraordinary|Supernatural|Spell-Like Ability)\)', text)
    if type_m2:
        rule["ability_type"] = type_m2.group(1)

    # Full description: everything after the name line / source line
    desc_m = re.search(
        r'(?:Source[^\n]+\n|' + re.escape(name) + r'[^\n]*\n)(.*)',
        text, re.DOTALL
    )
    if desc_m:
        rule["description"] = desc_m.group(1).strip()
    else:
        rule["description"] = text

    rule["full_text"] = text
    return rule


def collect_rule_links(soup: BeautifulSoup) -> list[dict]:
    """
    Find all individual rule links from the listing page.
    Each rule should be linked with href containing 'UniversalMonsterRules'.
    """
    links = []
    seen = set()

    main = (
        soup.find("div", id="ctl00_MainContent_DetailedOutput")
        or soup.find("div", id="main")
        or soup.find("body")
    )

    for a in main.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(strip=True)
        if not text or text in seen:
            continue
        # Links to individual rules
        if "UniversalMonsterRules" in href and "ItemName=" in href and "All" not in href:
            full_url = BASE_URL + href.lstrip("/") if not href.startswith("http") else href
            links.append({"name": text, "url": full_url})
            seen.add(text)

    return links


def parse_all_rules_inline(soup: BeautifulSoup) -> list[dict]:
    """
    Parse all rules directly from the 'All' page which renders everything inline.
    The page structure on aonsrd typically uses span.title or similar for rule names.
    """
    rules = []

    main = (
        soup.find("div", id="ctl00_MainContent_DetailedOutput")
        or soup.find("div", id="main")
        or soup.find("body")
    )

    if not main:
        return rules

    # Dump all the HTML to see the structure
    # Try finding all bold tags that serve as titles
    # On aonsrd.com, rule names in the "All" view are usually wrapped in <b> inside <p> or <span>
    # followed by description text.

    # Collect all text nodes and tags in order, then group by bold title
    current_rule = None
    current_desc_parts = []

    def flush_rule():
        nonlocal current_rule, current_desc_parts
        if current_rule:
            current_rule["description"] = "\n\n".join(
                p.strip() for p in current_desc_parts if p.strip()
            )
            rules.append(current_rule)
        current_rule = None
        current_desc_parts = []

    for el in main.descendants:
        if not isinstance(el, Tag):
            continue

        tag = el.name.lower() if el.name else ""

        # Potential rule name tags: b, strong, h2, h3, h4
        if tag in ("b", "strong", "h2", "h3", "h4"):
            text = el.get_text(strip=True)
            if not text or len(text) > 120:
                continue

            # Skip "Source" lines and navigation text
            if text.lower().startswith("source") or text.lower() in (
                "description", "special abilities", "ecology", "statistics",
                "offense", "defense", "base statistics"
            ):
                continue

            # Check parent — don't double-count if parent is also bold
            parent = el.parent
            if parent and parent.name in ("b", "strong"):
                continue

            # Looks like a new rule name
            flush_rule()
            # Extract type if present: "Rule Name (Ex)"
            type_match = re.search(r'\(([^)]+)\)\s*$', text)
            ability_type = None
            clean_name = text
            if type_match:
                ability_type = type_match.group(1)
                clean_name = text[:type_match.start()].strip()

            current_rule = {"name": clean_name}
            if ability_type:
                current_rule["ability_type"] = ability_type
            current_desc_parts = []

        elif tag in ("p", "div", "span") and current_rule:
            # Only top-level paragraphs / blocks, not nested inside a title
            # Check it's not itself a title wrapper
            inner_b = el.find(["b", "strong"])
            if inner_b and inner_b.get_text(strip=True) == el.get_text(strip=True):
                continue  # This element is just a wrapper for a bold title

            text = el.get_text(separator=" ", strip=True)
            if text and text not in current_desc_parts:
                current_desc_parts.append(text)

    flush_rule()
    return rules


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Fetching: {LIST_URL}")
    soup = get_soup(LIST_URL)

    # First, try to find individual rule links
    links = collect_rule_links(soup)
    print(f"Found {len(links)} individual rule links")

    rules = []

    if links:
        # Scrape each rule's detail page
        total = len(links)
        for i, entry in enumerate(links, 1):
            name = entry["name"]
            url = entry["url"]
            print(f"  [{i}/{total}] {name}", end="  ", flush=True)
            try:
                detail = parse_rule_detail_page(url, name)
                rules.append(detail)
                print("OK")
            except Exception as exc:
                print(f"ERROR: {exc}")
                rules.append({"name": name, "source_url": url, "error": str(exc)})
            time.sleep(DELAY)
    else:
        # All content is inline on the page — parse it directly
        print("No individual links found; parsing inline content...")
        rules = parse_rules_from_page(soup)
        print(f"  Extracted {len(rules)} rules from inline content")

    # Sort alphabetically
    rules.sort(key=lambda r: r.get("name", "").lower())

    print(f"\nWriting {len(rules)} rules to: {OUT_FILE}")
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

    print("Done!")


if __name__ == "__main__":
    main()

