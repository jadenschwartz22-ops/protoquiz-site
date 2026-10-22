# Tier-A source audit (c), 2026-10-22: TX MO WI KS ND OK UT VT CO

This is a read-only audit. No code or data was changed. It uses the same format and verdicts as `AUDIT_TIER_A_2026-10-22.md`:
- **CORRECT**: the named agencies carry 911 patients.
- **INCOMPLETE**: a transporter or contractor is missing, or a name is not the agency's name.
- **WRONG**: a named row does not carry patients, or the county's real transporter is missing.
- **NO SOURCE**: no page a reader could open confirms the row.

Samples are tier-A counties sorted by population: the 2 largest, 2 from the middle and the smallest. Rows come from
`data/atlas/<ST>.json` (`a`) and `county_911.json`. Loader blocks are in `county_911_all.py` L157-235.

## Families: what the source is

| family | tier A | source | strength |
|---|---|---|---|
| TX | 69 | Panhandle Regional Planning Commission `EMS_Boundaries` (55 dispatch districts, 24 rural counties), DETCOG `EMS Agency` layer, Bastrop layer, plus hand rows (Harris, Dallas, Grayson, Taylor ...) with agency URLs | Medium. PRPC/DETCOG are regional 911 dispatch districts. They name an EMS per district but say nothing about transport. The hand rows are individually sourced but **list only part of the metro counties**. |
| MO | 63 | `MO_AMBULANCE_DISTRICTS_view`, a KMZ "My Places" compilation (owner `osageadmin`, last edit 2023-04-05), cross-checked with the DHSS station layer | Medium. Third-party and 3.5 years old. Under Missouri law a named ambulance district is an ambulance operator, so a named district is a real transporter. Border slivers add neighbouring districts. |
| WI | 62 | WI OEC NG911 `EmergencyMedicalServicesBoundary` (county-submitted labels) | **Weak.** The labels are PSAP free text: station and unit codes ("Menomonie Amb Sta 1", "970-Osceola Amb", "North Memorial 5101") and responder combos ("Alma Amb/Dover 1st Resp"). **22 of 62** tier-A answers carry such labels. Every tier-A county has at least one name with transport=False. |
| KS | 55 | Kansas 911 Coordinating Council `Kansas_EMS` ESB (PSAP-stewarded); tier A when one polygon of 30% or more matches a KBEMS ground licence | Medium. The licence match is good, but **labels with no ground licence stay in the answer** (11 tier-A counties). |
| ND | 53 | ND DES/HHS EMS boundary atlas (`NDGISHUB_Emergency_Medical_Services_Boundary`, "used for determining which ambulance service is associated with a 9-1-1 incident location") | Strong in kind: it is the state 911 ambulance assignment layer. But it is labelled "preliminary", the ND EMS director wrote "the information on your map is not entirely accurate", and its display names are short labels ("F-M EMS", "Metro EMS"). |
| OK | 32 | OKRMRS Regions 6/8 RSA web map (2024-08, county-wide layers named "<County> County EMS"), plus Region 2 agency polygons (2025-03) | Region 2: medium. **Regions 6/8: weak.** A county-wide layer is a generic label, not necessarily an agency (Comanche). |
| UT | 29 | UGRC `EMSResponseAreas` (NG911, "primary EMS response agency", compiled from Bureau of EMS licence descriptions), filtered by licence class | Strong source with **two loader faults**. Non-transport classes are dropped without naming who transports there (Salt Lake City). Polygons under 1% of the county's area are dropped (American Fork, Springville, Pleasant Grove). |
| VT | 14 | VCGI `FS_VCGI_OPENDATA_Emergency_AmbulanceServiceAreas_SP_v1` (State steward, one provider per town; fields include `Total_Tran` = transports) | **Strong.** The layer itself carries a transport count per service (Burlington FD 5,584; Regional Ambulance 7,689; Middlebury 2,728). |
| CO | 12 | Hand rows (agency pages, `CO_oath.json`) plus the Park County ambulance district layer | Mixed. Each row is sourced, but **metro counties list only part of their providers**, and Larimer carries a placeholder row. |

## Spot checks

