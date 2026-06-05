"""DOCX export service — converts assembled HTML report to .docx via pandoc.

MVP: pandoc HTML→DOCX with LaTeX math preprocessing.
v2: python-docx template filling with latex2mathml + mathml2omml.
"""
import re
import subprocess
import tempfile
import os
from pathlib import Path


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
        from config import PANDOC_PATH, REFERENCE_DOCX
        pandoc_path = os.environ.get("PANDOC_PATH", PANDOC_PATH)
        cmd = [pandoc_path, html_path, "-f", "html+tex_math_dollars", "-t", "docx", "-o", docx_path]

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
    from config import PANDOC_PATH
    pandoc_path = os.environ.get("PANDOC_PATH", PANDOC_PATH)
    try:
        result = subprocess.run(
            [pandoc_path, "--version"], capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


# ── v3: template-driven direct DOCX build ─────────────────────────────────

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


_BUILD_SCRIPT_SYSTEM_PROMPT = """你是一个 python-docx 构建脚本生成器。你的任务是根据模板结构和实验数据，生成一个可直接执行的 Python 构建脚本。

脚本约束（必须严格遵守）：
1. 只能 import 以下模块：builder, docx_v2.utils, json, sys, pathlib
2. 第一步调用 reset_equation_counter() 重置公式计数器
3. 第二步调用 create_document(page_cm, ...) 创建文档
4. 第三步调用 add_content_table(doc, rows=N) 创建内容容器
5. 按 blocks 顺序遍历，对每个 block：
   - fixed=true → 调用 builder 函数输出模板固定文字
   - fixed=false → 根据实验数据调用 builder 函数填入内容
6. display_formula → formula(cell, latex)
7. inline_formula → body_sub(cell, text) 不要单独处理
8. three_line_table → w3table(cell, headers, rows, caption)
9. image + figcaption → img(cell, path) + figcap(cell, text)
10. 【降级】公式嵌入到 body_sub 中，转换失败不 crash

【输出铁律】只输出 Python 代码，禁止任何解释、注释说明、markdown 代码块包裹。你的输出直接保存为 .py 文件执行。"""


def build_from_template(
    template_name: str,
    course_id: str,
    experiment_id: str,
    experiment_data: dict | None = None,
) -> bytes:
    """Build a DOCX from a saved template markup + experiment data.

    Args:
        template_name: Name of the template (matches {name}.markup.json).
        course_id: Course identifier for locating the template.
        experiment_id: Experiment identifier for output path.
        experiment_data: Dict with keys like 'title', 'objectives', 'methods',
            'process', 'data_tables', 'formulas', 'analysis', 'conclusions',
            'reflections', 'thinking_questions', 'figure_dir'.

    Returns:
        DOCX file as bytes.
    """
    import json
    from config import OUTPUT_DIR, PROJECT_ROOT
    from services.claude_service import generate_sync

    experiment_data = experiment_data or {}

    # 1. Load template markup
    markup = _load_template_markup(template_name, course_id)
    if markup is None:
        raise FileNotFoundError(
            f"模板 '{template_name}.markup.json' 未找到。"
            f"请先在 reference/{course_id}/pattern/ 中上传模板 DOCX 并保存标记。"
        )

    page = markup.get("page_setup", {})
    blocks = markup.get("blocks", [])

    # 2. Build AI prompt
    user_message = _build_script_prompt(
        template_name, page, blocks, experiment_data
    )

    # 3. Generate Python script via AI (synchronous, needs event loop)
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    script_code = loop.run_until_complete(
        generate_sync(_BUILD_SCRIPT_SYSTEM_PROMPT, user_message,
                      temperature=0.3, max_tokens=8000)
    )

    # Strip markdown code fences if AI wrapped output
    script_code = script_code.strip()
    if script_code.startswith("```"):
        lines = script_code.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        script_code = "\n".join(lines)

    # 4. Save script to output directory
    out_dir = OUTPUT_DIR / course_id / experiment_id / "scripts"
    out_dir.mkdir(parents=True, exist_ok=True)
    script_path = out_dir / "build_docx.py"
    script_path.write_text(script_code, encoding="utf-8")

    # 5. Execute the script to produce DOCX
    reports_dir = OUTPUT_DIR / course_id / experiment_id / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    import sys
    # Save original sys.argv and set up for the script
    orig_argv = sys.argv
    orig_path = list(sys.path)
    try:
        sys.path.insert(0, str(PROJECT_ROOT / "backend" / "services"))
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True, text=True, timeout=120,
            cwd=str(PROJECT_ROOT),
            env={**os.environ, "PYTHONPATH": str(PROJECT_ROOT / "backend")},
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"DOCX 构建脚本执行失败 (exit {result.returncode}):\n"
                f"STDOUT: {result.stdout}\n"
                f"STDERR: {result.stderr}"
            )
    finally:
        sys.argv = orig_argv
        sys.path = orig_path

    # 6. Find and return the generated DOCX
    docx_files = list(reports_dir.glob("*.docx"))
    if not docx_files:
        raise RuntimeError(
            f"DOCX 构建脚本执行成功但未生成 .docx 文件。"
            f"脚本输出:\n{result.stdout}"
        )

    latest_docx = max(docx_files, key=lambda p: p.stat().st_mtime)
    return latest_docx.read_bytes()


def _build_script_prompt(
    template_name: str,
    page_setup: dict,
    blocks: list[dict],
    experiment_data: dict,
) -> str:
    """Build the user message (prompt) for AI script generation."""
    import json

    parts = [
        f"生成一个 python-docx 构建脚本。",
        "",
        "## 页面设置",
        json.dumps(page_setup, ensure_ascii=False, indent=2),
        "",
        "## 模板结构 (blocks)",
        json.dumps(blocks, ensure_ascii=False, indent=2),
        "",
        "## 实验数据",
        json.dumps(experiment_data, ensure_ascii=False, indent=2),
        "",
        "脚本中 import 格式：",
        "from services.docx_v2.builder import (create_document, add_content_table,",
        "    heading, sub, body, body_lbl, body_sub, formula, w3table, img, figcap,",
        "    reset_equation_counter, clear_first_para)",
        "from services.docx_v2.utils import latex_to_mathml, mathml_to_omml",
        "",
        "文档保存路径变量: REPORTS_DIR, 从环境变量 DOCX_OUTPUT_DIR 读取。",
        "实验数据中的图片目录: FIGURES_DIR。",
        "",
        "直接输出 Python 代码。",
    ]
    return "\n".join(parts)


def load_template_for_frontend(template_name: str, course_id: str = "") -> dict | None:
    """Load template markup for frontend display/editing.  Returns None if not found."""
    return _load_template_markup(template_name, course_id)
