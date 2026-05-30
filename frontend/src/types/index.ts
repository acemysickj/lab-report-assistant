export interface Course {
  id: string;
  name: string;
  has_handouts: boolean;
  has_patterns: boolean;
}

export interface Experiment {
  id: string;
  title: string;
  course_id: string;
  source_file?: string;
}

export interface StudentInfo {
  name: string;
  student_id: string;
  class_name: string;
  instructor: string;
  course: string;
  experiment_date: string;
  submit_date: string;
}

export interface ReviewResult {
  passed: boolean;
  feedback: string;
  round: number;
}

export type ReportPhase = 'prelab' | 'postlab';
export type PreLabSection = 'purpose' | 'principle' | 'equipment' | 'procedure';

export interface DataTableSchema {
  title: string;
  description?: string;
  columns: string[];
  rows: string[];
  cellType?: string;
  multiGroup?: boolean;
  groupLabel?: string;
  computed?: string[];
  constants?: Record<string, string>;
  temperature?: boolean;
}

export const SECTION_LABELS: Record<string, string> = {
  purpose: '实验目的',
  principle: '实验原理',
  equipment: '仪器与试剂',
  procedure: '实验步骤',
  records: '实验记录',
  discussion: '结果讨论',
  questions: '思考题',
};
