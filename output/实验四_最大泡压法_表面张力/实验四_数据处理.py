"""
实验四 数据处理：最大泡压法测定溶液表面张力
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import numpy as np
from scipy import stats

# ---------- 已知参数 ----------
T_exp = 21.5          # deg C
T_K = T_exp + 273.15  # K
R = 8.314              # J/(mol·K)
NA = 6.02214076e23     # mol^-1

# 水的表面张力温度校正
# sigma_water(25C) = 71.97 x 10^-3 N/m
# d(sigma)/dT = -0.152 x 10^-3 N/(m·K)
sigma_water_25 = 71.97e-3
sigma_water_T = sigma_water_25 + 0.152e-3 * (25.0 - T_exp)
print(f"水在 {T_exp}℃ 的表面张力 σ = {sigma_water_T*1e3:.2f} × 10⁻³ N·m⁻¹")
print(f"  (由 25℃ 标准值 71.97 经温度系数 -0.152×10⁻³ N·m⁻¹·K⁻¹ 校正)")

# ---------- 实验数据 ----------
c_arr = np.array([0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7])  # mol/dm³
dp_arr = np.array([488.200, 382.400, 336.000, 277.200, 235.000, 202.800, 190.600, 169.400])  # kPa

# 原始5次测量
dp_raw = np.array([
    [484, 380, 327, 281, 235, 202, 194, 163],
    [497, 386, 335, 271, 230, 196, 190, 169],
    [476, 378, 340, 277, 235, 208, 192, 165],
    [485, 386, 342, 281, 234, 206, 191, 186],
    [499, 382, 336, 276, 241, 202, 186, 164],
])

dp_avg = dp_raw.mean(axis=0)
dp_std = dp_raw.std(axis=0, ddof=1)

# ---------- Step 1: 计算仪器常数 K ----------
K = sigma_water_T * 1e3 / dp_avg[0]   # 使用水标定
print(f"\n仪器常数 K = σ_water / Δp_water = {sigma_water_T*1e3:.2f} / {dp_avg[0]:.1f} = {K:.5f} × 10⁻³ N·m⁻¹·kPa⁻¹")

# ---------- Step 2: 计算各浓度溶液的表面张力 ----------
sigma_arr = K * dp_avg
print(f"\n{'c (mol/dm³)':>12s}  {'Δp_avg (kPa)':>13s}  {'s (kPa)':>10s}  {'σ (10⁻³N/m)':>13s}")
print("-" * 58)
for i in range(len(c_arr)):
    print(f"{c_arr[i]:12.2f}  {dp_avg[i]:13.3f}  {dp_std[i]:10.4f}  {sigma_arr[i]:13.2f}")

# ---------- Step 3: σ vs ln c 曲线 ----------
# 去掉纯水点(c=0)
c_nonzero = c_arr[1:]
sigma_nonzero = sigma_arr[1:]
ln_c = np.log(c_nonzero)

print(f"\n{'ln c':>10s}  {'σ (10⁻³N/m)':>13s}")
for i in range(len(ln_c)):
    print(f"{ln_c[i]:10.4f}  {sigma_nonzero[i]:13.2f}")

# 多项式拟合 σ = f(ln c)  三阶
# 注意：sigma 值单位为 10⁻³ N/m，拟合时转为 SI (N/m)
sigma_si = sigma_nonzero * 1e-3  # 转换为 N/m

coeffs = np.polyfit(ln_c, sigma_si, 3)
poly = np.poly1d(coeffs)
sigma_fit = poly(ln_c)
residuals = sigma_si - sigma_fit
ss_res = np.sum(residuals**2)
ss_tot = np.sum((sigma_si - np.mean(sigma_si))**2)
r2_poly = 1 - ss_res / ss_tot

print(f"\n三阶多项式拟合 σ = a·(lnc)³ + b·(lnc)² + d·(lnc) + e  (SI: N/m)")
print(f"a = {coeffs[0]:.6f}, b = {coeffs[1]:.6f}, d = {coeffs[2]:.6f}, e = {coeffs[3]:.6f}")
print(f"R² = {r2_poly:.5f}")

# 导数 dσ/d(ln c) = 3a·(lnc)² + 2b·(lnc) + d  (N/m)
deriv = np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_c)

# ---------- Step 4: Gibbs吸附量 Γ ----------
RT = R * T_K
Gamma = -deriv / RT  # mol/m²
Gamma_umol = Gamma * 1e6  # μmol/m²

print(f"\nRT = {RT:.1f} J/mol")
print(f"{'ln c':>10s}  {'dσ/d(ln c)':>13s}  {'Γ (μmol/m²)':>13s}")
for i in range(len(ln_c)):
    print(f"{ln_c[i]:10.4f}  {deriv[i]:13.3f}  {Gamma_umol[i]:13.4f}")

# 最大吸附量 Γ_max
# Langmuir 线性化在此数据上截距为负（物理无意义），改用 Γ-c 曲线峰值法
# 取多项式拟合曲线上 Γ 的最大值作为 Γ_max
# 在实验浓度范围内对拟合曲线加密采样
ln_c_dense = np.linspace(ln_c[0], ln_c[-1], 200)
c_dense = np.exp(ln_c_dense)
sigma_dense = np.polyval(coeffs, ln_c_dense)
deriv_dense = np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_c_dense)
Gamma_dense = -deriv_dense / RT  # mol/m²

idx_max = np.argmax(Gamma_dense)
Gamma_max = Gamma_dense[idx_max]
Gamma_max_umol = Gamma_max * 1e6
c_at_max = c_dense[idx_max]

print(f"\nΓ_max 确定（Γ-c 曲线峰值法）：")
print(f"  Γ_max = {Gamma_max_umol:.2f} μmol/m²  (出现在 c ≈ {c_at_max:.2f} mol/dm³)")
print(f"  (Langmuir 线性化截距为负，不适用，故采用峰值法)")

# ---------- Step 5: 分子横截面积 ----------
S_molecule = 1.0 / (Gamma_max * NA)  # m²
S_A2 = S_molecule * 1e20  # Å²
print(f"\n乙醇分子横截面积 S = 1/(Γ_max · N_A)")
print(f"  S = {S_molecule:.4e} m² = {S_A2:.1f} Å²")
print(f"  文献值: 乙醇 ~22 Å²")

# ---------- 输出汇总 ----------
print(f"\n{'='*60}")
print(f"最终结果汇总:")
print(f"  实验温度: {T_exp}℃ ({T_K:.2f} K)")
print(f"  仪器常数 K = {K:.5f}")
print(f"  水 σ = {sigma_water_T*1e3:.2f} × 10⁻³ N·m⁻¹")
print(f"  Γ_max = {Gamma_max_umol:.2f} μmol/m²")
print(f"  乙醇分子横截面积 S = {S_A2:.1f} Å²")
print(f"{'='*60}")
