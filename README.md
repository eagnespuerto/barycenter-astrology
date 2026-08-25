# Barycenterology · Astrology of the Barycenter

A static, mobile-friendly site that watches the Solar System's true center of mass
drift in and out of the Sun, from **1800 to 2200**, and lays that dance beside
notable world events — framed as shadow (barycenter outside the Sun) and light
(barycenter inside).

**Live site:** https://eagnespuerto.github.io/barycenter-astrology/

## What it shows

- A chart of |Sun − Solar System Barycenter| in solar radii across four centuries.
- An orrery‑style visualization for any year (drag the slider).
- ~60 curated world events (sourced from Wikipedia) tagged as **Light**, **Shadow**, or **Equilibrium** according to the barycenter's state at the time.
- Rare **equilibrium** moments highlighted — when the barycenter passes essentially through the Sun's own center.

## Credit

The astronomical calculation and its overall shape are adapted from
**Lavender Elle Hanson**'s notebook *Solar System Barycenter Calculations*
(SPICE / JPL DE440). This repository uses [Skyfield](https://rhodesmill.org/skyfield/)
with the same DE440 ephemeris and reproduces her key statistics almost exactly:

- Barycenter within 1 R☉ of Sun's center: **~38 %** of the time
- Barycenter within 0.5 R☉: **~7 %**
- Barycenter within 2 R☉: **~97 %**

Events are drawn from public Wikipedia articles; each timeline entry links to its source.

## Repo layout

```
docs/           <- GitHub Pages root
  index.html
  style.css
  app.js
  data.json     <- monthly barycenter samples, 1800-01 .. 2200-12
  events.json   <- curated event list
compute_barycenter.py   <- regenerates docs/data.json
```

## Regenerating the barycenter data

```bash
pip install skyfield
python compute_barycenter.py
```

Skyfield will download `de440.bsp` (~120 MB) on the first run.

## License

MIT — see [LICENSE](LICENSE). Astronomical approach adapted from Lavender Elle
Hanson's notebook (credited above). Event text is original prose; historical
facts are from Wikipedia.

> Nothing on this page is a scientific claim about human affairs.
> Barycenterology is a poetic frame — a way of noticing that the ground
> beneath us is, in the largest sense, always in motion.
