const BASE = '/api';

// --- Courses & Experiments ---
export const getCourses = () =>
  request<{ courses: { id: string; name: string; has_handouts: boolean; has_patterns: boolean }[] }>('/courses');

export const getExperiments = (courseId: string) =>
  request<{ course_id: string; experiments: { id: string; title: string; course_id: string }[] }>(`/courses/${encodeURIComponent(courseId)}/experiments`);

// --- Pre-lab ---
export const assemblePrelab = (body: { course_id: string; experiment_id: string; sections: Record<string, string>; student_info: unknown }) =>
  request<{ report_id: string; html_path: string; html: string }>('/reports/prelab/assemble', { method: 'POST', body: JSON.stringify(body) });

// --- Post-lab ---
export const getDataTables = (experimentId: string) =>
  request<{ temperature: boolean; pressure: boolean; tables: unknown[] }>('/reports/postlab/data-tables', {
    method: 'POST', body: JSON.stringify({ experiment_id: experimentId }),
  });

export const analyzeData = (body: { experiment_id: string; data: unknown; temperature?: number; pressure?: number }) =>
  request<{ results: Record<string, unknown>; figures: string[]; logs: string }>('/reports/postlab/analyze', { method: 'POST', body: JSON.stringify(body) });

export const generateFigures = (body: { experiment_id: string; analysis_results: unknown; report_id?: string }) =>
  request<{ figures: string[]; output_dir: string }>('/reports/postlab/figures', { method: 'POST', body: JSON.stringify(body) });

export const assemblePostlab = (body: {
  course_id: string; experiment_id: string; prelab_sections: Record<string, string>;
  records: string; data_analysis: string; discussion: string; questions: string;
  student_info: unknown; figures_html?: string;
}) =>
  request<{ report_id: string; html_path: string; html: string }>('/reports/postlab/assemble', { method: 'POST', body: JSON.stringify(body) });

// --- Course Management ---
export const deleteCourse = (courseId: string) =>
  request<{ status: string }>(`/courses/${encodeURIComponent(courseId)}`, { method: 'DELETE' });

export const reparseCourse = (courseId: string, description: string) => {
  const fd = new FormData();
  fd.append('description', description);
  return request<{ status: string; message: string; experiments?: { id: string; title: string }[] }>(
    `/courses/${encodeURIComponent(courseId)}/reparse`,
    { method: 'POST', body: fd },
  );
};

// --- Files ---
export const listReports = () =>
  request<{ reports: { id: string; experiment_dir: string; html_path: string; created_at: string; size: number }[] }>('/files/reports');

export const deleteReport = (experimentDir: string, filename: string) =>
  request<{ status: string }>(`/files/reports/${encodeURIComponent(experimentDir)}/${encodeURIComponent(filename)}`, { method: 'DELETE' });

export const healthCheck = () =>
  request<{ status: string; claude_api: boolean }>('/health');

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}
