# Tier-A source audit, part b (2026-10-22): KY NC FL MD VA NY MI

Same format and verdict words as `AUDIT_TIER_A_2026-10-22.md`. Read-only: no code or data changed.
Owner bar: a named county needs a source a reader can open, and that source must say the named agency
carries 911 patients in that county.
Fetches were made with curl (Safari UA) on 2026-10-22, and the text is in the session scratchpad. 18 WebSearch calls were used.

## Sources by family

| family | tier A | input file | loader | what the source is |
|---|---|---|---|---|
| KY | 111 | `states/KY_public_2026-10.json` (KBEMS EMS Directory xlsx, 2026-08-01) | L111-127 | A **state licence record**. Each Class Ia licence carries the state field "911 Response (Scene) with Transport Capability" and a verbatim service-area text. This is stronger than an address roster, but it is a licence area, not a dispatch assignment (the README says so). The live xlsx (kbems.ky.gov/Legal/Documents/EMS_Agencies_2026-08-01.xlsx) returns 200 and matches the rows. **Loader bug, L124:** `whole_county_services or part_county_services` throws away every part-county 911 licence whenever any whole-county licence exists. 9 counties are hit. A-multi counties (17) are published as plain A. |
| NC | 100 | `states/NC_911.json` (231 of 255 rows from `NC_ownership.json`, the NC OEMS Continuum) | L71/L98-107 via `extra` | A state credential record: the agency's System (= the county EMS System) plus Primary Service "911 Response (Scene) with Transport Capability". This is a real state record. **But 231 rows have `source_url: "states/NC_ownership.json"`, a local file path**, so a reader cannot open anything. The rows still get `kind: 'state'` (L103: the url starts with `states/`). Continuum sits behind a click-through agreement (continuum.emspic.org). The rows store the agency number, not the `/auth/agency/<id>` link. 24 counties have a web-verified local URL. |
| FL | 63 | `states/FL_911.json` (81 rows, 57 counties) + `FL_public_2026-10.json` (6) | L71/L98-107; L139-150 | County, agency and news pages, each with a quote. Where `transport_basis` is not "source", the transport flag comes from the DOH licence type ALS/T. Broward comes from the county EMS provider directory (rev. 2023-07-06). |
| MD | 24 | `MD_public_2026-10.json` (MIEMSS FY2025-26 Annual Report p.75, JEMSOP list) | L139-150 | A **state list of the 9-1-1 EMS program of record** per jurisdiction. Verified live: "Maryland's 29 Jurisdictional EMS Operational Programs (JEMSOPs) provide 9-1-1 emergency medical response across the State" (miemss.org/.../Annual-Report-2026.pdf, HTTP 200). It does not say which units carry patients. In volunteer-squad counties the ambulances belong to squads that are not named. |
| VA | 19 | `states/VA_911.json` (20 rows) + `VA_public_2026-10.json` (Albemarle) | L71/L98-107; L139 | Billing and cost-recovery pages from each county or city, checked against the OEMS roster. Strong. **Loader bug, L65 `bykey`:** `cname()` strips " city", so "Fairfax city" and "Fairfax County" share the key ('VA','fairfax') and the city (a later FIPS) wins. The county rows land on the city. |
| NY | 15 | `states/NY_911.json` (42 rows) | L71/L98-107 | Agency, county and news pages, plus a 2013 IBO report and a 2015 Monroe map. Several rows are **class labels, not agency names**. |
| MI | 33 | `states/MI_911.json` (60 rows) | L71/L98-107 | Agency marketing pages (Life EMS, Medstar, HVA, AMR "company profile"), news and city pages. Many rows are "communities not listed". The MDHHS MCA list backs the file, but it never says who transports. |

## Spot checks

