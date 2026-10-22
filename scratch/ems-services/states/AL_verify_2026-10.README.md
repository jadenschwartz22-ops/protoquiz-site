# AL verify pull 2, 2026-10-22

File: `AL_verify_2026-10.json` (overwritten; only this pass's counties). Pass 1's 5 A rows (Morgan, Lauderdale, Chilton, Wilcox, Greene) were promoted to `AL_local_2026-10.json`; pass 1 held rows are not repeated here. Pass 1 notes kept: Limestone (Huntsville/Madison parts, likely HEMSI, unconfirmed), Marshall (Boaz Fire/Rescue role), Blount (map says Lifeguard; AmeriPro won the county 911 contract Nov 2025 per WVTM; Blountsville FD and Oneonta roles open), Pickens (no page naming the operator after NorthStar left).

A (5, pop 159,408): Walker, Colbert, Macon, Lowndes, Perry.
Held (5): Cherokee, Marion, DeKalb, Jackson, Coffee.
Not reached: Mobile, Baldwin, Tuscaloosa, Shelby, Calhoun, Houston, Etowah, St. Clair, Cullman, Elmore, Talladega and the rest (stopped at the 60-min cap). Next quick wins (single ground licensee, not yet tried hard): Dallas, Lawrence, Marengo, Cleburne, Hale, Clay, Choctaw, Bullock.

## Method
- Google News RSS decoded via scratchpad `gnx.py`; county 911 district domains probed directly (colbert911.org, walker911.org, marion911.org worked). Raw pages in `web_raw/AL/v/`.
- Licence check: `AL_adph.json`, every licence (transport and non-transport) with address in the county.

## Licence cross-check per A county
- Walker: only ground transport licence RPS - Walker; Sumiton, Cordova, Dora fire licences are non-transport. The two volunteer rescue squads on the 911 page hold no ADPH licence. Jasper (~14k) has no transport licence.
- Colbert: only ground licence Keller EMS; Muscle Shoals (~16k), Sheffield, Tuscumbia FDs have no transport licence.
- Macon: only licence Haynes Ambulance - Macon. Source is 2018 (replaced CARE); 2026 news shows Haynes transporting in Notasulga. Notasulga Volunteer Fire and EMS holds no licence.
- Lowndes: only licence Haynes Ambulance of Troy - Lowndes. Source is a 2020 one-year contract; licence name in the 2026-09 list shows it continues. Weakest A; recheck for a 2024+ source.
- Perry: only licence PC Ambulance dba Perry County Ambulance Service (county-owned since 2023-07).

## Held, what's missing
- Cherokee: Atrium Health Floyd is the E-911 provider (Business Alabama 2023, via archive); Piedmont Rescue & EMS (Calhoun licence) may transport from the Cherokee part of Piedmont.
- Marion: 911 site says "2 emergency medical services"; only Marion County EMS is licensed in the county; second unidentified.
- DeKalb, Jackson: sole ground licensee each (DeKalb Ambulance Service; Highlands EMS) but no page naming the 911 role. dasems.com is blank; hh.health has no EMS pages; rocketcitynow 403.
- Coffee: Enterprise Rescue "ground operations based in Coffee"; whole-county (Elba, Fort Novosel) unproven.

## Map answers
No current map answer found wrong in this pass. Map names match for Walker, Colbert, Macon, Lowndes, Perry, Cherokee.

## Spot check
Walker (largest): WBMA 2024-06 says Walker 911 transfers calls to RPS (second_source). Macon (mid): cnaw2 2026-02 Haynes transport in Notasulga. Perry (rural): only licence is the county service, matching the 2023 article.

Note: the shared scratchpad `fx.sh` was overwritten by a TN lane mid-run; this lane used `al_lane/f.sh` instead.
