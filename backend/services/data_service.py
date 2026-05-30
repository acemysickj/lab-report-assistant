"""Data analysis service — runs Python analysis scripts for each experiment.

Reuses and adapts existing data processing patterns from the skill's output/ directory.
"""
import subprocess
import tempfile
import json
import sys
from pathlib import Path
from config import PROJECT_ROOT


# Data table schemas for each experiment
# These mirror the tables in the handout's "数据记录" sections
EXPERIMENT_DATA_TABLES = {
    1: {  # 原电池电动势
        "temperature": True,
        "pressure": False,
        "tables": [
            {
                "title": "电池电动势测量",
                "description": "重复测量3次",
                "columns": ["电池", "实测1 (V)", "实测2 (V)", "实测3 (V)", "平均值 (V)"],
                "rows": ["电池3-1 (Zn-Cu)", "电池3-2 (Zn-SCE)", "电池3-3 (SCE-Cu)"],
                "cellType": "number",
            },
            {
                "title": "不同温度下电池3-2的电动势",
                "description": "SCE电极电势：25℃ φ=0.2412V, 30℃ φ=0.2378V, 40℃ φ=0.2307V",
                "columns": ["温度 (℃)", "实测1 (V)", "实测2 (V)", "实测3 (V)", "平均值 (V)"],
                "rows": ["30", "35", "40", "45"],
                "cellType": "number",
            },
        ],
    },
    2: {  # 蔗糖水解（旋光法）
        "temperature": True,
        "pressure": True,
        "tables": [
            {
                "title": "旋光度随时间变化",
                "description": "每2分钟记录一次旋光度αt",
                "columns": ["时间 (min)"]
                + [f"αt (度)"],
                "rows": ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30"],
                "cellType": "number",
                "multiGroup": True,
                "groupLabel": "实验组",
            },
            {
                "title": "α∞ 测量 (反应终了旋光度)",
                "description": "加热后冷却至室温，测5次",
                "columns": ["测量1", "测量2", "测量3", "测量4", "测量5"],
                "rows": ["α∞ (度)"],
                "cellType": "number",
            },
        ],
    },
    3: {  # 乙酸乙酯皂化
        "temperature": True,
        "pressure": False,
        "tables": [
            {
                "title": "电导率测量 (30℃)",
                "description": "G0 = ____, G∞ = ____",
                "columns": ["时间 (min)"]
                + [f"Gt (μS/cm)"],
                "rows": ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30"],
                "cellType": "number",
                "constants": {"G0": "初始电导率", "G∞": "终了电导率"},
            },
            {
                "title": "电导率测量 (40℃)",
                "description": "G0 = ____, G∞ = ____",
                "columns": ["时间 (min)"]
                + [f"Gt (μS/cm)"],
                "rows": ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30"],
                "cellType": "number",
                "constants": {"G0": "初始电导率", "G∞": "终了电导率"},
            },
        ],
    },
    4: {  # 最大泡压法表面张力
        "temperature": True,
        "pressure": False,
        "tables": [
            {
                "title": "不同浓度乙醇溶液的 Δp 测量",
                "description": "每个浓度重复测量3次",
                "columns": ["浓度 (mol/dm³)", "Δp1 (kPa)", "Δp2 (kPa)", "Δp3 (kPa)", "Δp平均 (kPa)", "σ (10⁻³N/m)"],
                "rows": ["水 (0)", "0.05", "0.1", "0.2", "0.3", "0.4", "0.5", "0.7"],
                "cellType": "number",
                "computed": ["Δp平均", "σ"],
            },
        ],
    },
    5: {  # 二组分固液相图
        "temperature": False,
        "pressure": False,
        "tables": [
            {
                "title": "步冷曲线温度记录",
                "description": "每30秒记录一次温度",
                "columns": ["时间 (s)"] + [f"样品{i} 温度 (℃)" for i in range(1, 7)],
                "rows": [str(i * 30) for i in range(1, 31)],  # 30 readings
                "cellType": "number",
            },
        ],
    },
    6: {  # 气液平衡相图
        "temperature": True,
        "pressure": True,
        "tables": [
            {
                "title": "工作曲线 — 折光率与组成",
                "description": "测量已知浓度标准溶液的折光率",
                "columns": ["环己烷体积分数", "0.10", "0.20", "0.30", "0.40", "0.50", "0.60", "0.70", "0.80", "0.90"],
                "rows": ["折光率 nD"],
                "cellType": "number",
            },
            {
                "title": "溶液沸点与气液平衡折光率",
                "description": "1-9号溶液 + 纯乙醇 + 纯环己烷",
                "columns": ["溶液编号", "沸点 (℃)", "气相 nD", "液相 nD"],
                "rows": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "乙醇", "环己烷"],
                "cellType": "number",
            },
        ],
    },
}


