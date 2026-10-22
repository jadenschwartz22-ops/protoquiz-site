# FL audit of verify lane 13 (2026-10-22): 16 A audited, 16 PASS, 0 FAIL

Input states/FL_verify13_2026-10.json; promoted into states/FL_local_2026-10.json (backup states/web_raw/FL/audit13/FL_local_before.json). Raw pages and helpers in states/web_raw/FL/audit13/.
Common checks for every row: all 17 cited quotes re-found on freshly fetched pages (chk.py); FL DOH weekly providers report processed 2026-09-04 (states/FL_parsed.json, every licence type incl. ALS/N) lists the county service as the only non-hospital ground ALS/T or BLS/T licence (F.S. 401.25: 911 transport needs a DOH transport licence plus the county COPCN, so a city/district/private 911 COPCN holder would appear there); CMS Medicare 2024 shows no other emergency ambulance biller in any town of these counties (2024 sign); Municode county codes read for the COPCN article (Marion ch.10 art.VIII, St. Lucie ch.18 art.III, Hernando ch.15 art.III, Citrus ch.38 art.II, Putnam ch.20 art.II, Jackson ch.30 art.II, Suwannee ch.70 art.VIII, Wakulla art.III): none names another 911 holder. St. Johns and Hamilton are not on Municode. No FL run-count data; no neighbour transport found in any news item read.

- Marion PASS. MCFR transport (archive 2025-09). Ocala Fire Rescue is ALS/N on the 2026-09 DOH list, its own divisions page lists no transport, no Ocala-city Medicare biller. The Villages (Marion part): Villages-News 2026-03-20 shows MCFR dispatched to a Villages garage fire in Marion and the resident transported; 2023-12 article: Marion County serves its portion of The Villages. HCA Ocala (hospital) and Courtesy Transport (BLS interfacility, code Level II) not 911.
- St. Lucie PASS. County code ch.18 art.III (Ord. 26-018, 2026-07-07): Fire District "shall be the exclusive provider" of all 911 ambulance transport (added as evidence3). Fort Pierce and Port St. Lucie have no fire departments of their own; Lawnwood is a hospital licence (code allows only non-emergency Class B transfers).
- St. Johns PASS. 2022 transport quote replaced in strength by the live bill-pay page ("the person we transported", 2025 forms on it) as evidence2; Medicare 2024 6,808 emergency claims. St. Augustine FD and St. Augustine Beach hold no DOH licence at all.
- Hernando PASS. Rates page May 2026. Brooksville FD merged its fire/EMS response into HCFR Oct 2025 (WFLA 2025-09-20); it never held a transport licence (2017 Tampa Bay Times: Brooksville used the county ambulance service).
- Citrus PASS. Transport since 2021 (>2 yrs, no change); only licence; Medicare 2024.
- Putnam PASS. Ambulance provider, 827 sq mi; Palatka FD unlicensed; Medicare 2024.
- Jackson PASS. "Sole provider of ALS EMS" countywide plus "Questions about your ambulance bill?" on the same page (evidence2), Graceville station houses an ambulance; only licence; Medicare 2024 1,900 claims.
- Levy PASS. Sole ambulance provider based in county, seven ALS transport units throughout the county; only licence.
- Suwannee PASS. Added county code s.70-402: the Suwannee County Rescue District, created to provide ambulance service, "shall include the entire area of the county" (evidence2, area now whole county).
- Wakulla PASS. Transport to all areas; Oct 2026 EMS-assessment news shows county-run EMS, no change.
- Gadsden PASS. 7,800 transports/yr (archive 2026-02); Florida State Hospital BLS/T is a campus licence; Oct 2026 news on new county EMS HQ.
- Bradford PASS. Five ALS transport units throughout the county; only licence.
- Dixie PASS. County ambulance service; billing page invoices "all patients who have been transported via ambulance" (evidence2); only licence; Medicare 2024.
- Hamilton PASS. Four ALS transport units; only licence; Medicare 2024.
- Jefferson PASS. Transport for all incorporated and unincorporated areas.
- Gulf PASS. Three ALS ambulances; privacy notice "providing you with treatment and transport" (evidence2); WJHG 2026-05-30 Gulf County EMS took a fire victim to hospital; Port St. Joe FD unlicensed.

Loader: county_911_all.py reads every states/*_local_2026-10.json by FIPS; these 16 FIPS do not overlap Pinellas 12103, Santa Rosa 12113, Franklin 12037 or the FL_public A counties (Liberty, Lafayette, Union, DeSoto, Hardee, Baker). FL_verify13 is not globbed.
