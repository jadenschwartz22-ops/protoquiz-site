# KY audit of tier A rows, 2026-10-22 (adversarial, LANE_BRIEF_AUDIT.md)

- 21111 Jefferson (pop 793,881): FAIL. Fern Creek, Jeffersontown and St. Matthews rest on the 2023 Metro deck's licensed-area table plus the KBEMS roster; no opened page states they transport, and the deck's Fern Creek/St. Matthews areas predate the 2026-06-15 licence change.
- 21067 Fayette (pop 329,437): PASS. Quote found on lexingtonky.gov/fire ('prompt transport'); KBEMS Fayette: only Ia 911 licence is LFD; AmeriPro 1705 typed IFT, UK 1687/3004 critical care; own search: no private 911 contractor.
- 21227 Warren (pop 147,936): FAIL. cited WBKO article is dated 2018-10-23 and TriStar Greenview won a CON on 2023-10-20 to run a ground ambulance service 'to serve the county along with Med Center EMS' (tristarhealth.com, 2023-11-16); no 2024+ source shows whether Greenview operates.
- 21093 Hardin (pop 112,826): PASS. Quotes found in 2024 county study ('sole ambulance transport service in Hardin County, apart from Fort Knox'); KBEMS Hardin: only Hardin County EMS Ia; own search: Baptist Health Hardin listed as medical transport only.
- 21151 Madison (pop 99,582): PASS. Quote found; same page says 'on all of our ambulances' and Emergency: 911; KBEMS Madison: only Madison County EMS Ia; own search: Berea station is Madison County EMS.
- 21059 Daviess (pop 104,457): PASS. EMS1 2019 quote found; current amr.net Owensboro page lists '911 Emergency' services in Owensboro, KBEMS 2026 licence 'Owensboro/Daviess Co EMS Operated by AMR'; Owensboro FD and Daviess Co F&R are non-transport; 2019 contract was 1 yr + 9 renewals, no end date before 2027 shown.

Audited 6, passed 4, failed 2; population passed 646,302, held 941,817.

## Second audit: KY_verify_2026-10.json, 18 tier A rows (promoted into KY_local_2026-10.json)
Method: every source re-opened (raw in web_raw/KY/audit/), every quote found; KBEMS 2026-08-01 licence list checked for every licence based in or naming the county (only one Ia 911-transport whole-county licence each; others are Class V community paramedicine, Class III UK critical care, Class II IFT, Class VIII event non-transport, Logan Aluminum plant-only Class IV; neighbouring-county "30 minute response" radii read as border coverage); one Google News RSS search per county ("<County> County" Kentucky ambulance service, last 2 years), no contradicting provider found. KY rule applied: Ia 911 whole-county licence + opened local page naming the service for the county.
- 21209 Scott (61,700): PASS. EMS1 2026-04 quote found; added Georgetown News-Graphic 2025-08-12 (G/SC EMS ambulance "enroute on an emergency call"); Georgetown served by the joint city-county service.
- 21113 Jessamine (56,495): PASS. Wayback 2025-08 quotes found ("Emergency Transport: 911"); added EMS1 2024-03-05 on Jessamine County EMS.
- 21073 Franklin (52,442): PASS. Chief quote and Med 1-5 apparatus found; added State Journal 2025-09-15 blotter naming Frankfort Fire and EMS; Franklin County FD holds no licence; SkyLife is non-911.
- 21179 Nelson (48,706): PASS. Quotes found on nelsoncountyems.com.
- 21009 Barren (45,609): PASS. WCLU 2025-03 "transported by Barren-Metcalfe EMS" found.
- 21107 Hopkins (45,218): PASS. WKDZ 2026-08 quote found; added WBKO 2025-12-18 "transported by Medical Center Ambulance Service".
- 21035 Calloway (38,975): PASS. KFVS 2024-10 "Murray-Calloway County EMS also transported" found.
- 21157 Marshall (31,734): PASS. County page quotes found ("911 emergency calls").
- 21021 Boyle (31,394): PASS. County page and 2024 fee schedule (ALS/BLS emergency transport codes) found.
- 21173 Montgomery (28,771): PASS. mcfdems.com quotes found (live refused, 2026 Wayback); WKYT 2025-06 names Montgomery County Fire and EMS transport times.
- 21141 Logan (28,467): PASS. WNKY 2026 quote found; added WBKO 2025-08-29 (patient transported, Logan County EMS on scene); second licence 1681 is Logan County EMS Auburn.
- 21239 Woodford (27,728): PASS. LEX18 2026 quote found; added WKYT 2026-02-13 "transported ... by Woodford County EMS".
- 21217 Taylor (26,809): PASS. campbellsville.us quotes found; Taylor Regional 2001 is BLS non-911.
- 21043 Carter (26,098): PASS. Carter County Times 2025-04 quote found.
- 21137 Lincoln (24,910): PASS. Wayback 2024-10 quotes and four stations found (live site unreachable); no change found in news.
- 21005 Anderson (24,883): PASS. 2022 quote found; 2022 URL now 404, replaced with live county Public Safety page (three ALS ambulances, owned by Fiscal Court), quotes found.
- 21205 Rowan (24,675): PASS. rcky.us "covering all 911 requests for ambulances" found; ambulance-theft news is Elliott County.
- 21003 Allen (22,037): PASS. County page quotes found; added WBKO 2026-09-09 on Allen County EMS ambulances; "unified Fire and EMS district" news is Allen County, Indiana.