def get_data_tables(experiment_id: int) -> dict:
    """Get the data table schema for an experiment."""
    return EXPERIMENT_DATA_TABLES.get(experiment_id, {"temperature": False, "pressure": False, "tables": []})


def run_analysis(experiment_id: int, data: dict, temperature: float = None, pressure: float = None) -> dict:
    """Run data analysis for an experiment.

    For experiments with existing Python analysis scripts (2, 4),
    we adapt those patterns. For others, we compute inline.
    """
    results = {
        "results": {},
        "figures": [],
        "logs": "",
    }

    try:
        if experiment_id == 2:
            results = _analyze_experiment_2(data, temperature, pressure)
        elif experiment_id == 4:
            results = _analyze_experiment_4(data, temperature)
        else:
            results["logs"] = f"实验{experiment_id}的数据分析将使用讲义中的公式进行计算。"
            results["results"] = {"status": "ready", "data": data}

    except Exception as e:
        results["logs"] = f"分析错误: {str(e)}"
        import traceback
        results["logs"] += "\n" + traceback.format_exc()

    return results


def _analyze_experiment_2(data: dict, temperature: float = None, pressure: float = None) -> dict:
    """Analyze experiment 2: Sucrose hydrolysis rate constant.

    Replicates the logic from output/实验二_蔗糖水解_旋光法/实验二_数据处理.py
    """
    import numpy as np
    from scipy import stats

    t = np.array(data.get("t", []))
    alpha_t = np.array(data.get("alpha_t", []))
    alpha_inf = data.get("alpha_inf", 0)

    if len(t) == 0 or len(alpha_t) == 0:
        return {"logs": "缺少数据", "results": {}}

    # Compute delta and ln(delta)
    delta = np.array(alpha_t) - alpha_inf
    # Filter positive deltas only
    mask = delta > 0
    t_filtered = np.array(t)[mask]
    delta_filtered = delta[mask]
    ln_delta = np.log(delta_filtered)

    # Linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(t_filtered, ln_delta)
    r2 = r_value ** 2

    # Rate constant k = -slope
    k = -slope
    half_life = np.log(2) / k if k > 0 else float('inf')

    # Standard deviations
    n = len(t_filtered)
    y_pred = slope * t_filtered + intercept
    residuals = ln_delta - y_pred
    s_yx = np.sqrt(np.sum(residuals**2) / (n - 2))
    x_mean = np.mean(t_filtered)
    s_xx = np.sum((t_filtered - x_mean)**2)
    s_slope = s_yx / np.sqrt(s_xx)
    s_intercept = s_yx * np.sqrt(1/n + x_mean**2 / s_xx)
    s_k = s_slope
    s_hl = np.log(2) * s_k / (k**2)

    alpha_0 = alpha_inf + np.exp(intercept)

    return {
        "results": {
            "slope": round(slope, 6),
            "intercept": round(intercept, 6),
            "r2": round(r2, 6),
            "k": round(k, 6),
            "s_k": round(s_k, 8),
            "half_life": round(half_life, 2),
            "s_hl": round(s_hl, 4),
            "alpha_0": round(alpha_0, 4),
            "s_slope": round(s_slope, 8),
            "s_intercept": round(s_intercept, 8),
            "t": t.tolist(),
            "alpha_t": alpha_t.tolist(),
            "ln_delta": ln_delta.tolist(),
            "delta": delta_filtered.tolist(),
            "temperature": temperature,
            "pressure": pressure,
        },
        "logs": f"线性回归: y = {slope:.6f}x + {intercept:.6f}, R² = {r2:.6f}\n速率常数 k = {k:.6f} ± {s_k:.8f} min⁻¹\n半衰期 t½ = {half_life:.2f} ± {s_hl:.4f} min",
        "figures": [],
    }