### KY: 4/7 CORRECT, 2 WRONG/INCOMPLETE, 1 INCOMPLETE
- **Jefferson: INCOMPLETE.** The answer is Louisville Metro only. Louisville Metro's own deck lists the suburban fire districts as licensed EMS transporters, with their licensed areas: "Fern Creek and All of Jefferson County", "Okolona and All of Jefferson County", PRP "Understood to be all of Jefferson County", St. Matthews and Anchorage "30-minute response" (louisvilleky.gov/sites/default/files/2023-08/Delivery%20of%20EMS%20in%20Jefferson%20County%20PPT%208-24.pdf). KBEMS lists all seven as Ia "911 Response (Scene) with Transport Capability". Fix: add Anchorage Middletown Fire & EMS, Fern Creek Fire & EMS, Jeffersontown Fire & EMS, Okolona FPD, Pleasure Ridge Park FPD, St. Matthews FPD and Fairdale FPD EMS.
- **Boone: WRONG.** The answer is "American Medical Response - Northern Kentucky" and "First Care Ohio, LLC" (both are broad multi-county licences; First Care is a Cincinnati company). The county is covered by its fire districts. Union FPD: "We are a department that provides emergency medical treatment and transportation ... approximately 49 square miles in south-central Boone County" (unionky911.org/about). The state NG911 layer splits Boone among UNION, BURLINGTON, HEBRON, VERONA, BELLEVIEW-MCVILLE, WALTON, FLORENCE and PETERSBURG FDs. Correct answer: Florence Fire/EMS, Burlington FPD, Hebron FPD, Union FPD, Verona Fire/EMS, Belleview-McVille FPD, Walton FPD and Petersburg VFD Life Squad (all Ia 911-transport in the KBEMS xlsx). This county should be split or partial, like Kenton and Campbell.
- **Christian: CORRECT.** KBEMS xlsx: "HOPKINSVILLE/CHRISTIAN COUNTY EMERGENCY AMBULANCE | Ia | 911 Response (Scene) with Transport Capability | ... | Christian County, Kentucky".
- **McCracken: CORRECT.** KBEMS: "MERCY REGIONAL EMS (1011) | Ia | 911 Response (Scene) with Transport Capability | ... | McCracken County", and Mercy Regional EMS is its own dispatch centre. No county page was found to confirm it.
- **Robertson (rural): INCOMPLETE.** The answer is Bracken County EMS. Its licence area is "Bracken County and other areas as set forth in the contract for the dissolution of Robertson County EMS". The state NG911 EMS layer gives "Nicholas Co Ems" 50% and "Bracken Co Ems" 47% of the county, so Nicholas County Ambulance Service is missing.
- **Owsley (rural): CORRECT.** KBEMS: "Allen's Ambulance Service, Inc. | 1302 | Ia | ... 911 Response (Scene) with Transport Capability | ... BOONEVILLE | OWSLEY | ... Owsley County".
- **Henry: CORRECT.** AmeriPro licence 1642, area "Henry County", and the NG911 label "Henry Co Ems" covers 98%. The org_type "Governmental, Non-Fire" makes the published ownership 'public' for a private operator. That is wrong, but it is a field error, not a naming error.
- **Class finding:** AMR Northern Kentucky appears in 8 answers (Boone, Bracken, Carroll, Gallatin, Grant, Mason, Owen, Pendleton) and First Care Ohio in 2 (Boone, Grant). Both come from a 10-county licence text. Neither has a source naming it as any of those counties' 911 transporter. Each county has its own 911 EMS licence.
- **KY verdict: KEEP WITH LISTED FIXES.** (1) L124: list the part-county 911 licences as well (Jefferson, Boone, Bell, Caldwell, Gallatin, Grant, Laurel, Pendleton, Whitley). (2) Do not publish A-multi counties as A. Hold the 17 at partial, or drop AMR-NKY and First Care Ohio wherever a county service holds the county licence. (3) Robertson: add Nicholas County Ambulance Service. (4) Ownership comes from org_type: AmeriPro (Henry, Caldwell, Mercer) reads public.

