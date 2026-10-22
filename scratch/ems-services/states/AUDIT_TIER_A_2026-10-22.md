# Tier-A source audit, 2026-10-22

Trigger: DeKalb County, GA showed tier A "named by a state record" = "Dekalb County Fire". AMR has
carried DeKalb's 911 patients under a county contract since 2013; the board renewed it in Nov 2025
(dekalbcountyga.gov/node/1210060; firehouse.com/ems/news/55331618).

Scope: every tier-A county whose answer carries no source URL (CA 57, GA 120-129, MS 81, MN 76, OR 19,
AZ 15, CT 9, HI 4; DC has none, see below). Read-only audit: no code or data was changed.

## How a URL-less tier-A row is made

Line numbers below are from `county_911_all.py`. The `normalize.py` adapters are reached through
`dedupe.agencies()`.

- **L17** `SERVES = {'CA','AZ','MN','MS','GA','HI','DC'}`. **L77**: every roster transporter in those
  states gets `basis='serves'`. **L86-88**: it is placed by the roster's own `county` field, which is
  the agency's address. **L276**: any 'serves' row makes the county tier A.
- **`dedupe.agencies()` collapses same-named agencies to one row.** A provider that is on record in
  several counties therefore lands in only one of them. This is why AMR is missing from Riverside
  County, CA, and why Mayo Clinic Ambulance is missing from Stearns County, MN.
- L77 copies no `src_url`, so the page shows no source.

| family | input file | loader | what the source is |
|---|---|---|---|
| GA | `states/GA_grant.json` (137 agencies) | `normalize.ga_grant` L1114 -> L77/86 | Trauma Commission FY25 EMS **equipment-grant roster**. One row per agency, at its address county. Membership means "holds a 911 zone somewhere", not "holds this county's zone". It is positive-only, and SOURCES.md says it was "NOT wired in". Multi-county zone holders sit in one county: AMR is filed under Fulton only, and Gold Cross under Jefferson although it serves Augusta. |
| MS | `states/MS_county_providers.json` (MSDH "Currently Licensed Ambulance Services" by county) | L94-96, `src 'derived'`; also `MS_imagetrend.json` -> L77 (address county) | The county->provider table **is close to a designation**: MSDH lists the ambulance service per county, with city sub-rows. The ImageTrend rows are address-located. They add names in 2 counties only (DeSoto, Neshoba). The loader keeps the county line but loses the city sub-rows (Biloxi/Gulfport = Pafford). |
| MN | `mn/mn_areas.json` (EMSRB statewide PSA layer, 478 PSA x county rows) | `normalize.mn` L32 -> dedupe -> L77/86 | A **genuine designation**: the EMSRB assigns each licensed service an exclusive Primary Service Area. **The join is broken.** 233 of 478 PSA-county pairs are dropped by the name dedupe, and 77 counties lose at least one holder. 'St Louis' and 'Ottertail' never match the Census names, so St. Louis County (Duluth) falls to tier D. |
| HI | `states/HI.json` (DOH EMS unit-locator layer, 56 units) | `normalize.hi` L493 -> L77 | A unit-location layer collapsed to 4 operators. The adapter docstring itself says "this stays tier C", yet HI is in SERVES. The answers are right because Hawaii runs one 911 operator per county by state contract. |
| OR | `states/OR_ASA.json` (third-party ArcGIS "OREGON_AMBULANCE_SERVICE_AREAS_AUTHORITATIVE", 209 polygons, no vintage) | L91-93 directly, plus L83-84 roster-name matches | A county ASA holder layer, which is a designation in kind. But it is stale (Washington County), names fire districts on sub-polygons, and carries junk names ('3201', 'ASA 3'). |
| CT | `states/CT_psar.json` (data.ct.gov m4bu-3dad, DPH PSAR, vintage 2026-03-19) | `normalize.ct_psar` L528 -> L78-82 (town->region) | The **state designation itself**. DPH: "Only the Primary Service Area Responder (PSAR) designated by the State may answer emergency calls". It is tier A only by the CT branch at L78-82; CT is not in SERVES. |
| CA | `states/CA_roster_2022.json` (EMSA provider list, Jan 2022, 2018-20 reporting years) | `normalize.ca_roster` L1200 -> L77/86 | A **licence roster**. `transport: Yes` means the agency holds an ambulance licence, including interfacility, air and CHP. It is placed by the address county and is 4+ years old. The real designation file, the EOA zone table `ca/ca_zones.json`, is **not registered** (`ca()` is commented out of ADAPTERS). |
| AZ | `az/allcons.json` (ADHS Certificates of Necessity, 104) | `normalize.az` L22 -> L77/86 | A **genuine designation**: ADHS grants each CON a defined service area. The `Immediate` field marks 911 response. Three CONs with Immediate != Yes are kept and should not be: Alliance/ABC Ambulance and Critical Air Response (Maricopa), and Ponderosa Aviation (Graham). |
| DC | `states/DC_por.json` (FEMS FAQ) | `normalize.dc_por` L512 | The rows carry no `county`, so add() never fires and **DC is tier D today**. The source would support A: "DC Fire and EMS uses ambulances from American Medical Response (AMR) to transport patients whose injuries or illnesses are not time sensitive" (fems.dc.gov/page/frequently-asked-questions-about-dc-fire-and-ems). |

