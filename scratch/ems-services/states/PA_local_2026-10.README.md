# PA local sources, 2026-10-22

File: `PA_local_2026-10.json` (4 counties). Raw: `web_raw/PA/` (Lebanon EMS boxes JSON, SCTF regional BLS overlays, WebFetch quotes).

## Sources
- Lebanon County GIS `Places/EmergencyServices_BoxesStations_SVC/MapServer/3` (EMS_Boxes, CMPNY_NAME per box; 41 boxes = 100% of county area). Live service; it no longer lists Lawn EMS, which the 2020 regional layer does, so it is newer than 2020.
- South Central PA Task Force `Regional_EMS2/FeatureServer/0` (Regional_BLS, 2020-05): Franklin, Lancaster (codes), Lebanon, Perry (town labels), York, Cumberland, Adams (codes), Dauphin. Layer 1 = Regional_ALS (not pulled).
- LebTown 2020-03-10; Myerstown Borough emergency management page; UPMC Community LifeTeam page (2026).

## Verdicts
A 1: Lebanon (145,319): Life Lion EMS (Penn State Health) 43.8% of area, First Aid and Safety Patrol 30.9%, Myerstown FAU, Schaefferstown EMS, Newmanstown EMS, FTIG, Central Medical Transport (Cleona), Northwest EMS.
Held 3: Dauphin (2020 map, 6.5% neighbour-county codes), Franklin (2020 map only), Perry (2020, town labels).
Skipped: Allegheny (AGOL EMS layer needs a token), Lancaster (layers private or code-only), Lehigh, Westmoreland, Luzerne, Erie (the 'Erie County EMS' AGOL layer is Erie County NY).

## Spot check (source the row does not cite)
- Lebanon, north (Life Lion municipalities): LebTown 2020 names exactly the same 8 municipalities as the county box layer. Agree.
- Lebanon, east (Myerstown/Jackson): Myerstown Borough page names Myerstown FAU (BLS) + FASP (ALS); box layer has Myerstown FAU for Jackson Twp/Richland. Agree.
- Only one A county in PA, so no mid/rural pair from other counties.

## Contradictions / leads
- SCTF Regional_EMS2 is the best lead for York, Cumberland, Dauphin, Franklin (2020); a current county box layer or 911 run card would lift Dauphin/Franklin to A.
- No PA state-level dead end repeated.
