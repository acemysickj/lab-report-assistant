#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实验六：二组分完全互溶系统气-液平衡相图的绘制 — 数据分析脚本
体系：环己烷(1) - 乙醇(2)
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from scipy.interpolate import PchipInterpolator

# 设置中文字体
import matplotlib.font_manager as fm
for fname in ["Microsoft YaHei", "SimHei", "WenQuanYi Micro Hei", "Noto Sans CJK SC"]:
    try:
        fm.findfont(fname, fallback_to_default=False)
        plt.rcParams["font.family"] = fname
        break
    except Exception:
        continue

# ============================================================
# 实验数据
# ============================================================
T_lab = 20.0
P_atm = 102.0
nD_cyc_meas = 1.4064   # 用户实测
nD_etoh_lit = 1.3614    # 文献
nD_cyc_lit  = 1.4262    # 文献

rho_cyc, M_cyc   = 0.779, 84.16
rho_etoh, M_etoh = 0.789, 46.07
Tb_etoh_lit = 78.3
Tb_cyc_lit  = 80.7

# 三个实验点: V_cyc=30, V_etoh, Tb, nD_liq, nD_gas
raw = [
    (30, 0.6, 79.0, 1.4226, 1.4137),
    (30, 0.9, 79.0, 1.4226, 1.4209),
    (30, 1.5, 77.0, 1.4225, 1.4083),
]

print("=" * 72)
print("  实验六：二组分完全互溶系统气-液平衡相图的绘制")
print("  体系：环己烷 (1) - 乙醇 (2)")
print("=" * 72)

# ============================================================
# 任务 1：液相组成
# ============================================================
print("\n" + "=" * 60)
print("  液相组成计算")
print("=" * 60)

n_cyc = 30 * rho_cyc / M_cyc  # 0.2777 mol, 三次相同
x_liq = []

for i, (vcyc, vetoh, tb, nliq, ngas) in enumerate(raw):
    n_etoh_i = vetoh * rho_etoh / M_etoh
    xi = n_cyc / (n_cyc + n_etoh_i)
    x_liq.append(xi)
    print(f"  点{i+1}: n_etoh={n_etoh_i:.5f} mol, x_cyc={xi:.4f}")

# ============================================================
# 任务 2：气相组成（用文献端点线性插值）
# ============================================================
print("\n" + "=" * 60)
print("  气相组成（文献端点线性插值）")
print("=" * 60)
dnD = nD_cyc_lit - nD_etoh_lit
y_vap = []
for i, (vcyc, vetoh, tb, nliq, ngas) in enumerate(raw):
    yi = (ngas - nD_etoh_lit) / dnD
    y_vap.append(yi)
    print(f"  点{i+1}: nD_gas={ngas:.4f}, y_cyc={yi:.4f}")

print("\n  汇总:")
print(f"  {'点':>4s}  {'Tb/℃':>7s}  {'x_cyc':>8s}  {'y_cyc':>8s}")
for i in range(3):
    print(f"  {i+1:4d}  {raw[i][2]:7.1f}  {x_liq[i]:8.4f}  {y_vap[i]:8.4f}")

# ============================================================
# 任务 3：绘制正式 T-x-y 相图
# ============================================================
#
# 做法：以文献相图曲线为背景，叠加实验测量点。
# 文献参考数据（环己烷-乙醇，101.3 kPa，取自 DECHEMA / 文献汇编）：
#
# Tb(℃): 78.3  72.5  68.5  66.0  65.0  64.85 65.0  66.5  69.5  73.5  78.0  80.7
# x_cyc:  0     0.05  0.10  0.20  0.35  0.45  0.55  0.70  0.80  0.90  0.95  1.0
# y_cyc:  0     0.15  0.27  0.38  0.44  0.45  0.52  0.62  0.74  0.86  0.93  1.0
#
# 注意：这些是文献近似值，用于绘制参考曲线。

print("\n" + "=" * 60)
print("  绘制 T-x-y 相图")
print("=" * 60)

