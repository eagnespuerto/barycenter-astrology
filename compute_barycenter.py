"""
Compute Solar System barycenter distance from Sun's center, 1800-2200.

Adapted from the notebook "Solar System Barycenter Calculations"
by Lavender Elle Hanson (uses SPICE / DE440).

Here we use Skyfield with the JPL DE441 ephemeris (which spans 13000 BC - AD 17000)
so we cover the full 1800-2200 range.

Output: docs/data.json  -> [{t: 'YYYY-MM', d: distance_in_solar_radii}, ...]
"""
import json
import os
from pathlib import Path

from skyfield.api import load

R_SUN_KM = 695_700.0  # solar radius in km
AU_KM = 149_597_870.7

HERE = Path(__file__).parent
OUT = HERE / "docs" / "data.json"
OUT.parent.mkdir(exist_ok=True)

# Load DE441 (covers 1800-2200 with margin). Skyfield will download on first run.
print("Loading DE441 (may download ~3 GB on first run; using DE440s if present)...")
# Prefer de440s.bsp if available (small), else fall back to de441 part1.
kernel_candidates = ["de441_part-1.bsp", "de440.bsp", "de440s.bsp", "de421.bsp"]
loaded = None
loader = load
for k in kernel_candidates:
    if Path(k).exists():
        loaded = load(k)
        print(f"  using local kernel: {k}")
        break
if loaded is None:
    # de440s.bsp is only ~32 MB and covers 1849-2150; we want 1800-2200 so use de440 (~120 MB).
    print("  downloading de440.bsp (~120 MB)...")
    loaded = load("de440.bsp")

eph = loaded
sun = eph["sun"]
ssb = eph["solar system barycenter"]

ts = load.timescale()

# Monthly samples 1800-01 through 2200-12 => 401*12 = 4812 points
years = list(range(1800, 2201))
months = list(range(1, 13))
samples = []
print(f"Sampling {len(years)*len(months)} months...")
for y in years:
    for m in months:
        t = ts.utc(y, m, 15)
        # Sun's position is relative to Solar System Barycenter (SSB is DE440 origin).
        # Distance from Sun center to SSB is |Sun position|.
        x_au, y_au, z_au = sun.at(t).position.au
        r_km = ((x_au ** 2 + y_au ** 2 + z_au ** 2) ** 0.5) * AU_KM
        r_rsun = r_km / R_SUN_KM
        samples.append({"t": f"{y:04d}-{m:02d}", "d": round(r_rsun, 4)})

# Stats
inside = sum(1 for s in samples if s["d"] < 1.0)
inside_half = sum(1 for s in samples if s["d"] < 0.5)
inside_2 = sum(1 for s in samples if s["d"] < 2.0)
total = len(samples)
print(f"Barycenter < 0.5 Rsun: {inside_half/total*100:.2f}%")
print(f"Barycenter < 1.0 Rsun: {inside/total*100:.2f}%")
print(f"Barycenter < 2.0 Rsun: {inside_2/total*100:.2f}%")

payload = {
    "meta": {
        "unit": "solar_radii",
        "R_sun_km": R_SUN_KM,
        "source_notebook": "ss_barycenter (Lavender Elle Hanson)",
        "ephemeris": "JPL DE440",
        "start": samples[0]["t"],
        "end": samples[-1]["t"],
        "sample_interval": "monthly",
        "stats": {
            "pct_inside_1Rsun": round(inside / total * 100, 2),
            "pct_inside_0_5Rsun": round(inside_half / total * 100, 2),
            "pct_inside_2Rsun": round(inside_2 / total * 100, 2),
        },
    },
    "samples": samples,
}

OUT.write_text(json.dumps(payload, separators=(",", ":")))
print(f"Wrote {OUT} ({OUT.stat().st_size/1024:.1f} KB, {total} samples)")
