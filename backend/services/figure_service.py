"""Figure generation service — creates publication-quality matplotlib figures.

Reuses patterns from the existing figure skill and experiment plotting scripts.
"""
import os
import tempfile
from pathlib import Path
from config import PROJECT_ROOT


def generate_figures(experiment_id: int, analysis_results: dict, output_dir: str) -> list[str]:
    """Generate figures for an experiment based on analysis results.

    Returns list of generated figure filenames.
    """
    if experiment_id == 2:
        return _generate_exp2_figures(analysis_results, output_dir)
    elif experiment_id == 4:
        return _generate_exp4_figures(analysis_results, output_dir)

    return []


def _generate_exp2_figures(results: dict, output_dir: str) -> list[str]:
    """Generate sucrose hydrolysis figures (αt~t and ln(αt-α∞)~t)."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import numpy as np

        mpl_style_path = PROJECT_ROOT / ".claude" / "skills" / "figure" / "SKILL.md"
        matplotlib.rcParams.update({
            "font.family": "sans-serif",
            "font.sans-serif": ["Arial", "DejaVu Sans", "sans-serif"],
            "svg.fonttype": "none",
            "font.size": 9,
            "axes.spines.right": False,
            "axes.spines.top": False,
            "axes.linewidth": 1.2,
            "legend.frameon": False,
        })

        t = np.array(results.get("t", []))
        alpha_t = np.array(results.get("alpha_t", []))
        ln_delta = np.array(results.get("ln_delta", []))
        slope = results.get("slope", 0)
        intercept = results.get("intercept", 0)
        r2 = results.get("r2", 0)
        k = results.get("k", 0)
        s_k = results.get("s_k", 0)
        half_life = results.get("half_life", 0)

        filenames = []

        # Figure 1: αt ~ t
        fig1, ax1 = plt.subplots(figsize=(6.8, 4.2))
        ax1.scatter(t, alpha_t, c="#2c6fbb", s=28, zorder=5, edgecolors="white", linewidth=0.4)
        coeffs = np.polyfit(t, alpha_t, 3)
        t_smooth = np.linspace(min(t), max(t), 120)
        ax1.plot(t_smooth, np.poly1d(coeffs)(t_smooth), "#2c6fbb", lw=1.0, alpha=0.35)
        ax1.set_xlabel("t / min", fontsize=10)
        ax1.set_ylabel("αt / °", fontsize=10)
        ax1.set_xlim(0.2, max(t) + 1.8)
        ax1.grid(True, alpha=0.12, lw=0.4)
        fig1.tight_layout(pad=0.6)
        f1_path = os.path.join(output_dir, "fig1_旋光度曲线.svg")
        fig1.savefig(f1_path)
        plt.close(fig1)
        filenames.append("fig1_旋光度曲线.svg")

        # Figure 2: ln(αt-α∞) ~ t
        fig2, ax2 = plt.subplots(figsize=(6.8, 4.2))
        ax2.scatter(t, ln_delta, c="#d9363e", s=26, zorder=5, edgecolors="white", linewidth=0.4, marker="s")
        xl = np.array([min(t), max(t)])
        yl = slope * xl + intercept
        ax2.plot(xl, yl, "#d9363e", lw=1.1, label=f"k={k:.5f}±{s_k:.5f}, R²={r2:.5f}")
        ax2.legend(fontsize=8, loc="upper right")
        ax2.set_xlabel("t / min", fontsize=10)
        ax2.set_ylabel("ln(αt - α∞)", fontsize=10)
        ax2.set_xlim(0.2, max(t) + 1.8)
        ax2.grid(True, alpha=0.12, lw=0.4)
        fig2.tight_layout(pad=0.6)
        f2_path = os.path.join(output_dir, "fig2_线性回归.svg")
        fig2.savefig(f2_path)
        plt.close(fig2)
        filenames.append("fig2_线性回归.svg")

        return filenames

    except ImportError as e:
        return [f"[matplotlib 不可用: {e}]"]
    except Exception as e:
        return [f"[绘图错误: {e}]"]


def _generate_exp4_figures(results: dict, output_dir: str) -> list[str]:
    """Generate surface tension figures (σ~c, σ~lnc, Γ~c)."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import numpy as np

        matplotlib.rcParams.update({
            "font.family": "sans-serif",
            "font.sans-serif": ["Arial", "DejaVu Sans", "sans-serif"],
            "svg.fonttype": "none",
            "font.size": 9,
            "axes.spines.right": False,
            "axes.spines.top": False,
            "axes.linewidth": 1.2,
            "legend.frameon": False,
        })

        c = np.array(results.get("concentrations", []))
        sigma = np.array(results.get("sigma_values", []))
        ln_c = np.array(results.get("ln_c", []))
        sigma_si = np.array(results.get("sigma_si", []))
        coeffs = results.get("coeffs", [])
        Gamma_umol = results.get("Gamma_umol", [])
        T_exp = results.get("T_exp", 25)

        filenames = []

        # Figure 1: σ vs c
        fig1, ax1 = plt.subplots(figsize=(5.5, 3.8))
        ax1.scatter(c, sigma, c="#2c6fbb", s=32, zorder=5)
        ax1.plot(c, sigma, "#2c6fbb", lw=0.8, alpha=0.5)
        ax1.set_xlabel("c / mol·dm⁻³", fontsize=10)
        ax1.set_ylabel("σ / 10⁻³ N·m⁻¹", fontsize=10)
        ax1.grid(True, alpha=0.12)
        fig1.tight_layout(pad=0.6)
        f1_path = os.path.join(output_dir, "fig1_sigma_vs_c.svg")
        fig1.savefig(f1_path)
        plt.close(fig1)
        filenames.append("fig1_sigma_vs_c.svg")

        # Figure 2: σ vs ln(c)
        fig2, ax2 = plt.subplots(figsize=(5.5, 3.8))
        ax2.scatter(ln_c, sigma_si, c="#d9363e", s=32, zorder=5)
        if coeffs:
            ln_dense = np.linspace(ln_c[0], ln_c[-1], 100)
            poly = np.poly1d(coeffs)
            ax2.plot(ln_dense, poly(ln_dense), "#d9363e", lw=1.0, alpha=0.5)
        ax2.set_xlabel("ln(c / mol·dm⁻³)", fontsize=10)
        ax2.set_ylabel("σ / N·m⁻¹", fontsize=10)
        ax2.grid(True, alpha=0.12)
        fig2.tight_layout(pad=0.6)
        f2_path = os.path.join(output_dir, "fig2_sigma_vs_lnc.svg")
        fig2.savefig(f2_path)
        plt.close(fig2)
        filenames.append("fig2_sigma_vs_lnc.svg")

        # Figure 3: Γ vs c
        if Gamma_umol and len(c) >= 2:
            c_nonzero = c[1:]
            fig3, ax3 = plt.subplots(figsize=(5.5, 3.8))
            ax3.scatter(c_nonzero[:len(Gamma_umol)], Gamma_umol, c="#2e7d32", s=32, zorder=5)
            ax3.plot(c_nonzero[:len(Gamma_umol)], Gamma_umol, "#2e7d32", lw=0.8, alpha=0.5)
            ax3.set_xlabel("c / mol·dm⁻³", fontsize=10)
            ax3.set_ylabel("Γ / μmol·m⁻²", fontsize=10)
            ax3.grid(True, alpha=0.12)
            fig3.tight_layout(pad=0.6)
            f3_path = os.path.join(output_dir, "fig3_Gamma_vs_c.svg")
            fig3.savefig(f3_path)
            plt.close(fig3)
            filenames.append("fig3_Gamma_vs_c.svg")

        return filenames

    except ImportError:
        return ["[matplotlib 不可用]"]
    except Exception as e:
        return [f"[绘图错误: {e}]"]
