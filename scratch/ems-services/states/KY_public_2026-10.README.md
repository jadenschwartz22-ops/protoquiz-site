# KY public EMS directory with service areas (2026-10-21 pull)

File: `states/KY_public_2026-10.json` = `meta` + 228 `rows` (one per KBEMS licence) + `county_verdict` (120 counties).
Raw: `downloads/ky_2026-10/` (`EMS_Agencies_2026-08-01.xlsx` + `.pdf`, `dir.html`, `ky_911_rsb_ems_2026-10-21.json`, parse scripts).

## Source
Kentucky Board of EMS (KBEMS), EMS Directory, "EMS_Agencies_2026-08-01.xlsx" (14-page PDF twin), page
`https://kbems.ky.gov/Legal/Pages/EMS-Directory.aspx`, fetched by curl with a browser UA, HTTP 200. Vintage 2026-08-01.
A second file `EMS_TEIs_2026-08-01` (training institutions) is not EMS service data and was not pulled.
Class key (page text, 202 KAR 7:545): Ia = 911 services; Ib = CON-exempt city/county services (KRS 216B.020(8));
IIa/IIb = non-911 / hospital IFT; III = critical care; IV = restricted location; V = mobile integrated health;
VI = first response; VII = air; VIII = event.

## What is new vs what we held
`states/KY_kbems.json` (2026-09-10, 228 rows) has the same agencies but only name, type, org_type and ADDRESS county.
This file adds the columns the old pull dropped: **Service Area Description** (the licensed service area, free text),
**PSAP centre + phone**, **dispatch centre**, licence number and class, permit level, volunteer status.
That area text is why KY can reach tier A, which the old county tiering (address county, 0 tier A) could not.
Also found and NOT yet wired: `states/KY.json` is the statewide NG911 "Ky_911_RSB_EMS" boundary layer (435
polygons, attributes only, no geometry). This pull re-fetched it WITH geometry (`downloads/ky_2026-10/ky_911_rsb_ems_2026-10-21.json`,
Kentucky_DGI ArcGIS FeatureServer layer 5, dataLastEditDate ~2026-08) and overlaid it on county polygons.