## Spot checks

Verdicts: CORRECT, INCOMPLETE (right agency, but misses the transporter or a contractor), WRONG, and
NO SOURCE.

### CA, 57 counties, 39.4M people. Score 1/5 correct.
- **Los Angeles: WRONG.** The answer lists 54 names: LACoFD, LAFD and the city fire departments,
  plus about 30 private IFT and BLS firms (Ambulnz, AmbuServe, Ambulife, All Town, Lynch, Mauran,
  PRN, Royalty, ...). Ownership comes out 'mixed'. Those firms are licensed transporters in the 2022
  roster, not 911 providers of record.
- **Riverside: WRONG.** AMR is missing. AMR "has an exclusive contract for 911 ambulance service in
  most of Riverside County" (jems.com/ems-operations/ground-ambulance-operations/amrs-exclusive-contract-california-area/;
  extensions reported on ems1.com). The answer lists Cavalry, Desert CCT, Cathedral City FD,
  Idyllwild FPD and Riverside County Fire. AMR is in the roster under Riverside but was deduped
  into LA.
- **Sacramento: WRONG on ownership.** The four public 911 transporters are present (Sac Metro, Sac
  City, Folsom, Cosumnes). Three IFT firms (Alpha One, Bay Medic, MEDIC Ambulance) are mixed in, so
  the county reads 'mixed'.
- **Santa Barbara: CORRECT, by accident.** "SB County Fire" is the current 911 transporter: the
  supervisors approved County Fire's permits and denied AMR's application (noozhawk.com,
  "supervisors approve ambulance services permits for county fire deny amrs application"). In 2022,
  however, AMR was the 911 provider. The roster shows SB County Fire only because AMR was deduped
  away.
