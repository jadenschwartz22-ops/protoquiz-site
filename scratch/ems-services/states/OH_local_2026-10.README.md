# OH local sources, 2026-10-22

File: `OH_local_2026-10.json` (6 counties). Raw: `web_raw/OH/` (county pages, Stark NG911 EMS layer, WebFetch quotes).

## Sources
- Athens: WSAZ 2025-10-27 levy article (five county EMS stations); The Post 2011 (county took over EMS from SEOEMS).
- Adams: adamscountyemsoh.gov/about (2026), station pages list all 15 townships.
- Hocking: hocking.oh.gov county 911 page (undated), HCEMS covers its 424 sq mi.
- Stark: county NG911 EMS jurisdictions MapServer/2 (2025), overlay 100% of county.
- Lucas: lucascountyoh.gov/412 + 13abc 2024/2025.
- Coshocton: county EMSSquads box layer (2020).
- OH AG opinion 1985-059: a county EMS under R.C. 307.05 must serve the whole county (supports whole-county reading of county-run EMS).

## Verdicts
A 3: Athens (63,218), Adams (27,671), Hocking (27,429) = 118,318 people.
Held 3: Stark (374k; 'Washington Twp Contract' 5.3% and 'Private Contractor' 1.5% unnamed, no transport field), Lucas (426k; ALS moved to municipalities 2024, BLS fire transport unsourced), Coshocton (2020 box layer, operator unconfirmed).
Skipped: Franklin, Cuyahoga, Hamilton, Summit, Montgomery, Butler and the rest of the metro list: dozens of city/township fire departments each, no county-level list found in budget. Mercer (county EMS exists, site JS-only and archive empty).

## Spot check (source the row does not cite)
- Largest A, Athens: The Post 2011 agrees (county took over EMS countywide); WSAZ 2025 is the row source. Agree.
- Mid, Adams: no independent page fetched; not confirmed beyond the agency's own site.
- Rural, Hocking: not confirmed independently.

## Dead ends
- Mercer OH county site: mercercountyohio.org redirects to a .gov JS shell; archive id_ capture empty.
- athensoh.org EMS URL guesses 404; lawrencecountyohio.com 403; Coshocton/Williams county hosts time out.
- AGOL search with PA/OH bbox filter for EMS box/zone layers is the productive discovery tool (found Stark, Coshocton, Troy, Williams 'Medic Zones' with codes only).
