# Adversarial audit: tier-A counties in *_local_2026-10.json (2026-10-22)

Scope: 66 tier-A counties across AR DC DE GA IL IN LA MA OH PA SC TN (no tier-A in other files). Every cited
source_url (97 unique) fetched with curl (browser UA), Wayback 2025id_ fallback on 403/404; quotes matched
after whitespace/quote normalisation, misses re-checked by keyword. Independent sources for the 20 largest via
WebSearch (29 calls) + direct fetch. Read-only; no lane file edited.

## HOLD (13)

| County | FIPS | Verdict | Evidence |
|---|---|---|---|
| Faulkner AR | 05045 | WRONG | Cited LR resolution (Jan 2022) is real, but Faulkner Quorum Court Ord. 22-08 (faulknercountyar.gov ... Proposed Ordinance 22-08) names Pafford Medical Services after a Feb 2022 RFQ ("Pafford ... was the only response received"; "city of Conway has opted to exercise its authority establishing an ambulance service which is separate"). Pulse of Conway: "Effective March 1, 2022, Pafford Medical Services became the provider of emergency medical services for the City of Conway an[d Faulkner County]". ADH active-services list 2025-12-17 (healthy.arkansas.gov/wp-content/uploads/AR-active-services-for-Public-Portal_2025-12-17_102414.pdf) lists "Pafford - Faulkner Co." (Conway) and no MEMS Faulkner unit; metroems.org/about lists Pulaski, Grant, Maumelle, Sherwood, Cabot only. |
| Washington AR | 05143 | WRONG / OVERCLAIM | Central EMS quote CONFIRMED (centralems.org/about), but Springdale Fire Department is marked non-transport and it transports: ADH list 2025-12 license 139 "Springdale Fire Department", Paramedic/Paramedic, Washington; NWA Online 2014 "springdale-council-to-consider-ambulanc" (FD took over ambulance service in 1966; also covers Tontitown); KNWA Oct 2025 FD proposal to raise ambulance fees. Springdale is roughly a third of county population. Central EMS cannot be "essentially all". |
| York SC | 45091 | OUTDATED | JEMS 2025-03 quote CONFIRMED, but operators changed: Atrium Health acquired Fort Mill EMS in 2025 (York County Council approved transition Apr 2025, WRHI; later JEMS jems.com/?p=216288 "Atrium bought Fort Mill EMS last year"); EMS1 2025-12-18 (ems1.com/ems-management/financial-pressures-drive-s-c-ems-into-hospital-ownership): "Lake Wylie ambulance service will transition to Piedmont Medical Center ownership in January" (River Hills/Lake Wylie EMS -> Piedmont). Rows name dead operators. |
| Pulaski AR | 05119 | OVERCLAIM | LR resolution 2025-09-16 CONFIRMED ("exclusive franchise to provide all ambulance services (emergency and non-emergency) to Pulaski County ... through October 27, 2030"). But ADH list 2025-12 license 358 "Jacksonville Fire Department (RSI)", Paramedic/Paramedic, Pulaski (same class as MEMS units; Conway Fire's first-response license is "Advanced"). Lane note itself saw JFD in the 2021 layer. Jacksonville transport not ruled out: whole-county MEMS unproven for Jacksonville. Hold until JFD transport is confirmed or ruled out. |
| Beaufort SC | 45013 | OVERCLAIM | County quote CONFIRMED, but Hilton Head Island Fire Rescue FAQ (hiltonheadislandsc.gov/firerescue/faq.cfm): "Fire Rescue is responsible for transporting all patients to the hospital as part of our system"; seven stations each with an ALS ambulance. HHI (~38k) must be named; county EMS is not whole county. |
| Horry SC | 45051 | OVERCLAIM | HCFR quote CONFIRMED ("emergency medical services for the entire county"). But City of Myrtle Beach news 2022-03-21 (cityofmyrtlebeach.com/news_detail_T6_R1552.php) "Two new ambulances are coming to the Myrtle Beach Fire Department"; WMBF 2022-04-15 "A brand new ambulance is officially in service at Myrtle Beach Fire Station 1 ... one of two new ambulances that we're adding to our fleet". MBFD transporter unnamed. (North Myrtle Beach Rescue Squad role unverified, zoominfo only.) |
| DeKalb GA | 13089 | QUOTE NOT FOUND (DCFR row) + possible OVERCLAIM | AMR row CONFIRMED on dekalbcountyga.gov/node/1210060 (Wayback; live 404): 2025-11-19 "new five-year contract with American Medical Response (AMR) for emergency ambulance services". The DeKalb County Fire Rescue row's quote "coordinate ambulance resources and unit hours across the county" is NOT on the page; page never says DCFR transports. Also unresolved: the City of Atlanta's DeKalb portion may be Grady EMS's zone (gradyhealth.org says 911 for City of Atlanta); "whole county" for AMR unproven there. |
| Sullivan TN | 47163 | OVERCLAIM | Quote CONFIRMED but page states no service area (lane note admits "inferred"). Kingsport Life Saving Crew still runs calls (WJHL: Kingsport BMA hired 3 firefighters to staff it; Kingsport Central Dispatch handles "Sullivan County EMS and the Kingsport Life Saving Crew") and Bristol Life Saving Crew exists (RadioReference). Whole-county unproven. |
| Lebanon PA | 42075 | OVERCLAIM / unreadable source | ArcGIS layer content CONFIRMED by query (41 boxes: Life Lion 13, FASP 12, Myerstown FAU 6, Newmanstown 5, Northwest 2, CMT/FTIG/Schaefferstown 1). But the cited URL opens to "Services Directory has been disabled" for a reader; the layer is an undated dispatch box card with no transport wording; "LebTown 2020" quote is a separate URL. Fails "source a reader can open that says transports"; vintage unknown. |
| Orangeburg SC | 45075 | QUOTE NOT FOUND | Cited page (sc-orangeburgcounty.civicplus.com/171) has no "sole 911 provider" nor "1986" (also absent from 2025 Wayback of orangeburgcounty.org/171). Page does say OCEMS provides "out-of-hospital acute medical care and/or transport", ambulance fleet, 6+1 stations. Re-quote; MedTrust staffing agreement (EMS1, unfetched) unresolved. |
| Lexington SC | 45063 | OVERCLAIM (contractor unnamed) | County quote CONFIRMED. MedTrust has a 5-year county contract from Dec 2022 taking low-priority 911 calls (Post and Courier 2022; County Focus Winter 2024: ~500 calls/month off county EMS; Lexington Chronicle). A contractor carrying 911 patients must be named. |
| New Castle DE | 10003 | POLICY | Quotes CONFIRMED (newcastlede.gov/343 Wayback; trinityhealthma.org Saint Francis). Transporters outside Wilmington are an unnamed set ("21 volunteer fire company BLS ambulances"); University of Delaware student BLS ambulance also omitted. Owner call: does an unnamed set meet "named"? |
| Sussex DE | 10005 | POLICY | Quotes CONFIRMED (sussexcountyde.gov/emergency-medical-services: "Transportation of patients is provided by 21 BLS transport services"). Named agency (SCEMS) is non-transport; the 21 transporters are unnamed. Same owner call as New Castle. |

## Fix row, keep (no hold)
- DC 11001: AMR row vintage 2021 is stale but contract is CURRENT: DC Council FY27 FB0 Attachment I (dccouncil.gov/wp-content/uploads/2026/04/FB0_FY27_Attachment-I.pdf): "American Medical Response Mid-Atlantic Third Party Ambulance - Medicaid Grant Portion 10/1/2026 9/30/2027 20,926,004.00". Swap source. FEMS quote CONFIRMED.
- Knox TN 47093: AMR CONFIRMED current (WVLT 2026-02-03 "AMR meets response time goals in Knox County after contract changes"). TN directory "Priority" conflict resolved in AMR's favour. KFD row (NT) source 403, search-summary only; drop or re-source.
- Aiken SC 45003: CONFIRMED, but county page itself says private companies help "in time of excess activity" (unnamed). Watch.

## CONFIRMED (quote present, supports transport + area, current or no sign of change)
Suffolk MA (Boston EMS, Cataldo x3) · Davidson TN · Greenville SC · East Baton Rouge LA (EBR EMS; Acadian partial) · Charleston SC ·
Richland SC (Wayback 2025; transport wording only in note) · Hamilton TN (East Ridge covered per county 2021 resolution) · Rutherford TN ·
Orleans LA · Williamson TN · Berkeley SC · Lafayette LA (2020 Advocate "parish-wide contract"; KATC 2026-10 Acadian Broussard station, no sign of change) ·
Montgomery TN · Tippecanoe IN · Dorchester SC (Wayback gz) · Ouachita LA · Washington TN · Pickens SC · Florence SC · Bradley TN · Lancaster SC ·
LaPorte IN · Sumter SC (+Guardian) · Putnam TN · Bartholomew IN · Anderson TN · Robertson TN · Athens OH (levy PASSED 2025-11-04, WSAZ 60.8%) ·
Darlington SC · Jefferson TN · Bedford TN · Jackson IN · Lawrence TN · Cheatham TN · Campbell TN · Putnam IN · Jasper SC · Steuben IN · Greene IN ·
Edgefield SC · Washington IN · Adams OH · Hocking OH · Owen IN · Sabine LA (Acadian sole provider from 2026-01-01, KALB) · Jay IN · Union IL ·
Lawrence IL · McCormick SC · Jasper IL.

## Independent second source, 20 largest
Suffolk: boston.gov Boston EMS 2024 Vital Stats (93,774 transports) · DeKalb: hoodline 2025-11 AMR $78M · Davidson: WSMV 2025-12-31 NFD year-end ·
DC: DC Council FY27 Attachment I · New Castle: WDEL 2024 county medics + county tiered-response page · Greenville: county SystemOverview + 2024 Large System of the Year ·
Knox: WVLT 2026-02-03 · EBR: WAFB 2024-12-17 new EBR EMS station · Charleston: Post and Courier special report (late 2024) · Richland: WIS 2026-07-10 county ambulance suit ·
Horry: CONTRADICTS (MBFD ambulances) · Pulaski: ADH 2025-12 list (MEMS units; also JFD) · Hamilton: hamiltontn.gov 2021 resolution (East Ridge) + Medic 17 release ·
Rutherford: Fox17 / JEMS Smyrna station · Orleans: NOLA OIG 2026-04 + LA Illuminator 2025-06 · Lexington: Post and Courier 2022 (CONTRADICTS: MedTrust) ·
York: EMS1 2025-12 (CONTRADICTS: ownership change) · Sussex: county new paramedic station release (Medic 103, 2024) · Williamson: Williamson Herald 2022 Brentwood station (no 2024+ independent found) ·
Washington AR: ADH 2025-12 (CONTRADICTS: Springdale FD).
