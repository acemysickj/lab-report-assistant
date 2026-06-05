"""DOCX v2: python-docx + LaTeX->OMML deterministic rendering.

Public API:
  blocks_to_docx() — blocks JSON -> DOCX elements (via block_renderer)
  Builder functions for direct DOCX construction.
"""
from .builder import (
    create_document, add_content_table, reset_equation_counter,
    heading, sub, body, body_with_math, body_lbl, body_sub,
    formula, w3table, img, figcap, clear_first_para, set_tbl_borders,
)
