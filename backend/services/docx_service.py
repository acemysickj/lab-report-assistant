"""DOCX export service — template-driven deterministic DOCX build.

No pandoc. No AI script generation.  Pure deterministic rendering
via docx_v2.builder + block_renderer.
"""
import os
from pathlib import Path


# ── template helpers ────────────────────────────────────────────────────

def _load_template_markup(template_name: str, course_id: str = "") -> dict | None:
    """Load a saved template markup JSON from reference/."""
    import json
    from config import REFERENCE_DIR

    search_dirs = []
    if course_id:
        search_dirs.append(REFERENCE_DIR / course_id / "pattern")
    search_dirs.append(REFERENCE_DIR / "pattern")

    for d in search_dirs:
        markup_path = d / f"{template_name}.markup.json"
        if markup_path.exists():
            return json.loads(markup_path.read_text(encoding="utf-8"))
    return None


def load_template_for_frontend(template_name: str, course_id: str = "") -> dict | None:
    """Load template markup for frontend display/editing. Returns None if not found."""
    return _load_template_markup(template_name, course_id)


# ── deterministic template build ────────────────────────────────────────

def build_from_template(
    template_name: str,
    course_id: str,
    experiment_id: str,
    experiment_data: dict | None = None,
) -> bytes:
    """Build a DOCX from a saved template markup + experiment data.

    Deterministic: loads markup JSON, merges with experiment_data,
    renders via blocks_to_docx().  No AI involvement.

    Args:
        template_name: Name of the template (matches {name}.markup.json).
        course_id: Course identifier for locating the template.
        experiment_id: Experiment identifier (unused, for API compatibility).
        experiment_data: Dict with keys matching template block fill targets.

    Returns:
        DOCX file as bytes.

    Raises:
        FileNotFoundError: If template markup not found.
    """
    import io
    from services.docx_v2.builder import (
        create_document, clear_first_para, set_tbl_borders,
    )
    from services.block_renderer import blocks_to_docx
    from docx.shared import Cm
    from docx.enum.table import WD_TABLE_ALIGNMENT

    experiment_data = experiment_data or {}

    # 1. Load template markup
    markup = _load_template_markup(template_name, course_id)
    if markup is None:
        raise FileNotFoundError(
            f"模板 '{template_name}.markup.json' 未找到。"
        )

    page = markup.get("page_setup", {})
    template_blocks = markup.get("blocks", [])

    # 2. Merge template blocks with experiment data
    blocks = _merge_template_with_data(template_blocks, experiment_data)

    # 3. Build DOCX deterministically
    doc = create_document(
        page_width_cm=page.get("width_cm", 21.0),
        page_height_cm=page.get("height_cm", 29.7),
        top_margin_cm=page.get("top_margin_cm", 2.54),
        bottom_margin_cm=page.get("bottom_margin_cm", 2.54),
        left_margin_cm=page.get("left_margin_cm", 1.92),
        right_margin_cm=page.get("right_margin_cm", 1.57),
        font_ascii=page.get("font_ascii", "Calibri"),
        font_east_asia=page.get("font_east_asia", "宋体"),
        font_size_pt=page.get("font_size_pt", 12.0),
        line_spacing=page.get("line_spacing", 1.5),
    )

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_tbl_borders(tbl, sz=4)
    tbl.rows[0].cells[0].width = Cm(17.47)
    clear_first_para(tbl.rows[0].cells[0])

    figure_dir = experiment_data.get("figure_dir", "")
    blocks_to_docx(doc, blocks, tbl.rows[0].cells[0], figure_dir=figure_dir)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _merge_template_with_data(
    template_blocks: list[dict],
    experiment_data: dict,
) -> list[dict]:
    """Merge template blocks with experiment data.

    fixed=True blocks keep template text.
    fixed=False blocks are filled from experiment_data.
    """
    result = []
    for block in template_blocks:
        if block.get("fixed", True):
            result.append(dict(block))
        else:
            filled = _fill_block_from_data(block, experiment_data)
            if filled:
                result.append(filled)
    return result


def _fill_block_from_data(block: dict, data: dict) -> dict:
    """Fill a non-fixed template block from experiment data.

    Simple strategy:
      - body blocks: look for string values in data
      - table blocks: look for dict values with headers/rows
      - formula blocks: look for string values
      - image blocks: keep as-is (path filled elsewhere)
    """
    btype = block.get("type", "")
    block_text = block.get("text", "")

    # Try data keys that might match this block's content
    for key, val in data.items():
        if not val:
            continue
        if btype == "body" and isinstance(val, str) and val.strip():
            # Match first string value — simple heuristic
            # In practice, data dict keys are ordered by template position
            return {"type": "body", "text": val}
        elif btype == "three_line_table" and isinstance(val, dict):
            return {
                "type": "three_line_table",
                "headers": val.get("headers", block.get("headers", [])),
                "rows": val.get("rows", block.get("rows", [])),
                "caption": val.get("caption", block.get("caption", "")),
            }
        elif btype == "display_formula" and isinstance(val, str):
            return {"type": "display_formula", "latex": val}

    # Fallback: return block as-is
    return dict(block)