- **Sierra (rural): INCOMPLETE.** "Downieville Fire" covers the west side. The east side (Loyalton)
  is served by Eastern Plumas Health Care Ambulance ("EPHCA was requested ... Third St. in
  Loyalton", themountainmessenger.org sheriff's log 2022-11-24).
- **CA verdict: DEMOTE to inferred.** A 2022 licence roster placed by address is not a 911
  designation. Re-promote only from `ca/ca_zones.json` (EMSA EOA zones).

### GA, 129 counties, 9.26M people. Score 3/5 correct (+Chatham weak).
Cobb is tier D and Clarke is a GA_zoning row with a URL. Both are outside this family and were not
scored.
- **DeKalb: INCOMPLETE.** Dekalb County Fire is a transporter, but AMR carries the county's 911
  patients. "DeKalb County Board of Commissioners Unanimously Approves $78 Million Contract for
  Emergency Medical Services" (dekalbcountyga.gov/node/1210060, Nov 2025); "AMR has held the county
  contract since 2013".
- **Fulton: CORRECT, by coincidence.** Fulton has five zones. North Fulton belongs to AMR: Sandy
  Springs and four other cities contracted with "American Medical Response (AMR), which is the
  designated provider to North Fulton County per the Georgia Department of Public Health approved
  Regional Ambulance Zoning Plan" (roughdraftatlanta.com 2024-06-06). Grady holds Atlanta and has
  held South Fulton since 2018 (gradyhealth.org; ajc.com). Hapeville is listed. Atlanta Fire Rescue
  runs a few city-bought ambulances as a supplement to Grady and is not a zone holder
  (ems1.com/firerescue1.com, "City buys Atlanta FD 2 rigs"). AMR shows up here only because the
  grant roster files AMR under Fulton.
- **Gwinnett: CORRECT.** "Gwinnett County Fire / EMS": the department transports about 44k patients
  a year and bills an emergency medical transport fee (gwinnettcounty.com news releases; ajc.com).
- **Chatham (mid): CORRECT, weak.** The answer is "Mercy Ambulance". The county's 911 provider is
  Chatham Emergency Services, "the sole provider" (news.yahoo.com, Savannah EMS series). The Augusta
  Press says CES "operates Mercy Ambulance Service". The name is a DBA or out of date.
- **Webster (rural): CORRECT.** Webster County EMS, 170 Montgomery St, Preston, with "two EMTs,
  paramedics, or a combination" on duty and 450-500 calls a year (webstercountyga.org/ems/).
- **GA verdict: DEMOTE to inferred, except GA_zoning rows.** A grant roster placed by HQ address
  cannot name a county's zone holder. Every county served by an out-of-county or contract operator
  (AMR, Grady, Gold Cross, Pafford ...) is missed or misattributed. The 3/5 score hides the
  structural miss that produced DeKalb.

### AZ, 15 counties, 7.58M people. Score 5/5 correct (2 extras flagged).
- **Yuma: CORRECT.** CON No. 133 (archived ADHS certificate, OCR) reads: "CITY OF YUMA dba CITY OF
  YUMA FIRE DEPARTMENT ... Service Area: The corporate boundaries of the City of Yuma ... Immediate
  dispatch/response transports only."
  (web.archive.org/web/2025id_/https://www.azdhs.gov/.../certificates/YumaCertificate.pdf)
- **Maricopa: CORRECT, with 2 extras.** The CON holders (Phoenix, Mesa, Tempe, Gilbert, Scottsdale,
  Chandler, Peoria, AMR/Southwest, Maricopa Ambulance, ...) are the 911 certificate holders.
  Alliance (ABC Ambulance) and Critical Air Response have `Immediate: No`, which marks
  interfacility-only CONs, so they are not 911 providers.
- **Pima: CORRECT.** City of Tucson CON (dba Tucson Fire Department, Immediate: Yes), the fire
  districts, and Southwest Ambulance of Tucson. Certificate: TucsonCertificate.pdf, layer `Website`
  field.
- **Cochise (mid): CORRECT.** Sierra Vista Fire & Medical CON (Immediate: Yes), plus Bisbee,
  Douglas and the fire districts.
- **Greenlee (rural): CORRECT.** Greenlee County Ambulance Service CON (dba Greenlee County EMS,
  Immediate: Yes).
- Caveat: the live ADHS site was in "Site Maintenance" today, so the checks use the CON documents
  and an archive capture. No independent agency page was fetched.
- **AZ verdict: KEEP A.** Before re-publishing: drop CONs with Immediate != 'Yes', and attach each
  CON's `Website` URL.

### MN, 76 counties, 5.31M people. Score 0/5 correct (3 INCOMPLETE, 2 WRONG).
The evidence for each county is the EMSRB layer's own rows (`mn/mn_areas.json`;
gisdata.mn.gov/dataset/4d222b9c-3dbe-403a-914c-0d219ba2306c) set against the published answer.
- **Hennepin: INCOMPLETE.** The answer has 5 holders. The layer has 9: M Health Fairview (146 sq mi),
  Ridgeview and Allina North Metro are missing.
- **Ramsey: INCOMPLETE.** M Health Fairview, Allina North Metro and HealthPartners are missing.
- **Stearns: WRONG.** The answer is "Sauk Centre Ambulance" only. The layer names Mayo Clinic
  Ambulance - St. Cloud (522 sq mi in Stearns), CentraCare Paynesville, Melrose, Watkins and
  Glacial Ridge. Mayo's own page lists St. Cloud among its ground service cities
  (mayoclinic.org/ambulance-service/emergency-ground-transport).
- **Olmsted (mid): INCOMPLETE.** Mayo Rochester is present. Chatfield, Hayfield, St. Charles and
  Mayo Plainview are missing.
- **Lake of the Woods (rural): WRONG.** The answer is "Warroad Area Rescue Unit" (273 sq mi). The
  county's main holder, Lake of the Woods Ambulance, Baudette (1,303 sq mi), is missing, and so is
  Lifecare Roseau.
- **MN verdict: DEMOTE until the loader is fixed.** The source is a true designation. Read
  `mn_areas.json` per county directly (as L91 does for OR) instead of through `dedupe.agencies()`,
  and normalise 'St Louis' and 'Ottertail'. The family can then go back to A.

### CT, 9 planning regions, 3.68M people. Score 5/5 correct.
The live API (data.ct.gov/resource/m4bu-3dad.json, pulled today, 478 rows) matches the stored file.
- **Capitol:** Hartford PSAR Basic = AMR of CT and Aetna Ambulance. Both are in the answer.
- **Greater Bridgeport:** Bridgeport and Fairfield = AMR of CT. In the answer.
- **South Central:** New Haven Basic = AMR of CT. In the answer.
- **Western:** Stamford = Stamford EMS, which describes itself as "a private, non-profit, 911
  organization" that "provides paramedic transport services for the city of Stamford"
  (stamfordems.org). Danbury = Danbury EMS. Both are in the answer.
- **Northeastern (rural):** Woodstock Basic = Woodstock EMS. In the answer.
- **CT verdict: KEEP A.** Attach the data.ct.gov URL. A planning-region answer lists 5-31 PSARs,
  which is correct but coarse.

### MS, 81 counties, 2.92M people. Score 4/5 correct, 1 INCOMPLETE.
Check source: MSDH county ambulance list, archived capture of msdh.ms.gov/page/resources/20241.pdf
(web.archive.org/web/2025id_/...).
- **Harrison: INCOMPLETE.** The answer is "Acadian". MSDH lists "Harrison Acadian / Biloxi Pafford
  EMS / Gulfport Pafford EMS". The county contract went to Acadian, "effective May 1"
  (wlox.com 2024-03-12), while "Gulfport and Biloxi selected Pafford EMS". The loader dropped the
  city sub-rows.
- **Hinds: CORRECT.** MSDH lists "Hinds AMR Central". Pafford needed "AMR's permission to cross into
  that territory" (mississippitoday.org 2023-06-14).
- **DeSoto (mid): CORRECT.** MSDH lists "Desoto County EMS / Hernando Fire / Horn Lake Fire /
  Southaven Fire / Olive Branch Fire". The answer has the same five names.
- **Lee (mid): CORRECT.** The answer is Pafford. "Pafford Emergency Medical Services will be taking
  over ambulance services in Lee County" from NMMC (wtva.com, Jan 2025; ems1.com). The archived
  MSDH list still says "North MS Ground", so our answer is the fresher one.
- **Issaquena (rural): CORRECT.** MSDH lists "Sharkey-Issaquena Shoals dba Baptist". The answer is
  "Shoals Ambulance Service - Magnolia Ambulance", the same operator.
- **MS verdict: KEEP A**, with three fixes. Attach the MSDH URL. Read the city sub-rows. Remove MS
  from SERVES, so the ImageTrend address rows stop counting as 'serves'.

### OR, 19 counties, 2.14M people. Score 2/5 correct.
- **Washington: WRONG.** The answer names fire districts (TVF&R, Hillsboro, WashCo FD#2, Forest
  Grove, Cornelius, Gaston). The county's 911 ambulance contractor is AMR, which replaced Metro West
  on 2023-08-01: "Metro West is out as Washington County's ambulance provider ... sign a contract
  with American Medical Response" (koin.com; kgw.com). The layer's provider field on
  "WASHINGTON COUNTY ASA" sub-polygons is not the ASA holder.
- **Jackson: CORRECT.** "Mercy Flights is the (9-1-1) emergency ground ambulance provider for
  Jackson County, Oregon, not including Ashland Fire & Rescue and the Rogue River Fire District
  service areas" (mercyflights.com).
- **Lane (mid): CORRECT.** "The county shall designate one emergency ambulance provider for each ASA"
  (Lane Code ch. 18). South Lincoln holds coastal ASA #2, and a county staff report recommends
  reassigning it to Western Lane (citizenportal.ai summary). That transfer is pending, so add a flag.
- **Umatilla (mid): WRONG.** The answer is literally "3201". The layer has no provider names for the
  Pendleton, Hermiston, Umatilla, Milton-Freewater or CTUIR ASAs.
- **Lake (rural): INCOMPLETE.** Three named volunteer units, plus a junk name, "ASA 3".
- **OR verdict: DEMOTE.** The layer is third-party, undated and at least three years stale in
  Washington, and it carries junk names. Use OHA or county ASA plans per county (Marion's county
  layer is already wired at L240).

### HI, 4 counties, 1.45M people. Score 4/4 correct (Kalawao has no answer).
- **Maui and Kauai: CORRECT.** "DOH Affirms Awards of Contracts for 911 Ground Ambulance in Kauai and
  Maui to AMR" (health.hawaii.gov/news/files/2024/07/PDF-DOH-Affirms-Awards-of-Contracts-for-911-Ground-Ambulance-in-Kauai-and-Maui-to-AMR.pdf).
  The contracts run 2025-01-01 to 2028-12-31.
- **Honolulu: CORRECT.** Honolulu EMS provides "pre-hospital emergency medical care and services to
  residents and visitors of Oʻahu, 24 hours a day" (emergencyservices.honolulu.gov, cited in
  HI_por.README.md).
