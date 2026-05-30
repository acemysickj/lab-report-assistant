"""Manage the output/ directory for report files."""
import json
import uuid
from pathlib import Path
from datetime import datetime
from config import OUTPUT_DIR


def generate_report_id() -> str:
    """Generate a unique report ID."""
    return uuid.uuid4().hex[:12]


def get_experiment_dir(experiment_id: int, experiment_title: str) -> Path:
    dir_name = f"实验{experiment_id}_{experiment_title}"
    exp_dir = OUTPUT_DIR / dir_name
    exp_dir.mkdir(parents=True, exist_ok=True)
    return exp_dir


def save_report_html(
    experiment_id: int,
    experiment_title: str,
    report_id: str,
    html_content: str,
    phase: str,
) -> Path:
    """Save a report HTML file."""
    exp_dir = get_experiment_dir(experiment_id, experiment_title)
    filename = f"实验{experiment_id}_{phase}_报告_{report_id}.html"
    filepath = exp_dir / filename
    filepath.write_text(html_content, encoding="utf-8")
    return filepath


def save_progress(
    experiment_id: int,
    experiment_title: str,
    report_id: str,
    progress: dict,
) -> Path:
    """Save report generation progress."""
    exp_dir = get_experiment_dir(experiment_id, experiment_title)
    filepath = exp_dir / f"progress_{report_id}.json"
    filepath.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")
    return filepath


def load_progress(experiment_id: int, experiment_title: str, report_id: str) -> dict | None:
    """Load saved progress."""
    exp_dir = get_experiment_dir(experiment_id, experiment_title)
    filepath = exp_dir / f"progress_{report_id}.json"
    if filepath.exists():
        return json.loads(filepath.read_text(encoding="utf-8"))
    return None


def list_reports() -> list[dict]:
    """List all reports by scanning output/ directory.

    Filename format: 实验{id}_{phase}_报告_{report_id}.html
    """
    reports = []
    if not OUTPUT_DIR.exists():
        return reports

    for exp_dir in sorted(OUTPUT_DIR.iterdir()):
        if not exp_dir.is_dir() or exp_dir.name.startswith("_"):
            continue
        for file in sorted(exp_dir.iterdir(), reverse=True):
            if not file.suffix == ".html":
                continue
            stem = file.stem
            # Parse report_id from filename
            if "_报告_" in stem:
                rid = stem.rsplit("_报告_", 1)[-1]
            else:
                rid = stem  # old files without standard naming

            reports.append({
                "id": rid,
                "experiment_dir": exp_dir.name,
                "html_path": str(file),
                "created_at": datetime.fromtimestamp(file.stat().st_mtime).isoformat(),
                "size": file.stat().st_size,
            })

    reports.sort(key=lambda r: r["created_at"], reverse=True)
    return reports


def get_report_content(experiment_dir: str, filename: str) -> str | None:
    """Get the HTML content of a specific report."""
    filepath = OUTPUT_DIR / experiment_dir / filename
    if filepath.exists():
        return filepath.read_text(encoding="utf-8")
    return None


def delete_report(experiment_dir: str, filename: str) -> bool:
    """Delete a report file."""
    filepath = OUTPUT_DIR / experiment_dir / filename
    if filepath.exists():
        filepath.unlink()
        return True
    return False
