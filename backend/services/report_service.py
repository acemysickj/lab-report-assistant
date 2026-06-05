"""Report orchestration — follows the multi-agent workflow from SKILL.md.

Flow: Writing Agent generates → Review Agent checks → if fail: revise (max 2 rounds).
Only review-passed content is delivered to the user.
"""
import json
from pathlib import Path
from datetime import datetime
from typing import AsyncGenerator

from models.schemas import StudentInfo
from utils.skill_loader import (
    build_system_prompt,
    build_review_prompt,
    get_experiments,
    get_pattern_content,
    load_format_spec,
)
from utils.file_manager import (
    generate_report_id,
    get_experiment_dir,
    save_report_html,
    save_progress,
    load_progress,
)
from services.claude_service import stream_generate, generate_sync, is_available
from config import MAX_REVIEW_ROUNDS


async def generate_with_review(
    course_id: str,
    experiment_id: str,
    section: str,
    student_info: StudentInfo,
    extra_context: str = "",
    api_key: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Generate content with internal review loop.

    Sends status updates via SSE during the process.
    """
    system_prompt = build_system_prompt(section, course_id, experiment_id)

    exps = get_experiments(course_id)
    exp_title = next((e['title'] for e in exps if e['id'] == experiment_id), experiment_id)

    user_message = f"请为「{exp_title}」生成 {section} 部分的内容。"
    if extra_context:
        user_message += f"\n\n补充信息：{extra_context}"
    if student_info.name:
        user_message += f"\n学生信息：{student_info.model_dump_json()}"

    # --- Step 1: Generate ---
    yield {"type": "status", "message": f"撰写 Agent 正在生成「{section}」..."}

    content = ""
    async for chunk in stream_generate(system_prompt, user_message, api_key=api_key):
        content += chunk

    if "[生成错误" in content:
        yield {"type": "error", "message": content}
        return

    content = _strip_markdown_wrappers(content)

    # Parse blocks JSON from LLM output
    blocks = _parse_blocks_json(content)

    # --- Step 2: Review loop ---
    for round_num in range(1, MAX_REVIEW_ROUNDS + 1):
        yield {"type": "status", "message": f"审查 Agent 第 {round_num} 轮审查中..."}

        readable = _blocks_to_review_text(blocks)
        review = await _review_section(course_id, experiment_id, section, readable, round_num, api_key=api_key)

        if review["passed"]:
            yield {"type": "status", "message": "审查通过 ✓"}
            break

        if round_num < MAX_REVIEW_ROUNDS:
            yield {"type": "status", "message": f"审查未通过，修改 Agent 正在修改..."}
            revised_raw = await _revise_content(course_id, experiment_id, section, readable, review["feedback"], api_key=api_key)
            blocks = _parse_blocks_json(revised_raw)
        else:
            yield {"type": "status", "message": "⚠️ 2轮审查后仍有改进空间，已提交最佳版本"}

    # --- Step 3: Render blocks to HTML and stream ---
    from services.block_renderer import blocks_to_html
    html = blocks_to_html(blocks, include_mathjax=False)
    chunk_size = 300
    for i in range(0, len(html), chunk_size):
        yield {"type": "chunk", "content": html[i:i + chunk_size]}

    yield {"type": "done"}


async def _review_section(
    course_id: str,
    experiment_id: str,
    section: str,
    content: str,
    round_num: int,
    api_key: str | None = None,
) -> dict:
    """Review a section. Returns {passed, feedback, round}."""
    system_prompt = build_review_prompt(section, course_id, experiment_id, content)
    user_message = (
        f"请审查以上 {section} 部分的内容（第{round_num}轮审查）。\n"
        "审查要点：\n"
        "1. 内容完整性：是否有遗漏\n"
        "2. 格式规范性：字号、字体、三线表、图下表上、编号格式、缩进、行距\n"
        "3. 语言质量：是否有语义重复、逻辑断裂、表述啰嗦\n"
        "4. 数据合理性：数值计算是否正确\n"
        "5. LaTeX 公式检查（重要）：\n"
        "   - 所有 LaTeX 公式必须用 $$...$$（独立行）或 \\(...\\)（行内）包裹\n"
        "   - 编号公式必须用 \\begin{equation}...\\end{equation}，禁止用 \\tag{} 手动编号\n"
        "   - 禁止出现未经包裹的原始 LaTeX 源码\n"
        "   - 公式内部语法必须正确，大括号必须配对\n"
        "6. 纯净输出检查：禁止「好的」「以下是」「修改说明」、代码块包裹\n\n"
        "如果内容合格，回复「通过」并简要说明。"
        "如果有问题，给出具体修改意见，指明位置和方向。"
    )

    response = await generate_sync(system_prompt, user_message, temperature=0.3, max_tokens=2048, api_key=api_key)
    passed = response.strip().startswith("通过") or "质量合格" in response or "没有问题" in response

    return {"passed": passed, "feedback": response, "round": round_num}


async def _revise_content(
    course_id: str,
    experiment_id: str,
    section: str,
    content: str,
    feedback: str,
    api_key: str | None = None,
) -> str:
    """Revise content based on review feedback."""
    system_prompt = (
        "你是实验报告修改助手。根据审查意见修改内容。\n"
        "【输出铁律】\n"
        "1. 直接输出修改后的完整 HTML，不要输出任何其他内容\n"
        "2. 禁止输出修改说明、审阅意见、思考过程\n"
        "3. 禁止用 ```html 代码块包裹\n"
        "4. 禁止输出「以下是修改后的内容」等引导语\n"
        "5. 你的输出就是最终报告内容，用户会直接看到"
    )

    user_message = (
        f"审查意见：\n{feedback}\n\n"
        f"原始内容：\n{content}\n\n"
        "直接输出修改后的完整 HTML："
    )

    revised = await generate_sync(system_prompt, user_message, temperature=0.5, max_tokens=4096, api_key=api_key)
    return _strip_markdown_wrappers(revised) if not revised.startswith("[生成错误") else content


def _strip_markdown_wrappers(text: str) -> str:
    """Strip common markdown code block wrappers from LLM output."""
    text = text.strip()
    if text.startswith("```html"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _parse_blocks_json(raw: str) -> list[dict]:
    """Parse LLM output as blocks JSON array.  Retries with cleanup.

    Returns a list of block dicts.  On total failure, wraps raw text
    as a single body block (degraded mode).
    """
    import json as _json
    import re as _re

    raw = raw.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        raw = "\n".join(lines).strip()

    try:
        blocks = _json.loads(raw)
        if isinstance(blocks, list):
            return blocks
    except (_json.JSONDecodeError, ValueError):
        pass

    # Last resort: try to find JSON array in text
    match = _re.search(r'\[.*\]', raw, _re.DOTALL)
    if match:
        try:
            return _json.loads(match.group(0))
        except (_json.JSONDecodeError, ValueError):
            pass

    # Return as single body block (degraded mode)
    return [{"type": "body", "text": raw}]


def _blocks_to_review_text(blocks: list[dict]) -> str:
    """Convert blocks to a readable text representation for the review agent."""
    lines = []
    for b in blocks:
        btype = b.get('type', '')
        if btype in ('section_heading', 'sub_heading'):
            lines.append('')
            lines.append(f'[{btype}] {b.get("text", "")}')
            lines.append('')
        elif btype == 'body':
            lines.append(b.get('text', ''))
        elif btype == 'display_formula':
            lines.append(f'[公式] {b.get("latex", "")}')
        elif btype == 'three_line_table':
            caption = b.get('caption', '')
            if caption:
                lines.append(f'[表格标题] {caption}')
            lines.append(f'[表头] {" | ".join(b.get("headers", []))}')
            for row in b.get("rows", []):
                lines.append(f'[行] {" | ".join(str(c) for c in row)}')
        elif btype == 'image':
            lines.append(f'[图片] path={b.get("path", "")} alt={b.get("alt", "")} caption={b.get("caption", "")}')
    return "\n".join(lines)


def assemble_prelab_html(
    course_id: str,
    experiment_id: str,
    sections: dict,
    student_info,
) -> str:
    """Build pre-lab HTML from section blocks (or legacy HTML strings).

    New path: sections dict values are lists of block dicts.
    Legacy path: sections dict values are HTML strings (auto-wrapped as body blocks).
    """
    from services.block_renderer import blocks_to_html

    blocks_sections = {}
    for key, val in sections.items():
        if isinstance(val, list):
            blocks_sections[key] = val
        elif isinstance(val, str) and val.strip():
            # Legacy HTML string — parse to blocks if possible, else wrap
            parsed = _parse_blocks_json(val)
            blocks_sections[key] = parsed if parsed else [{"type": "body", "text": val}]
        else:
            blocks_sections[key] = []

    blocks = assemble_prelab_blocks(course_id, experiment_id, blocks_sections)
    return blocks_to_html(blocks, include_mathjax=True)


def assemble_prelab_blocks(
    course_id: str,
    experiment_id: str,
    sections: dict[str, list[dict]],
) -> list[dict]:
    """Merge pre-lab section blocks into one ordered list."""
    section_order = ["purpose", "principle", "equipment", "procedure"]
    all_blocks = []
    for key in section_order:
        if key in sections and sections[key]:
            all_blocks.extend(sections[key])
    return all_blocks


def assemble_postlab_html(
    course_id, experiment_id,
    prelab_sections, records, data_analysis,
    discussion, questions, student_info, figures_html="",
) -> str:
    """Build post-lab HTML from section blocks (or legacy HTML strings)."""
    from services.block_renderer import blocks_to_html

    def _to_blocks(val):
        if isinstance(val, list):
            return val
        if isinstance(val, str) and val.strip():
            parsed = _parse_blocks_json(val)
            return parsed if parsed else [{"type": "body", "text": val}]
        return []

    blocks = assemble_postlab_blocks(
        course_id, experiment_id,
        {k: _to_blocks(v) for k, v in (prelab_sections or {}).items()},
        _to_blocks(records),
        _to_blocks(data_analysis),
        _to_blocks(discussion),
        _to_blocks(questions),
        _to_blocks(figures_html),
    )
    return blocks_to_html(blocks, include_mathjax=True)


def assemble_postlab_blocks(
    course_id: str,
    experiment_id: str,
    prelab_sections: dict[str, list[dict]],
    records: list[dict],
    data_analysis: list[dict],
    discussion: list[dict],
    questions: list[dict],
    figures: list[dict],
) -> list[dict]:
    """Merge all post-lab sections into one ordered block list."""
    all_blocks = []
    for key in ["purpose", "principle", "equipment", "procedure"]:
        if key in prelab_sections and prelab_sections[key]:
            all_blocks.extend(prelab_sections[key])
    all_blocks.extend(records)
    all_blocks.extend(data_analysis)
    all_blocks.extend(discussion)
    all_blocks.extend(questions)
    all_blocks.extend(figures)
    return all_blocks
