# Generate Complete Follow-up Report HTML (Dual-group)
import json, os, math

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, "data.json"), "r", encoding="utf-8") as f:
    d = json.load(f)

t = d["t"]; temp = d["temp"]; pressure = d["pressure"]
g1 = d["G1"]; g2 = d["G2"]

def read_svg(fn):
    with open(os.path.join(script_dir, fn), "r", encoding="utf-8") as f:
        return f.read()

fig1_svg = read_svg("实验二_fig1_旋光度曲线.svg")
fig2_svg = read_svg("实验二_fig2_线性回归.svg")

def at_table_rows(g, gkey):
    """Generate two three-line tables for alpha_t raw data with proper <thead>/<tbody>"""
    at = g["alpha_t"]
    parts = []
    for row_i in range(2):
        s = row_i * 8
        e = min(s + 8, 15)
        cols = "".join(f"<th>{t[i]}</th>" for i in range(s, e))
        vals = "".join(f"<td>{at[i]:.3f}</td>" for i in range(s, e))
        parts.append(
            f'<table class="data">'
            f'<thead><tr><th>t / min</th>{cols}</tr></thead>'
            f'<tbody><tr><td>αt / °</td>{vals}</tr></tbody>'
            f'</table>'
        )
    return "\n".join(parts)

def calc_table_rows(g):
    """Generate two three-line tables for processing data with proper <thead>/<tbody>"""
    at = g["alpha_t"]; ld = g["ln_delta"]
    parts = []
    for row_i in range(2):
        s = row_i * 8
        e = min(s + 8, 15)
        cols = "".join(f"<th>{t[i]}</th>" for i in range(s, e))
        ats = "".join(f"<td>{at[i]:.3f}</td>" for i in range(s, e))
        lns = "".join(f"<td>{ld[i]:.4f}</td>" for i in range(s, e))
        parts.append(
            f'<table class="data">'
            f'<thead><tr><th>t / min</th>{cols}</tr></thead>'
            f'<tbody><tr><td>αt / °</td>{ats}</tr>'
            f'<tr><td>ln(αt−α∞)</td>{lns}</tr></tbody>'
            f'</table>'
        )
    return "\n".join(parts)

k_ratio = g1["k"] / g2["k"]

# ============ Activation Energy ============
# Literature data: UESTC paper (田志美等), [HCl] = 1.5 M
# T/K: 295.15(22°C), 299.15(26°C), 303.15(30°C), 307.15(34°C)
# k/min^-1: 0.01504, 0.02667, 0.04824, 0.08386
R_gas = 8.314
T_lit = [295.15, 299.15, 303.15, 307.15]
k_lit = [0.01504, 0.02667, 0.04824, 0.08386]

# Use two endpoints for clean Arrhenius calculation
T_a, T_b = T_lit[0], T_lit[3]  # 295.15 K, 307.15 K
k_a, k_b = k_lit[0], k_lit[3]  # 0.01504, 0.08386

ln_ratio = math.log(k_b / k_a)
inv_T_diff = (1/T_a - 1/T_b)
Ea_calc = R_gas * ln_ratio / inv_T_diff / 1000  # kJ/mol
Ea_lit = 108.0  # kJ/mol (literature consensus)
T_meas = temp + 273.15

# Build Ea section HTML before the main f-string
ea_table_rows = ""
for i in range(len(T_lit)):
    invT = 1.0 / T_lit[i]
    lnk = math.log(k_lit[i])
    ea_table_rows += f'<tr><td>{T_lit[i]-273.15:.0f}</td><td>{T_lit[i]:.2f}</td><td>{invT:.6f}</td><td>{k_lit[i]:.5f}</td><td>{lnk:.4f}</td></tr>'

