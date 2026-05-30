"""Experiments API — dynamically scans template library."""
import json
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from utils.skill_loader import list_courses, get_experiments, get_handout_content
from config import REFERENCE_DIR

router = APIRouter(prefix="/api", tags=["experiments"])


@router.get("/courses")
async def api_list_courses():
    """List all courses in the template library."""
    courses = list_courses()
    return {"courses": courses}


@router.get("/courses/{course_id}/experiments")
async def api_list_experiments(course_id: str):
    """List experiments for a course."""
    exps = get_experiments(course_id)
    if not exps:
        raise HTTPException(status_code=404, detail=f"课程 '{course_id}' 没有找到实验")
    return {"course_id": course_id, "experiments": exps}


@router.get("/experiments/{course_id}/{experiment_id}")
async def api_get_experiment(course_id: str, experiment_id: str):
    """Get experiment details."""
    exps = get_experiments(course_id)
    exp = next((e for e in exps if e["id"] == experiment_id), None)
    if not exp:
        raise HTTPException(status_code=404, detail="实验未找到")

    handout = get_handout_content(course_id, experiment_id)
    return {
        "course_id": course_id,
        "experiment": exp,
        "handout_preview": handout[:2000] if handout else "",
    }


@router.post("/courses/create")
async def api_create_course(
    name: str = Form(...),
    handouts: list[UploadFile] = File(default_factory=list),
    patterns: list[UploadFile] = File(default_factory=list),
    description: str = Form(default=""),
):
    """Create a new course. Upload handout .md files and pattern .md files.

    - name: course folder name
    - handouts: list of .md files for the handout/ directory
    - patterns: list of .md files for the pattern/ directory
    - description: natural language describing the experiments (optional)
      If provided, AI will generate index.json after course creation.
    """
    # Validate
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="课程名称不能为空")
    name = name.strip()
    # Sanitize: remove path separators and dangerous chars
    name = name.replace("/", "").replace("\\", "").replace("..", "")

    course_dir = REFERENCE_DIR / name
    if course_dir.exists():
        raise HTTPException(status_code=409, detail=f"课程 '{name}' 已存在")

    # Create directories
    handout_dir = course_dir / "handout"
    pattern_dir = course_dir / "pattern"
    handout_dir.mkdir(parents=True, exist_ok=True)
    pattern_dir.mkdir(parents=True, exist_ok=True)

    # Save handout files
    for f in handouts:
        if not f.filename:
            continue
        filename = Path(f.filename).name
        if not filename.endswith(".md"):
            filename += ".md"
        content = await f.read()
        (handout_dir / filename).write_bytes(content)

    # Save pattern files
    for f in patterns:
        if not f.filename:
            continue
        filename = Path(f.filename).name
        if not filename.endswith(".md"):
            filename += ".md"
        content = await f.read()
        (pattern_dir / filename).write_bytes(content)

    # Generate index.json from description using AI
    index_generated = False
    if description and description.strip():
        try:
            index_json_str = await _generate_index_json(name, description.strip())
            parsed = json.loads(index_json_str)
            (handout_dir / "index.json").write_text(
                json.dumps(parsed, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            index_generated = True
        except Exception:
            pass  # Non-fatal: index.json generation failed

    return {
        "status": "ok",
        "course_id": name,
        "message": f"课程 '{name}' 创建成功" + ("，已自动生成实验列表" if index_generated else ""),
    }


async def _generate_index_json(course_name: str, description: str) -> str:
    """Use AI to generate index.json from natural language description."""
    from services.claude_service import generate_sync

    system_prompt = (
        "你是一个 JSON 生成器。根据用户对课程的描述，提取出所有实验的列表。\n"
        "输出铁律：只输出一个合法的 JSON 数组，不要输出任何其他内容。\n"
        "格式：[{\"id\": \"exp1\", \"title\": \"实验一 实验名称\"}, ...]\n"
        "id 用 exp1, exp2, ... 编号。title 保留原始中文命名。"
    )

    user_message = f"课程名称：{course_name}\n\n课程描述：{description}\n\n请提取实验列表："

    result = await generate_sync(system_prompt, user_message, temperature=0.2, max_tokens=2048)

    # Strip any markdown code block wrappers
    result = result.strip()
    if result.startswith("```json"):
        result = result[7:]
    if result.startswith("```"):
        result = result[3:]
    if result.endswith("```"):
        result = result[:-3]
    result = result.strip()

    # Validate it's valid JSON
    parsed = json.loads(result)
    if not isinstance(parsed, list):
        raise ValueError("Not a list")
    return result


@router.delete("/courses/{course_id}")
async def api_delete_course(course_id: str):
    """Delete a course and all its files."""
    course_dir = REFERENCE_DIR / course_id
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="课程不存在")

    shutil.rmtree(course_dir)
    return {"status": "deleted"}


@router.post("/courses/{course_id}/reparse")
async def api_reparse_course(course_id: str, description: str = Form(default="")):
    """Re-parse a course's experiment index from a new description."""
    course_dir = REFERENCE_DIR / course_id
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="课程不存在")

    if not description or not description.strip():
        raise HTTPException(status_code=400, detail="请提供实验列表描述")

    try:
        index_json_str = await _generate_index_json(course_id, description.strip())
        parsed = json.loads(index_json_str)
        (course_dir / "handout" / "index.json").write_text(
            json.dumps(parsed, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return {
            "status": "ok",
            "message": "实验列表已重新生成",
            "experiments": parsed,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重新解析失败：{str(e)}")
