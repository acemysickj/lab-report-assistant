# DOCX 导出功能 — 设计规格

日期：2026-05-31
状态：已确认，待实现
关联：lab-assistant v1.0 MVP

## 目标

为 lab-assistant 增加 DOCX 导出功能，学生完成 HTML 报告后可一键下载 Word 文档。MVP 使用 pandoc 快速实现，后续版本演进到 python-docx 模板填充。

## 当前系统状态

- 后端 FastAPI + 前端 React/Vite/TypeScript/Ant Design
- 已产出完整 HTML 报告（通过 `/api/reports/prelab/assemble` 和 `/api/reports/postlab/assemble`）
- HTML 包含三线表 CSS、MathJax 渲染公式（`\\(...\\)` 行内 + `$$...$$` 独立行 + `\\begin{equation}` 编号）、内联 SVG 架构图
- 图表由 matplotlib 生成 SVG/PNG，通过 `/output` 路径静态服务
- 数据表为 HTML `<table>` 标签

## 整体架构

```
assemble 产出 HTML
        │
        ▼
  HTML 预处理（LaTeX 格式转换、SVG→PNG 替换）
        │
        ▼
  pandoc HTML → DOCX（使用 reference.docx 控制样式）
        │
        ▼
  DOCX 文件流返回前端下载
```

## MVP 范围

### 后端新增

1. **`backend/services/docx_service.py`** — DOCX 生成核心
   - `convert_html_to_docx(html: str, reference_docx: str | None) -> bytes`
   - 预处理：`\\(` → `$`, `\\)` → `$`, `\\begin{equation}` → `$$`, `\\end{equation}` → `$$`
   - SVG `<img>` 标签处理（MVP：替换为 alt 文本占位，提醒用户图表见 HTML 版）
   - 调用 subprocess pandoc
   - 返回 DOCX 字节流

2. **`backend/routers/reports.py`** 新增端点
   - `POST /api/reports/export-docx` — 接收 `{ html: str, report_id: str }`，返回 `application/vnd.openxmlformats-officedocument.wordprocessingml.document` 流

3. **`backend/config.py`** 新增配置
   - `PANDOC_PATH` — pandoc 可执行文件路径（默认 "pandoc"）
   - `REFERENCE_DOCX` — 参考模板路径（可选）

### 前端改动

1. **`ReportPreview.tsx`** 新增"下载 DOCX"按钮
   - 调用 `/api/reports/export-docx`
   - 触发浏览器下载

### 不改动

- HTML 生成管线完全不动
- 审查循环不动
- 数据表格/分析/绘图全部不动
- 现有 API 端点签名不动

## 技术决策

### 公式转换

**MVP：正则替换 + pandoc**

```
\\(...\\)      →  $...$       (pandoc 认识的行内公式)
$$...$$        →  保持         (pandoc 认识的独立公式)
\begin{equation} → $$         (去掉编号环境，pandoc 不认)
\end{equation}   → $$
```

pandoc 内部调 texmath 将 `$...$` / `$$...$$` 转为 OMML。

**风险**：`\begin{align}`、`\begin{cases}` 等复杂环境可能转换失败。MVP 先不做处理，遇到时记录日志。

**v2 升级**：latex2mathml → mathml2omml 直通 python-docx。

### SVG 图片

**MVP**：替换为占位文本 `[图表：{filename}]`。学生可在 Word 中手动插入 PNG。

**理由**：pandoc 不认识 SVG，成本最低。

**v2**：后台预渲染 SVG→PNG（cairosvg），再将 PNG 写入 DOCX。

### 参考模板 (reference.docx)

**MVP**：不提供自定义模板，使用 pandoc 默认样式。

**v2**：生成一个符合中国大学实验报告格式的 `reference.docx`（宋体 12pt、三线表样式、页边距等），作为 pandoc `--reference-doc`。

### 三线表

**MVP**：pandoc 默认表格样式。CSS 三线表样式（`border-top/bottom: 1.5px`）在 DOCX 中丢失。

**缓解**：v2 用 reference.docx 预定义三线表样式。

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `backend/services/docx_service.py` | HTML→DOCX 转换 |
| 修改 | `backend/routers/reports.py` | 新增 export-docx 端点 |
| 修改 | `backend/config.py` | 新增 pandoc 配置项 |
| 修改 | `frontend/src/pages/ReportPreview.tsx` | 新增下载 DOCX 按钮 |
| 修改 | `frontend/src/api/client.ts` | 新增 apiExportDocx 函数 |
| 新建 | `backend/requirements.txt` | 无需新增（用 subprocess 调 pandoc） |

## 测试验证

1. 用已有 output/ 目录下的 HTML 报告做转换测试
2. 验证公式在 Word 中可编辑（双击进入 Word 公式编辑器）
3. 验证中文宋体正确渲染
4. 验证表格结构完整

## 后续阶段

### v2 — python-docx 模板填充
- 用户上传 .docx 模板
- python-docx 解析段落/表格结构
- latex2mathml + mathml2omml 替代 pandoc
- SVG→PNG 预渲染

### v3 — 智能模板
- 自动识别模板占位区域（如 `${name}`、`${report_content}`）
- 多校模板库
