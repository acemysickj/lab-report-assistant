"""Pydantic models for API requests and responses."""
from pydantic import BaseModel, Field
from typing import Optional, Literal


# --- Student Info ---
class StudentInfo(BaseModel):
    name: str = ""
    student_id: str = ""
    class_name: str = ""
    instructor: str = ""
    course: str = ""
    experiment_date: str = ""
    submit_date: str = ""


# --- Pre-lab ---
class PreLabGenerateRequest(BaseModel):
    course_id: str
    experiment_id: str
    section: Literal["purpose", "principle", "equipment", "procedure"]
    student_info: StudentInfo = Field(default_factory=StudentInfo)


class ReviewRequest(BaseModel):
    course_id: str
    experiment_id: str
    section: str
    content: str


class ReviewResponse(BaseModel):
    passed: bool
    feedback: str
    round: int


class ReviseRequest(BaseModel):
    course_id: str
    experiment_id: str
    section: str
    content: str
    feedback: str


class AssembleRequest(BaseModel):
    course_id: str
    experiment_id: str
    sections: dict  # {section_name: html_content}
    student_info: StudentInfo


# --- Post-lab ---
class PostLabGenerateRequest(BaseModel):
    course_id: str
    experiment_id: str
    section: Literal["records", "discussion", "questions"]
    data: dict = {}
    analysis_results: dict = {}
    student_info: StudentInfo = Field(default_factory=StudentInfo)


# --- DOCX v2 Direct Build ---

class MarkupBlock(BaseModel):
    """A single block in a template markup."""
    index: int
    type: Literal["section_heading", "sub_heading", "body",
                  "inline_formula", "display_formula",
                  "three_line_table", "image"]
    text: str = ""
    fixed: bool = False
    latex: str = ""          # for inline_formula / display_formula
    headers: list[str] = []  # for three_line_table
    rows: list[list[str]] = []  # for three_line_table
    caption: str = ""        # for three_line_table / image
    image_count: int = 0     # for image
    descriptions: list[str] = []  # for image


class PageSetup(BaseModel):
    """Page and font settings extracted from DOCX template."""
    width_cm: float = 21.0
    height_cm: float = 29.7
    top_margin_cm: float = 2.54
    bottom_margin_cm: float = 2.54
    left_margin_cm: float = 1.92
    right_margin_cm: float = 1.57
    font_ascii: str = "Calibri"
    font_east_asia: str = "宋体"
    font_size_pt: float = 12.0
    line_spacing: float = 1.5


class TemplateMarkup(BaseModel):
    """Complete template markup: page setup + blocks."""
    template_name: str
    page_setup: PageSetup = Field(default_factory=PageSetup)
    blocks: list[MarkupBlock] = []


class DocxBuildRequest(BaseModel):
    """Request to build a DOCX from a template + experiment data."""
    template_name: str
    course_id: str
    experiment_id: str
    experiment_data: dict = {}
