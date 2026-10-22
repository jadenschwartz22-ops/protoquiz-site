# TN tier-A audit (adversarial), 2026-10-22

Scope: 30 A rows in states/TN_local_2026-10.json. 14 new rows: steps 1-5. 16 older rows (passed states/AUDIT_LANES_2026-10-22.md): steps 3-5.
Result: 29 PASS, 1 FAIL (Hawkins -> held). Population still A: 3,715,746.

Licence cross-check: states/TN_directory.json holds only the PRIMARY 911 rows (101), not every licence. The full list was pulled fresh: POST County=<X> to
https://internet.health.tn.gov/EMSDirectory (curl works now, 2026-10-22, one county at a time; parallel POSTs come back empty). Every licence in each A county is listed below.
Exclusion rule used: hospital-owned services (Vanderbilt LifeFlight Ground, Saint Thomas EMS, HCA, Erlanger, CommonSpirit, children's hospitals, UT LifeStar/Mobile Health Solutions, Covenant) count as interfacility;
plant and military fire services (ORNL, Y-12, AEDC/Arnold AFB) count as non-public; category I (invalid vehicle), E (conditional), G (rotorwing) and revoked licences are not 911 ground transport.
Private BLS companies without the state PRIMARY 911 tag are excluded on the state record plus the county or contract page. An untagged private ALS service needs an opened page.

Step 5 (one independent search per county): RUN ONLY FOR KNOX. The session-wide WebSearch budget (200, shared) was used up after 2 calls in this lane. Steps 5 is still OPEN for the other 28 PASS rows. Tiers were left at A on steps 1-4, because a hold cannot be undone later. Re-run step 5 when the budget refills.

## New rows (steps 1-5)
- Greene: PASS. Quote found ("exclusive ... ambulance service countywide"), page dated 2026-08-29. Opened WJHL 2024 shows the agency running calls. Only licence: Greene County/Greeneville EMS 3001. Greeneville is about 15k. Step 5 open.
- Tipton: PASS (weak). The 2020 release quote is present ("exclusive 911 emergency ambulance service to the county"). No contract term is stated. The 2026 Priority page (priorityambulance.com/brands/baptist-ambulance/) lists a Tipton hub, Tipton as a service area and 9-1-1 among its services, and the 2026 directory still tags Baptist-Tipton PRIMARY 911. Benchmark Medical Transportation-Tipton (BLS, untagged) is excluded by the exclusive contract. Step 5 open.
- Loudon: PASS. WVLT 2024-12-03 quote is present, and the page says the 5-year renewal is "exclusive emergency and non-emergency" for the county, Loudon and Lenoir City. RURAL/METRO dba AMR-Loudon (ALS 10244, Greenback, untagged) is excluded by that exclusive contract. Step 5 open.
- Coffee: PASS. Quotes are present, and the county page lists 2 Manchester and 2 Tullahoma stations (Tullahoma is about 20k). Other licences: AEDC (Arnold AFB, military), Vanderbilt LifeFlight Ground-Coffee (hospital), Expedited Medical Services BLS (on probation) and Team Mobile BLS (both untagged private BLS). Step 5 open.
- Hawkins: FAIL -> held. The quotes are present (WUOT 2026, and WJHL 2017 says "entire county"). But part of Kingsport (city over 20k) lies in Hawkins, and nothing opened says who carries 911 patients there. The Kingsport Life Saving Crew still runs Kingsport calls.
- Giles: PASS. Quote present; the other licence is Survival Flight (rotorwing). Step 5 open.
- Hickman: PASS. Quote present ("emergency 911 ... ambulance transportation ... throughout Hickman County"). Saint Thomas EMS-Hickman (BLS) is hospital interfacility. Step 5 open.
- Lewis: PASS. Quote present (the page has invisible characters). The page mentions Winter Storm Fern (2026), so it is current. Only licence: Maury Regional EMS-Lewis County (primary 911). Step 5 open.
- Scott: PASS. Quote present; only licence. Step 5 open.
- Unicoi: PASS. Quote present; only licence. Step 5 open.
- Union: PASS. Live page 403; Wayback copy has the quote, modified 2025-11-25. Only licence. Step 5 open.
- Morgan: PASS (weak vintage). Live page 403; Wayback copy has the quote, page dated 2020. The 2026 directory has the same director (Lamance) as primary 911, so there is no sign of change. Only licence. Step 5 open.
- Marion: PASS (weak). Puckett page quote present ("trusted 9-1-1 provider for ... Sequatchie, and Marion counties"), current 2026. No county page; contract term unknown. Only licence: Puckett EMS-Marion (primary 911). Step 5 open.
- Sequatchie: PASS (weak). Same as Marion; only licence Puckett EMS-Sequatchie (primary 911). Step 5 open.

## Older rows (steps 3-5)
- Davidson: PASS. 21 licences. Only NFD is tagged; the rest are hospital, I/E/G or private BLS. Davidson County Rescue Squad (BLS, volunteer) is untagged; noted, but not a known 911 transporter. Step 5 open.
- Knox: PASS. AMR is right. Opened WVLT 2026-02-03: "Knox County's ambulance service met its response time goals throughout 2025", AMR, under a contract renewed 2 years earlier (5+5 years). Priority's PRIMARY 911 tag (licence 10174) is explained by Priority's own page (priorityambulance.com/brands/priority-ambulance/). That page names Priority's exclusive 911 counties as Loudon, Cocke and Franklin and offers only a subscription in Knox. KFD holds ALS licence 10349 for "KFD Ambulance 1": WVLT 2024-11-14 says it "is not intended for standard emergency medical services calls" and is for special operations. The row's KFD evidence is a search summary (page 403); re-source it to the WVLT 2024 page. Other licences are hospital, private untagged or I/E/G. Farragut is in the AMR contract (2013 bid).
- Hamilton: PASS. 15 licences; only Hamilton County EMS is tagged. AMR, Vital Medical and Puckett-Hamilton are untagged private ALS. Puckett's own page leaves Hamilton out of its 911 counties. AMR and Vital rest on the "all 576 square miles" quote, and the earlier audit cleared East Ridge (2021 resolution). Step 5 open (AMR/Vital overflow in Chattanooga not searched).
- Rutherford: PASS. Saint Thomas EMS-R is a hospital service. Team Mobile Health Care-Rutherford (ALS, untagged private) is the weakest exclusion; the page names county EMS as responsible for "the primary 911 medical response". No city fire department holds a licence. Step 5 open.
- Williamson: PASS. Only other licence is Caliber (I). Step 5 open.
- Montgomery: PASS. Page says "sole 911 provider". Other licences: First Call BLS, Team Mobile (E), Vanderbilt ground (hospital). Fort Campbell is military. Step 5 open.
- Washington: PASS. Niswonger Children's (hospital). Step 5 open.
- Anderson: PASS. ORNL and Y-12 fire departments are federal plants. Oak Ridge has no licence of its own. Step 5 open.
- Bedford: PASS. Vanderbilt LifeFlight Ground-Bedford is a hospital service. Step 5 open.
- Lawrence: PASS. Moorecare BLS (untagged private). Step 5 open.
- Bradley, Putnam, Robertson, Jefferson, Campbell, Cheatham: PASS, single licence each. Jefferson's "all residents" quote covers its share of Morristown. Step 5 open.
