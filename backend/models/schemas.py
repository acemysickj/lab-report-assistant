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
