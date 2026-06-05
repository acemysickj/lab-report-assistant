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
# --- DOCX Export (统一入口) ---

@router.post("/export-docx")
async def export_docx(request: dict):
    """Build DOCX from blocks JSON or template + experiment data.

    Request body options:
      1. { blocks: [...] }  -- direct blocks rendering
      2. { template_name, course_id, experiment_id, experiment_data }
         -- template-driven build

    Returns: DOCX binary stream.
    """
    from fastapi.responses import Response

    # Path A: Direct blocks -> DOCX (deterministic)
    blocks = request.get("blocks", None)
    if blocks and isinstance(blocks, list):
        try:
            docx_bytes = _build_docx_from_blocks(blocks)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DOCX 构建失败: {str(e)}")
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=report.docx"},
        )

    # Path B: Template-driven build (deterministic)
    template_name = request.get("template_name", "")
    if template_name:
        course_id = request.get("course_id", "")
        experiment_id = request.get("experiment_id", "")
        experiment_data = request.get("experiment_data", {})
        from services.docx_service import build_from_template
        try:
            docx_bytes = build_from_template(
                template_name, course_id, experiment_id, experiment_data,
            )
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=report.docx"},
        )

    raise HTTPException(status_code=400, detail="缺少 blocks 或 template_name 参数")


def _build_docx_from_blocks(blocks: list[dict]) -> bytes:
    """Build a DOCX file from blocks JSON using deterministic rendering."""
    import io
    from services.docx_v2.builder import create_document, clear_first_para, set_tbl_borders
    from services.block_renderer import blocks_to_docx
    from docx.shared import Cm
    from docx.enum.table import WD_TABLE_ALIGNMENT

    doc = create_document()
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_tbl_borders(tbl, sz=4)
    tbl.rows[0].cells[0].width = Cm(17.47)
    clear_first_para(tbl.rows[0].cells[0])

    blocks_to_docx(doc, blocks, tbl.rows[0].cells[0])

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@router.get("/template/{template_name}")
async def get_template_markup(template_name: str, course_id: str = ""):
    """Get a saved template markup for frontend display."""
    from services.docx_service import load_template_for_frontend

    markup = load_template_for_frontend(template_name, course_id)
    if markup is None:
        raise HTTPException(status_code=404,
                            detail=f"模板 '{template_name}' 未找到")
    return markup


@router.post("/template/parse")
async def parse_template_docx(request: dict):
    """Parse an uploaded DOCX template and return blocks for frontend marking.

    Request body: { docx_path: str }
    Returns: { template_name, page_setup, blocks }
    """
    from services.docx_v2.template_parser import parse_template

    docx_path = request.get("docx_path", "")
    if not docx_path:
        raise HTTPException(status_code=400, detail="缺少 docx_path 参数")

    try:
        result = parse_template(docx_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模板解析失败: {str(e)}")

    return result


@router.post("/template/save-markup")
async def save_template_markup(request: dict):
    """Save a marked-up template to reference/ for later use.

    Request body: { course_id: str, markup: { template_name, page_setup, blocks } }
    """
    from config import REFERENCE_DIR
    import json

    course_id = request.get("course_id", "")
    markup = request.get("markup", {})

    template_name = markup.get("template_name", "")
    if not template_name:
        raise HTTPException(status_code=400, detail="缺少 template_name")

    pattern_dir = REFERENCE_DIR / course_id / "pattern" if course_id else REFERENCE_DIR / "pattern"
    pattern_dir.mkdir(parents=True, exist_ok=True)

    markup_path = pattern_dir / f"{template_name}.markup.json"
    markup_path.write_text(json.dumps(markup, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"saved": str(markup_path), "template_name": template_name}
