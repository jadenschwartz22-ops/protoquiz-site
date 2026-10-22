# KY verify lane, 2026-10-22 (60 min, no sub-agents, 5 WebSearch calls)

File: `states/KY_local_2026-10.json` (builder: `ky_build_local.py`). Raw captures: `states/web_raw/KY/`.
Not reached: all other KY counties (110). Christian, McCracken, Owsley, Henry were already confirmed and skipped.

## Result
- A (6, pop 1,588,119): Jefferson, Fayette, Warren, Hardin, Madison, Daviess.
- held (4): Boone, Kenton, Campbell (correct provider lists recorded, agency pages not opened), Robertson.

## Sources
KBEMS EMS Directory 2026-08-01 (Class Ia rows are the licence cross-check, step 4); NG911 Ky_911_RSB_EMS layer (in KY_public_2026-10.json); Louisville Metro EMS page (archive 2025); Metro 2023 deck; AMFEMS, Okolona, PRP, Fairdale, Union FPD pages; lexingtonky.gov/fire; Hardin County 2024 emergency services evaluation (hardincountyky.gov); madisoncountyems.com; EMS1 2019 (Daviess AMR).

## Findings against the current map
- Jefferson: Metro only -> Metro + 7 suburban 911-transport districts.
- Boone: AMR-NKY and First Care Ohio -> fire districts (Union, Florence, Burlington, Hebron, Verona, Belleview-McVille, Walton, Petersburg). Held.
- Robertson: Bracken only -> Bracken + Nicholas County Ambulance (NG911 50/47). Held.
- AMR-NKY (1527) / First Care Ohio (1684): no page anywhere says they carry 911 patients in any of their 10 licensed counties (amr.net Northern KY page has no 911 claim). Counties naming them stay unproven: Bracken, Carroll, Gallatin, Grant, Mason, Owen, Pendleton, Boone, Kenton, Campbell.
- Hardin: Fort Knox is a second (on-post) transporter per the county study.

## Weak points (read before publishing)
- Warren source is an undated WBKO article plus KBEMS 2026; Greenview CON status unconfirmed (no KBEMS licence).
- Daviess: 2019 AMR contract article; newer contract text not opened (Owensboro Times 403).
- Madison page does not say "transport"; KBEMS licence does.
- Fern Creek, Jeffersontown, St. Matthews rest on the 2023 Metro deck plus 2026 KBEMS text.
- Spot check (largest/mid/rural) not done against an independent source; NG911 layer agrees for Jefferson, Fayette, Madison, Daviess, Hardin (86% coverage).
- Next: Bullitt (NG911 18.5% uncovered, Mt Washington Fire & EMS), Oldham (county EMS non-transport + AmeriPro 1707), Pulaski (two licences), Laurel (Knox 1516 south Laurel), Scott, Jessamine, Pike, Boyd, Hopkins, Henderson (AMR-Henderson vs Deaconess).
