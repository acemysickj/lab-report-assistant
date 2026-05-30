"""DOCX v2: python-docx + BeautifulSoup + addFormula2docx OMML.

Adapted from html2docx (pqzx/html2docx, MIT) for DOM→docx rendering.
LaTeX→OMML via addFormula2docx (Sun-ZhenXing/addFormula2docx, MIT).
"""
from .renderer import render_html_to_docx as convert_html_to_docx_v2