### NC: 3/6 CORRECT, 1 INCOMPLETE, 2 CORRECT with NO OPENABLE SOURCE
- **Wake: CORRECT.** "Your Wake County EMS Subscription covers EMERGENCY 911 TRANSPORTS by Wake County EMS" (wake.gov/.../60-subscription-program).
- **Mecklenburg: CORRECT.** "Medic is the sole 911 ambulance service provider in Mecklenburg County" (imagetrend.com press release). The source is a vendor press release; Medic's own page would be better.
- **Robeson (mid): CORRECT, NO OPENABLE SOURCE.** The rows cite `states/NC_ownership.json`. Robeson County EMS's own page says "Robeson County EMS is the primary provider of Emergency Medical Care ... In 2025 Robeson County EMS answered 24,456 calls for service, with assistance from our other system providers, a total of 41,196 calls" (robesoncountync.gov/copy-of-ems). The squads are real, but nothing a reader can open names them.
- **Jackson (mid): INCOMPLETE.** Harris EMS covers "all areas of the county from the Thorpe Power Plant, north, with the exception of the area within the Cherokee Reservation". The cited live URL now returns 404. The archive works: web.archive.org/web/2025id_/https://www.jacksonnc.org/PDF/work-session/2021/november-09/attachment-5a.pdf. The reservation part of the county (Cherokee Indian EMS) has no named provider. Glenville-Cashiers Rescue Squad, the south of the county, is cited only to the local file.
- **Hertford (rural): CORRECT by state record, NO OPENABLE SOURCE.** The row is Continuum agency 0460152, System "Hertford", primary 911 transport. No web page was checked.
- **Jones (rural): CORRECT, NO OPENABLE SOURCE.** The county EMS page lists Jones County EMS (two 24-hour units) and six volunteer EMS departments: Phillips Crossroads, Comfort, Trenton, Wyse Fork, Maysville and Pollocksville (jonescountync.gov/departments/emergency-services/emergency-medical-services). The answer has five of the six; Wyse Fork is missing.
- **NC verdict: KEEP WITH LISTED FIXES.** The Continuum record is a real state 911-transport credential per county system. But 76 counties have nothing a reader can open. Before calling these counties named, give each row its Continuum agency URL (or a county EMS page). Re-point Jackson to the archive capture and add the Qualla Boundary provider. Add Wyse Fork to Jones.