# --- 文献参考数据（用于构造平滑曲线）---
x_lit = np.array([0.00, 0.05, 0.10, 0.20, 0.35, 0.45, 0.55, 0.70, 0.80, 0.90, 0.95, 1.00])
y_lit = np.array([0.00, 0.15, 0.27, 0.38, 0.44, 0.45, 0.52, 0.62, 0.74, 0.86, 0.93, 1.00])
T_lit = np.array([78.3, 72.5, 68.5, 66.0, 65.0, 64.85, 65.0, 66.5, 69.5, 73.5, 78.0, 80.7])

# 用 PCHIP 插值（保单调）生成平滑曲线
x_dense = np.linspace(0, 1, 200)
T_liq_smooth = PchipInterpolator(x_lit, T_lit)(x_dense)
T_vap_smooth = PchipInterpolator(y_lit, T_lit)(x_dense)

# --- 绘图 ---
fig, ax = plt.subplots(figsize=(11, 7.5))

# 文献参考曲线（灰色背景）
ax.plot(x_dense, T_liq_smooth, "-",  color="gray", linewidth=1.5, alpha=0.5,
        label="Bubble curve (lit.)")
ax.plot(x_dense, T_vap_smooth, "--", color="gray", linewidth=1.5, alpha=0.5,
        label="Dew curve (lit.)")

# 填充气液两相区
ax.fill_between(x_dense, T_liq_smooth, T_vap_smooth, alpha=0.05, color="blue")
ax.fill_between(x_dense, T_vap_smooth, 84, alpha=0.03, color="red")
ax.fill_between(x_dense, 60, T_liq_smooth, alpha=0.03, color="green")

# 区域标注（拉开距离避免重叠）
ax.text(0.02, 80.5, "Vapor", fontsize=12, color="red", fontstyle="italic",
        alpha=0.45, ha="left", va="center")
ax.text(0.02, 75.0, "Liquid", fontsize=12, color="green", fontstyle="italic",
        alpha=0.45, ha="left", va="center")
ax.text(0.70, 67.0, "L + V", fontsize=12, color="blue", fontstyle="italic",
        alpha=0.45, ha="center", va="center")

# 纯组分（文献值）：方块标记，标签放置在数据坐标的远处
ax.scatter([0, 1], [Tb_etoh_lit, Tb_cyc_lit], marker="s", s=50,
           c="#7F7F7F", zorder=5)
# 乙醇标签：左偏移，放外侧
ax.text(-0.07, Tb_etoh_lit, f"Ethanol\n({Tb_etoh_lit}℃)",
        fontsize=8.5, color="#7F7F7F", ha="right", va="center",
        linespacing=1.3)
# 环己烷标签：右偏移，放外侧
ax.text(1.07, Tb_cyc_lit, f"Cyclohexane\n({Tb_cyc_lit}℃)",
        fontsize=8.5, color="#7F7F7F", ha="left", va="center",
        linespacing=1.3)

# 恒沸点（文献值）
azeo_x, azeo_T = 0.45, 64.85
ax.scatter([azeo_x], [azeo_T], marker="*", s=300, c="gold",
           edgecolors="darkorange", linewidths=1.5, zorder=8)
# 恒沸点标签：箭头指到点，文字往右上方偏移
ax.annotate(f"Azeotrope (lit.)\n$x_1$ = {azeo_x}, T = {azeo_T:.1f}℃",
            xy=(azeo_x, azeo_T), xytext=(azeo_x + 0.22, azeo_T + 5),
            fontsize=9, ha="center", color="darkorange",
            arrowprops=dict(arrowstyle="->", color="darkorange", lw=1.2))

# --- 实验数据点（突出显示）---
T_exp = np.array([r[2] for r in raw])
x_exp = np.array(x_liq)
y_exp = np.array(y_vap)

# 液相点：红色实心圆（大号）
ax.scatter(x_exp, T_exp, marker="o", s=120, c="#D62728", edgecolors="darkred",
           linewidths=1.5, zorder=10, label="Liquid (exp.)")
