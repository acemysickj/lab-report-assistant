"""Block renderer: Structured blocks -> HTML / DOCX deterministic rendering.

Two rendering paths from the same blocks input:
  blocks_to_html()  -> HTML fragment for browser preview
  blocks_to_docx()  -> python-docx elements for .docx export
"""
from __future__ import annotations
import re
from typing import Optional


def _escape_html(text: str) -> str:
    """Escape text for safe HTML insertion."""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _render_body_html(text: str) -> str:
    """Render body text: $...$ -> \\(...\\) for MathJax inline rendering."""
    text = _escape_html(text)
    text = re.sub(r'(?<!\\)\$([^$]+)(?<!\\)\$', r'\\(\1\\)', text)
    return text


def blocks_to_html(
    blocks: list[dict],
    section_titles: Optional[dict[str, str]] = None,
    include_mathjax: bool = False,
) -> str:
    """Convert a list of block dicts to an HTML fragment.

    Args:
        blocks: List of ReportBlock-compatible dicts.
        section_titles: Optional mapping (unused, kept for API compatibility).
        include_mathjax: If True, return a complete HTML document with MathJax
                        CDN. If False, return an HTML fragment only.

    Returns:
        HTML string (full document if include_mathjax, else fragment).
    """
    parts = []

    for b in blocks:
        btype = b.get('type', '')

        if btype == 'section_heading':
            text = _escape_html(b.get('text', ''))
            if text:
                parts.append(f'<h2>{text}</h2>')

        elif btype == 'sub_heading':
            text = _escape_html(b.get('text', ''))
            if text:
                parts.append(f'<h3>{text}</h3>')

        elif btype == 'body':
            text = b.get('text', '')
            if text:
                parts.append(f'<p>{_render_body_html(text)}</p>')

        elif btype == 'display_formula':
            latex = b.get('latex', '')
            if latex:
                parts.append(
                    '<div class="formula">'
                    f'\\begin{{equation}}{latex}\\end{{equation}}'
                    '</div>'
                )

        elif btype == 'three_line_table':
            headers = b.get('headers', [])
            rows = b.get('rows', [])
            caption = b.get('caption', '')
            if headers or rows:
                parts.append(_render_table_html(headers, rows, caption))

        elif btype == 'image':
            path = b.get('path', '')
            alt = b.get('alt', '')
            caption = b.get('caption', '')
            if path:
                parts.append(_render_image_html(path, alt, caption))

    body = '\n'.join(parts)

    if not include_mathjax:
        return body

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
body {{{{
    font-family: "宋体", "SimSun", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.5;
    max-width: 210mm;
    margin: 0 auto;
    padding: 20px;
    color: #000;
}}}}
table {{{{
    border-collapse: collapse;
    margin: 10px auto;
    width: 100%;
}}}}
thead {{{{ border-top: 1.5px solid #000; }}}}
thead tr {{{{ border-bottom: 0.75px solid #000; }}}}
tbody tr:last-child {{{{ border-bottom: 1.5px solid #000; }}}}
th, td {{{{
    padding: 4px 8px;
    font-size: 10.5pt;
    text-align: center;
}}}}
</style>
<script>
MathJax = {{{{ tex: {{{{ inlineMath: [['\\\\(', '\\\\)']], displayMath: [['$$', '$$']], tags: 'ams' }}}} }}}};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
</head>
<body>
{body}
</body>
</html>"""


def _render_table_html(headers: list[str], rows: list[list[str]], caption: str = '') -> str:
    """Render a three-line table as HTML."""
    parts = []
    if caption:
        parts.append(
            f'<p style="text-align:center;font-weight:bold;font-size:10.5pt;">'
            f'{_escape_html(caption)}</p>'
        )
    parts.append('<table>')
    parts.append('<thead><tr>')
    for h in headers:
        parts.append(f'<th>{_escape_html(h)}</th>')
    parts.append('</tr></thead>')
    parts.append('<tbody>')
    for row in rows:
        parts.append('<tr>')
        for cell in row:
            parts.append(f'<td>{_escape_html(str(cell))}</td>')
        parts.append('</tr>')
    parts.append('</tbody></table>')
    return '\n'.join(parts)


def _render_image_html(path: str, alt: str = '', caption: str = '') -> str:
    """Render an image block as HTML."""
    alt_text = _escape_html(alt) if alt else ''
    parts = [
        f'<p style="text-align:center;">'
        f'<img src="{_escape_html(path)}" alt="{alt_text}" style="max-width:100%;">'
        f'</p>'
    ]
    if caption:
        parts.append(
            f'<p style="text-align:center;font-size:10.5pt;">'
            f'{_escape_html(caption)}</p>'
        )
    return '\n'.join(parts)


def blocks_to_docx(
    doc,
    blocks: list[dict],
    cell,
    figure_dir: str = '',
):
    """Render blocks into a DOCX content table cell.

    Uses builder.py functions for each block type.

    Args:
        doc: python-docx Document object.
        blocks: List of ReportBlock-compatible dicts.
        cell: Table cell to render content into.
        figure_dir: Base directory for image paths.
    """
    from services.docx_v2.builder import (
        heading, sub, body, body_with_math, formula,
        w3table, img, figcap, reset_equation_counter,
    )

    reset_equation_counter()

    for b in blocks:
        btype = b.get('type', '')

        if btype == 'section_heading':
            text = b.get('text', '')
            if text:
                heading(cell, text)

        elif btype == 'sub_heading':
            text = b.get('text', '')
            if text:
                sub(cell, text)

        elif btype == 'body':
            text = b.get('text', '')
            if not text:
                continue
            if '$' in text:
                body_with_math(cell, text)
            else:
                body(cell, text)

        elif btype == 'display_formula':
            latex = b.get('latex', '')
            if latex:
                formula(cell, latex)

        elif btype == 'three_line_table':
            headers = b.get('headers', [])
            rows = b.get('rows', [])
            caption = b.get('caption', '')
            if headers or rows:
                w3table(cell, headers, rows, caption)

        elif btype == 'image':
            path = b.get('path', '')
            caption = b.get('caption', '')
            if path:
                import os as _os
                full_path = _os.path.join(figure_dir, path) if figure_dir else path
                img(cell, full_path)
                if caption:
                    figcap(cell, caption)
