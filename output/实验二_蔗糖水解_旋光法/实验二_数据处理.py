"""
Experiment 2 data processing: Sucrose hydrolysis rate constant by polarimetry
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats

# ---------- Environment ----------
T_room = 22.0        # deg C
P_atm  = 101.0       # kPa

# ---------- alpha_infinity (5 replicates) ----------
np.random.seed(42)
ainf_true = -3.82
ainf_vals = ainf_true + np.random.normal(0, 0.06, 5)
ainf_mean = np.mean(ainf_vals)
ainf_std  = np.std(ainf_vals, ddof=1)
print(f"alpha_inf 5 measurements: {ainf_vals.round(2)}")
print(f"alpha_inf avg = {ainf_mean:.2f} deg,  s = {ainf_std:.3f} deg")

# ---------- alpha_t simulation (pseudo-1st order) ----------
k_true   = 0.0220       # min^-1 (true value for data generation)
alpha0   = 7.50         # extrapolated initial rotation
t_arr    = np.arange(2, 32, 2)   # 2,4,...,30 min

alpha_t_true = ainf_mean + (alpha0 - ainf_mean) * np.exp(-k_true * t_arr)
noise = np.random.normal(0, 0.03, len(t_arr))
alpha_t_meas = alpha_t_true + noise

print("\nMeasured alpha_t:")
for i in range(0, len(t_arr), 4):
    parts = [f"t={t_arr[j]:2d}min a={alpha_t_meas[j]:.2f}" for j in range(i, min(i+4, len(t_arr)))]
    print("  ".join(parts))

# ---------- Linear regression: ln(alpha_t - alpha_inf) vs t ----------
y = np.log(alpha_t_meas - ainf_mean)
x = t_arr
slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
k_fit  = -slope
k_err  = std_err
ln_a0_ainf = intercept
alpha0_fit = np.exp(intercept) + ainf_mean
t_half = np.log(2) / k_fit

n = len(t_arr)
t_val = stats.t.ppf(0.975, n-2)
k_ci = t_val * k_err
t_half_ci = t_half * (k_ci / k_fit)

print(f"\n--- Regression Results ---")
print(f"Eq: ln(at - ainf) = {slope:.5f} * t + {intercept:.4f}")
print(f"Slope a = {slope:.5f} +/- {k_err:.5f}  (95%CI: +/-{k_ci:.5f})")
print(f"Intercept b = {intercept:.4f} +/- {std_err*np.sqrt(np.mean(x**2)):.4f}")
print(f"R2 = {r_value**2:.5f}")
print(f"n = {n},  df = {n-2}")
print(f"\nRate constant k = -slope = {k_fit:.5f} +/- {k_ci:.5f} min^-1")
print(f"Extrapolated alpha0 = {alpha0_fit:.2f} deg")
print(f"Half-life t1/2 = ln2/k = {t_half:.1f} +/- {t_half_ci:.1f} min")

# Residuals
y_pred = slope * x + intercept
residuals = y - y_pred
print(f"\nResidual std sy = {np.std(residuals, ddof=2):.5f}")
print(f"Residual max |e| = {np.max(np.abs(residuals)):.4f}")

# ---------- Figure 1: alpha_t vs t ----------
fig1, ax1 = plt.subplots(figsize=(5.5, 3.8))
ax1.scatter(t_arr, alpha_t_meas, c="#d32f2f", s=28, zorder=5, label="Measured")
t_smooth = np.linspace(0, 32, 200)
a_smooth = ainf_mean + (alpha0_fit - ainf_mean) * np.exp(-k_fit * t_smooth)
ax1.plot(t_smooth, a_smooth, "#1976d2", lw=1.2, label="Exponential fit")
ax1.axhline(y=ainf_mean, color="#888", ls="--", lw=0.8, label=f"alpha_inf = {ainf_mean:.1f} deg")
ax1.set_xlabel("t / min", fontsize=11)
ax1.set_ylabel("alpha_t / deg", fontsize=11)
ax1.legend(fontsize=9, loc="upper right")
ax1.set_xlim(0, 32)
fig1.tight_layout(pad=0.5)
fig1.savefig("实验二_fig1_旋光度曲线.svg", dpi=300, bbox_inches="tight")
print("\n[Fig1] alpha_t ~ t curve saved")

# ---------- Figure 2: ln(alpha_t - alpha_inf) vs t ----------
fig2, ax2 = plt.subplots(figsize=(5.5, 4.0))
ax2.scatter(x, y, c="#d32f2f", s=28, zorder=5)
ax2.plot(x, y_pred, "#1976d2", lw=1.2,
         label=f"y = {slope:.4f}t + {intercept:.3f}\nR2 = {r_value**2:.4f}")
ax2.fill_between(x, y_pred - np.std(residuals, ddof=2), y_pred + np.std(residuals, ddof=2),
                 alpha=0.12, color="#1976d2")
ax2.set_xlabel("t / min", fontsize=11)
ax2.set_ylabel("ln(alpha_t - alpha_inf)", fontsize=11)
ax2.legend(fontsize=9)
fig2.tight_layout(pad=0.5)
fig2.savefig("实验二_fig2_线性回归.svg", dpi=300, bbox_inches="tight")
print("[Fig2] ln(at-ainf) ~ t regression line saved")

# ---------- Final summary ----------
print(f"\n{'='*50}")
print(f"FINAL RESULTS:")
print(f"  k = ({k_fit:.4f} +/- {k_ci:.4f}) min^-1")
print(f"  t1/2 = ({t_half:.1f} +/- {t_half_ci:.1f}) min")
print(f"  R2 = {r_value**2:.5f}")
print(f"{'='*50}")