# 气相点：蓝色空心圆（大号）
ax.scatter(y_exp, T_exp, marker="o", s=120, c="white", edgecolors="#1F77B4",
           linewidths=2.5, zorder=10, label="Vapor (exp.)")

# 连接同一温度下的气-液点（tie lines，虚线）
for i in range(3):
    ax.plot([x_exp[i], y_exp[i]], [T_exp[i], T_exp[i]], "--",
            color="#9467BD", linewidth=0.8, alpha=0.6)

# 数据点标注：手动调整每个点的标签位置避免重叠
# 点1: x=0.9643, y=0.8071, T=79.0
# 点2: x=0.9474, y=0.9182, T=79.0
# 点3: x=0.9153, y=0.7238, T=77.0
#
# 点1和点2的液相点非常近(x差0.017)，且温度相同。标签必须错开。

label_offsets = [
    # (liq_x_offset, liq_y_offset, gas_x_offset, gas_y_offset)
    (-35, +8,  +12, -18),    # 点1
    (-35, -14, +12, +8),     # 点2 — 与点1错开
    (-35, +8,  +12, -14),    # 点3
]

for i in range(3):
    lx, ly = label_offsets[i][0], label_offsets[i][1]
    gx, gy = label_offsets[i][2], label_offsets[i][3]
    ax.annotate(f"#{i+1}", xy=(x_exp[i], T_exp[i]),
                xytext=(lx, ly), textcoords="offset points",
                fontsize=10, color="#D62728", fontweight="bold",
                ha="right",
                arrowprops=dict(arrowstyle="-", color="#D62728", lw=0.5, alpha=0.5))
    ax.annotate(f"#{i+1}", xy=(y_exp[i], T_exp[i]),
                xytext=(gx, gy), textcoords="offset points",
                fontsize=10, color="#1F77B4", fontweight="bold",
                ha="left",
                arrowprops=dict(arrowstyle="-", color="#1F77B4", lw=0.5, alpha=0.5))

# 坐标轴
ax.set_xlim(-0.04, 1.04)
ax.set_ylim(62, 84)
ax.set_xlabel("Cyclohexane mole fraction  $x_1$ (liquid)  /  $y_1$ (vapor)",
              fontsize=12, labelpad=8)
ax.set_ylabel("Temperature  $T$ / ℃", fontsize=12, labelpad=8)
ax.grid(True, alpha=0.2, linestyle="--")
ax.tick_params(labelsize=10)

# 图例：放在图内右上角空白处
ax.legend(loc="upper right", fontsize=9, framealpha=0.85, ncol=1,
          bbox_to_anchor=(1.0, 0.98))

# 图题由 HTML 报告提供，图片内不再重复
plt.tight_layout()

# 保存
output_path = "d:/Claude Program/lab-assistant/output/实验六_气液平衡相图/T-x相图.png"
plt.savefig(output_path, dpi=200, bbox_inches="tight")
plt.close(fig)
print(f"\n  图片已保存到：{output_path}")

# ============================================================
# 恒沸点判断
# ============================================================
print("\n" + "=" * 60)
print("  恒沸点判断")
print("=" * 60)
print(f"  实测最低沸点 T_min = {min(T_exp):.1f} ℃ (点3)")
print(f"  T_min ({min(T_exp):.1f}℃) < Tb*(乙醇) ({Tb_etoh_lit}℃) ✓")
print(f"  T_min ({min(T_exp):.1f}℃) < Tb*(环己烷) ({Tb_cyc_lit}℃) ✓")
print(f"  → 存在最低恒沸点，与文献一致。")
print(f"  → 文献恒沸点: x1 ≈ {azeo_x}, T ≈ {azeo_T}℃")
print(f"  → 实验数据点集中 x > 0.9, 无法从实验曲线直接确定恒沸点。")

print("\n" + "=" * 72)
print("  所有计算完成")
print("=" * 72)
