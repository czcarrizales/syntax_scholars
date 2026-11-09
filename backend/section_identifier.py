"""Version 0.1 section identification using PDF outlines or simple heading rules.

Output: flat, ordered heading records with TOC hierarchy levels when available.
"""

import re
from statistics import median

import pymupdf

from collections import Counter
from difflib import SequenceMatcher


def normalize(text):
    return " ".join(text.split()).casefold()


def heading_record(items, title=None, level=0):
    return {
        "type": "heading",
        "content": title if title is not None else " ".join(item["text"] for item in items),
        "level": level,
        "pages": list(dict.fromkeys(item["page"] for item in items)),
        "item_ids": [item["id"] for item in items],
    }


def all_items(pdf_data):
    return [item for page in pdf_data["pages"] for item in page["items"]]


def compact(text):
    """Normalize case and remove spaces/decorative punctuation for matching."""
    return "".join(char for char in text.casefold() if char.isalnum())


def page_stream(items):
    """Build searchable text while retaining each character's originating item."""
    text = []
    owners = []
    for item in items:
        for char in compact(item["text"]):
            text.append(char)
            owners.append(item)
    return "".join(text), owners


def window_items(owners, start, end):
    """Return the distinct PDF items touched by a character window."""
    result = []
    seen = set()
    for item in owners[start:end]:
        if item["id"] not in seen:
            result.append(item)
            seen.add(item["id"])
    return result


