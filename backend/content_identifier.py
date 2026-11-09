"""Version 0.1: identify body paragraphs using section-local PDF typography.

Input: (params, pdf_data, sections)
Output: ordered heading and body_text records using the shared record format.
"""

from collections import Counter
import re
from statistics import median


def _style(item):
    """Return the dominant (font, size) and bold fraction of a PDF text line."""
    counts = Counter()
    total = bold = 0
    for span in item["spans"]:
        length = len(span["text"].strip())
        if not length:
            continue
        counts[(span["font"], round(span["size"], 1))] += length
        total += length
        if "bold" in span["font"].lower():
            bold += length
    return (counts.most_common(1)[0][0] if counts else None,
            bold / total if total else 0.0)


def _body_style(items):
    """Infer the likely prose style from relatively long, nonbold lines."""
    counts = Counter()
    for item in items:
        if len(item["text"].strip()) < 35:
            continue
        style, bold = _style(item)
        if style and bold < 0.5:
            counts[style] += len(item["text"].strip())
    return counts.most_common(1)[0][0] if counts else None


def _prose_blocks(items, params):
    """Return text items in blocks with enough evidence of continuous prose."""
    blocks = {}
    for item in items:
        blocks.setdefault(item.get("block_id", item["id"]), []).append(item)

    selected = []
    min_lines = params.get("prose_min_lines", 3)
    min_avg_length = params.get("prose_min_avg_line_length", 40)
    for block_items in blocks.values():
        if (len(block_items) >= min_lines
                and sum(len(item["text"].strip()) for item in block_items)
                / len(block_items) >= min_avg_length):
            selected.extend(block_items)
    return selected


def _record(items, level):
    return {
        "type": "body_text",
        "content": _join_text(items),
        "level": level,
        "pages": list(dict.fromkeys(item["page"] for item in items)),
        "item_ids": [item["id"] for item in items],
    }


def _join_text(items):
    """Join wrapped PDF lines, including ordinary line-end hyphenation."""
    text = ""
    for item in items:
        part = item["text"].strip()
        if not part:
            continue
        if text.endswith("-") and part[0].islower():
            text = text[:-1] + part
        else:
            text += (" " if text else "") + part
    return text


def _same_paragraph(previous, current, typical_height, params):
    """Use basic alignment and spacing to join adjacent prose lines."""
    if previous["page"] != current["page"]:
        if not params.get("merge_paragraphs", True):
            return False
        # Only join across a page break when the previous sentence is unfinished.
        if previous["text"].rstrip().endswith((".", "!", "?", ":")):
            return False
        return True

    ax0, ay0, ax1, ay1 = previous["bbox"]
    bx0, by0, bx1, by1 = current["bbox"]
    gap = by0 - ay1
    if gap < -typical_height * 0.45 or gap > typical_height * 0.9:
        return False
    # A new paragraph commonly indents its first line.
    # First-line indentation is a strong paragraph boundary in novels.
    # A 15pt indent can be smaller than 1.2x the font line height.
    if bx0 - ax0 > typical_height * params.get("paragraph_indent_threshold", 0.6):
        return False
    # A change to a different text column isn't a paragraph continuation.
    if abs(bx0 - ax0) > typical_height * 4:
        return False
    return True


def _omit_empty_sections(records):
    """Keep a heading if it has body text directly or in any descendant.

    A heading's section ends at the next heading of equal or lower level.
    The records stay flat and no body paragraph is duplicated.
    """
    keep = [True] * len(records)
    for i, record in enumerate(records):
        if record["type"] != "heading":
            continue
        level = record["level"]
        has_body = False
        for following in records[i + 1:]:
            if following["type"] == "heading" and following["level"] <= level:
                break
            if following["type"] == "body_text":
                has_body = True
                break
        keep[i] = has_body
    return [record for record, included in zip(records, keep) if included]



def _equation_line(item, page_width, body_size, params):
    """Conservative native-PDF check for standalone, displayed mathematics.

    Does not interpret mathematics inside otherwise ordinary prose lines.
    """
    text = item["text"].strip()
    if not text:
        return False

    # Most displayed formula lines contain operators, special math symbols,
    # or an equation number; don't reject prose that merely mentions math.
    math_symbols = sum(ch in "=+−×÷∑∫√≤≥≠≈∞∏<>" for ch in text)
    math_fonts = sum(len(s["text"]) for s in item["spans"]
                     if any(key in s["font"].lower()
                            for key in ("symbol", "math", "cmex", "cmsy")))
    word_count = len(text.split())
    letters = sum(ch.isalpha() for ch in text)
    has_number = bool(re.search(r"\(\d+\.\d+\)\s*$", text))
    # PDF math can be split into separate items: "logB1", "logBX", "0".
    # Those pieces often contain no operator or mathematical font at all.
    log_fragment = bool(re.fullmatch(r"(?i:log|ln|lg)[A-Za-z0-9]*", text))
    numeric_fragment = bool(re.fullmatch(r"[0-9]+", text))
    formula_like = math_symbols >= 1 or math_fonts >= 2 or has_number or log_fragment or numeric_fragment
    if not formula_like:
        return False

    x0, _, x1, _ = item["bbox"]
    mid = (x0 + x1) / 2
    centered = abs(mid - page_width / 2) < page_width * 0.24
    compact = word_count <= params.get("equation_max_words", 12)
    sparse = letters / max(1, len(text)) < 0.65
    # A short centered formula, or a short fragment dominated by math syntax.
    return (compact and centered and (math_symbols >= 1 or has_number or math_fonts >= 2
                                      or log_fragment or numeric_fragment)
            or compact and sparse and math_symbols >= 2)


