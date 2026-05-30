"""DOCX export service — converts assembled HTML report to .docx via pandoc.

MVP: pandoc HTML→DOCX with LaTeX math preprocessing.
v2: python-docx template filling with latex2mathml + mathml2omml.
"""
import re
import subprocess
import tempfile
from pathlib import Path
from config import PANDOC_PATH, REFERENCE_DOCX


def _preprocess_html_for_pandoc(html: str) -> str:
    """Transform MathJax/LaTeX in HTML to pandoc-compatible math delimiters.

    pandoc recognizes $...$ (inline) and $$...$$ (display) via texmath.
    Our HTML uses \\(...\\) for inline and $$...$$ / \\begin{equation} for display.
    """
    # Inline: \(...\) → $...$
    # Match literal backslash-open-paren: regex \\\( = escaped \ + escaped (
    html = re.sub(r'\\\(', '$', html)
    html = re.sub(r'\\\)', '$', html)

    # Display: \begin{equation}...\end{equation} → $$...$$
    html = re.sub(r'\\begin\{equation\}', '$$', html)
    html = re.sub(r'\\end\{equation\}', '$$', html)

    # Display: \begin{align}...\end{align} → $$...$$
    # (pandoc/texmath may not handle align perfectly, but $$ is safer than leaving raw)
    html = re.sub(r'\\begin\{align\*?\}', '$$', html)
    html = re.sub(r'\\end\{align\*?\}', '$$', html)

    # \begin{cases}...\end{cases} — wrap in $$ for pandoc
    html = re.sub(r'\\begin\{cases\}', '$$\\\\begin{cases}', html)
    html = re.sub(r'\\end\{cases\}', '\\\\end{cases}$$', html)

    return html


def _replace_svg_images(html: str) -> str:
    """Replace SVG <img> tags with placeholder text.

    pandoc cannot embed SVG into DOCX.  We replace each SVG image
    with a note telling the student the figure is in the HTML version.
    v2: pre-render SVG→PNG via cairosvg and embed the PNG instead.
    """
    def _replacement(match: re.Match) -> str:
        src = match.group(1) or ""
        alt = match.group(2) or ""
        filename = src.rsplit("/", 1)[-1] if "/" in src else src
        label = alt or filename or "图表"
        return (
            f'<p style="color:#999;font-style:italic;padding:8px;border:1px dashed #ccc;">'
            f'[图表：{label} — 请参见 HTML 版报告或手动插入图片]'
            f'</p>'
        )

    # Match <img ... src="..." ... alt="..." ... >
    html = re.sub(
        r'<img[^>]*src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>',
        _replacement,
        html,
    )
    return html


def convert_html_to_docx(html: str) -> bytes:
    """Convert an HTML report string to .docx bytes via pandoc.

    Args:
        html: Complete HTML document (with <!DOCTYPE>, <html>, <head>, <body>).

    Returns:
        DOCX file as bytes.

    Raises:
        RuntimeError: If pandoc is not installed or conversion fails.
    """
    html = _preprocess_html_for_pandoc(html)
    html = _replace_svg_images(html)

    with tempfile.NamedTemporaryFile(
        suffix=".html", mode="w", encoding="utf-8", delete=False
    ) as tmp_html:
        tmp_html.write(html)
        html_path = tmp_html.name

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp_docx:
        docx_path = tmp_docx.name

    try:
        cmd = [PANDOC_PATH, html_path, "-f", "html", "-t", "docx", "-o", docx_path]

        # Use reference docx for styling if configured
        if REFERENCE_DOCX and Path(REFERENCE_DOCX).exists():
            cmd.extend(["--reference-doc", REFERENCE_DOCX])

        # Extract media to a temp dir (we discard it for MVP since SVG isn't embeddable)
        cmd.extend(["--extract-media", str(Path(docx_path).parent)])

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            stderr = result.stderr.strip()
            # pandoc often writes non-fatal warnings to stderr;
            # only treat it as an error if the output file is empty/missing
            docx_file = Path(docx_path)
            if not docx_file.exists() or docx_file.stat().st_size < 1000:
                raise RuntimeError(f"pandoc conversion failed: {stderr}")

        docx_file = Path(docx_path)
        if not docx_file.exists():
            raise RuntimeError("pandoc did not produce output file")

        return docx_file.read_bytes()

    except FileNotFoundError:
        raise RuntimeError(
            "pandoc 未安装。请安装 pandoc (https://pandoc.org/installing.html) 后重试。"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("pandoc 转换超时（60秒）")
    finally:
        # Clean up temp files
        for p in (html_path, docx_path):
            try:
                Path(p).unlink(missing_ok=True)
            except OSError:
                pass


def is_pandoc_available() -> bool:
    """Check whether pandoc is installed and reachable."""
    try:
        result = subprocess.run(
            [PANDOC_PATH, "--version"], capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False