### TX: Harris INCOMPLETE, Dallas INCOMPLETE, Grayson CORRECT, Taylor CORRECT, Roberts NO SOURCE. Score 2/5.
- **Harris: INCOMPLETE.** The five rows are true:
  - HFD: "We operate over 100 ambulances and transport units" (houstontx.gov/fire/about/index.html).
  - ESD 11 Mobile Healthcare: "fleet of 43 ambulances ... north Harris County" (harriscountyesd11.gov).
  - Cy-Fair, Baytown and Allegiance (Pasadena) are also correct.
  - But Harris has many more 911 transporters, none of them listed: Spring FD (ESD 7), Atascocita, Humble/ESD 46, Tomball, La Porte EMS, Deer Park, South Houston, Nassau Bay and the Katy ESDs. The roster's own `located` rows name several of them (La Porte EMS, South Houston EMS, Nassau Bay EMS). The county reads as fully named, but it is a partial list.
- **Dallas: INCOMPLETE.** Dallas Fire-Rescue and Mesquite FD are right ("In addition to the Department's ambulances ...", cityofmesquite.com/1151). Missing: Garland, Irving, Grand Prairie, Richardson, Carrollton, Cedar Hill, DeSoto, Duncanville, Lancaster, Rowlett and other city fire departments that run their own ambulances.
- **Grayson: CORRECT.**
  - "The Sherman Fire Department provides Emergency Medical Service (EMS) to the citizens of Sherman and portions of Grayson County ... five ambulances licensed by the Texas Department of State Health Services" (ci.sherman.tx.us/157).
  - Denison: "operates engines, Advanced Life Support (ALS) ambulances" (denisontx.gov/217).
  - PVES: "The ambulance district covers 96 square miles and three fire districts, Preston, Pottsboro, and Locust" (pves.org/about/history).
  - Possible gaps (Van Alstyne, Whitesboro) were not checked.
- **Taylor: CORRECT.** "Taylor County Commissioners Court voted to keep Taylor County EMS as the extended provider for ambulance services ... AMR Metro Care ... affirmed their commitment to providing care to the residents of the City of Abilene" (KTAB via yahoo.com, 2024-04-24).
- **Roberts (rural, pop 837): NO SOURCE.**
  - The answer lists Hemphill County EMS, Miami Volunteer EMS, Pampa EMS and Spearman EMS, taken from the PRPC layer (the polygons for those names touch Roberts).
  - PRPC describes the layer as "EMS districts ... to support regional emergency response coordination and dispatch".
  - No page was found that says Miami Volunteer EMS runs an ambulance. The answer is plausible but unconfirmed.
- **TX verdict: KEEP WITH LISTED FIXES.** Mark Harris and Dallas `partial` (not tier A) until every city or ESD transporter is listed. Keep the PRPC/DETCOG rows, which are a regional dispatch designation, but leave the note "does not say ... carries patients" visible.