def _roman_number(text):
    """Parse a canonical Roman chapter number, rejecting ordinary prose."""
    if not re.fullmatch(r"[IVXLCDM]+", text.upper()):
        return None
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    letters = text.upper()
    total = sum((-values[c] if i + 1 < len(letters) and values[c] < values[letters[i + 1]] else values[c]) for i, c in enumerate(letters))
    if not 0 < total <= 3999:
        return None
    def encode(n):
        parts = ((1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"))
        result = ""
        for value, chars in parts:
            count, n = divmod(n, value)
            result += chars * count
        return result
    return total if encode(total) == letters else None


def _chapter_number(title):
    """Extract a chapter number from titles like 'Chapter IV' or 'Chapter 4'."""
    match = re.fullmatch(r"chapter\s+([IVXLCDM]+|\d+)", title.strip(), re.I)
    if not match:
        return None
    token = match.group(1)
    return int(token) if token.isdigit() else _roman_number(token)


def _heading_candidates(pdf_data):
    """Find plausible isolated title lines independent of TOC availability."""
    results = []
    for page_index, page in enumerate(pdf_data["pages"]):
        items = page["items"]
        if not items:
            continue
        # The most common character-weighted font size is a local prose baseline.
        sizes = Counter()
        for item in items:
            for span in item.get("spans", []):
                if span.get("text", "").strip():
                    sizes[round(float(span["size"]), 1)] += len(span["text"].strip())
        body_size = sizes.most_common(1)[0][0] if sizes else 12.0
        # Avoid a dependency on a particular page dimension: center relative to
        # the page's text extent, which is stable on chapter and regular pages.
        bounds = [item["bbox"] for item in items if item.get("bbox")]
        left = min(b[0] for b in bounds)
        right = max(b[2] for b in bounds)
        center = (left + right) / 2
        width = max(1.0, right - left)
        for index, item in enumerate(items):
            text = " ".join(item["text"].split())
            spans = [x for x in item.get("spans", []) if x.get("text", "").strip()]
            if not text or not spans or len(text) > 100 or len(text.split()) > 12:
                continue
            size = max(float(x["size"]) for x in spans)
            bold = any("bold" in x["font"].lower() for x in spans)
            x0, y0, x1, y1 = item["bbox"]
            centered = abs((x0 + x1) / 2 - center) <= max(12.0, width * 0.09)
            # Short, visually isolated, different-style lines only.  This
            # avoids treating a Roman 'I' in ordinary sentences as a heading.
            style_distinct = size >= body_size * 1.12 or (bold and size >= body_size * 1.03)
            if not style_distinct:
                continue
            prior = items[index - 1] if index else None
            following = items[index + 1] if index + 1 < len(items) else None
            upper_gap = y0 - prior["bbox"][3] if prior else None
            lower_gap = following["bbox"][1] - y1 if following else None
            isolated = (upper_gap is None or upper_gap > size * 0.6 or y0 < min(b[1] for b in bounds) + size * 1.5) and (lower_gap is None or lower_gap > size * 0.6)
            # Headings on title pages can be vertically separated but not centered.
            if not isolated:
                continue
            font = max(spans, key=lambda x: len(x["text"]))["font"].lower()
            family = (font, round(size, 1), bool(centered), round(y0 / max(size, 1), 0))
            results.append({"items": [item], "text": text, "page": page_index + 1,
                            "centered": centered, "size": size, "bold": bold,
                            "family": family, "number": _roman_number(text) if re.fullmatch(r"[IVXLCDM]+", text, re.I) else (int(text) if text.isdigit() else None)})
    # Patterns recur across the document, rather than being independently
    # inferred for each page.
    counts = Counter(c["family"] for c in results)
    for candidate in results:
        candidate["family_count"] = counts[candidate["family"]]
    return results


def _resolve_structural_toc(entries, pdf_data, used_ids, params):
    """Match unresolved bookmarks against statistical headings and sequences.

    A weak title match is never enough by itself: candidates require strong
    style / isolation evidence and either a title alias or repeated structure.
    """
    candidates = _heading_candidates(pdf_data)
    tolerance = max(0, int(params.get("toc_structural_page_tolerance", 1)))
    for entry in entries:
        if entry["match"]:
            continue
        number = _chapter_number(entry["title"])
        options = []
        for c in candidates:
            if any(item["id"] in used_ids for item in c["items"]):
                continue
            distance = abs(c["page"] - entry["page"])
            if distance > tolerance:
                continue
            name_matches = compact(c["text"]) == entry["target"]
            chapter_alias = number is not None and c["number"] == number
            # Do not permit a candidate like 'I' to resolve an arbitrary
            # bookmark; chapter numbering must match exactly.
            if not name_matches and not chapter_alias:
                continue
            # A chapter-number alias is accepted with either recurring
            # formatting or an exact bookmark page and centered heading.
            pattern = c["family_count"] >= 2
            if chapter_alias and not (pattern or (distance == 0 and c["centered"])):
                continue
            if not chapter_alias and not (c["centered"] or pattern):
                continue
            score = (3 if name_matches else 2) + (2 if pattern else 0) + (1 if c["centered"] else 0) - distance
            options.append((score, -distance, c))
        if not options:
            continue
        best = max(options, key=lambda x: x[:2])[2]
        entry.update(match=best["items"], position=(best["page"] - 1, 0), score=1.0,
                     display_title=entry["title"] if number is not None else best["text"])
        used_ids.update(item["id"] for item in best["items"])
        print(f"Structural TOC match (page {best['page']}): {entry['title']} -> {best['text']}")


def from_toc(pdf_data, params):
    """Resolve TOC entries: exact matches, then bounded fuzzy cross-correlation."""
    pages = pdf_data["pages"]
    streams = [page_stream(page["items"]) for page in pages]
    max_levels = params.get("toc_levels", 0)
    threshold = params.get("toc_match_threshold", 0.75)

    entries = [
        {"title": title, "level": level, "page": page, "target": compact(title), "match": None,
         "position": None, "score": 0.0}
        for level, title, page, *_ in pdf_data.get("toc", [])
        if (not max_levels or level <= max_levels) and 1 <= page <= len(pages)
    ]
    used_ids = set()

    # Pass 1: exact normalized matches on the bookmark's page.
    # Character windows may cross item boundaries (e.g., CHAPTER / 1 / Title).
    for entry in entries:
        if not entry["target"]:
            continue
        text, owners = streams[entry["page"] - 1]
        start = 0
        while True:
            start = text.find(entry["target"], start)
            if start == -1:
                break
            group = window_items(owners, start, start + len(entry["target"]))
            if not any(item["id"] in used_ids for item in group):
                entry.update(match=group, position=(entry["page"] - 1, start), score=1.0)
                used_ids.update(item["id"] for item in group)
                break
            start += 1

    # Pass 2: unresolved entries search between their nearest exact-match anchors.
    # Use the TOC page as the preferred location, falling back to the anchor range.
    for index, entry in enumerate(entries):
        if entry["match"] or not entry["target"]:
            continue

        previous = next((e for e in reversed(entries[:index]) if e["position"]), None)
        following = next((e for e in entries[index + 1:] if e["position"]), None)
        lower = previous["position"] if previous else (0, 0)
        upper = following["position"] if following else (len(pages) - 1, len(streams[-1][0]))

        # A bookmark's destination page is authoritative in Version 0.1.
        # Searching unrelated pages can falsely match a title in the printed TOC.
        preferred = entry["page"] - 1
        page_tolerance = int(params.get("toc_page_tolerance", 0))
        if page_tolerance < 0:
            raise ValueError("toc_page_tolerance must be nonnegative")
        page_indices = [
            p for p in range(max(lower[0], preferred - page_tolerance),
                             min(upper[0], preferred + page_tolerance) + 1)
        ]
        page_indices.sort(key=lambda p: (abs(p - preferred), p))

        best = None  # (score, distance_from_toc_page, page_index, start, items)
        n = len(entry["target"])
        for p in page_indices:
            text, owners = streams[p]
            begin = lower[1] if p == lower[0] else 0
            end = upper[1] if p == upper[0] else len(text)
            if end - begin < n:
                continue
            for start in range(begin, end - n + 1):
                group = window_items(owners, start, start + n)
                if any(item["id"] in used_ids for item in group):
                    continue
                score = SequenceMatcher(None, entry["target"], text[start:start + n], autojunk=False).ratio()
                candidate = (score, -abs(p - preferred), p, start, group)
                if best is None or candidate[:2] > best[:2]:
                    best = candidate

        if best and best[0] >= threshold:
            score, _, p, start, group = best
            entry.update(match=group, position=(p, start), score=score)
            used_ids.update(item["id"] for item in group)
            print(f"Fuzzy TOC match ({score:.0%}, page {p + 1}): {entry['title']}")
        else:
            entry["score"] = best[0] if best else 0.0

    # Combine statistical candidate evidence, recurring heading styles and
    # bookmark sequence after the strict text-based matching passes.
    if params.get("toc_structural_matching", True):
        _resolve_structural_toc(entries, pdf_data, used_ids, params)

    for entry in entries:
        if not entry["match"]:
            print(f"Unresolved TOC entry (page {entry['page']}, best {entry['score']:.0%}): {entry['title']}")

    # Retain original bookmark hierarchy levels. Output remains a flat list in
    # actual PDF item order, including when a fuzzy match moved a heading.
    item_positions = {item["id"]: index for index, item in enumerate(all_items(pdf_data))}
    resolved = [
        heading_record(entry["match"], title=entry.get("display_title"), level=entry["level"])
        for entry in entries if entry["match"]
    ]
    return sorted(resolved, key=lambda record: item_positions[record["item_ids"][0]])


def from_statistics(pdf_data, params):
    """Basic untrained heading detector for PDFs without embedded TOCs."""
    items = all_items(pdf_data)
    sizes = Counter()
    for item in items:
        for span in item["spans"]:
            if span["text"].strip() and "bold" not in span["font"].lower():
                sizes[round(span["size"], 1)] += len(span["text"].strip())
    body_size = sizes.most_common(1)[0][0] if sizes else 12.0

    results = []
    for item in items:
        text = item["text"].strip()
        spans = [s for s in item["spans"] if s["text"].strip()]
        if not spans or len(text.split()) > 14:
            continue

        length = sum(len(s["text"].strip()) for s in spans)
        bold = sum(len(s["text"].strip()) for s in spans if "bold" in s["font"].lower())
        bold_fraction = bold / max(1, length)
        size = max(s["size"] for s in spans)
        numbered = bool(re.match(r"^(?:chapter\s+\d+|\d+(?:\.\d+)+\.?\s+\S)", text, re.I))

        if (numbered and (bold_fraction >= 0.5 or size > body_size * 1.05)) or (
            bold_fraction >= 0.6 and size > body_size * 1.08
        ):
            results.append(heading_record([item]))

    return results



# A run of separately extracted letters is a spacing candidate, not proof of
# a word: geometry and (when available) the embedded outline decide.
_SPACED_LETTERS = re.compile(r"(?<![A-Za-z0-9])(?:[A-Za-z]\s+){2,}[A-Za-z](?![A-Za-z0-9])")


def _line_characters(page, item):
    """Locate the PDF-native character boxes for an identified heading item."""
    box = pymupdf.Rect(item["bbox"])
    best = None
    best_overlap = 0.0
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            line_box = pymupdf.Rect(line["bbox"])
            overlap = (line_box & box).get_area()
            if overlap <= best_overlap:
                continue
            chars = [ch for span in line["spans"] for ch in span.get("chars", [])]
            if chars:
                best, best_overlap = chars, overlap
    return best or []


def _repair_spaced_item(text, chars, toc_words):
    """Join spaced heading letters if their character positions support it."""
    candidates = list(_SPACED_LETTERS.finditer(text))
    if not candidates or not chars:
        return text

    # Align raw character positions to the extracted line text. A line's
    # rawdict normally has the same characters as its dict text; bail out on
    # mismatches rather than applying an ungrounded correction.
    raw_text = "".join(ch["c"] for ch in chars)
    if raw_text.strip() != text.strip():
        return text
    offset = raw_text.find(text)
    if offset < 0:
        return text

    replacements = []
    for match in candidates:
        positions = [offset + match.start() + i for i, c in enumerate(match.group()) if c.isalpha()]
        letters = "".join(chars[i]["c"] for i in positions)
        if letters.lower() != "".join(c for c in match.group() if c.isalpha()).lower():
            continue

        # PDF word spaces have different geometric sizes across fonts. Compare
        # the letter gaps with the actual glyph height, rather than points.
        gaps = []
        heights = []
        for left, right in zip(positions, positions[1:]):
            a, b = pymupdf.Rect(chars[left]["bbox"]), pymupdf.Rect(chars[right]["bbox"])
            gaps.append(max(0, b.x0 - a.x1))
            heights.append((a.height + b.height) / 2)
        if not gaps or median(heights) <= 0:
            continue
        normalized_gap = median(gaps) / median(heights)
        # Outline titles offer additional evidence that the candidate is one
        # word; do not merge 'A B C' if the outline lists separate tokens.
        title_confirms = letters.casefold() in toc_words if toc_words else False
        if normalized_gap <= 0.40 and (title_confirms or not toc_words):
            replacements.append((match.start(), match.end(), letters))

    for start, end, replacement in reversed(replacements):
        text = text[:start] + replacement + text[end:]
    return text


def _repair_spaced_toc_words(text, toc_words):
    """Use known outline vocabulary to resolve letter-spaced heading words.

    Deliberate tracking can make letters farther apart than a normal space,
    so PDF geometry by itself cannot always decide this case.
    """
    def replace(match):
        joined = "".join(match.group().split())
        return joined if joined.casefold() in toc_words else match.group()

    return _SPACED_LETTERS.sub(replace, text)


def _restore_toc_spacing(text, toc_title):
    """Transfer spaces from a matching TOC title without changing printed case.

    A TOC match must agree on every non-space character (letters, digits,
    punctuation). This also handles '1 . 1' and an isolated final '?'.
    """
    source = "".join(text.split())
    reference = "".join(toc_title.split())
    if source.casefold() != reference.casefold():
        return None

    result = []
    position = 0
    for piece in re.findall(r"\s+|\S+", toc_title):
        if piece.isspace():
            if result and result[-1] != " ":
                result.append(" ")
        else:
            result.append(source[position:position + len(piece)])
            position += len(piece)
    return "".join(result).strip()


def _join_spaced_punctuation(text):
    """Join spaced decimal/section punctuation and trailing punctuation."""
    # Restrict numeric joining to separators used inside section numbers.
    text = re.sub(r"(?<=\d)\s*([.])\s*(?=\d)", r"\1", text)
    # A spaced terminal mark is part of its preceding word, not a new word.
    text = re.sub(r"(?<=[A-Za-z0-9])\s+([?!,:;])(?=\s|$)", r"\1", text)
    return text


def _repair_spaced_words(text, toc_words):
    """Use TOC vocabulary to split continuous letter-spaced runs into words.

    Alphabetic tokens are considered separately from digits and punctuation.
    Without a matching vocabulary segmentation, leave the run unchanged.
    """
    def replace(match):
        letters = re.findall(r"[A-Za-z]", match.group())
        joined = "".join(letters)
        lower = joined.casefold()
        # Prefer a split into known TOC words, with fewer words first.
        solutions = {len(lower): []}
        for i in range(len(lower) - 1, -1, -1):
            choices = []
            for j in range(i + 1, len(lower) + 1):
                if lower[i:j] in toc_words and j in solutions:
                    choices.append([j] + solutions[j])
            if choices:
                solutions[i] = min(choices, key=len)
        if 0 not in solutions:
            return match.group()
        result = []
        start = 0
        for end in solutions[0]:
            result.append(joined[start:end])
            start = end
        return " ".join(result)

    return _SPACED_LETTERS.sub(replace, text)


def normalize_heading_spacing(params, pdf_data, headings):
    """Correct only identified headings without changing their IDs or levels."""
    if not params.get("normalize_heading_spacing", False):
        return headings

    items_by_id = {item["id"]: item for item in all_items(pdf_data)}
    toc_entries = [(title, page) for _, title, page, *_ in pdf_data.get("toc", [])]
    toc_words = {
        word.casefold()
        for title, _ in toc_entries
        for word in re.findall(r"[A-Za-z]+", title)
    }

    suspect = [h for h in headings if _SPACED_LETTERS.search(h["content"]) or re.search(r"\d\s+\.\s+\d", h["content"])]
    if not suspect:
        return headings

    source = pdf_data.get("source")
    with pymupdf.open(source) if source else _null_page_context() as doc:
        for heading in suspect:
            original = heading["content"]
            # Prefer the exact bookmark on this page: it retains real word
            # boundaries even if all letters were deliberately tracked apart.
            same_page = [title for title, page in toc_entries if page in heading["pages"]]
            recovered = next(
                (candidate for title in same_page
                 if (candidate := _restore_toc_spacing(original, title)) is not None),
                None,
            )
            if recovered is not None:
                heading["content"] = recovered
                continue

            parts = []
            for item_id in heading["item_ids"]:
                item = items_by_id[item_id]
                text = item["text"]
                if _SPACED_LETTERS.search(text):
                    text = _repair_spaced_words(text, toc_words)
                    if doc is not None and _SPACED_LETTERS.search(text):
                        chars = _line_characters(doc[item["page"] - 1], item)
                        text = _repair_spaced_item(text, chars, toc_words)
                parts.append(text)
            heading["content"] = _join_spaced_punctuation(" ".join(parts))
    return headings


class _null_page_context:
    """Context manager used when source PDF isn't available."""
    def __enter__(self):
        return None

    def __exit__(self, *_):
        return False


def identify_sections(params, pdf_data):
    """Return flat heading records, in document order.

    section_method='embedded_toc': use the outline when present, else fallback.
    section_method='statistical': ignore the outline.
    """
    method = params.get("section_method", "embedded_toc")
    if method == "embedded_toc":
        sections = from_toc(pdf_data, params) if pdf_data.get("toc") else from_statistics(pdf_data, params)
    elif method == "statistical":
        sections = from_statistics(pdf_data, params)
    else:
        raise ValueError(f"Unknown section_method: {method}")
    return normalize_heading_spacing(params, pdf_data, sections)
