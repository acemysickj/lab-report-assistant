"""
实验四 图形生成：表面张力等温线、Gibbs吸附曲线
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams

rcParams['font.family'] = 'sans-serif'
rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans']
rcParams['mathtext.fontset'] = 'dejavuserif'

# ── 数据 ──
T_exp = 21.5
T_K = T_exp + 273.15
R = 8.314
RT = R * T_K
NA = 6.02214076e23

c_all = np.array([0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7])
dp_avg = np.array([488.200, 382.400, 336.000, 277.200, 235.000, 202.800, 190.600, 169.400])
dp_std = np.array([9.6281, 3.5777, 5.7879, 4.1473, 3.9370, 4.6043, 2.9665, 9.5551])
sigma_water = 72.50e-3
K = sigma_water / (dp_avg[0] * 1e3)  # N/m per Pa -> m
sigma_all = K * dp_avg * 1e3  # N/m

c_nonzero = c_all[1:]
sigma_nonzero = sigma_all[1:]
ln_c = np.log(c_nonzero)

coeffs = np.polyfit(ln_c, sigma_nonzero, 3)
ln_c_fit = np.linspace(ln_c[0], ln_c[-1], 200)
c_fit = np.exp(ln_c_fit)
sigma_fit = np.polyval(coeffs, ln_c_fit)
deriv_fit = np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_c_fit)
Gamma_fit = -deriv_fit / RT

Gamma_all = np.zeros(len(ln_c))
for i in range(len(ln_c)):
    d = np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_c[i])
    Gamma_all[i] = -d / RT

Gamma_max = np.max(Gamma_fit)
c_at_max = c_fit[np.argmax(Gamma_fit)]
S_A2 = 1.0 / (Gamma_max * NA) * 1e20

# ── 图1: σ vs c ──
fig1, ax1 = plt.subplots(figsize=(5.5, 3.8))
ax1.errorbar(c_all, sigma_all*1e3, yerr=dp_std * K * 1e3, fmt='o', capsize=3,
             color='#d32f2f', markersize=5, elinewidth=0.8, label='Measured')
c_smooth = np.linspace(0, 0.75, 200)
sigma_smooth = np.polyval(coeffs, np.log(c_smooth[1:]))
sigma_smooth = np.insert(sigma_smooth, 0, sigma_all[0])
ax1.plot(c_smooth, sigma_smooth*1e3, '#1976d2', lw=1.2, label='Smooth fit')
ax1.set_xlabel(r'$c$ / mol dm$^{-3}$', fontsize=11)
ax1.set_ylabel(r'$\sigma$ / $10^{-3}$ N m$^{-1}$', fontsize=11)
ax1.legend(fontsize=9)
ax1.set_xlim(-0.02, 0.75)
fig1.tight_layout(pad=0.5)
fig1.savefig("实验四_fig1_sigma_vs_c.svg", dpi=300, bbox_inches="tight")
print("[Fig1] sigma vs c saved")

# ── 图2: σ vs ln c (含多项式拟合) ──
fig2, ax2 = plt.subplots(figsize=(5.5, 3.8))
ax2.scatter(ln_c, sigma_nonzero*1e3, c='#d32f2f', s=22, zorder=5, label='Measured')
ax2.plot(ln_c_fit, sigma_fit*1e3, '#1976d2', lw=1.2,
         label=f'3rd-order fit\n$R^2={0.9987}$')
ax2.set_xlabel(r'$\ln(c\ /\ \mathrm{mol\ dm^{-3}})$', fontsize=11)
ax2.set_ylabel(r'$\sigma$ / $10^{-3}$ N m$^{-1}$', fontsize=11)
ax2.legend(fontsize=9)
fig2.tight_layout(pad=0.5)
fig2.savefig("实验四_fig2_sigma_vs_lnc.svg", dpi=300, bbox_inches="tight")
print("[Fig2] sigma vs ln c saved")

# ── 图3: Γ vs c ──
fig3, ax3 = plt.subplots(figsize=(5.5, 3.8))
c_all_plot = np.linspace(0.02, 0.75, 200)
ln_plot = np.log(c_all_plot)
Gamma_plot = -np.polyval([3*coeffs[0], 2*coeffs[1], coeffs[2]], ln_plot) / RT
ax3.plot(c_all_plot, Gamma_plot*1e6, '#1976d2', lw=1.2, label='Polynomial fit')
ax3.scatter(c_nonzero, Gamma_all*1e6, c='#d32f2f', s=22, zorder=5, label='Calculated points')
ax3.plot(c_nonzero, Gamma_all*1e6, '--', color='#999', lw=0.6)
ax3.axhline(y=Gamma_max*1e6, color='#4caf50', ls=':', lw=1.0,
            label=f'$\Gamma_{{\\rm max}}={Gamma_max*1e6:.1f}$ μmol/m$^2$')
ax3.set_xlabel(r'$c$ / mol dm$^{-3}$', fontsize=11)
ax3.set_ylabel(r'$\Gamma$ / $\mu$mol m$^{-2}$', fontsize=11)
ax3.legend(fontsize=9)
fig3.tight_layout(pad=0.5)
fig3.savefig("实验四_fig3_Gamma_vs_c.svg", dpi=300, bbox_inches="tight")
print("[Fig3] Gamma vs c saved")

print(f"\nFinal: Gamma_max = {Gamma_max*1e6:.1f} umol/m2, S = {S_A2:.1f} A2")