### FL: 4/6 CORRECT, 1 INCOMPLETE, 1 CORRECT with a stale note
- **Broward: INCOMPLETE.** The provider directory (archive capture web.archive.org/web/2025id_/https://www.broward.org/BrowardEMS/Documents/EMS-Providers.pdf; the live URL returns 403 to curl) lists "ALS RESCUE PROVIDERS" that the answer leaves out: **Lighthouse Point Fire Dept.** and **Seminole Tribe of Florida, Dept. of EMS**. The directory is dated "revised 7/6/2023".
- **Pinellas: CORRECT.** "Sunstar Paramedics offer continued care during ambulance transportation to hospitals" (pinellas.gov/emergency-medical-services/). "Operated by Paramedics Plus" is not on that page.
- **Santa Rosa (mid): CORRECT.** "Santa Rosa County contracts with Lifeguard Ambulance Service for emergency and non-[emergency]" (santarosa.fl.gov/478/Ambulance-Services).
- **Columbia (mid): CORRECT, stale note.** The answer note says "entire county (interim)". AmeriPro has since been selected as the primary 911 provider ("AmeriPro Health Inks New 911 EMS Agreement with Columbia County (FL)", jems.com). Board minutes from June 2026 record missed response times. Fix: replace the interim note and the WCJB URL.
- **Franklin (rural): CORRECT.** "The Franklin County Emergency Medical Services ... Weems currently manages a fleet of three ambulances ... stationed throughout the county in Apalachicola, Eastpoint, and Carrabelle" (weemsmemorial.com/healthcare-services/ambulance/).
- **Union (rural): CORRECT, weak.** The county page names the EMS department and its director but has no transport sentence. The transport claim rests on DOH licence 6301 ALS/T.
- Also: Hillsborough's answer is one string, "Hillsborough County Fire Rescue; Tampa Fire Rescue; Temple Terrace Fire Department; Plant City Fire Rescue". It should be split into four names.
- **FL verdict: KEEP WITH LISTED FIXES.** Broward: add Lighthouse Point FD and Seminole Tribe EMS. Columbia: update the note and URL. Hillsborough: split the name.

### MD: 3/6 CORRECT, 3 INCOMPLETE
- **Montgomery: CORRECT.** MCFRS is the JEMSOP, and MCFRS runs the ambulances (with the volunteer corporations inside MCFRS).
- **Baltimore city: CORRECT.** The JEMSOP is Baltimore City Fire Department, which runs city EMS transport. It is keyed by FIPS 24510, so it does not collide with Baltimore County.
- **Harford (mid): CORRECT, incomplete detail.** DES "provides round-the-clock response with 17 ambulances, most housed at volunteer fire companies" (harfordcountymd.gov/165; /2463/Emergency-Medical-Services). The volunteer companies, which also transport, are not named.
- **Queen Anne's (mid): INCOMPLETE (not verified).** The county page fetched (qac.org/235) was the wrong page. The answer is the DES program only; the volunteer companies are not named.
- **Garrett (rural): INCOMPLETE.** The county program "uses paid EMS staff at the volunteer rescue squads" (mgaleg.maryland.gov/2017RS/fnotes/bil_0008/hb0758.pdf). Northern Garrett and Southern Garrett Rescue Squads and Bittinger ("continues to maintain 2 ambulances", garrettcountymd.gov ESB minutes 2025-08-21) own the ambulances, and none is named.
- **Kent (rural): INCOMPLETE.** The county EMS program was started "to help volunteer ambulance companies". "The Kent & Queen Anne's Rescue Squad ... operates three ALS ambulances" in Chestertown (chestertown.gov/community/page/kent-queen-annes-rescue-squad; kentcounty.com/oes/ems). It is missing.
- **MD verdict: KEEP WITH LISTED FIXES.** The source is a real state 911 program list, so the answer is right as "the 911 program of record". It falls short of the owner's bar where volunteer squads run the ambulances. Either add a fixed note ("county 911 EMS program; volunteer companies run ambulances under it") to every MD county, or add the squads for Garrett, Kent, Queen Anne's, Caroline, Allegany and Talbot.

### VA: 4/6 CORRECT, 2 WRONG (a loader collision)
- **Prince William: CORRECT.** "EMS incidents, which result in the transport of a patient to the hospital" (pwcva.gov/department/fire-rescue/ems-billing-program).
- **Virginia Beach: CORRECT.** "The Department of EMS, and the greater VB Rescue system, provides pre-hospital emergency medical care and transportation to City of Virginia Beach" (vbems.com archive capture).
- **Stafford: CORRECT** ("EMS transport billing started October 1, 2006 in Stafford County"), but the ownership reads 'private' for a county fire department.
- **Hanover: CORRECT.** "...when they need emergency transportation via ambulance" (hanovercounty.gov/298).
- **Fairfax city: WRONG.** The answer is "Fairfax County Fire and Rescue Department", but its own row says "not the independent cities of Fairfax and Falls Church". The city runs its own department: "the city charges medical insurance carriers for ambulance transport services, and cost recovery is directed back to the fire department" (fairfaxva.gov/government/fire-department/operations/ems-transport-billing). Correct answer: City of Fairfax Fire Department (OEMS 00072, in VA_oems.json). **Fairfax County (51059, 1.15M people) is tier D as a result.**
- **Roanoke city: WRONG.** The answer adds "Roanoke County Fire & Rescue Department", whose own row says "not Roanoke or Salem cities". **Roanoke County (51161) is tier D as a result.**
- Same collision: Richmond County, VA (51159) is tier D. RAA lands correctly on Richmond city only because the city's FIPS is the later one.
- **VA verdict: KEEP WITH LISTED FIXES.** Key L65 `bykey` on FIPS, or keep " city" in `cname`. Re-run. Fairfax County and Roanoke County then gain tier A, and Fairfax city gets City of Fairfax FD. Fix Stafford's ownership.

### NY: 2/6 CORRECT, 3 INCOMPLETE, 1 WRONG
- **Suffolk: INCOMPLETE (no named agency).** The answer is "Volunteer ambulance companies (27, Suffolk)" and "Fire department ambulances (Suffolk)". The source does name them: "Ambulance Agencies in Suffolk: Bayshore Brightwaters Vol. Rescue Ambulance, Brentwood Legion Ambulance Service, ..." (suffolkambulancechiefs.com). Publish the names. The same fix applies to Nassau ("Fire department / fire district ambulances (Nassau)", "Volunteer ambulance corps (Nassau)").
- **Erie: INCOMPLETE.** AMR (Buffalo), Twin City and Erie County Ambulance are right. The county program page says it was formed because of "an aging and decreasing base of skilled volunteer EMTs" (www3.erie.gov/ems/erie-county-ambulance-program). The volunteer and fire-company ambulances in the southern towns are not named. AMR also appears twice.
- **Rockland: WRONG.** The only answer is "Town volunteer ambulance corps (Rockland)", which is not an agency name. The source is Rockland Paramedic Services, an ALS service: "We have established a premier ALS/BLS System by working with the various town volunteer ambulance corps" (rocklandparamedics.org/services/municipal-911/). No corps is named. Demote the county until the corps are named (for example from the county EMS directory).
- **Albany (mid): CORRECT.** Mohawk lists "Emergency Albany Area (518) 434-4151" and provides "Basic and Advanced Life Support Services to Albany ... Counties" (mohawkambulanceservice.com/about-us/). Colonie and the town EMS units are named.
- **Dutchess (mid): CORRECT, minus Beacon.** "The merger would make Empress the sole EMS provider in the county except for the City of Beacon" (lakevillejournal.com, 2025-09-03). Beacon's provider is not named.
- **Monroe: CORRECT, stale.** AMR Rochester plus the named volunteer and fire ambulances, from a county map dated 2015-12-31. That source is about 11 years old.
- **NY verdict: KEEP WITH LISTED FIXES.** Replace class labels with the names (Suffolk, Nassau), demote Rockland, add Beacon, and note the Monroe vintage.

### MI: 3/6 CORRECT, 3 INCOMPLETE
- **Wayne: INCOMPLETE.** The file's own gap list says "Livonia, Taylor, Dearborn Hts, Redford, Downriver not row-sourced (WCMCA list: ~30 fire depts plus LifeLine, Superior, AmeriPro, HVA)" (MI_911.md). HVA and Medstar rows say "municipalities not listed".
- **Kent: INCOMPLETE (self-flagged).** Life EMS ("Greater Grand Rapids"), Rockford Ambulance and AMR West Michigan ("serving West Michigan and the communities around Grand Rapids and Holland", amr.net). The note says "Grand Rapids city split ... not stated". The sources are company marketing pages.
- **Ottawa (mid): CORRECT, partial extent.** "Life EMS selected as new ambulance service provider for Grand Haven Area" (fox17online.com) and AMR for Holland. The rest of the county is not shown.
- **Berrien (mid): INCOMPLETE.** Medic 1 serves its 22 member municipalities (medic1ambulance.org/coverage-map/). The Niles and Buchanan area is served by **Southwestern Michigan Community Ambulance Service (SMCAS)**, "a non-profit, municipally owned advanced life support service serving residents within the Cities of Buchanan and Niles, as well as Buchanan, Niles, Howard, Bertrand, Milton and Pokagon Townships" (berriencommunity.org/southwestern-michigan-community-ambulance-service-smcas). It is missing.
- **Lake (rural): CORRECT.** Life EMS files quarterly reports with the county: "2,214 transports and assessments" in 2024 (lakecountymi.gov/wp-content/uploads/2025/03/Lake-Co-comm-report-4th-qt-2024.pdf). The current URL is Life EMS's marketing list, so swap it for the county report.
- **Oceana (rural): CORRECT.** "Effective October 1, 2018, Oceana County receives emergency medical ambulance service from Life EMS Ambulance" (oceana.mi.us/community/public-safety/emergency-medical-ambulance-service/). Swap the URL to this page.
- **MI verdict: KEEP WITH LISTED FIXES** for single-provider counties sourced to a county page. For multi-provider metro counties whose rows say "communities not listed" (Wayne, Oakland, Macomb, Kent, Genesee), mark them partial, not A. Berrien: add SMCAS.

## Every county found wrong or incomplete, with the correct answer

| state | county | current answer | correct answer / addition | source |
|---|---|---|---|---|
| KY | Boone | AMR-NKY, First Care Ohio | Florence Fire/EMS, Burlington, Hebron, Union, Verona, Belleview-McVille, Walton FPDs, Petersburg Life Squad | unionky911.org/about; KBEMS xlsx; KY NG911 layer |
| KY | Jefferson | Louisville Metro | + Anchorage Middletown, Fern Creek, Jeffersontown, Okolona, PRP, St. Matthews, Fairdale | louisvilleky.gov 2023-08 EMS deck; KBEMS xlsx |
| KY | Robertson | Bracken County EMS | + Nicholas County Ambulance Service | KY NG911 EMS layer (50%) |
| KY | 6 more AMR-NKY counties | AMR-NKY listed | drop AMR-NKY unless a source names it | KBEMS area text only |
| NC | Jackson | Harris EMS, Glenville-Cashiers | + Cherokee Indian EMS (reservation); dead URL -> archive | jacksonnc.org attachment-5a (archive) |
| NC | Jones | 5 squads | + Wyse Fork | jonescountync.gov EMS page |
| NC | 76 roster-only counties | Continuum rows | attach openable URL | - |
| FL | Broward | 17 providers | + Lighthouse Point Fire Dept, Seminole Tribe Dept of EMS | Broward EMS-Providers.pdf (2023) |
| FL | Columbia | AmeriPro "interim" | AmeriPro, primary 911 contract | jems.com AmeriPro-Columbia article |
| FL | Hillsborough | one joined string | split into 4 names | - |
| MD | Garrett | Garrett County EMS | + Northern Garrett RS, Southern Garrett RS, Bittinger VFD | garrettcountymd.gov ESB minutes 2025; MD fiscal note HB758 |
| MD | Kent | Kent County OES | + Kent & Queen Anne's Rescue Squad (+ Rock Hall, Galena companies) | chestertown.gov; kentcounty.com/oes/ems |
| VA | Fairfax city | Fairfax County FRD | City of Fairfax Fire Department | fairfaxva.gov EMS transport billing |
| VA | Roanoke city | Roanoke Fire-EMS + Roanoke County F&R | Roanoke Fire-EMS only | roanokecountyva.gov row note |
| VA | Fairfax County, Roanoke County, Richmond County | tier D (rows lost) | FCFRD; Roanoke County F&R; (Richmond County unresearched) | existing VA_911 rows |
| NY | Rockland | "Town volunteer ambulance corps" | name the corps or demote | rocklandparamedics.org |
| NY | Suffolk, Nassau | class labels | the named companies | suffolkambulancechiefs.com |
| NY | Erie | AMR x2, Twin City, ECAS | + volunteer/fire ambulances of southern towns | erie.gov ambulance program |
| NY | Dutchess | Empress | + Beacon's provider | lakevillejournal.com 2025-09-03 |
| MI | Berrien | Medic 1 | + SMCAS (Niles, Buchanan) | berriencommunity.org SMCAS |
| MI | Wayne, Kent | partial lists | partial flag | MI_911.md gap list |

## Summary

| family | tier A | spot score | verdict |
|---|---|---|---|
| KY | 111 | 4/7 | KEEP WITH LISTED FIXES (L124 part-county drop; A-multi; AMR-NKY) |
| NC | 100 | 3/6 + 2 correct-but-no-URL | KEEP WITH LISTED FIXES (76 counties need an openable URL before "named") |
| FL | 63 | 4/6 (+1 stale note) | KEEP WITH LISTED FIXES |
| MD | 24 | 3/6 | KEEP WITH LISTED FIXES (program of record; name squads or add the program note) |
| VA | 19 | 4/6 | KEEP WITH LISTED FIXES (bykey city/county collision) |
| NY | 15 | 2/6 complete (+2 minor) | KEEP WITH LISTED FIXES (class labels; Rockland demote) |
| MI | 33 | 3/6 | KEEP WITH LISTED FIXES (metro counties -> partial) |

Root causes for `county_911_all.py`:
1. **L65 `bykey`, keyed by name:** an independent city and the county of the same name share one key, so county rows land on the city. This hits VA (Fairfax, Roanoke, Richmond) and any other state where a city and county share a name. Key by FIPS.
2. **L124 `whole or part`:** part-county 911 licences are dropped whenever a whole-county licence exists (9 KY counties).
3. **L103 `kind='state'` when `url.startswith('states/')`:** a local file path is treated as a state source with a URL. The 231 NC rows get no openable link.