### MO: St. Charles CORRECT, St. Francois CORRECT (+2 sliver extras), Cedar unchecked, Gasconade CORRECT (weak), Worth CORRECT. Score 3/5 + 1 weak.
- **St. Charles: CORRECT.** St. Charles County Ambulance District is the county's 911 transporter. sccad.org returned nothing to curl today, so this rests on the district's statutory role and the DHSS station match.
- **St. Francois: CORRECT, with extras.** "St. Francois County Ambulance District Proudly Serving The citizens of St. Francois County" (sfcad.org, linked from the layer's PopupInfo). Iron CAD and Madison CAD are boundary slivers and should be shown as partial or dropped.
- **Cedar (mid): not independently checked.** No district website responded. The only evidence is the layer plus the DHSS station name (Cedar County Ambulance District).
- **Gasconade (mid): CORRECT, weak.** "Hermann Area Ambulance District" (hermannems.com). The Gerald, Owensville and Ozark Central districts appear in the layer with a tcad.net boundary-map PDF. Their share of Gasconade was not checked.
- **Worth (rural): CORRECT.** RadioReference lists "Worth County Ambulance" (Grant City) dispatched by Gentry County. A Nov 2024 news item says "Worth County EMS transported the woman to Mosaic Life Care" (salinapost.com 2024-11-10). Nodaway CAD and North Harrison CAD are slivers.
- **MO verdict: KEEP WITH LISTED FIXES.**
  - Drop or mark partial any district under about 5% of the county's area. Slivers now read as co-equal providers.
  - Show "2023 compilation" as the vintage.
  - The two transport=False names (Ripley: Naylor-Neelyville AD; Iron: Reynolds CAD) must not appear in a tier-A answer.

### WI: Milwaukee INCOMPLETE, Dane CORRECT, Dunn INCOMPLETE, Polk INCOMPLETE, Florence WRONG. Score 1/5.
- **Milwaukee: INCOMPLETE, with 1 wrong row.**
  - Bell, Curtis and Paratech carry Milwaukee's BLS 911 patients: "Three private ambulance companies help service the city of Milwaukee's 911 calls ... Bell, Curtis, and Paratech Ambulance companies handle what are called basic life support 911 calls" (tmj4.com, "the ambulance companies helping milwaukees 911 service are stretched to the max"). None of them is named.
  - "Milwaukee County Fire Department" is the airport ARFF unit: "The Milwaukee County Fire Department at Milwaukee Mitchell International Airport ..." (mitchellairport.com/airport-information/airport-fire-department). It is not a 911 transporter.
- **Dane: CORRECT** (not verified agency by agency). The 20 labels are real Dane EMS agencies: Madison FD, Sun Prairie, Fitch-Rona, Middleton, Stoughton and others.
- **Dunn (mid): INCOMPLETE (names).**
  - The answer lists "Menomonie Amb Sta 1", "Menomonie Amb Sta 2" and "Ecfd Amb". These are station and unit labels.
  - The agency is Menomonie Fire Rescue: "2,641 EMS calls resulted in $1,351,962 in revenue for the city" (menomonie-wi.gov/Archive.aspx?ADID=65, 2021 chief's report).
- **Polk (mid): INCOMPLETE (names).** Unit-numbered labels such as "572-Lakes Region EMS", "970-Osceola Amb" and "977-Northwestern EMS" are shown verbatim.
- **Florence (rural): WRONG.**
  - The answer lists "Aspirus Medivac Als & Tipler Rescue + Florence Rescue", "Integrity Care & Aurora Rescue" and similar combinations.
  - The county now runs its own service: "residents of Florence County now have a county-run EMS service. As of January, all three EMS stations -- Florence, Aurora and Long Lake/Tipler -- are operational ... options were explored, including contracting through Aspirus Medical Transport from Iron River or Integrity Care EMS from Iron Mountain, but developing the county's own system appeared to be the least-costly route" (ironmountaindailynews.com 2024-02-10).
  - Florence Rescue Squad ended service on 2021-03-01 (uppermichiganssource.com 2021-01-22).
  - Correct answer: **Florence County EMS**.
- **WI verdict: DEMOTE.** The layer's labels name responders, stations and units. 22 of 62 answers contain non-agency labels, and Florence is two years stale. To re-promote, use the WI DHS licensed-service roster (`states/WI_dhs.json`) for the names and the NG911 polygons only for placement.

### KS: Sedgwick WRONG (1 row), Reno CORRECT, Washington INCOMPLETE, Norton INCOMPLETE, Greeley CORRECT. Score 2/5.
- **Sedgwick: WRONG row.**
  - "Clearwater EMS" is listed. KBEMS (`states/KS_imagetrend.json`) licenses Clearwater Fire Dept only as a "Continuing Education" provider, with no ground licence.
  - In 2019 the county took over Clearwater: Clearwater's volunteer service was "unable to provide transport" (KSN 2019-12-17). The county EMS now lists "Post 18 – 319 W. Ross, Clearwater" (sedgwick.gov/ems/about/).
  - Correct answer: **Sedgwick County EMS** alone, plus Mount Hope only if it holds a licence (none found).
- **Reno: CORRECT.** Every name matches a KBEMS ground licence: HUTCHINSON REG MED CTR/RENO CO EMS, HAVEN COMMUNITY EMS, PRETTY PRAIRIE AMBULANCE SERVICE, BURRTON CONSOLIDATED FIRE DIST #5. renogov.org is behind Cloudflare, so no agency page was read.
- **Washington (mid): INCOMPLETE.**
  - The label "Washington County EMS" is in fact City of Washington EMS: "provides ambulance service to the citizens of the City of Washington and surrounding areas ... two BLS ambulances, one housed in Washington and one housed in Hanover" (washingtonks.municipalimpact.com/emergency-medical-services).
  - KBEMS also licenses LINN CITY AMBULANCE SERVICE (Ground Ambulance, Linn, Washington County), which is missing.
- **Norton (mid): INCOMPLETE.** "Almena EMS" and "Lenora EMS" have no KBEMS ground licence but are shown alongside Norton County EMS, Logan County EMS and Graham County EMS.
- **Greeley (rural): CORRECT.** KBEMS Ground Ambulance: GREELEY COUNTY AMBULANCE, Tribune.
- **KS verdict: KEEP WITH LISTED FIXES.**
  - Drop every label with no ground-licence match from tier-A answers. This affects 11 counties: Norton, Thomas, Wilson, Osborne, Lincoln, Barber, Barton (the "Great Bend Fire Station 1/2" labels), Ottawa, Sedgwick and others.
  - Show the licence name, not the PSAP label.
  - Add licensed ground services located in the county that the layer omits (Linn).

### ND: Cass INCOMPLETE (name), Burleigh CORRECT (weak). Dunn, Pierce and Slope were not independently checked (atlas only). Score 1/2 checked.
- **Cass: INCOMPLETE (name).** "F-M EMS" is now Sanford Ambulance: "Sanford Ambulance locations: ... North Dakota Fargo Hillsboro West Fargo" (sanfordhealth.org, reached via fmambulance.com/about). The other four (Casselton, Hunter, Kindred, Page) are licensed rural services, but this was not checked against their own pages.
- **Burleigh: CORRECT (weak).** "Metro EMS" is Metro Area Ambulance Service, Bismarck (RadioReference Burleigh page; the CB Insights profile describes it as a private ambulance provider founded in 1983). Wilton and Kidder are border services.
- **Dunn, Pierce, Slope: NO INDEPENDENT SOURCE.** Their small-town service sites did not respond. The only evidence is the state atlas.
- **ND verdict: KEEP WITH LISTED FIXES.**
  - This is the state's own 911 ambulance-assignment layer.
  - Show its "preliminary" caveat.
  - Map display labels to licence names: F-M EMS becomes Sanford Ambulance, and Metro EMS becomes Metro Area Ambulance Service.

### OK: Comanche WRONG, Rogers CORRECT, Marshall, Atoka and Cimarron NO SOURCE. Score 1/5.
- **Comanche: WRONG.** The answer is "Comanche County EMS", a generic RSA-map layer name. The county's own resolution names "the following ambulance services in the county outside the Lawton/Fort Sill city limits: Apache EMS, Carnegie EMS, Comanche County Memorial Hospital and Kirk's EMS" (southwestledger.news/node/17290, 2022-07-26). Correct answer: **Comanche County Memorial Hospital EMS (Lawton and the county), Kirk's EMS (Elgin/NE), Apache EMS, Carnegie EMS**.
- **Rogers: CORRECT.** "Pafford EMS currently serves Claremore area ... five units are dedicated" (claremore.org/rogers-county). Oologah-Talala EMS is from the Region 2 polygon and was not independently checked.
- **Marshall, Atoka, Cimarron: NO SOURCE.** Each is a whole-county "<X> County EMS" layer on the Regions 6/8 map. No agency page was found or fetched (atokacountyems.com returned nothing).
- **OK verdict: KEEP WITH LISTED FIXES.** Keep the Region 2 rows, which are agency polygons. **Demote the Regions 6/8 whole-county rows** (35 rows) to B until each county-layer name is matched to an OSDH licence. Comanche shows that the layer name can be a placeholder.

### UT: Salt Lake INCOMPLETE, Utah INCOMPLETE, Sevier CORRECT, Duchesne CORRECT, Daggett CORRECT. Score 3/5.
- **Salt Lake: INCOMPLETE.**
  - Salt Lake City (about 14% of the county's area, about 200k people) has no transporter named. "Salt Lake City Fire Department" holds the licence class "Paramedic Rescue - ALS non transport" and was correctly dropped, but nothing replaced it.
  - The state licence roster (`UT_imagetrend.json`) lists Gold Cross Ambulance, 1717 S Redwood Rd, SLC, "Ground Ambulance - ALS", licence 1812, and the loader's own note says "Salt Lake City transport is run by Gold Cross".
  - A contractor that carries patients must be named. Add **Gold Cross Ambulance** for Salt Lake City.
- **Utah: INCOMPLETE.** The UGRC layer has its own 911 polygons for "American Fork City", "Springville Fire And Rescue" and "Pleasant Grove Ambulance" (EMS1, EMS57, EMS73). The 1%-of-area cutoff drops them. These are cities of 35-40k people.
- **Sevier: CORRECT.** Sevier County Ambulance holds "Ground Ambulance - ALS" and has a county Ambulance department page (sevier.utah.gov). The Emery QRU is correctly dropped.
- **Duchesne: CORRECT.** Uintah Basin Medical Center holds "Ground Ambulance - ALS" and covers 99% of the county (UGRC + licence roster).
- **Daggett: CORRECT.** "county department: emergency medical treatment and transport" (daggettcounty.gov/98/Ambulance-Services).
- **UT verdict: KEEP WITH LISTED FIXES.**
  - Drop the 1%-area cutoff and keep every polygon that holds population.
  - Where a non-transport responder is dropped, name the licensed transporter for that area (Gold Cross for Salt Lake City), or mark the county partial.

### VT: Chittenden, Rutland, Addison, Bennington and Essex all CORRECT. Score 5/5 (Essex weak).
- **Layer evidence:** `Total_Tran` in the VCGI layer itself shows each service transports:
  - Burlington FD Ambulance 5,584
  - South Burlington FD 2,878
  - Colchester Rescue 1,595
  - Regional Ambulance Service (Rutland) 7,689
  - Middlebury Regional EMS 2,728
  - Bristol 960
  - Vergennes 624
  - Brandon 625
  - White River Valley 1,174
- **Bennington:** Granville Rescue Squad (NY, covering Pawlet, Rupert and Wells) has no transport figure. It is plausible but unconfirmed.
- **Essex (rural): CORRECT (weak).** VCGI assigns Guildhall, Lunenburg and Maidstone to Lancaster (NH) Fire Department. Guildhall's 2024 town report lists Lancaster FD as its fire and EMS contact (guildhallvt.org 2024 municipal report). A VT E911 ESN map also shows Weeks Memorial Hospital for one ESN, so it should be watched. 45th Parallel EMS covers Canaan, Lemington and Bloomfield (pittsburg-nh.gov/45th-parallel-emergency-medical-services).
- **VT verdict: KEEP.** Cite `Total_Tran` as the transport evidence.

### CO: El Paso INCOMPLETE, Denver CORRECT, Douglas INCOMPLETE, Larimer WRONG (placeholder row), Park CORRECT. Score 2/5.
- **El Paso: INCOMPLETE.**
  - AMR is still Colorado Springs' provider: "City Council voted 5-4 against the proposal to establish a fire department-based enterprise to manage emergency ambulance transport" (coloradosprings.gov/EMSTransport, 2024-06-11).
  - The county's other transporters are not named: "Manitou Springs, the Falcon Fire Protection District ... have all ended contracts with private ambulance providers to bring services in-house" (gazette.com, "CSFD or AMR?", updated 2025-07-16). Fountain FD, Tri-Lakes Monument FPD and Black Forest FPD also transport.
- **Denver: CORRECT.** "Denver Health Paramedic Division (DHPD) provides 911 Advanced Life Support (ALS) Emergency Medical Services (EMS) and ambulance transportation to the City and County of Denver" (denverhealth.org/paramedics).
- **Douglas: INCOMPLETE.**
  - South Metro is right: "SMFR provides medical transport through our highly trained Firefighter Paramedics and EMT-Basics" (southmetro.org/emergency-medical-services).
  - Castle Rock Fire and Rescue is missing. Its listed duties include "paramedic ambulance transportation" over a 66-square-mile area covering the Town and the Castle Rock FPD (crgov.com/facilities/facility/details/Fire-Headquarters-Station-151-16).
  - Franktown, Larkspur and West Douglas were not checked.
- **Larimer: WRONG row.** "Fire protection districts (volunteer ambulance)" is a placeholder, not an agency. The other three rows (UCHealth EMS, Thompson Valley EMS, UCHealth Estes Valley) are agency-sourced. Correct answer: name the districts (Glacier View, Livermore, Poudre Canyon, Red Feather Lakes, Rist Canyon) only once each is confirmed to transport. Until then, mark the mountain area partial.
- **Park (rural): CORRECT.** The county's Emergency Services page lists "Platte Canyon Fire and Ambulance", "Southern Park County Fire and Ambulance District", South Park Ambulance District and Ute Pass Regional Ambulance District (parkcountyco.gov/291/Emergency-Services).
- **CO verdict: KEEP WITH LISTED FIXES.** Keep Denver and Park. Make El Paso and Douglas partial until complete. Remove the Larimer placeholder row.

## Individual counties found wrong, with the correct answer

| county | shown | correct | source |
|---|---|---|---|
| Florence, WI | Aspirus/Integrity/Florence Rescue combos | Florence County EMS (county-run, 3 stations since Jan 2024) | ironmountaindailynews.com/news/local-news/2024/02/florence-county-gets-new-three-station-ems-service/ |
| Milwaukee, WI | 12 FDs incl. Milwaukee County FD | add Bell Ambulance and Curtis Ambulance (BLS 911); drop Milwaukee County FD (airport ARFF) | tmj4.com i-team article; mitchellairport.com airport-fire-department |
| Sedgwick, KS | Clearwater EMS + Sedgwick County EMS (+Mount Hope combo) | Sedgwick County EMS (Post 18 in Clearwater) | sedgwick.gov/ems/about/; KBEMS roster (Clearwater FD: CE provider only) |
| Comanche, OK | Comanche County EMS | Comanche County Memorial Hospital EMS, Kirk's EMS, Apache EMS, Carnegie EMS | southwestledger.news/node/17290 |
| Salt Lake, UT | 8 FDs, no Salt Lake City transporter | add Gold Cross Ambulance (ALS ground licence 1812, SLC) | UT_imagetrend.json (Bureau of EMS licence roster) |
| Larimer, CO | row "Fire protection districts (volunteer ambulance)" | remove; name confirmed districts or mark partial | n/a (placeholder) |
| Washington, KS | "Washington County EMS" | City of Washington EMS + Linn City Ambulance Service | washingtonks.municipalimpact.com/emergency-medical-services; KBEMS roster |

INCOMPLETE (a partial list shown as named): Harris TX, Dallas TX, El Paso CO, Douglas CO, Utah UT, Dunn WI and Polk WI (names), Norton KS,
Cass ND (name), plus the MO sliver extras in St. Francois and Worth.

## Summary

| family | tier A | score | verdict |
|---|---|---|---|
| TX | 69 | 2/5 (+2 incomplete, 1 no source) | KEEP WITH FIXES: Harris and Dallas to partial |
| MO | 63 | 3/5 + 1 weak, 1 unchecked | KEEP WITH FIXES: drop slivers, show vintage |
| WI | 62 | 1/5 | **DEMOTE**: PSAP labels name stations, units and responders; Florence stale |
| KS | 55 | 2/5 | KEEP WITH FIXES: drop unlicensed labels (11 counties), use licence names |
| ND | 53 | 1/2 checked | KEEP WITH FIXES: licence names, "preliminary" caveat |
| OK | 32 | 1/5 | KEEP Region 2; **DEMOTE the Regions 6/8 whole-county rows** |
| UT | 29 | 3/5 | KEEP WITH FIXES: no 1% cutoff; name Gold Cross for Salt Lake City |
| VT | 14 | 5/5 | KEEP (cite Total_Tran) |
| CO | 12 | 2/5 | KEEP WITH FIXES: El Paso and Douglas partial; drop the Larimer placeholder |

Class findings for whoever fixes the loader:
1. **A partial list in a multi-provider county is shown as a full answer.** This hits the hand rows in Harris, Dallas, El Paso and Douglas. Tier A should need either complete coverage or the `partial` flag.
2. **Labels are shown without checking them against a licence.** WI shows station and responder labels, KS shows unlicensed labels, and OK shows generic "<County> County EMS" names. Join to the state licence roster (WI_dhs, KS_imagetrend, OK OSDH) and show the licence name.
3. **A dropped non-transport responder leaves a hole.** In Salt Lake City, the transporter that replaces it must be added, or the county marked partial.
4. **Area thresholds hide dense small cities.** The UT 1% cutoff hides cities. The MO and ND thresholds keep border slivers.

WebSearch calls used: 15 of 30.
