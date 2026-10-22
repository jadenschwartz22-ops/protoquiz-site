# MN audit, half 2 (37 counties), 2026-10-22

Output: `MN_audit2_2026-10.json` (same shape as the verify file; 31 A, 6 held; A pop 2,374,434). MN_local not touched. Helpers + captures: `web_raw/MN/audit2/`.

Checks applied to every county:
- Layer re-queried today (`requery.py`): every service name, licence, ServLevel and EditDate in the row evidence matches the live OEMS PSA layer (0 mismatches); no layer row for the county is missing from the row. Both item-page quotes are present in the item description (owner OEMS_GIS).
- Coverage: uncovered parts located (`gaps.py`) and checked against TIGER water (Lake: Lake Superior + BWCA lakes; Mille Lacs: the lake; Goodhue: Lake Pepin). Land gaps over 1% fail.
- Licence cross-check: the OEMS licence CSV is behind the Radware captcha (not solved) and the Wayback Machine was offline (CDX "Temporarily Offline"), so no direct licence list. Public substitute: MN Revenue "Certified Aid 2024" Emergency Ambulance Service Aid list (revenue.state.mn.us 2024-ems-aid-website_0.pdf), one row per licensed rural service. Every aid-list name maps to a layer service (exceptions are outside these counties: Waseca, Ringdahl, Lake Region Healthcare); it is also the 2024+ operating sign for most small services. Not on it: Mayo, Allina, Sanford, White Earth, Hutchinson, metro services.
- Other 2024+ signs: Allina "EMS primary response areas" PDF (last update 3/1/2026: Isanti County (Cambridge), New Ulm licensed by Allina; Glencoe Regional, Hutchinson Health, River's Edge, ALF under Allina contract; small services in Renville/Sibley/Le Sueur/Nicollet/Chippewa/Swift labelled); Sanford Ambulance page (locations Bagley, Luverne, Thief River Falls, Wheaton); White Earth Nation health division ambulance page; MESB 911 map (2026-09-30) for Hennepin, Dakota, Isanti; Post Bulletin 2026-08-25 (Mayo Clinic Ambulance station, Austin); St. Cloud Live 2026-08-18 (Mayo Clinic Ambulance, St. Cloud area); Worthington Globe 2026-05-08 ("Rock County Ambulance"); Ely Echo 2026-10 ("Ely Area Ambulance Joint Powers Board"); KEYC 2026-09-30 (Madelia, Truman, Winnebago transporting).
- Own search: Google News RSS titles (2024+) for each of the 127 services and each county; Bing RSS returned junk; Google link decoding blocked, articles opened from publisher sites.
- Cities over 20k: Mankato, Austin, Owatonna, Winona and the Dakota/Hennepin cities have no own city ambulance beyond the row (metro confirmed on the MESB map).

| FIPS | County | Verdict | Reason |
|---|---|---|---|
| 27005 | Becker | PASS | 5 holders; Essentia DL, Perham, Astera, North Park Rapids on 2024 aid list; White Earth tribal page current |
| 27009 | Benton | PASS | Mayo St. Cloud (2026 news), North Memorial Princeton (aid 2024) |
| 27013 | Blue Earth | FAIL | Lewisville Ambulance (5.9%) stopped transporting 2026-10-01 (KEYC 2026-09-30) |
| 27017 | Carlton | PASS | all 4 on aid 2024; Cloquet Area Fire District 2026 news |
| 27023 | Chippewa | PASS | all 7 on aid 2024; Allina map 3/2026 labels Kerkhoven, Raymond, Granite Falls |
| 27029 | Clearwater | PASS | Sanford lists Bagley; Red Lake on aid 2024; White Earth page |
| 27033 | Cottonwood | PASS | all 8 on aid 2024; Springfield under Allina management only |
| 27037 | Dakota | PASS | MESB 911 map 2026-09-30 matches (St. Paul Fire 0.1%, Cottage Grove 0.07% slivers) |
| 27041 | Douglas | PASS | all 4 on aid 2024; North Memorial Douglas 2025 news |
| 27045 | Fillmore | PASS | all 7 on aid 2024; Rushford, Spring Valley 2026 news |
| 27049 | Goodhue | PASS | all 6 on aid 2024; gap is Lake Pepin |
| 27053 | Hennepin | PASS | MESB 911 map matches; HCMC EMS operating 2026 despite Hennepin Healthcare finances |
| 27059 | Isanti | PASS | MESB map: Allina 72.4, North Memorial 20.9, Lakes Region 6.7 |
| 27065 | Kanabec | PASS | Welia, Mille Lacs HS, Essentia Sandstone on aid 2024; Allina Cambridge on Allina 2026 map |
| 27069 | Kittson | PASS | all 3 on aid 2024 |
| 27075 | Lake | PASS | Lake County Ambulance, Babbitt on aid 2024; Ely Area Ambulance JPB 2026-10; uncovered area is water |
| 27079 | Le Sueur | PASS | all on aid 2024 or Mayo/Allina map; River's Edge staffed under Allina contract, River's Edge-owned (2026) |
| 27083 | Lyon | PASS | aid 2024; Tyler licence paid as "Avera Tyler Ambulance" (same Tyler service, operator Avera) |
| 27087 | Mahnomen | PASS | Mahnomen Health Center on aid 2024; White Earth page |
| 27091 | Martin | PASS | aid 2024 + Truman 2026 news; Mayo Fairmont (Mayo operating 2026, no closure news) |
| 27095 | Mille Lacs | PASS | both on aid 2024; MLHS financial strain 2026 but no ambulance closure found; gap is the lake |
| 27099 | Mower | PASS | Mayo Austin station 2026-08-25; others aid 2024; Hayfield 2026 news |
| 27103 | Nicollet | PASS | aid 2024 + Allina 2026 map (New Ulm Allina-licensed) |
| 27107 | Norman | PASS | all 3 on aid 2024 |
| 27113 | Pennington | FAIL | Sanford lists Thief River Falls as a Sanford Ambulance location; no 2024+ source names "Thief River Falls Area Ambulance" (86.9%) |
| 27117 | Pipestone | PASS | all on aid 2024 (Tyler as Avera Tyler) |
| 27121 | Pope | PASS | all 3 on aid 2024 |
| 27125 | Red Lake | PASS | both on aid 2024 |
| 27129 | Renville | PASS | aid 2024; Hutchinson Health EMS on Allina 2026 map (Allina contract) |
| 27133 | Rock | PASS | "Rock County Ambulance" in Worthington Globe 2026-05-08 and 2025-11-10; Jasper, Edgerton aid 2024 |
| 27143 | Sibley | PASS | aid 2024; Glencoe Regional EMS under Allina contract on Allina 2026 map |
| 27147 | Steele | FAIL | 6 sq mi land strip on the south line with no PSA (1.4% of land) |
| 27151 | Swift | FAIL | 20 sq mi land block between Kerkhoven and Sunburg PSAs with no PSA (2.6%) |
| 27155 | Traverse | FAIL | Sanford lists Wheaton as a Sanford Ambulance location; no 2024+ source names "Wheaton Ambulance Service" (65.8%) |
| 27159 | Wadena | PASS | all 3 on aid 2024; Astera 2026 news |
| 27165 | Watonwan | FAIL | Lewisville Ambulance (12.3%) stopped transporting 2026-10-01 |
| 27169 | Winona | PASS | aid 2024 (Tri-State, Winona Area, Houston, etc.); Mayo Plainview no closure news |

Residual risk: Mayo Fairmont/Owatonna/Plainview/Mankato have only system-level 2026 signs, not station-level; Sanford-run licences keep old names (Rock County Ambulance confirmed by name, TRF and Wheaton not).