## Fields (rows)
name, license, class, org_type, volunteer_status, permit_level, primary_type (the state's 911 field),
address_county, city, service_area_text (verbatim), area_whole_county_fips / area_part_county_fips (+ names),
flags, psap, psap_phone, dispatch_center, transport, is_911_scene_with_transport,
counts_toward_county_911_verdict (Class Ia/Ib + "911 Response (Scene) with Transport Capability" + not interfacility-only),
source_url, vintage. 172 Ia, 2 Ib, 54 other classes. 167 rows count toward the county verdict (meta.rows_counted_toward_county_verdict).

## Parse
openpyxl read, whitespace and `_x000D_` cleaned. County names pulled from the area text by a list regex
("Boone, Kenton, Campbell ... Counties"), whole vs part decided by qualifier words (north/south/portion/parts/section/radius/
fire protection district/employees/plant) or a fire-district/VFD name. Hand overrides (4): Crittenden (Caldwell is "parts of"),
Lifeguard 1611 (Magoffin+Pike unrestricted, Floyd/Martin/Johnson interfacility only), Knox 1516 (Knox/Laurel/Whitley are partial),
Louisville Metro ("All of Metro Louisville" = Jefferson). The 30-minute-response clause ("and an area limited to a 30 minute
response time for 95% of the population served from the above address") is kept as flag `thirty_min_extension`; the home county
still counts as whole. Every Class Ia/Ib 911 row was read against its area text. Row count check: xlsx 228 = json 228.

## County verdict (`county_verdict`, tiers from RESUME_911_MAP.md rules of evidence: "a state record names the provider for that county (service area...)")
- **A** 99 counties (3.75M people): exactly one 911-transport operator's licensed area names the whole county (including one operator
  with several licences, e.g. AmeriPro Henry, Deaconess Union). KBEMS names the service area, so this meets the tier-A definition.
- **A-multi** 18 counties (0.79M, 17%): two or more different operators' licences name the whole county. Tier A evidence
  (providers named) but NOT a single provider of record: Boone, Boyd, Bracken, Campbell, Carroll, Floyd, Gallatin, Grant, Greenup,
  Kenton, Magoffin, Mason, Ohio, Owen, Pendleton, Pike, Pulaski, Trimble. Northern KY (AMR Northern Kentucky and First Care Ohio
  each claim 4 to 10 counties on top of county and fire-district licences) and the Pike/Floyd/Magoffin Lifeguard vs Appalachian/Emergent
  overlaps need a human read before one name goes on the map.
- **A-partial** 3 counties (Fulton, Knox, McLean): only part-county areas are named (Twin Cities/KenTenn around Fulton and Hickman;
  Knox County Ambulance sections; Western McLean). Tier A for the part, otherwise C.
- 0 counties fall to C or none: every KY county has at least one counted licence area naming it.
Fire-district licences (Jefferson, Kenton, Boone, Campbell) are recorded as `area_part_county_fips`; they never decide a county alone.

## Cross-check against the NG911 EMS boundary layer (second independent state record)
Per county, `ng911_ems_boundary` lists the labels covering >=3% of the county area (0.015 deg grid, 47,393 points; mean uncovered 0.6%).
Agreement is strong where labels are readable: Fayette 98% "Lexington Fire Department", Jefferson 98% "EMS" (louisvilleky.gov),
Daviess "AMR-Owensboro", Pike "Lifeguard Ems" 78% / "Appalachian First Response" 18%, Hardin, Bell. `kbems_vs_ng911_label_overlap` is a crude
shared-word test; False mostly means the NG911 label is cryptic (HQT, EMS D6, Station 1). Real conflicts to read before publishing:
Lewis (NG911: PORTSMOUTH AMBULANCE SERVICE vs KBEMS Lewis County EMS), Henderson (NG911 AMR-Henderson vs KBEMS Deaconess EMS), Martin
(NG911 PATRIOT EMS vs KBEMS Rapid EMS), Warren (NG911 label is the PSAP, Bowling Green Police, while KBEMS says The Medical Center EMS).

## Limits
- A licence service area is not an exclusive franchise and not a dispatch assignment. KY has overlapping licences (see A-multi).
  The PSAP column says who answers the call, not who the ambulance is.
- Free text, so the parse is rule-based plus 4 overrides; the JSON keeps `service_area_text` verbatim for audit.
- Oldham County EMS is Class Ia but typed "911 Response (Scene) WITHOUT Transport"; not counted. AmeriPro 1707 holds the Oldham area.
- Ownership: `org_type` is the state's own field (Fire Department / Governmental, Non-Fire / Hospital / Private / Community Non-Profit).
- Not tried: KY county/PSAP sites for adjudicating A-multi; KBEMS records request.
- Spot check (only partly done): Fayette confirmed from a source the row does not cite (lexingtonky.gov/fire: Lexington Fire
  Department ambulance rates and transport). Louisville Metro EMS and Warren (Medical Center EMS) pages were blocked or JS-only (403 / empty).
  Madison County EMS page did not load. Not a finished three-county check.

## Wired into the county map (2026-10-21, branch lane/ky-public)
`county_911_all.py` reads `county_verdict` (the KY block after the TN block). Result: **A 113, B 1, C 6** (was B 21, C 95, D 2, none 2; all 120 counties changed, no other state).
- 95 counties where one operator's licence names the whole county: tier A, `basis: serves`.
- 18 A-multi counties (two or more operators each name the whole county): tier A with ALL named operators listed, none picked (the A rule needs a record that names the provider for the county; GA zones and OR ASAs already carry several per county). Ownership reads `mixed` where owners differ. Owner may pick one per county:
  - Boone: American Medical Response - Northern Kentucky; First Care Ohio, LLC
  - Boyd: Boyd County Emergency Ambulance Service; King’s Daughters Medical Transport
  - Bracken: American Medical Response - Northern Kentucky; Bracken County EMS
  - Campbell: American Medical Response - Northern Kentucky; Campbell Fire/Rescue; Fire Department of Bellevue-Dayton; First Care Ohio, LLC; NEWPORT FIRE DEPT. AMBULANCE SERVICE; Southgate-Wilder EMS
  - Carroll: American Medical Response - Northern Kentucky; CARROLL COUNTY EMERGENCY MEDICAL SERVICES
  - Floyd: EMERGENT CARE EMS; LIFEGUARD EMERGENCY MEDICAL SERVICES (1188)
  - Gallatin: American Medical Response - Northern Kentucky; GALLATIN CO. EMS
  - Grant: American Medical Response - Northern Kentucky; DRY RIDGE FIRE DEPARTMENT; First Care Ohio, LLC
  - Greenup: Greenup County Ambulance Authority; GREENUP EMERGENCY AMBULANCE SERVICE, LLC; King’s Daughters Medical Transport; PORTSMOUTH EMERGENCY AMBULANCE SERVICES (1686); Rapid EMS (1653)
  - Kenton: American Medical Response - Northern Kentucky; EDGEWOOD FIRE & EMS; First Care Ohio, LLC
  - Magoffin: LIFEGUARD EMERGENCY MEDICAL SERVICES (1611); Magoffin County Ambulance Service
  - Mason: American Medical Response - Northern Kentucky; MAYSVILLE-MASON COUNTY AMBULANCE SERVICE
  - Ohio: COM CARE, INC.; OHIO CO. EMS
  - Owen: American Medical Response - Northern Kentucky; Owen County Emergency Medical Services
  - Pendleton: American Medical Response - Northern Kentucky; PENDLETON COUNTY AMBULANCE TAXING DISTRICT
  - Pike: Appalachian 1st Response Emergency Services, Inc.; LIFEGUARD EMERGENCY MEDICAL SERVICES (1611)
  - Pulaski: SOMERSET-PULASKI CO. RESCUE SQUAD; Somerset-Pulaski County EMS
  - Trimble: AmeriPro EMS of Kentucky LLC (1707); TRIMBLE COUNTY EMS
- 3 part-county counties (Fulton, Knox, McLean): `basis: located`, `partial` (tier B/C by the usual Medicare check; Knox B, Fulton and McLean C).
- 4 counties held out of A because the NG911 EMS boundary layer (`states/KY.json`, re-pulled with geometry in `downloads/ky_2026-10/`) names another operator; KBEMS names enter as `located` (tier C), conflict text kept in the provider `note`: Lewis (KBEMS Lewis County EMS vs NG911 PORTSMOUTH AMBULANCE SERVICE), Henderson (Deaconess EMS vs AMR-Henderson), Martin (Rapid EMS vs PATRIOT EMS), Warren (The Medical Center EMS vs Bowling Green Police Department, which is the PSAP, not an operator). Resolve by county page or call; then move the county out of `KY_CONFLICT`.
- Public text: `via` = "Kentucky Board of EMS licensed service areas (EMS Directory, 2026-08-01)", credited to the state board; "A licence area is not an exclusive or dispatch assignment." Fire-district licences never count toward the county answer.
- Names keep the state's spelling minus the `(licence)` suffix; ownership from the state's `org_type`.
