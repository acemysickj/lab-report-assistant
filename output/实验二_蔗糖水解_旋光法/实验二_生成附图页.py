# Generate Appendix page — user-selected items only, no captions
import json, os, math

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, "data.json"), "r", encoding="utf-8") as f:
    d = json.load(f)

t = d["t"]; g1 = d["G1"]; g2 = d["G2"]

def read_svg(fn):
    with open(os.path.join(script_dir, fn), "r", encoding="utf-8") as f:
        return f.read()

fig2_svg = read_svg("实验二_fig2_线性回归.svg")

def proc_table(g):
    at = g["alpha_t"]; ld = g["ln_delta"]
    h = '<div class="item">'
    for row_i in range(2):
        s = row_i*8; e = min(s+8,15)
        cols = "".join(f"<th>{t[i]}</th>" for i in range(s,e))
        ats = "".join(f"<td>{at[i]:.3f}</td>" for i in range(s,e))
        lns = "".join(f"<td>{ld[i]:.4f}</td>" for i in range(s,e))
        h += f'<table class="data"><thead><tr><th>t/min</th>{cols}</tr></thead><tbody><tr><td>at / deg</td>{ats}</tr><tr><td>ln(at - ainf)</td>{lns}</tr></tbody></table>'
    h += '</div>'
    return h

# Literature Ea table (表5)
T_lit_C = [22, 26, 30, 34]
T_lit_K = [295.15, 299.15, 303.15, 307.15]
k_lit = [0.01504, 0.02667, 0.04824, 0.08386]
ea_rows = ""
for i in range(4):
    invT = 1.0 / T_lit_K[i]
    lnk = math.log(k_lit[i])
    ea_rows += f'<tr><td>{T_lit_C[i]}</td><td>{T_lit_K[i]:.2f}</td><td>{invT:.6f}</td><td>{k_lit[i]:.5f}</td><td>{lnk:.4f}</td></tr>'

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>实验二 附图页</title>
<style>
  body {{ font-family: "SimSun","宋体","SimHei",sans-serif; font-size: 14px; max-width: 850px; margin: 20px auto; padding: 10px 30px; }}
  h2 {{ font-size: 16px; font-family: "SimHei","黑体",sans-serif; text-align: center; margin: 0 0 20px; }}
  .item {{ text-align: center; margin: 52px 0; page-break-inside: avoid; }}
  .item svg {{ max-width: 100%; height: auto; }}
  table.data {{ width: 100%; border-collapse: collapse; margin: 0 auto; font-size: 13px; }}
  table.data + table.data {{ margin-top: 0; }}
  table.data + table.data thead {{ border-top: none; }}
  table.data thead {{ border-top: 1.5px solid #000; border-bottom: 0.75px solid #000; }}
  table.data tbody {{ border-bottom: 1.5px solid #000; }}
  table.data th {{ padding: 4px 3px; font-size: 11px; text-align: center; font-weight: bold; }}
  table.data td {{ padding: 3px; text-align: center; }}
  @media print {{
    body {{ padding: 0 10px; margin: 0 auto; }}
    h2 {{ margin: 0 0 12px; font-size: 14px; }}
    .item {{ margin: 36px 0; }}
  }}
</style>
</head>
<body>

<h2>实验二 附图页</h2>

<div class="item">
{proc_table(g1)}
</div>

<div class="item">
{proc_table(g2)}
</div>

<div class="item">
<table class="data">
  <thead><tr><th>T / ℃</th><th>T / K</th><th>1/T / K<sup>-1</sup></th><th>k / min<sup>-1</sup></th><th>ln k</th></tr></thead>
  <tbody>
{ea_rows}  </tbody>
</table>
</div>

<div class="item">
{fig2_svg.replace('<svg ', '<svg style="max-width:95%;height:auto;" ')}
</div>

</body>
</html>"""

with open(os.path.join(script_dir, "实验二_附图页.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("Appendix page saved.")
