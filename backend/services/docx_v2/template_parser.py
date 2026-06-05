"""DOCX template parser — reads a .docx template and extracts structured blocks.

Preliminary type guessing only.  Final marking is done by the user in the frontend.
"""
from __future__ import annotations
from pathlib import Path
from typing import Any

from docx import Document
from docx.shared import Cm, Pt
from docx.oxml.ns import qn

# Namespace map for inline drawing detection
_DRAWING_NS = {
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}


def parse_template(docx_path: str) -> dict[str, Any]:
    """Parse a DOCX template into page setup + blocks list.

    Returns a dict suitable for saving as a markup.json starter:
        {
            "template_name": "...",
            "page_setup": { ... },
            "blocks": [ {index, type, text?, fixed?, headers?, ...}, ... ]
        }

    All blocks default to fixed=False (user must confirm in frontend).
    """
    path = Path(docx_path)
    doc = Document(str(path))

    page_setup = _extract_page_setup(doc)
    blocks = _extract_blocks(doc)

    return {
        "template_name": path.stem,
        "page_setup": page_setup,
        "blocks": blocks,
    }


def _extract_page_setup(doc: Document) -> dict:
    """Extract page dimensions, margins, and font info from the document."""
    section = doc.sections[0]
    style = doc.styles['Normal']

    font_ascii = 'Calibri'
    font_east_asia = '宋体'
    font_size_pt = 12.0
    line_spacing = 1.5

    if style.font.name:
        font_ascii = style.font.name
    if style.font.size:
        font_size_pt = style.font.size.pt
    if style.paragraph_format.line_spacing:
        ls = style.paragraph_format.line_spacing
        if hasattr(ls, '__float__'):
            line_spacing = float(ls)

    # Read east-Asian font from style rFonts element
    rPr = style.element.find(qn('w:rPr'))
    if rPr is not None:
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is not None:
            ea = rFonts.get(qn('w:eastAsia'))
            if ea:
                font_east_asia = ea

    return {
        "width_cm": round(section.page_width.cm, 1),
        "height_cm": round(section.page_height.cm, 1),
        "top_margin_cm": round(section.top_margin.cm, 2),
        "bottom_margin_cm": round(section.bottom_margin.cm, 2),
        "left_margin_cm": round(section.left_margin.cm, 2),
        "right_margin_cm": round(section.right_margin.cm, 2),
        "font_ascii": font_ascii,
        "font_east_asia": font_east_asia,
        "font_size_pt": font_size_pt,
        "line_spacing": line_spacing,
    }


def _extract_blocks(doc: Document) -> list[dict]:
    """Walk document body and extract paragraphs/tables/images as blocks."""
    blocks: list[dict] = []
    index = 0

    body = doc.element.body
    for child in body:
        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag

        if tag == 'p':
            block = _parse_paragraph(child, index)
            if block is not None:
                blocks.append(block)
                index += 1
        elif tag == 'tbl':
            block = _parse_table(child, doc, index)
            if block is not None:
                blocks.append(block)
                index += 1
        # We skip sectPr, etc.

    return blocks


def _parse_paragraph(para_elem, index: int) -> dict | None:
    """Parse a w:p element into a block dict.  Returns None for empty paragraphs."""
    # Collect runs with bold/italic info
    runs = []
    for r in para_elem.findall(qn('w:r')):
        t = r.find(qn('w:t'))
        rPr = r.find(qn('w:rPr'))
        is_bold = False
        is_italic = False
        font_size = None
        if rPr is not None:
            is_bold = rPr.find(qn('w:b')) is not None
            is_italic = rPr.find(qn('w:i')) is not None
            sz = rPr.find(qn('w:sz'))
            if sz is not None:
                font_size = float(sz.get(qn('w:val'), '24')) / 2.0  # half-points → pt
        if t is not None and t.text:
            runs.append({
                'text': t.text,
                'bold': is_bold,
                'italic': is_italic,
                'size_pt': font_size,
            })

    if not runs:
        # Check for inline drawings (images in paragraph)
        inline_imgs = _extract_inline_images(para_elem)
        if inline_imgs:
            return {
                "index": index,
                "type": "image",
                "image_count": len(inline_imgs),
                "descriptions": inline_imgs,
                "fixed": False,
            }
        return None

    full_text = ''.join(r['text'] for r in runs).strip()
    if not full_text:
        return None

    # Type guessing based on formatting
    all_bold = all(r['bold'] for r in runs if r['text'].strip())
    any_italic = any(r['italic'] for r in runs)
    max_size = max((r['size_pt'] or 12) for r in runs)
    min_size = min((r['size_pt'] or 12) for r in runs)

    if all_bold and max_size >= 13:
        guess_type = 'section_heading'
    elif any_italic and not all_bold:
        guess_type = 'sub_heading'
    elif full_text.startswith(('图 ', '图1', '图2', '图3')):
        guess_type = 'image'  # likely a figure caption
    else:
        guess_type = 'body'

    block: dict = {
        "index": index,
        "type": guess_type,
        "text": full_text,
        "fixed": True,  # template text is fixed by default; user can change
    }
    return block


def _parse_table(table_elem, doc, index: int) -> dict | None:
    """Parse a w:tbl element into a block dict."""
    rows = table_elem.findall(qn('w:tr'))
    if not rows:
        return None

    num_rows = len(rows)
    num_cols = 0
    headers = []
    data_rows = []

    for ri, tr in enumerate(rows):
        cells = tr.findall(qn('w:tc'))
        if ri == 0:
            num_cols = len(cells)
        cell_texts = []
        for tc in cells:
            cell_text = ''
            for p in tc.findall(qn('w:p')):
                for t in p.iter(qn('w:t')):
                    if t.text:
                        cell_text += t.text
            cell_texts.append(cell_text.strip())
        if ri == 0:
            headers = cell_texts
        else:
            data_rows.append(cell_texts)

    return {
        "index": index,
        "type": "three_line_table",
        "num_rows": num_rows,
        "num_cols": num_cols,
        "headers": headers,
        "rows": data_rows,
        "fixed": False,
    }


def _extract_inline_images(para_elem) -> list[str]:
    """Extract image descriptions from inline drawings in a paragraph."""
    images = []
    for drawing in para_elem.findall('.//' + qn('w:drawing')):
        # Try to get alt text or description
        desc_parts = []
        for docPr in drawing.iter(qn('wp:docPr')):
            name = docPr.get('name', '')
            descr = docPr.get('descr', '')
            if name:
                desc_parts.append(name)
            if descr:
                desc_parts.append(descr)
        desc = ' '.join(desc_parts).strip() if desc_parts else ''
        blip = drawing.find('.//' + qn('a:blip'))
        embed = blip.get(qn('r:embed'), '') if blip is not None else ''
        info = desc or f'image_{embed[:8]}' if embed else 'unknown_image'
        images.append(info)
    return images
