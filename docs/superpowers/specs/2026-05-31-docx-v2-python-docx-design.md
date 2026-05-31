# DOCX v2：python-docx 模板填充 + addFormula2docx OMML 直通

日期：2026-05-31
状态：设计完成，待实现
关联：v1 pandoc 方案已完成（commit dcdf310）

## 动机

pandoc MVP 已实现 DOCX 导出（230 个 OMML 公式），但存在两个问题：
1. OMML 公式内有多余空格（pandoc/texmath 生成质量问题）
2. 无法支持用户上传自定义 .docx 模板进行样式填充

v2 用 python-docx + addFormula2docx 替代 pandoc，从结构化内容直接构建 DOCX。

## 技术路线

```
用户 LaTeX 公式字符串
    │
    ▼
latex2mathml (PyPI: latex2mathml.converter.convert)
    │
    ▼
MathML XML (lxml etree)
    │
    ▼
MML2OMML.XSL (微软 Word 2016 官方 XSLT 处理器)
    │
    ▼
OMML XML → python-docx 插入段落/模板占位符
```

### 核心依赖

| 依赖 | 用途 | 来源 |
|------|------|------|
| python-docx | DOCX 构建、模板解析、段落/表格操作 | PyPI |
| latex2mathml | LaTeX 字符串 → MathML XML | PyPI |
| lxml | XSLT 处理器 (MathML → OMML) | PyPI |
| MML2OMML.XSL | 微软官方 MathML→OMML 转换样式表 | addFormula2docx 仓库 (MIT) |
| Pillow / cairosvg | SVG → PNG 预渲染 | PyPI |

### 复用 addFormula2docx 的模块

从 [Sun-ZhenXing/addFormula2docx](https://github.com/Sun-ZhenXing/addFormula2docx) (MIT) 引入：

- `formulas/utils.py` — latex_to_mathml(), mathml_to_omml() 转换函数
- `formulas/MML2OMML.XSL` — 微软 XSL 样式表
- `formulas/Formula.py` — Formula 类（封装 LaTeX/MathML/OMML 互转 + 插入 docx）

放入 `backend/services/docx_v2/` 目录，标注版权来源。

## 架构设计

### 新增文件

```
backend/services/docx_v2/
    __init__.py          # 公开接口
    converter.py          # 公式提取 + LaTeX→OMML 转换
    builder.py            # python-docx 文档构建器
    template.py           # 模板解析与占位符填充（v2.1）
    MML2OMML.XSL          # 来自 addFormula2docx (MIT)
```

### 核心流程

```
预/后续报告的结构化内容
    (section_name → html_content 字典)
        │
        ▼
converter.py: 解析 HTML，分离文字和公式
    - 正则提取 \(...\) / $$...$$ / \begin{...}...\end{...}
    - 每个公式调用 latex_to_mathml() → mathml_to_omml()
    - 输出: [TextChunk | OMMLChunk] 列表
        │
        ▼
builder.py: 构建 DOCX
    - 从 reference.docx 复制样式（或使用内置默认模板）
    - 逐 section 写入：
        - 标题 → Heading 样式
        - TextChunk → 普通段落
        - OMMLChunk → 内嵌 OMML 公式
        - 图片 → add_picture() 嵌入 PNG
        - 表格 → add_table() + 三线表样式
    - 输出 .docx bytes
        │
        ▼
POST /api/reports/export-docx-v2
    - 接收结构化内容（与现有 assemble 相同的输入）
    - 返回 .docx 文件流
```

### HTML 内容解析策略

现有系统 assemble 出的 HTML 包含：
- LaTeX 公式：`\(...\)`、`$$...$$`、`\begin{equation}`、`\begin{align}`
- 三线表：`<table>` 标签
- SVG 图表：`<img src="...svg">`
- 普通 HTML 结构：`<h2>`、`<p>`、`<ul>`、`<ol>`

v2 解析器需要：
1. 将 HTML 按公式边界切割为片段（文字片段 + 公式片段交替）
2. 文字片段：去除 HTML 标签，保留纯文本
3. 公式片段：提取 LaTeX 源码，走 latex2mathml→mathml2omml
4. 表格：解析 `<table>` 为 python-docx Table 对象
5. 图片：将 SVG 预渲染为 PNG（cairosvg），再用 python-docx 嵌入

## MVP 范围（v2.0）

### 实现内容

1. 引入 addFormula2docx 核心模块到 `backend/services/docx_v2/`
2. 实现 `converter.py`：HTML 解析 + LaTeX→OMML 公式转换
3. 实现 `builder.py`：python-docx 文档构建（含三线表、图片嵌入）
4. 新增 `POST /api/reports/export-docx-v2` 端点
5. 前端 `ReportPreview.tsx` 增加"下载 DOCX (精准版)"按钮

### 不实现（留到 v2.1+）

- 用户上传自定义 .docx 模板解析
- 占位符自动识别与填充
- 公式编号对齐（\tag{} 支持）
- 复杂 LaTeX 环境（\begin{cases}、\begin{matrix} 等 — 依赖 latex2mathml 支持度）

### 与 v1 pandoc 的关系

- v1 端点 `POST /api/reports/export-docx` 保留，作为快速备选
- v2 端点独立为 `POST /api/reports/export-docx-v2`
- 前端默认使用 v2，v1 保留在"下载 DOCX (快速版)"按钮

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `backend/services/docx_v2/__init__.py` | 公开 API |
| 新建 | `backend/services/docx_v2/converter.py` | HTML 解析 + LaTeX→OMML |
| 新建 | `backend/services/docx_v2/builder.py` | python-docx 文档构建 |
| 新建 | `backend/services/docx_v2/MML2OMML.XSL` | 微软 XSL 样式表 |
| 新建 | `backend/services/docx_v2/OMML2MML.XSL` | 微软逆向 XSL 样式表 |
| 新建 | `backend/services/docx_v2/formula.py` | Formula 类（来自 addFormula2docx, MIT） |
| 新建 | `backend/services/docx_v2/utils.py` | 转换工具函数（来自 addFormula2docx, MIT） |
| 修改 | `backend/routers/reports.py` | 新增 export-docx-v2 端点 |
| 修改 | `frontend/src/api/client.ts` | 新增 exportDocxV2() |
| 修改 | `frontend/src/pages/ReportPreview.tsx` | 新增 v2 下载按钮 |

## 测试验证

1. 用 test-to-del/ 目录中的 HTML 报告做转换对比
2. 对比 v1 pandoc 和 v2 python-docx 生成的 DOCX：
   - 公式编辑体验（双击 Word 公式编辑器）
   - 公式内是否还有多余空格
   - 表格样式（三线表）
   - 中文宋体渲染
3. 测试复杂公式：分式、上标下标、希腊字母、积分、求和

## 风险

| 风险 | 缓解 |
|------|------|
| latex2mathml 不支持复杂 LaTeX | 对不支持的公式降级为纯文本占位 + 日志记录 |
| XSL 转换性能 | 一次性加载 XSLT 处理器（模块级缓存） |
| HTML 解析边界情况（公式嵌套、转义字符） | 用 HTML parser (BeautifulSoup) 替代正则，渐进增强 |
| SVG→PNG 转换质量 | 使用 cairosvg，设置足够 DPI (300) |