def _analyze_experiment_4(data: dict, temperature: float = None) -> dict:
    """Analyze experiment 4: Surface tension by maximum bubble pressure.

    Replicates the logic from output/实验四_最大泡压法_表面张力/实验四_数据处理.py
    """
    import numpy as np

    T_exp = temperature if temperature else 25.0
    T_K = T_exp + 273.15
    R = 8.314
    NA = 6.02214076e23

    # Water surface tension temperature correction
    sigma_water_25 = 71.97e-3  # N/m at 25°C
    sigma_water_T = sigma_water_25 + 0.152e-3 * (25.0 - T_exp)

    c_arr = np.array(data.get("concentrations", [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7]))
    dp_arr = np.array(data.get("dp_values", []))

    if len(dp_arr) == 0:
        return {"logs": "缺少压力数据", "results": {}}

    # Calculate instrument constant K from water measurement
    K = sigma_water_T * 1e3 / dp_arr[0]

    # Calculate surface tensions
    sigma_arr = K * dp_arr  # × 10⁻³ N/m

    # Polynomial fit: σ vs ln(c) for non-zero concentrations
    c_nonzero = c_arr[1:]
    sigma_nonzero = sigma_arr[1:]
    ln_c = np.log(c_nonzero)
    sigma_si = sigma_nonzero * 1e-3

    coeffs = np.polyfit(ln_c, sigma_si, 3)
    poly = np.poly1d(coeffs)
    sigma_fit = poly(ln_c)
    ss_res = np.sum((sigma_si - sigma_fit)**2)
    ss_tot = np.sum((sigma_si - np.mean(sigma_si))**2)
    r2_poly = 1 - ss_res / ss_tot

    # Derivative and Gibbs adsorption
    RT = R * T_K
    deriv = np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_c)
    Gamma = -deriv / RT
    Gamma_umol = (Gamma * 1e6).tolist()

    # Find max adsorption
    ln_c_dense = np.linspace(ln_c[0], ln_c[-1], 200)
    deriv_dense = np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_c_dense)
    Gamma_dense = -deriv_dense / RT
    idx_max = np.argmax(Gamma_dense)
    Gamma_max = Gamma_dense[idx_max]
    S_molecule = 1.0 / (Gamma_max * NA)
    S_A2 = S_molecule * 1e20

    return {
        "results": {
            "T_exp": T_exp,
            "T_K": round(T_K, 2),
            "sigma_water": round(sigma_water_T * 1e3, 2),
            "K": round(K, 5),
            "concentrations": c_arr.tolist(),
            "dp_values": dp_arr.tolist(),
            "sigma_values": sigma_arr.tolist(),
            "ln_c": ln_c.tolist(),
            "sigma_si": sigma_si.tolist(),
            "coeffs": [round(c, 6) for c in coeffs.tolist()],
            "r2_poly": round(r2_poly, 5),
            "Gamma_umol": Gamma_umol,
            "Gamma_max_umol": round(Gamma_max * 1e6, 2),
            "S_A2": round(S_A2, 1),
        },
        "logs": (
            f"仪器常数 K = {K:.5f}\n"
            f"三阶拟合 R² = {r2_poly:.5f}\n"
            f"Γ_max = {Gamma_max*1e6:.2f} μmol/m²\n"
            f"乙醇分子横截面积 S = {S_A2:.1f} Å²\n"
            f"文献值: 乙醇 ~22 Å²"
        ),
        "figures": [],
    }