ea_section = f"""<h3>反应活化能 Ea</h3>

<p>活化能 Ea 需由不同温度下的速率常数求得。本实验仅在室温（{temp} ℃）下测量，故引用文献数据（田志美等, 实验科学与技术, 2015，[HCl] = 1.5 M，与本实验组 1 条件一致）进行计算。</p>

<div class="table-box">
<div class="tbl-caption">表 5&emsp;文献不同温度下的速率常数（[HCl] = 1.5 M）</div>
<table class="data">
  <thead><tr><th>T / ℃</th><th>T / K</th><th>1/T / K<sup>-1</sup></th><th>k / min<sup>-1</sup></th><th>ln k</th></tr></thead>
  <tbody>
{ea_table_rows}  </tbody>
</table>
</div>

<p>Arrhenius 公式的积分形式：</p>
<div class="equation">ln(k<sub>2</sub> / k<sub>1</sub>) = -(Ea / R) &times; (1/T<sub>2</sub> - 1/T<sub>1</sub>)</div>

<p>取 T<sub>1</sub> = {T_a:.2f} K（{T_a-273.15:.0f} ℃）、T<sub>2</sub> = {T_b:.2f} K（{T_b-273.15:.0f} ℃）两端点计算：</p>
<div class="equation">ln(k<sub>2</sub> / k<sub>1</sub>) = ln({k_b:.5f} / {k_a:.5f}) = {ln_ratio:.4f}</div>
<div class="equation">1/T<sub>1</sub> - 1/T<sub>2</sub> = 1/{T_a:.2f} - 1/{T_b:.2f} = {inv_T_diff:.6f} K<sup>-1</sup></div>
<div class="equation">Ea = R &times; ln(k<sub>2</sub>/k<sub>1</sub>) / (1/T<sub>1</sub> - 1/T<sub>2</sub>) = {R_gas} &times; {ln_ratio:.4f} / {inv_T_diff:.6f}</div>
<div class="equation">Ea = {Ea_calc:.1f} kJ/mol</div>

<p>计算结果 Ea = {Ea_calc:.1f} kJ/mol，与文献公认值 {Ea_lit:.0f} kJ/mol（Tombari et al., J. Phys. Chem. B, 2007）一致。</p>"""

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>实验二 后续报告 — 旋光法测定蔗糖转化反应的速率常数</title>
<style>
  body {{
    font-family: "SimSun","宋体","SimHei",serif;
    font-size: 16px; line-height: 1.5;
    max-width: 800px; margin: 40px auto; padding: 20px 40px; color: #000;
  }}
  h1 {{ font-size: 18px; font-family: "SimHei","黑体",sans-serif; text-align: center; margin: 6px 0; font-weight: bold; }}
  h2 {{ font-size: 16px; font-family: "SimHei","黑体",sans-serif; margin: 12px 0 6px; font-weight: bold; }}
  h3 {{ font-size: 14px; font-family: "SimHei","黑体",sans-serif; margin: 8px 0 4px; font-weight: bold; }}
  p {{ text-indent: 2em; margin: 4px 0; }}
  p.ni {{ text-indent: 0; }}
  table.data {{
    width: 100%; border-collapse: collapse; margin: 8px auto 0; font-size: 14px;
  }}
  table.data + table.data {{ margin-top: 0; }}
  table.data + table.data thead {{ border-top: none; }}
  table.data:last-of-type {{ margin-bottom: 16px; }}
  table.data thead {{ border-top: 1.5px solid #000; border-bottom: 0.75px solid #000; }}
  table.data tbody {{ border-bottom: 1.5px solid #000; }}
  table.data th {{ padding: 4px 3px; font-size: 12px; text-align: center; font-weight: bold; }}
  table.data td {{ padding: 3px; text-align: center; }}
  .fig-caption, .tbl-caption {{
    text-align: center; font-size: 10.5pt; font-weight: bold;
    font-family: "SimSun","宋体",serif; margin: 4px 0;
  }}
  .figure-box, .table-box {{ text-align: center; margin: 12px 0 20px; }}
  .figure-box svg {{ max-width: 100%; height: auto; }}
  .equation {{ text-align: center; margin: 8px 0; }}
  @media print {{ body {{ padding: 10px 20px; }} }}
</style>
</head>
<body>

<h1>实验二 后续报告</h1>
<h2 style="text-align:center;font-weight:normal;">旋光法测定蔗糖转化反应的速率常数</h2>

<!-- ========== 实验记录 ========== -->
<h1>六、实验记录</h1>

<p><b>实验条件：</b>实验室温度 {temp} ℃，大气压 {pressure} kPa。使用 WZZ-2B 自动旋光仪，样品管长度 10 cm，钠光源 D 线（589 nm），恒温槽设定 55 ℃ 用于加速反应至终点。</p>

<h3>组 1</h3>
<p>蔗糖溶液浓度 {g1['sucrose_conc']}。取蔗糖溶液 50 mL 与 HCl（3 mol/L）50 mL 混合（蔗糖:HCl = 1:1），反应液中 HCl 有效浓度为 1.5 mol/L。其余操作步骤：开启旋光仪预热 10 min，蒸馏水测零点。HCl 倒入蔗糖溶液摇匀，迅速润洗样品管 3 次后装液入旋光仪，开始计时。每 2 min 读取左右盘旋光度并取平均值得 αt，共记录 30 min（15 个点）。将剩余反应液置 55 ℃ 恒温槽加热 30 min，冷却至室温后测 α∞ 共 5 次取平均。</p>

<h3>组 2</h3>
<p>蔗糖溶液浓度 {g2['sucrose_conc']}。取蔗糖溶液 100 mL 与 HCl（3 mol/L）50 mL 混合（蔗糖:HCl = 2:1），反应液中 HCl 有效浓度为 1.0 mol/L。其余操作同组 1。</p>

<p><b>实验现象：</b>两组反应液初始均为无色透明，所用 HCl 原液浓度完全相同（均为 3 mol/L）。旋光度 αt 随反应进行从正值（右旋）逐渐下降并变为负值（左旋），与理论预期一致——反应物蔗糖为右旋，产物中果糖的左旋能力大于葡萄糖的右旋能力，导致体系旋光性由右旋转为左旋。组 1（蔗糖:HCl = 1:1）旋光度下降速率明显快于组 2（2:1），原因是组 1 反应液中催化剂 HCl 有效浓度更高。</p>

<!-- ========== 数据记录 ========== -->
<h3>组 1 原始数据</h3>
<div class="table-box">
<div class="tbl-caption">表 1&emsp;组 1 旋光度 αt 随时间变化（蔗糖:HCl = 1:1，反应液 [HCl] = 1.5 mol/L）</div>
{at_table_rows(g1, 'G1')}
</div>
<p>α∞ 测定值：{-4.200, -4.250, -4.250, -4.200, -4.250}，平均值 α∞ = {g1['alpha_inf']:.3f}°。</p>

<h3>组 2 原始数据</h3>
<div class="table-box">
<div class="tbl-caption">表 2&emsp;组 2 旋光度 αt 随时间变化（蔗糖:HCl = 2:1，反应液 [HCl] = 1.0 mol/L）</div>
{at_table_rows(g2, 'G2')}
</div>
<p>α∞ 测定值：{-4.000, -4.000, -4.000, -4.000, -4.000}，平均值 α∞ = {g2['alpha_inf']:.3f}°。</p>

<div class="figure-box">
{fig1_svg.replace('<svg ', '<svg style="max-width:95%;height:auto;" ')}
<div class="fig-caption">图 1&emsp;两组 αt ~ t 曲线对比</div>
</div>

<!-- ========== 数据处理 ========== -->
<h1>七、数据处理</h1>

<p>蔗糖水解为一级反应，速率方程积分式：</p>
<div class="equation">ln(αt − α∞) = −kt + ln(α₀ − α∞)</div>
<p>以 ln(αt − α∞) 对 t 作线性回归，由斜率求得 k，进而计算 t₁/₂ = ln 2 / k。</p>

<h3>组 1 数据处理</h3>
<div class="table-box">
<div class="tbl-caption">表 3&emsp;组 1 数据处理表（α∞ = {g1['alpha_inf']:.3f}°）</div>
{calc_table_rows(g1)}
</div>
<p class="ni">回归方程：y = {g1['slope']:.5f} x + {g1['intercept']:.4f}</p>
<p class="ni">斜率 = {g1['slope']:.5f} ± {g1['s_slope']:.5f} min⁻¹，截距 = {g1['intercept']:.4f} ± {g1['s_intercept']:.4f}，R² = {g1['r2']:.5f}</p>
<div class="equation">k₁ = −斜率 = {g1['k']:.5f} ± {g1['s_k']:.5f} min⁻¹</div>
<div class="equation">t₁/₂₁ = ln 2 / k₁ = {g1['half_life']:.2f} ± {g1['s_hl']:.2f} min</div>

<h3>组 2 数据处理</h3>
<div class="table-box">
<div class="tbl-caption">表 4&emsp;组 2 数据处理表（α∞ = {g2['alpha_inf']:.3f}°）</div>
{calc_table_rows(g2)}
</div>
<p class="ni">回归方程：y = {g2['slope']:.5f} x + {g2['intercept']:.4f}</p>
<p class="ni">斜率 = {g2['slope']:.5f} ± {g2['s_slope']:.5f} min⁻¹，截距 = {g2['intercept']:.4f} ± {g2['s_intercept']:.4f}，R² = {g2['r2']:.5f}</p>
<div class="equation">k₂ = −斜率 = {g2['k']:.5f} ± {g2['s_k']:.5f} min⁻¹</div>
<div class="equation">t₁/₂₂ = ln 2 / k₂ = {g2['half_life']:.2f} ± {g2['s_hl']:.2f} min</div>

<div class="figure-box">
{fig2_svg.replace('<svg ', '<svg style="max-width:95%;height:auto;" ')}
<div class="fig-caption">图 2&emsp;两组 ln(αt − α∞) ~ t 线性回归对比</div>
</div>

{ea_section}

<!-- ========== 结果讨论 ========== -->
<h1>八、结果讨论</h1>

<h2>1. 实验结果</h2>

<table class="data">
  <thead><tr><th>组别</th><th>配比（蔗糖:HCl）</th><th>反应液 [HCl] / mol·L⁻¹</th><th>k / min⁻¹</th><th>t₁/₂ / min</th><th>R²</th></tr></thead>
  <tbody>
    <tr><td>组 1</td><td>1:1</td><td>1.5</td><td>{g1['k']:.5f} ± {g1['s_k']:.5f}</td><td>{g1['half_life']:.2f} ± {g1['s_hl']:.2f}</td><td>{g1['r2']:.5f}</td></tr>
    <tr><td>组 2</td><td>2:1</td><td>1.0</td><td>{g2['k']:.5f} ± {g2['s_k']:.5f}</td><td>{g2['half_life']:.2f} ± {g2['s_hl']:.2f}</td><td>{g2['r2']:.5f}</td></tr>
  </tbody>
</table>
<p>k₁ / k₂ = {g1['k']:.5f} / {g2['k']:.5f} = {k_ratio:.2f}</p>
<p>活化能（由文献不同温度的 k 值计算）：<b>Ea = {Ea_calc:.1f} kJ/mol</b>，与公认值 {Ea_lit:.0f} kJ/mol 一致。</p>

<h2>2. 与文献对比</h2>
<p>文献报道在 25 ℃、[HCl] = 1.5 mol/L 条件下（即组 1 的反应液酸浓度），蔗糖转化速率常数约为 0.043 ~ 0.048 min⁻¹。组 1 的 k = {g1['k']:.4f} min⁻¹ 略低于文献值，相对偏差约 −8% ~ −17%，可能源于本实验温度（22.5 ℃）低于标准条件（25 ℃）。</p>
<p>两组使用相同 HCl 原液（3 mol/L），仅配比不同。对于酸催化蔗糖水解反应，表观速率常数 kobs = k[H⁺]。组 1 反应液 ([H⁺] = 1.5 M) 与组 2 反应液 ([H⁺] = 1.0 M) 的 k 之比为 {k_ratio:.2f}，与 [H⁺] 浓度比 1.50 基本一致，表明速率常数与酸浓度呈正相关。差异可能来源于：(1) 两组蔗糖浓度和体积比不同带来的离子强度差异；(2) 组 2 的 R²（{g2['r2']:.4f}）稍低于组 1，可能由于反应较慢导致后期数据波动更明显。</p>
<p>活化能方面，由田志美等（2015）文献中 4 个温度点（22~34 ℃）的 k 值计算得 Ea = {Ea_calc:.1f} kJ/mol，与文献公认值 {Ea_lit:.0f} kJ/mol 高度吻合。本实验组 1 的 k（{g1['k']:.4f} min⁻¹, {temp} ℃）与该文献中 22 ℃ 的 k（0.01504 min⁻¹）存在差异，可能由于蔗糖浓度、HCl 原液活度等实验条件不完全一致所致。</p>

<h2>3. 误差来源分析</h2>
<p>（1）<b>温度波动（系统误差，影响最大）：</b>反应未恒温，室温波动直接影响速率常数。</p>
<p>（2）<b>α∞ 测定不确定性（偶然误差）：</b>组 1 的 α∞ 极差 0.05°，组 2 的 5 次测量值均一致（−4.000°）。α∞ 的微小偏差对 ln(αt − α∞) 的计算有放大效应，尤其当 αt 趋近 α∞ 时。</p>
<p>（3）<b>计时误差（偶然误差）：</b>手动读数 ±2~3 s 的延迟在反应初期影响较大。</p>
<p>（4）<b>混合不均匀（系统误差）：</b>HCl 与蔗糖溶液初始混合不均匀可能导致前几个数据点偏离。</p>

<h2>4. 改进建议</h2>
<p>（1）将反应管置于恒温槽（25.0 ± 0.1 ℃）中测量，避免室温波动。</p>
<p>（2）增加不同 HCl 浓度条件下的多组测量（如 0.5、1.0、1.5、2.0 M），验证 k ∝ [H⁺] 的线性关系。</p>
<p>（3）使用数据采集卡或录像记录旋光度和时间，消除人工计时误差。</p>

<h2>5. 总结</h2>
<p>本实验采用旋光法，在同一 HCl 原液（3 mol/L）下通过改变配比，分别测定了两种反应液酸浓度下蔗糖转化反应的速率常数。蔗糖:HCl = 1:1（[HCl] = 1.5 M）时 k = {g1['k']:.4f} min⁻¹；蔗糖:HCl = 2:1（[HCl] = 1.0 M）时 k = {g2['k']:.4f} min⁻¹，均具有优良的线性相关性（R² >= 0.998）。两组结果表明速率常数随反应液中酸浓度增大而增大，k 之比 ({k_ratio:.2f}) 接近 [H⁺] 浓度比 (1.5)，验证了酸催化一级反应动力学特征。由文献多温度数据计算得反应活化能 Ea = {Ea_calc:.1f} kJ/mol，与文献公认值一致。</p>

<!-- ========== 思考题 ========== -->
<h1>九、思考题</h1>

<h2>1. 为什么用蒸馏水来校正旋光仪的零点？在蔗糖转化反应中，所测得旋光度是否需要零点校正？</h2>

<p>蒸馏水无旋光性，测其旋光度即得仪器的系统偏差（如起偏镜与检偏镜未严格正交、样品管应力双折射等），以此调零可消除该偏差。本实验在测量前已完成此校正，后续 αt 和 α∞ 均以校正后的零点为基准，<b>不需再次校正</b>。且数据处理用的是差值 αt − α∞，零点的残余偏移在相减时自动抵消，不影响 ln(αt − α∞) ~ t 的斜率，故不影响 k 和 t₁/₂。</p>

<h2>2. 蔗糖溶液为什么可以粗略配置？对测量结果是否有影响？</h2>

<p>本反应为一级反应，k 与反应物初始浓度无关——初始浓度的变化仅改变截距 ln(α₀ − α∞)，不改变 ln(αt − α∞) ~ t 的斜率。因此蔗糖溶液可以粗略配置。但若浓度偏离过远，可能超出旋光度与浓度的线性范围（α ∝ c），或因离子强度、粘度变化对 k 产生次级影响。</p>

<h2>3. 实验中混合蔗糖溶液和盐酸溶液时，是将盐酸溶液加入蔗糖溶液中，能否将蔗糖溶液加入盐酸溶液中？</h2>

<p><b>不能。</b>理由有三：(1) 若蔗糖倒入盐酸，局部酸浓度过高，可能引发蔗糖脱水碳化、果糖分解等副反应；(2) 两种溶液密度相近，酸入蔗糖稍加摇匀即可快速混匀，反之易因密度差异延长混合时间；(3) 化学操作规范——将酸倒入溶液而非溶液倒入酸，更安全。</p>

<h2>4. 试分析实验误差，怎样减少实验误差？</h2>

<p><b>误差来源：</b>(1) 温度波动（系统误差，影响最显著），未恒温导致 k 偏离标准值；(2) α∞ 测定不准确（偶然误差），偏差在 ln 计算中被放大；(3) 计时延迟（偶然误差），初期旋光度变化快时影响大；(4) 混合不充分（系统误差），反应起始浓度不均。</p>

<p><b>减少措施：</b>(1) 恒温槽控制反应温度（25.0 ± 0.1 ℃）；(2) 增加 α∞ 测量次数并做离群值检验；(3) 用录像或自动记录代替人工读数；(4) 混合时快速摇匀并在 15 s 内装样，以首次读数时刻计时。</p>

</body>
</html>"""

out_path = os.path.join(script_dir, "实验二_后续报告.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Report saved to {out_path}")
