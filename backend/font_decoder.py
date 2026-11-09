"""Recover simple missing Unicode symbols from embedded PDF font glyphs.

Current scope: thin horizontal rectangular glyphs (minus signs) represented
by unmapped control characters in CFF fonts. Other glyphs are left untouched.

Requires: PyMuPDF and fonttools.

Usage:
    decoder = FontDecoder(pdf_document)
    page_maps = decoder.page_mappings(page)
    corrected = decoder.correct_span(span, page_maps)
"""

from io import BytesIO
import re

from fontTools.cffLib import CFFFontSet
from fontTools.pens.recordingPen import RecordingPen


_SUBSET_PREFIX = re.compile(r"^[A-Z]{6}\+")
_DIFFERENCES = re.compile(r"/Differences\s*\[([^\]]*)\]", re.S)
_TOKENS = re.compile(r"/[^\s/\[\]<>]+|\d+")


def _normal_font_name(name):
    return _SUBSET_PREFIX.sub("", name or "")


def _font_encoding(pdf, font_xref):
    """Return PDF character-code -> glyph-name for a font's Differences array."""
    kind, value = pdf.xref_get_key(font_xref, "Encoding")
    if kind == "xref":
        text = pdf.xref_object(int(value.split()[0]), compressed=False)
    elif kind == "dict":
        text = value
    else:
        return {}

    match = _DIFFERENCES.search(text)
    if not match:
        return {}

    result = {}
    code = None
    for token in _TOKENS.findall(match.group(1)):
        if token.isdigit():
            code = int(token)
        elif token.startswith("/") and code is not None:
            result[code] = token[1:]
            code += 1
    return result


def _is_minus_outline(operations):
    """Recognize a single axis-aligned, thin horizontal filled rectangle."""
    if len(operations) != 5:
        return False
    if [operation for operation, _ in operations] != [
        "moveTo", "lineTo", "lineTo", "lineTo", "closePath"
    ]:
        return False

    points = [args[0] for _, args in operations[:4]]
    xs = sorted(set(x for x, _ in points))
    ys = sorted(set(y for _, y in points))
    if len(xs) != 2 or len(ys) != 2:
        return False
    if set(points) != {(x, y) for x in xs for y in ys}:
        return False

    width = xs[1] - xs[0]
    height = ys[1] - ys[0]
    # Avoid tiny dots / blocks and tall rectangles; only a horizontal stroke.
    return width >= 150 and 0 < height <= 0.16 * width


def _cff_minus_names(font_bytes):
    """Return glyph names with unambiguous horizontal-bar outlines."""
    cff = CFFFontSet()
    cff.decompile(BytesIO(font_bytes), None)
    names = set()
    for font_name in cff.fontNames:
        font = cff[font_name]
        for glyph_name in font.CharStrings.keys():
            try:
                pen = RecordingPen()
                font.CharStrings[glyph_name].draw(pen)
                if _is_minus_outline(pen.value):
                    names.add(glyph_name)
            except (ValueError, KeyError, TypeError):
                continue
    return names


class FontDecoder:
    """Build replacement mappings once per PDF font and apply to text spans."""

    def __init__(self, pdf):
        self.pdf = pdf
        self._cache = {}

    def _font_mapping(self, font_xref):
        if font_xref in self._cache:
            return self._cache[font_xref]

        mapping = {}
        encoding = _font_encoding(self.pdf, font_xref)
        if encoding:
            try:
                _, extension, _, font_data = self.pdf.extract_font(font_xref)
                if extension == "cff" and font_data:
                    minus_names = _cff_minus_names(font_data)
                    for code, name in encoding.items():
                        # PyMuPDF reports unmapped codes as controls in this PDF.
                        # Do not override valid, printable extracted Unicode.
                        if 0 <= code < 32 and name in minus_names:
                            mapping[chr(code)] = "−"
            except (ValueError, KeyError, TypeError, OSError):
                pass

        self._cache[font_xref] = mapping
        return mapping

    def page_mappings(self, page):
        """Map a page's span font names to their recoverable characters."""
        result = {}
        for entry in page.get_fonts(full=True):
            xref, _, _, basefont = entry[:4]
            if not xref:
                continue
            replacements = self._font_mapping(xref)
            if replacements:
                font_name = _normal_font_name(basefont)
                # Conflicting same-named fonts on one page are not safe to fix.
                if font_name in result and result[font_name] != replacements:
                    result[font_name] = {}
                else:
                    result[font_name] = replacements
        return result

    @staticmethod
    def correct_span(span, page_mappings):
        """Return corrected text for a PyMuPDF text-dictionary span."""
        text = span["text"]
        mapping = page_mappings.get(_normal_font_name(span.get("font")))
        if not mapping:
            return text
        return "".join(mapping.get(character, character) for character in text)
