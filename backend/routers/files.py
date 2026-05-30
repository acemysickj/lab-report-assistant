"""Files API router — serving and managing generated reports."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, Response
from utils.file_manager import list_reports, get_report_content, delete_report
from pathlib import Path

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/reports")
async def get_reports():
    """List all generated reports."""
    reports = list_reports()
    return {"reports": reports}


@router.get("/reports/{experiment_dir}/{filename}")
async def get_report(experiment_dir: str, filename: str):
    """Get a specific report's HTML content."""
    content = get_report_content(experiment_dir, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="报告不存在")
    return HTMLResponse(content=content)


def _html_to_markdown(html: str) -> str:
    """Convert HTML report to Markdown."""
    try:
        import html2text
        h = html2text.HTML2Text()
        h.body_width = 0          # no wrapping
        h.ignore_links = False
        h.ignore_images = False
        h.ignore_emphasis = False
        h.protect_links = True
        h.unicode_snob = True
        # Remove style/script blocks
        h.ignore_tables = False
        return h.handle(html)
    except ImportError:
        return "错误: html2text 未安装"


@router.get("/reports/{experiment_dir}/{filename}/download")
@router.get("/reports/{experiment_dir}/{filename}/download/html")
async def download_html(experiment_dir: str, filename: str):
    """Download report as HTML."""
    content = get_report_content(experiment_dir, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="报告不存在")

    from config import OUTPUT_DIR
    filepath = OUTPUT_DIR / experiment_dir / filename
    if filepath.exists():
        dl_name = filename.replace('.html', '') + '.html'
        return FileResponse(path=str(filepath), filename=dl_name, media_type="text/html")
    raise HTTPException(status_code=404, detail="文件不存在")


@router.get("/reports/{experiment_dir}/{filename}/download/md")
async def download_markdown(experiment_dir: str, filename: str):
    """Download report as Markdown."""
    content = get_report_content(experiment_dir, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="报告不存在")

    md = _html_to_markdown(content)
    dl_name = filename.replace('.html', '') + '.md'

    from urllib.parse import quote
    return Response(
        content=md.encode('utf-8'),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(dl_name)}"},
    )


@router.get("/reports/{experiment_dir}/{filename}/download/pdf")
async def download_pdf(experiment_dir: str, filename: str):
    """Download report as PDF (via print-optimized HTML page)."""
    content = get_report_content(experiment_dir, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="报告不存在")

    # Inject print-optimized CSS and a print trigger
    print_html = content.replace(
        '</head>',
        '''<style>
  @media print {
    body { margin: 0; padding: 15mm; }
    @page { size: A4; margin: 0; }
  }
</style>
<script>window.onload = function() { window.print(); }</script>
</head>''',
    )
    return HTMLResponse(content=print_html)


@router.delete("/reports/{experiment_dir}/{filename}")
async def remove_report(experiment_dir: str, filename: str):
    """Delete a report."""
    success = delete_report(experiment_dir, filename)
    if not success:
        raise HTTPException(status_code=404, detail="报告不存在或删除失败")
    return {"status": "deleted"}
