"""Reports API router — pre-lab and post-lab generation."""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import (
    PreLabGenerateRequest,
    ReviewRequest,
    ReviewResponse,
    ReviseRequest,
    AssembleRequest,
    PostLabGenerateRequest,
)
from services.report_service import (
    generate_with_review,
    assemble_prelab_html,
    assemble_postlab_html,
)
from services.claude_service import stream_generate, generate_sync, is_available
from utils.skill_loader import get_experiments
from utils.file_manager import generate_report_id, get_experiment_dir, save_report_html

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _sse(event_stream):
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# --- Pre-lab ---

@router.post("/prelab/generate")
async def generate_prelab_section(request: PreLabGenerateRequest):
    """Generate with internal review loop."""
    async def event_stream():
        async for event in generate_with_review(
            request.course_id,
            request.experiment_id,
            request.section,
            request.student_info,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return _sse(event_stream)


@router.post("/prelab/revise")
async def revise_prelab_section(request: ReviseRequest):
    """Revise based on user feedback (streaming)."""
    system_prompt = (
        "你是实验报告修改助手。根据用户反馈修改内容。\n"
        "【输出铁律】直接输出修改后的完整 HTML，不要输出任何其他内容。"
    )
    user_message = f"原始内容：\n{request.content}\n\n用户反馈：\n{request.feedback}\n\n直接输出修改后的完整 HTML："

    async def event_stream():
        async for chunk in stream_generate(system_prompt, user_message):
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return _sse(event_stream)


@router.post("/prelab/assemble")
async def assemble_prelab(request: AssembleRequest):
    """Assemble pre-lab sections into complete HTML."""
    if not is_available():
        raise HTTPException(status_code=503, detail="未配置 API Key")

    html = assemble_prelab_html(
        request.course_id,
        request.experiment_id,
        request.sections,
        request.student_info,
    )

    report_id = generate_report_id()
    exps = get_experiments(request.course_id)
    exp_title = next((e['title'] for e in exps if e['id'] == request.experiment_id), request.experiment_id)
    filepath = save_report_html(0, exp_title, report_id, html, "预习")

    return {"report_id": report_id, "html_path": str(filepath), "html": html}


# --- Post-lab ---

@router.post("/postlab/data-tables")
async def get_postlab_data_tables(request: dict):
    """Get fillable data table structures for an experiment."""
    from services.data_service import get_data_tables
    experiment_id = request.get("experiment_id", 0)
    tables = get_data_tables(int(experiment_id) if isinstance(experiment_id, (int, str)) and str(experiment_id).isdigit() else 0)
    return tables


@router.post("/postlab/analyze")
async def analyze_postlab_data(request: dict):
    """Run data analysis."""
    from services.data_service import run_analysis
    experiment_id = request.get("experiment_id", 0)
    data = request.get("data", {})
    temperature = request.get("temperature")
    pressure = request.get("pressure")

    eid = int(experiment_id) if isinstance(experiment_id, (int, str)) and str(experiment_id).isdigit() else 0
    results = run_analysis(eid, data, temperature, pressure)
    return results


@router.post("/postlab/figures")
async def generate_postlab_figures(request: dict):
    """Generate figures."""
    from services.figure_service import generate_figures
    experiment_id = request.get("experiment_id", 0)
    analysis_results = request.get("analysis_results", {})
    report_id = request.get("report_id", generate_report_id())

    eid = int(experiment_id) if isinstance(experiment_id, (int, str)) and str(experiment_id).isdigit() else 0
    output_dir = str(get_experiment_dir(eid, str(experiment_id)))
    filenames = generate_figures(eid, analysis_results, output_dir)
    return {"figures": filenames, "output_dir": output_dir}


@router.post("/postlab/generate")
async def generate_postlab_section(request: PostLabGenerateRequest):
    """Generate post-lab section with review."""
    extra = (
        f"实验数据：{json.dumps(request.data, ensure_ascii=False)}\n\n"
        f"分析结果：{json.dumps(request.analysis_results, ensure_ascii=False)}"
    )

    async def event_stream():
        async for event in generate_with_review(
            request.course_id,
            request.experiment_id,
            request.section,
            request.student_info,
            extra_context=extra,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return _sse(event_stream)


@router.post("/postlab/revise")
async def revise_postlab_section(request: ReviseRequest):
    """Revise based on user feedback."""
    system_prompt = "你是实验报告修改助手。根据用户反馈修改内容。\n【输出铁律】直接输出修改后的完整 HTML。"
    user_message = f"原始内容：\n{request.content}\n\n用户反馈：\n{request.feedback}\n\n直接输出修改后的完整 HTML："

    async def event_stream():
        async for chunk in stream_generate(system_prompt, user_message):
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return _sse(event_stream)


@router.post("/postlab/assemble")
async def assemble_postlab(request: dict):
    """Assemble complete post-lab report."""
    course_id = request.get("course_id", "")
    experiment_id = request.get("experiment_id", "")
    prelab_sections = request.get("prelab_sections", {})
    records = request.get("records", "")
    data_analysis = request.get("data_analysis", "")
    discussion = request.get("discussion", "")
    questions = request.get("questions", "")
    student_info_dict = request.get("student_info", {})
    figures_html = request.get("figures_html", "")

    from models.schemas import StudentInfo
    student_info = StudentInfo(**student_info_dict)

    html = assemble_postlab_html(
        course_id, experiment_id,
        prelab_sections, records, data_analysis,
        discussion, questions, student_info, figures_html,
    )

    report_id = generate_report_id()
    exps = get_experiments(course_id)
    exp_title = next((e['title'] for e in exps if e['id'] == experiment_id), experiment_id)
    filepath = save_report_html(0, exp_title, report_id, html, "完整")

    return {"report_id": report_id, "html_path": str(filepath), "html": html}
# --- DOCX Export ---

@router.post("/export-docx")
async def export_docx(request: dict):
    """Convert assembled HTML report to DOCX and return as downloadable file.

    Request body: { html: str }
    Returns: DOCX binary stream.
    """
    from fastapi.responses import Response
    from services.docx_service import convert_html_to_docx, is_pandoc_available

    if not is_pandoc_available():
        raise HTTPException(
            status_code=501,
            detail="pandoc 未安装。请安装 pandoc 后重试。",
        )

    html = request.get("html", "")
    if not html:
        raise HTTPException(status_code=400, detail="缺少 html 参数")

    try:
        docx_bytes = convert_html_to_docx(html)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=report.docx"},
    )


@router.post("/export-docx-v2")
async def export_docx_v2(request: dict):
    """Build DOCX from HTML report via python-docx + addFormula2docx renderer.

    Request body: { html: str }
    Returns: DOCX binary stream.
    """
    from fastapi.responses import Response
    from services.docx_v2 import convert_html_to_docx_v2

    html = request.get("html", "")
    if not html:
        raise HTTPException(status_code=400, detail="缺少 html 参数")

    try:
        docx_bytes = convert_html_to_docx_v2(html)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=report.docx"},
    )