Audited 18, passed 18, failed 0; population passed 646,651.

## Audit 4, 2026-10-22: 4 A audited, 4 PASS, 0 FAIL; pop passed 121,610
All quotes re-found (web_raw/KY/audit4/). Licences KY_public_2026-10.json by service-area FIPS and address county. KY rule applied: whole-county Ia transport licence plus an opened local page naming the service in that county.
- Meade 21163 PASS: licence 1091 Ia whole county; WNKY 2026-09 names Meade County EMS at scene, 2022 transport quote; NG911 Med 1-3 polygons are Meade 911; the 9.8% uncovered is the Fort Knox reservation (noted on page, same as Hardin).
- Henderson 21101 PASS: undated Deaconess page backed by WEHT 2026-10-08 (Deaconess EMS responding in Henderson County, dispatched by Henderson Dispatch), added to second_source; only Ia licence is Deaconess 1043; Century Aluminum (plant, non-transport) and Deaconess Women's (critical care, non-911) excluded; no AMR licence despite NG911 label; Henderson city has no fire ambulance licence.
- Hart 21099 PASS: licence 1423; WNKY 2026-05 transport by Hart County EMS.
- Grayson 21085 PASS: licence 1081; WNKY 2026-10 names Grayson County EMS at scene; Vanderbilt ground licence is non-911.
Held rows promoted as empty-service notes: Oldham, Bullitt, Breckinridge, Russell, Simpson.

## Run 5 audit (verify file with 7 A, 2026-10-22; helpers web_raw/KY/audit5/)
- Perry 21193 PASS: quote present (Hazard Herald 2026-03 "Perry County Ambulance transported"); only Ia licence for Perry is Perry Co. Ambulance Authority 1416 (Knott's licence 1376 "DBA Perry County Ambulance" is area Knott only, same brand); NG911 "Perry County Ambulance Service" 97%.
- Harlan 21095 PASS: Yahoo 2025-07 quote present; "Harlan Lifeguard Ambulance Service" matches sole Ia licensee Lifeguard EMS 1303 (distinctive name, NG911 "Lifeguard Ems" 98%).
- Johnson 21115 PASS: both Paintsville Herald 2026 quotes present; Paintsville EMS = licensee City of Paintsville Fire-Rescue-EMS 1192 (area City + Johnson County); Lifeguard 1611/3010 are interfacility-only in Johnson; NG911 Paintsville FD 98%.
- Mercer 21167 PASS: LEX18/WKYT 2024-04 quotes present; AmeriPro 1717 sole licence 2026-08; three-year contract runs past 2027-01; NG911 Mercer Co EMS updated 2025-06. Own search: only Mercer County OH hits.
- Marion 21155 PASS: WNKY 2026-04 quote present; sole licence Marion County EMS 1470, exact name; NG911 99%.
- Wayne 21231 FAIL: quote present and name matches licence 1648, but Wayne County's own NG911 EMS layer (2023-09) assigns a zone on the north edge (Mill Springs / Lake Cumberland, ~4% of the county) to "PULASKI EMS"; no page explains it.
- Adair 21001 PASS: WNKY 2026-10 quotes present; sole licence Adair County Ambulance Service 1466, exact name; NG911 99.8%.
Held rows promoted as empty-service notes: Casey, Pulaski, Laurel, Whitley, Garrard, Spencer, Rockcastle.
