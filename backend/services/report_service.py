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
    async for chunk in stream_generate(system_prompt, user_message):
        content += chunk

    if "[生成错误" in content:
        yield {"type": "error", "message": content}
        return

    content = _strip_markdown_wrappers(content)

    # --- Step 2: Review loop ---
    for round_num in range(1, MAX_REVIEW_ROUNDS + 1):
        yield {"type": "status", "message": f"审查 Agent 第 {round_num} 轮审查中..."}

        review = await _review_section(course_id, experiment_id, section, content, round_num)

        if review["passed"]:
            yield {"type": "status", "message": "审查通过 ✓"}
            break

        if round_num < MAX_REVIEW_ROUNDS:
            yield {"type": "status", "message": f"审查未通过，修改 Agent 正在修改..."}
            content = await _revise_content(course_id, experiment_id, section, content, review["feedback"])
        else:
            yield {"type": "status", "message": "⚠️ 2轮审查后仍有改进空间，已提交最佳版本"}

    # --- Step 3: Stream final content ---
    chunk_size = 200
    for i in range(0, len(content), chunk_size):
        yield {"type": "chunk", "content": content[i:i + chunk_size]}

    yield {"type": "done"}


async def _review_section(
    course_id: str,
    experiment_id: str,
    section: str,
    content: str,
    round_num: int,
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

    response = await generate_sync(system_prompt, user_message, temperature=0.3, max_tokens=2048)
    passed = response.strip().startswith("通过") or "质量合格" in response or "没有问题" in response

    return {"passed": passed, "feedback": response, "round": round_num}


async def _revise_content(
    course_id: str,
    experiment_id: str,
    section: str,
    content: str,
    feedback: str,
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

    revised = await generate_sync(system_prompt, user_message, temperature=0.5, max_tokens=4096)
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


def assemble_prelab_html(
    course_id: str,
    experiment_id: str,
    sections: dict[str, str],
    student_info: StudentInfo,
) -> str:
    """Assemble pre-lab sections into a complete HTML document."""
    exps = get_experiments(course_id)
    exp_title = next((e['title'] for e in exps if e['id'] == experiment_id), experiment_id)
    format_spec = load_format_spec(course_id)

    section_titles = {
        "purpose": "一、实验目的",
        "principle": "二、实验原理",
        "equipment": "三、仪器与试剂",
        "procedure": "四、实验步骤",
    }

    parts = []
    for key in section_titles:
        if key in sections:
            parts.append(sections[key])

    body = "\n".join(parts)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{exp_title} - 预习报告</title>
<style>
body {{
    font-family: "宋体", "SimSun", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.5;
    max-width: 210mm;
    margin: 0 auto;
    padding: 20px;
    color: #000;
}}
/* 三线表规范 — 确保预览与导出完全一致 */
table {{
    border-collapse: collapse;
    margin: 10px auto;
    width: 100%;
    border-left: none;
    border-right: none;
    border-top: none;
    border-bottom: none;
}}
thead {{ border-top: 1.5px solid #000; }}
thead tr {{ border-bottom: 0.75px solid #000; }}
tbody tr:last-child {{ border-bottom: 1.5px solid #000; }}
th, td {{
    padding: 4px 8px;
    font-size: 10.5pt;
    border-left: none;
    border-right: none;
    text-align: center;
}}
</style>
<script>
MathJax = {{ tex: {{ inlineMath: [['\\\\(', '\\\\)']], displayMath: [['$$', '$$']], tags: 'ams' }} }};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
</head>
<body>
{body}
</body>
</html>"""

    return html


def assemble_postlab_html(
    course_id: str,
    experiment_id: str,
    prelab_sections: dict[str, str],
    records: str,
    data_analysis: str,
    discussion: str,
    questions: str,
    student_info: StudentInfo,
    figures_html: str = "",
) -> str:
    """Assemble complete post-lab report HTML."""
    exps = get_experiments(course_id)
    exp_title = next((e['title'] for e in exps if e['id'] == experiment_id), experiment_id)

    parts = []
    for key in ["purpose", "principle", "equipment", "procedure"]:
        if key in prelab_sections:
            parts.append(prelab_sections[key])

    parts.append(records)
    parts.append(data_analysis)
    parts.append(discussion)
    parts.append(questions)

    if figures_html:
        parts.append(figures_html)

    body = "\n".join(parts)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{exp_title} - 完整报告</title>
<style>
body {{
    font-family: "宋体", "SimSun", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.5;
    max-width: 210mm;
    margin: 0 auto;
    padding: 20px;
    color: #000;
}}
/* 三线表规范 — 确保预览与导出完全一致 */
table {{
    border-collapse: collapse;
    margin: 10px auto;
    width: 100%;
    border-left: none;
    border-right: none;
    border-top: none;
    border-bottom: none;
}}
thead {{ border-top: 1.5px solid #000; }}
thead tr {{ border-bottom: 0.75px solid #000; }}
tbody tr:last-child {{ border-bottom: 1.5px solid #000; }}
th, td {{
    padding: 4px 8px;
    font-size: 10.5pt;
    border-left: none;
    border-right: none;
    text-align: center;
}}
</style>
<script>
MathJax = {{ tex: {{ inlineMath: [['\\\\(', '\\\\)']], displayMath: [['$$', '$$']], tags: 'ams' }} }};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
</head>
<body>
{body}
</body>
</html>"""

    return html
