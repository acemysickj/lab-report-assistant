# Experiment 2 - Publication-quality figures via figure skill
import json, os, math
import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

# ---- figure-skill style baseline ----
mpl.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans", "sans-serif"],
    "svg.fonttype": "none",
    "font.size": 9,
    "axes.spines.right": False,
    "axes.spines.top": False,
    "axes.linewidth": 0.7,
    "legend.frameon": False,
})

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, "data.json"), "r", encoding="utf-8") as f:
    d = json.load(f)

t = d["t"]
g1 = d["G1"]; g2 = d["G2"]

c1 = "#2c6fbb"; c2 = "#d9363e"   # restrained blues/reds

# ============================================================
# Fig 1 — αt ~ t curve (dual group)
# ============================================================
fig1, ax1 = plt.subplots(figsize=(6.8, 4.2))

ax1.scatter(t, g1["alpha_t"], c=c1, s=28, zorder=5, edgecolors="white", linewidth=0.4, label="Group 1")
ax1.scatter(t, g2["alpha_t"], c=c2, s=28, zorder=5, edgecolors="white", linewidth=0.4, label="Group 2")

# smooth trend guides (low-alpha)
for at, col in [(g1["alpha_t"], c1), (g2["alpha_t"], c2)]:
    coeffs = np.polyfit(t, at, 3)
    t_smooth = np.linspace(min(t), max(t), 120)
    ax1.plot(t_smooth, np.poly1d(coeffs)(t_smooth), col, lw=1.0, alpha=0.35, zorder=2)

# α∞ reference lines
for g, col in [(g1, c1), (g2, c2)]:
    ax1.axhline(y=g["alpha_inf"], color=col, ls="--", lw=0.6, alpha=0.45)

ax1.legend(fontsize=8, loc="upper right", handlelength=1.2, borderpad=0.4)

ax1.set_xlabel("t / min", fontsize=10, labelpad=5)
ax1.set_ylabel("αt / °", fontsize=10, labelpad=5)

all_a = g1["alpha_t"] + g2["alpha_t"]
ax1.set_xlim(0.2, 31.8)
ax1.set_ylim(min(all_a) - 3, max(all_a) + 3)
ax1.tick_params(labelsize=8)
ax1.grid(True, alpha=0.12, lw=0.4)

fig1.tight_layout(pad=0.6)
fig1.savefig(os.path.join(script_dir, "实验二_fig1_旋光度曲线.svg"))
plt.close(fig1)
print("Fig 1 saved.")

# ============================================================
# Fig 2 — ln(αt−α∞) ~ t linear regression
# ============================================================
fig2, ax2 = plt.subplots(figsize=(6.8, 4.2))

marks = ["o", "s"]
for g, col, mk in [(g1, c1, marks[0]), (g2, c2, marks[1])]:
    ax2.scatter(t, g["ln_delta"], c=col, s=26, zorder=5,
                edgecolors="white", linewidth=0.4, marker=mk)

# regression lines
for g, col, label in [(g1, c1, "G1 fit"), (g2, c2, "G2 fit")]:
    xl = np.array([min(t), max(t)])
    yl = np.array([g["slope"]*xi + g["intercept"] for xi in xl])
    ax2.plot(xl, yl, col, lw=1.1, zorder=3, label=label)

# annotation box — top-right, translucent
lines = []
for gkey, g in [("G1", g1), ("G2", g2)]:
    lines.append(f"{gkey}: k = {g['k']:.5f} +/- {g['s_k']:.5f} min^-1")
    lines.append(f"     t1/2 = {g['half_life']:.2f} +/- {g['s_hl']:.2f} min")
    lines.append(f"     R² = {g['r2']:.5f}")
lines.append(f"k(G1)/k(G2) = {g1['k']/g2['k']:.2f}")

ax2.text(0.973, 0.975, "\n".join(lines), transform=ax2.transAxes,
         fontsize=6.8, fontfamily="monospace", va="top", ha="right",
         bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#cccccc", alpha=0.92))

ax2.legend(fontsize=8, loc="lower left", handlelength=1.2, borderpad=0.3)

ax2.set_xlabel("t / min", fontsize=10, labelpad=5)
ax2.set_ylabel("ln(at - ainf)", fontsize=10, labelpad=5)

all_ln = g1["ln_delta"] + g2["ln_delta"]
dy = max(all_ln) - min(all_ln)
ax2.set_xlim(0.2, 31.8)
ax2.set_ylim(min(all_ln) - dy*0.12, max(all_ln) + dy*0.12)
ax2.tick_params(labelsize=8)
ax2.grid(True, alpha=0.12, lw=0.4)

fig2.tight_layout(pad=0.6)
fig2.savefig(os.path.join(script_dir, "实验二_fig2_线性回归.svg"))
plt.close(fig2)
print("Fig 2 saved.")
print("Done.")
