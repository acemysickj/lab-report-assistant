/** Deterministic blocks -> HTML fragment renderer.
 *  Mirrors backend/services/block_renderer.py:blocks_to_html()
 */
export interface ReportBlock {
  type: 'section_heading' | 'sub_heading' | 'body' | 'display_formula' | 'three_line_table' | 'image';
  text?: string;
  latex?: string;
  headers?: string[];
  rows?: string[][];
  caption?: string;
  path?: string;
  alt?: string;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderBodyText(text: string): string {
  text = esc(text);
  text = text.replace(/(?<!\\)\$([^$]+)(?<!\\)\$/g, '\\($1\\)');
  return text;
}

export function blocksToHtml(blocks: ReportBlock[]): string {
  const parts: string[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case 'section_heading':
        if (b.text) parts.push(`<h2>${esc(b.text)}</h2>`);
        break;
      case 'sub_heading':
        if (b.text) parts.push(`<h3>${esc(b.text)}</h3>`);
        break;
      case 'body':
        if (b.text) parts.push(`<p>${renderBodyText(b.text)}</p>`);
        break;
      case 'display_formula':
        if (b.latex) parts.push(`<div class="formula">\\begin{equation}${b.latex}\\end{equation}</div>`);
        break;
      case 'three_line_table': {
        const headers = b.headers || [];
        const rows = b.rows || [];
        if (headers.length || rows.length) {
          const capHtml = b.caption
            ? `<p style="text-align:center;font-weight:bold;font-size:10.5pt;">${esc(b.caption)}</p>`
            : '';
          const thead = `<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
          const tbody = `<tbody>${rows
            .map((row) => `<tr>${row.map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`)
            .join('')}</tbody>`;
          parts.push(`${capHtml}<table>${thead}${tbody}</table>`);
        }
        break;
      }
      case 'image': {
        if (b.path) {
          const altText = esc(b.alt || '');
          parts.push(
            `<p style="text-align:center;"><img src="${esc(b.path)}" alt="${altText}" style="max-width:100%;"></p>`
          );
          if (b.caption)
            parts.push(`<p style="text-align:center;font-size:10.5pt;">${esc(b.caption)}</p>`);
        }
        break;
      }
    }
  }

  return parts.join('\n');
}

/** Wrap blocks-rendered HTML into a full document ready for download. */
export function blocksToFullHtml(blocks: ReportBlock[], title: string = '实验报告'): string {
  const body = blocksToHtml(blocks);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>
body {
  font-family: "宋体", "SimSun", "Times New Roman", serif;
  font-size: 12pt;
  line-height: 1.5;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20px;
  color: #000;
}
table { border-collapse: collapse; margin: 10px auto; width: 100%; }
thead { border-top: 1.5px solid #000; }
thead tr { border-bottom: 0.75px solid #000; }
tbody tr:last-child { border-bottom: 1.5px solid #000; }
th, td { padding: 4px 8px; font-size: 10.5pt; text-align: center; }
</style>
<script>
MathJax = { tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['$$', '$$']], tags: 'ams' } };
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
</head>
<body>
${body}
</body>
</html>`;
}