- **Hawaii: CORRECT.** County fire stations run the ambulances: state-funded ambulances were
  "assigned to the Central (Hilo), Keauhou, Waikoloa, and Ocean View stations"
  (bigislandvideonews.com 2025-03-18).
- **HI verdict: KEEP A.** Swap the evidence from the unit layer to the DOH contract award and the
  county pages, and attach those URLs.

### DC: no tier-A row today
DC_por rows lack `county`, so DC reads tier D. The FEMS FAQ supports tier A: FEMS plus AMR
contracted BLS transport. Add `county: 'District of Columbia'` and the URL.

## Summary

| family | counties | pop | score | verdict |
|---|---|---|---|---|
| CA | 57 | 39.4M | 1/5 | DEMOTE (2022 licence roster by address) |
| GA | 129 | 9.3M | 3/5 + 1 weak | DEMOTE (grant roster by HQ address; keep GA_zoning rows) |
| AZ | 15 | 7.6M | 5/5 | KEEP (drop Immediate != Yes; add CON URL) |
| MN | 76 | 5.3M | 0/5 complete | DEMOTE until the dedupe join is fixed; the source is good |
| CT | 9 | 3.7M | 5/5 | KEEP (add URL) |
| MS | 81 | 2.9M | 4/5 | KEEP (add URL, city sub-rows, drop MS from SERVES) |
| OR | 19 | 2.1M | 2/5 | DEMOTE (stale third-party layer, junk names) |
| HI | 4 | 1.4M | 4/4 | KEEP (cite DOH award) |
| DC | 0 | - | n/a | the loader misses it; promote with URL |

Root causes for whoever fixes `county_911_all.py`:
1. **L17 `SERVES`** turns address-located roster rows into 'serves'. Remove CA, GA and MS. MN, AZ and
   HI should be read from their designation files directly.
2. **`dedupe.agencies()` collapses multi-county providers.** It costs MN 233 pairs and costs CA AMR
   in Riverside. Provider-of-record joins must not go through the dedupe.
3. **L77 drops `src_url`**, so no tier-A row in these families can be clicked through.

WebSearch calls used: 20 of 25.
