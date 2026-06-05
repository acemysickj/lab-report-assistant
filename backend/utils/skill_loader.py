"""Load skill rules and reference material for building prompts.

Template library structure:
  reference/
    课程A/
      handout/     ← lab handouts (.md files)
      pattern/     ← report templates (.md files)
      index.json   ← optional: manual experiment list
    课程B/
      ...

By default, experiment names are auto-extracted from handout markdown headers.
If index.json exists, it overrides auto-extraction.
"""
import json
import re
from pathlib import Path
from config import REFERENCE_DIR


def list_courses() -> list[dict]:
    """Scan reference/ for all courses."""
    courses = []
    if not REFERENCE_DIR.exists():
        return courses

    for course_dir in sorted(REFERENCE_DIR.iterdir()):
        if not course_dir.is_dir() or course_dir.name.startswith("."):
            continue
        handout_dir = course_dir / "handout"
        pattern_dir = course_dir / "pattern"
        courses.append({
            "id": course_dir.name,
            "name": course_dir.name,
            "has_handouts": handout_dir.exists() and any(handout_dir.iterdir()),
            "has_patterns": pattern_dir.exists() and any(pattern_dir.iterdir()),
        })
    return courses


def get_experiments(course_id: str) -> list[dict]:
    """Get experiment list for a course.

    Priority:
    1. handouts/index.json (manual declaration)
    2. Auto-extract from handout markdown headers
    """
    course_dir = REFERENCE_DIR / course_id
    if not course_dir.exists():
        return []

    handout_dir = course_dir / "handout"
    if not handout_dir.exists():
        return []

    # 1) Check for index.json
    index_file = handout_dir / "index.json"
    if index_file.exists():
        try:
            data = json.loads(index_file.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return data
        except Exception:
            pass

    # 2) Auto-extract from markdown files
    experiments = []
    for md_file in sorted(handout_dir.glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        # Match experiment headers in various formats:
        # "实验一 原电池电动势的测定" / "实验一  原电池电动势的测定及其应用"
        # "实验二  （之一） 旋光法测定蔗糖转化反应的速率常数"
        # "# 实验一 xxx" (markdown header)
        pattern = r'(?:^|\n)(?:#{1,3}\s*)?实验\s*[一二三四五六七八九十\d]+[、，。\s]*(?:（[^）]*）)?\s*[^\n]{3,60}'
        matches = re.findall(pattern, content)
        seen_titles = set()
        for match in matches:
            title = match.lstrip('#').strip().replace('\n', ' ')
            # Remove trailing dots, spaces, page numbers
            title = re.sub(r'[．.…]{2,}\d*$', '', title)
            title = title.strip()
            # Skip TOC entries that are too short or just numbers
            if len(title) < 8:
                continue
            # Deduplicate
            normalized = re.sub(r'\s+', '', title)
            if normalized in seen_titles:
                continue
            seen_titles.add(normalized)
            exp_id = _title_to_id(course_id, title)
            experiments.append({
                "id": exp_id,
                "title": title,
                "course_id": course_id,
                "source_file": md_file.name,
            })

    return experiments


def get_handout_content(course_id: str, experiment_id: str) -> str:
    """Get the full handout content for a specific experiment.

    Searches through all handout files in the course directory.
    """
    course_dir = REFERENCE_DIR / course_id
    handout_dir = course_dir / "handout"
    if not handout_dir.exists():
        return ""

    # Find which file contains this experiment
    for md_file in sorted(handout_dir.glob("*.md")):
        if md_file.name == "index.json":
            continue
        content = md_file.read_text(encoding="utf-8")
        # Check if this file contains the experiment
        if _title_in_content(content, experiment_id):
            return content

    # Fallback: return all handout content concatenated
    all_content = []
    for md_file in sorted(handout_dir.glob("*.md")):
        if md_file.name == "index.json":
            continue
        all_content.append(md_file.read_text(encoding="utf-8"))
    return "\n\n".join(all_content)


def get_pattern_content(course_id: str) -> str:
    """Get report template/pattern for a course."""
    course_dir = REFERENCE_DIR / course_id
    pattern_dir = course_dir / "pattern"
    if not pattern_dir.exists():
        return ""

    for md_file in sorted(pattern_dir.glob("*.md")):
        return md_file.read_text(encoding="utf-8")
    return ""


def get_section_rules(course_id: str) -> dict[str, str]:
    """Get section-specific rules. Uses global rules/ files if course-specific ones don't exist."""
    from config import RULES_DIR

    rules = {}
    # First check course-specific rules
    course_rules = REFERENCE_DIR / course_id / "rules"
    rule_files = {
        "purpose": "purpose.md",
        "principle": "principle.md",
        "equipment": "equipment.md",
        "procedure": "procedure.md",
        "records": "record.md",
        "discussion": "discussion.md",
        "questions": "questions.md",
        "data_processing": "data-processing.md",
        "format": "format.md",
    }

    for section, filename in rule_files.items():
        # Course-specific first
        if course_rules.exists():
            f = course_rules / filename
            if f.exists():
                rules[section] = f.read_text(encoding="utf-8")
                continue
        # Global rules as fallback
        f = RULES_DIR / filename
        if f.exists():
            rules[section] = f.read_text(encoding="utf-8")

    return rules


def load_format_spec(course_id: str = "") -> str:
    """Load the HTML formatting specification."""
    from config import RULES_DIR

    # Course-specific first
    if course_id:
        f = REFERENCE_DIR / course_id / "rules" / "format.md"
        if f.exists():
            return f.read_text(encoding="utf-8")

    f = RULES_DIR / "format.md"
    if f.exists():
        return f.read_text(encoding="utf-8")
    return ""


def build_system_prompt(
    section: str,
    course_id: str,
    experiment_id: str,
) -> str:
    """Build a system prompt for the Writing Agent."""
    rules = get_section_rules(course_id)
    format_spec = load_format_spec(course_id)
    handout = get_handout_content(course_id, experiment_id)
    pattern = get_pattern_content(course_id)

    experiments = get_experiments(course_id)
    exp_title = next((e['title'] for e in experiments if e['id'] == experiment_id), experiment_id)

    prompt_parts = [
        f"你是{course_id}实验报告写作助手。请按照以下规范生成实验报告内容。",
        "",
        "## 格式规范（必须严格遵守）",
        format_spec if format_spec else "使用标准学术报告格式",
        "",
        "## 语言风格要求",
        "- 使用学术书面语，避免口语化表达",
        "- 公式变量使用斜体，单位使用正体",
        "- 数字与单位之间空一格（如 22.0 ℃，101 kPa）",
        "- 使用 MathJax 渲染 LaTeX 公式：行内用 \\(...\\)，独立行用 $$...$$",
        "- 公式编号规范（必须严格遵守）：",
        "  - 编号公式一律使用 \\begin{equation}...\\end{equation}，编号会自动右对齐",
        "  - 禁止在 $$...$$ 内使用 \\tag{} 手动编号（会导致编号位置飘移）",
        "  - 多行公式用 \\begin{align}...\\end{align}，每行自动编号",
        "  - 不需要编号的公式用 $$...$$",
        "- 输出应为 JSON 数组（blocks），每个元素是一个对象，包含 type 字段：",
        "",
        "【block 类型定义 — 严格按以下格式输出】",
        '  {"type": "section_heading", "text": "一、实验目的"}',
        '  {"type": "sub_heading", "text": "1. 具体目标"}',
        '  {"type": "body", "text": "正文内容。内联公式用 $...$ 包裹，如 $E=mc^2$。"}',
        '  {"type": "display_formula", "latex": "E = mc^2"}  （独立行公式，自动编号，禁止手动 \\\\tag{}）',
        '  {"type": "three_line_table", "headers": ["列1", "列2"], "rows": [["a","b"]], "caption": "表1 标题"}',
        '  {"type": "image", "path": "fig1_xxx.svg", "alt": "描述", "caption": "图1 标题"}',
        "- 表格禁止使用 HTML <table> 标签，必须使用 three_line_table 块类型",
        "- 图片禁止使用 <img> 标签，必须使用 image 块类型",
        "",
        "【实验步骤特殊规范 — 架构图风格】",
        "- 实验步骤必须用内联 SVG 绘制架构图（框图+箭头），不可用传统流程图",
        "- 每个步骤用圆角矩形框，标注操作名称",
        "- 关键点/难点用橙色边框标注",
        "- 待观察现象用虚线框标注",
        "- 待测数据用蓝色框标注",
        "- 步骤之间用箭头连接",
        "- 其他章节的示意图能画就用内联 SVG 画，画不出来就完全省略，不写占位符",
        "",
        "【输出铁律 — 违反即为不合格】",
        "- 只输出 JSON 数组，禁止任何引导语、说明、总结",
        "- 禁止输出「好的」「以下是」「修改说明」等非报告内容",
        "- 禁止用 ```json ... ``` 代码块包裹（直接输出裸 JSON）",
        "- 你的输出会被直接解析为 JSON，任何额外文字都会导致解析失败",
    ]

    # Add report structure from pattern
    if pattern:
        prompt_parts.extend([
            "",
            "## 报告整体结构（参考模板）",
            pattern[:3000],
        ])

    # Add section-specific rules
    section_rule = rules.get(section, "")
    if section_rule:
        prompt_parts.extend([
            "",
            f"## {section} 部分的撰写规范",
            section_rule,
        ])

    # Add handout content
    if handout:
        prompt_parts.extend([
            "",
            f"## 实验讲义（{exp_title}）",
            _extract_relevant_section(handout, section),
        ])

    prompt_parts.extend([
        "",
        f"请为「{exp_title}」生成【{section}】部分的 blocks JSON。",
    ])

    return "\n".join(prompt_parts)


def build_review_prompt(
    section: str,
    course_id: str,
    experiment_id: str,
    content: str,
) -> str:
    """Build a system prompt for the Review Agent."""
    rules = get_section_rules(course_id)
    format_spec = load_format_spec(course_id)
    pattern = get_pattern_content(course_id)

    prompt_parts = [
        "你是实验报告审查 Agent。请严格审查以下内容，给出具体的修改意见。",
        "",
        "## 审查标准",
        "1. 内容完整性：是否有遗漏的必要信息",
        "2. 格式规范性：是否严格遵循格式规范",
        "3. 语言质量：是否有语义重复、逻辑断裂、表述啰嗦",
        "4. 数据合理性：数值是否正确（如适用）",
        "5. LaTeX 公式检查：",
        "   - 所有公式必须用 $...$ 包裹（内联）或作为 display_formula 块的 latex 字段",
        "   - 编号公式禁止用 \\tag{} 手动编号，系统自动编号",
        "   - 公式内部语法必须正确，大括号必须配对",
        "6. 实验步骤架构图检查（仅 procedure 部分）：",
        "   - 必须包含内联 SVG 架构图（框图+箭头）",
        "   - 关键点/难点是否有醒目标注（橙色）",
        "   - 待测数据是否有标注（蓝色框）",
        "7. 纯净输出检查：",
        "   - 禁止出现「好的」「以下是」「修改说明」等非报告内容",
        "   - 禁止出现代码块包裹（```json ... ```）",
        "   - 输出必须是合法的 JSON 数组",
        "",
        "## 审查要求",
        "- 必须给出具体的、可操作的修改意见",
        "- 指明问题位置和修改方向",
        "- 不得笼统说'不规范'",
        "",
        f"## 待审查内容（{section} 部分）",
        content,
    ]

    if format_spec:
        prompt_parts.insert(5, "\n".join(["## 格式规范参考", format_spec, ""]))

    return "\n".join(prompt_parts)


def _title_to_id(course_id: str, title: str) -> str:
    """Generate a stable ID from a title string."""
    import hashlib
    slug = hashlib.md5(f"{course_id}:{title}".encode()).hexdigest()[:8]
    return f"{course_id}_{slug}"


def _title_in_content(content: str, experiment_id: str) -> bool:
    """Check if experiment_id appears in the handout content."""
    experiments = []
    for md_file in []:  # We rely on reading all files instead
        pass
    # Just check if any extracted experiment matches
    course_id = experiment_id.rsplit("_", 1)[0] if "_" in experiment_id else ""
    exps = _extract_from_content(content)
    for exp in exps:
        eid = _title_to_id(course_id, exp)
        if eid == experiment_id:
            return True
    return False


def _extract_from_content(content: str) -> list[str]:
    """Extract experiment titles from markdown content."""
    titles = []
    pattern = r'^#{1,3}\s*实验\s*[一二三四五六七八九十\d]+[^#\n]*'
    matches = re.findall(pattern, content, re.MULTILINE)
    for match in matches:
        title = match.lstrip('#').strip().replace('**', '')
        titles.append(title)
    return titles


def _extract_relevant_section(handout: str, section: str) -> str:
    """Extract the most relevant portion of the handout for a given section."""
    # Map sections to likely roman numeral prefixes in handouts
    section_map = {
        "purpose": ["Ⅰ、目的要求", "Ⅰ、目的要求", "1、目的要求"],
        "principle": ["Ⅲ、实验原理", "Ⅲ、实验原理", "3、实验原理"],
        "equipment": ["Ⅱ、仪器与试剂", "Ⅱ、仪器与试剂", "2、仪器与试剂"],
        "procedure": ["Ⅳ、实验步骤", "Ⅳ、实验步骤", "4、实验步骤"],
        "records": ["Ⅴ、数据记录", "Ⅴ、实验数据记录", "5、实验数据记录", "5、数据记录和数据处理"],
        "discussion": ["Ⅴ", "Ⅵ"],  # data + questions surrounding discussion
        "questions": ["Ⅵ、思考问题", "Ⅵ、思考问题", "6、思考问题", "6、数据处理"],
    }

    prefixes = section_map.get(section, [])
    for prefix in prefixes:
        idx = handout.find(prefix)
        if idx != -1:
            # Return ~3000 chars from this point
            return handout[idx:idx + 3000]

    # Fallback: return first 4000 chars of handout
    return handout[:4000]