def _ends_sentence(text):
    """Check end punctuation, not equation numbers or arbitrary digits."""
    return bool(re.search(r'[.!?][\"\'\u201d\u2019)]*\s*$', text))


def _remove_interrupted_sentence(text):
    """Remove the trailing unfinished sentence before an omitted equation.

    Earlier complete sentences in the same paragraph remain available to TTS.
    """
    if _ends_sentence(text):
        return text
    # Sentence punctuation followed by whitespace; ignore periods in decimals.
    boundaries = list(re.finditer(r'(?<!\d)[.!?](?!\d)[\"\'\u201d\u2019)]*(?=\s|$)', text))
    if not boundaries:
        return ""
    return text[:boundaries[-1].end()].strip()


def _paragraph_record(paragraph, level, interrupted=False):
    if not paragraph:
        return None
    record = _record(paragraph, level)
    if interrupted:
        record["content"] = _remove_interrupted_sentence(record["content"])
    return record if record["content"].strip() else None


def _layout_groups(region, typical_height, params):
    """Construct potential paragraphs using *all* visible text lines first.

    Deliberately do not discard non-body-font lines before grouping: those
    lines are useful boundaries around mathematical displays and tables.
    """
    groups = []
    current = []
    for item in region:
        if current and not _same_paragraph(current[-1], item, typical_height, params):
            groups.append(current)
            current = []
        current.append(item)
    if current:
        groups.append(current)
    return groups


def _looks_like_prose(group, body_style, params):
    """Evaluate a spatial paragraph, rather than accepting individual lines.

    A full one-line sentence may be prose, but a few short equation fragments
    are not paragraphs merely because they use the document's body font.
    """
    if not group:
        return False
    matches = []
    for item in group:
        style, bold = _style(item)
        matches.append(style is not None and style[0] == body_style[0]
                       and abs(style[1] - body_style[1]) <= 0.2
                       and bold < 0.6)
    if sum(matches) / len(matches) < 0.80:
        return False

    lines = [item["text"].strip() for item in group]
    text = _join_text(group)
    if len(group) == 1:
        # Only trust a lone line when it contains a recognizable full sentence.
        return len(text) >= params.get("prose_single_line_min_chars", 65) and _ends_sentence(text)

    # Multi-line paragraphs normally have sustained line lengths. Short
    # isolated mathematical labels and aligned definition fragments do not.
    if median(len(t) for t in lines) < params.get("prose_group_min_median_chars", 30):
        return False

    # A prose paragraph's left edge should be largely consistent, allowing
    # a normal first-line indent. Formula layouts often jump across columns.
    lefts = [item["bbox"][0] for item in group]
    height = median(max(1, item["bbox"][3] - item["bbox"][1]) for item in group)
    body_left = median(lefts[1:])
    if any(abs(x - body_left) > height * 1.8 for x in lefts[1:]):
        return False
    if abs(lefts[0] - body_left) > height * 3:
        return False
    return True


def identify_content(params, pdf_data, sections):
    """Identify geometric prose paragraphs within heading-to-heading ranges."""
    method = params.get("content_method", "statistical")
    if method != "statistical":
        raise ValueError(f"Unknown content_method: {method}")

    items = [item for page in pdf_data["pages"] for item in page["items"]]
    indices = {item["id"]: i for i, item in enumerate(items)}
    heading_ids = {item_id for section in sections for item_id in section["item_ids"]}
    headings_by_start = {}
    for section in sections:
        positions = [indices[item_id] for item_id in section["item_ids"] if item_id in indices]
        if positions:
            headings_by_start[min(positions)] = section

    starts = sorted(headings_by_start)
    use_prose_blocks = params.get("prose_block_style", False)
    nonheading_items = [item for item in items if item["id"] not in heading_ids]
    global_style = _body_style(_prose_blocks(nonheading_items, params)
                               if use_prose_blocks else nonheading_items)
    output = []
    boundaries = ([0] if params.get("include_pre_section_content", False) else []) + starts + [len(items)]
    boundaries = sorted(set(boundaries))
    for part, start in enumerate(boundaries[:-1]):
        stop = boundaries[part + 1]
        heading = headings_by_start.get(start)
        if heading:
            output.append(heading)
        level = heading["level"] if heading else 0
        region = [item for item in items[start:stop] if item["id"] not in heading_ids]
        prose_items = _prose_blocks(region, params) if use_prose_blocks else region
        local_style = _body_style(prose_items)
        if use_prose_blocks and local_style is None:
            continue
        long_text = sum(len(item["text"]) for item in region if len(item["text"].strip()) >= 35)
        body_style = local_style if long_text >= 200 else (global_style or local_style)
        if body_style is None:
            continue

        heights = [item["bbox"][3] - item["bbox"][1] for item in prose_items]
        typical_height = median(heights) if heights else body_style[1]
        groups = _layout_groups(region, typical_height, params)
        sentence_filter = params.get("filter_equation_sentences", False)
        for group in groups:
            if not _looks_like_prose(group, body_style, params):
                continue
            record = _record(group, level)
            if sentence_filter:
                # Discard the trailing colon-led formula introduction, or any
                # unfinished text after the last complete sentence. Never
                # promote an isolated equation fragment to a body paragraph.
                record["content"] = _remove_interrupted_sentence(record["content"])
            if record["content"].strip():
                output.append(record)

    if params.get("omit_empty_sections", False):
        output = _omit_empty_sections(output)
    return output
