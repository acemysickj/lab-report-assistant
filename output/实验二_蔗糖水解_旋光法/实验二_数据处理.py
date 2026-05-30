# Experiment 2: Data Processing (Dual-group)
import math, json, os

# ============ Raw Data ============
temp = 22.5; pressure = 102

t = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]

groups = {
    "G1": {
        "label": "Group 1 (50mL sucrose + 50mL HCl)",
        "sucrose_conc": "20.0890 g/100mL",
        "volume_ratio": "50mL sucrose : 50mL HCl",
        "hcl_eff": 1.5,  # effective [HCl] in reaction mixture (M)
        "alpha_t": [12.675, 11.350, 10.200, 9.050, 8.100, 7.100, 6.250,
                    5.500, 4.700, 4.050, 3.400, 2.800, 2.300, 1.850, 1.300],
        "alpha_inf_meas": [-4.200, -4.250, -4.250, -4.200, -4.250],
    },
    "G2": {
        "label": "Group 2 (100mL sucrose + 50mL HCl)",
        "sucrose_conc": "20.0767 g/100mL",
        "volume_ratio": "100mL sucrose : 50mL HCl",
        "hcl_eff": 1.0,  # effective [HCl] in reaction mixture (M)
        "alpha_t": [14.800, 14.300, 13.650, 12.900, 12.175, 11.600, 11.000,
                    10.625, 10.000, 9.550, 8.850, 8.375, 7.900, 7.650, 7.150],
        "alpha_inf_meas": [-4.000, -4.000, -4.000, -4.000, -4.000],
    }
}

def linear_regression(x, y):
    n = len(x)
    Sx = sum(x); Sy = sum(y)
    Sxy = sum(x[i]*y[i] for i in range(n))
    Sx2 = sum(xi*xi for xi in x)
    Sxx = Sx2 - Sx*Sx/n; Sxy_c = Sxy - Sx*Sy/n
    slope = Sxy_c / Sxx
    intercept = Sy/n - slope*Sx/n
    y_pred = [slope*xi + intercept for xi in x]
    residuals = [y[i] - y_pred[i] for i in range(n)]
    ss_res = sum(r*r for r in residuals)
    ss_tot = sum((yi - Sy/n)**2 for yi in y)
    r2 = 1 - ss_res/ss_tot
    s = math.sqrt(ss_res/(n-2))
    s_slope = s/math.sqrt(Sxx)
    s_intercept = s*math.sqrt(Sx2/(n*Sxx))
    return slope, intercept, r2, s, s_slope, s_intercept

results = {}
for gkey, g in groups.items():
    at = g["alpha_t"]
    ainf = sum(g["alpha_inf_meas"]) / len(g["alpha_inf_meas"])
    delta = [ati - ainf for ati in at]
    ln_d = [math.log(di) for di in delta]
    slope, intercept, r2, s, s_slope, s_intercept = linear_regression(t, ln_d)
    k_val = -slope
    hl = math.log(2)/k_val
    s_k = s_slope
    s_hl = hl * (s_slope/k_val)
    alpha0 = math.exp(intercept) + ainf

    results[gkey] = {
        "alpha_inf": ainf, "delta": delta, "ln_delta": ln_d,
        "slope": slope, "intercept": intercept, "r2": r2,
        "k": k_val, "s_k": s_k, "half_life": hl, "s_hl": s_hl,
        "alpha_0": alpha0, "s": s, "s_slope": s_slope, "s_intercept": s_intercept,
        "hcl_eff": g["hcl_eff"], "label": g["label"],
        "sucrose_conc": g["sucrose_conc"], "volume_ratio": g["volume_ratio"],
        "alpha_t": at, "alpha_inf_meas": g["alpha_inf_meas"],
    }

# ============ Output ============
print("="*65)
print("Experiment 2 - Dual Group Data Processing")
print(f"T = {temp} deg C, P = {pressure} kPa")
print("="*65)

for gkey in ["G1", "G2"]:
    r = results[gkey]
    print(f"\n--- {r['label']} ---")
    print(f"a_inf = {r['alpha_inf']:.3f} deg")
    print(f"HCl effective conc: {r['hcl_eff']} M")
    print(f"\n{'t/min':>6} {'at/deg':>10} {'at-ainf':>10} {'ln(at-ainf)':>13}")
    for i in range(len(t)):
        print(f"{t[i]:>6}  {r['alpha_t'][i]:>10.3f}  {r['delta'][i]:>10.3f}  {r['ln_delta'][i]:>13.4f}")
    print(f"\n  Regression: y = {r['slope']:.6f}x + {r['intercept']:.6f}")
    print(f"  Slope    = {r['slope']:.6f} +/- {r['s_slope']:.6f} min^-1")
    print(f"  Intercept = {r['intercept']:.6f} +/- {r['s_intercept']:.6f}")
    print(f"  R^2       = {r['r2']:.6f}")
    print(f"  k = {r['k']:.5f} +/- {r['s_k']:.5f} min^-1")
    print(f"  t1/2 = {r['half_life']:.2f} +/- {r['s_hl']:.2f} min")
    print(f"  a0 = {r['alpha_0']:.3f} deg")

# Compare: k ratio vs HCl ratio
print(f"\n{'='*65}")
print(f"Comparison: k_G1/k_G2 = {results['G1']['k']:.5f}/{results['G2']['k']:.5f} = {results['G1']['k']/results['G2']['k']:.3f}")
print(f"            HCl1/HCl2 = 1.5/1.0 = 1.5")
print(f"  (The rate depends on [H+]; k proportional to [HCl]")

# Save
out = {"t": t, "temp": temp, "pressure": pressure, "G1": results["G1"], "G2": results["G2"]}
script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, "data.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2, default=str)
print(f"\nSaved to data.json")
