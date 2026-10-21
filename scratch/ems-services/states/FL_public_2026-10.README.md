# FL public-record rows for the 10 counties FL_911.json left "Not sourced" (pulled 2026-10-21)

Files: `states/FL_public_2026-10.json` (meta, 7 rows, county_verdict in the WA/NV `add` format). Tools: `downloads/fl_2026-10/build_public_fl_ga_la.py` (builder, also GA and LA), `fl_county_sites.py` (domain probe + one-level crawl), `fl_txt.py` (page text). Raw pages: `downloads/fl_2026-10/` (`fl_sites/`, `hardee_fr.html`, `desoto_ps.html`, `arch_union_ems.html`, `bcfr.geojson`, `baker_county.geojson`).

## Result (10 counties)
- **A-supportable (6): Liberty, Lafayette, Union, DeSoto, Hardee, Baker.** Source = county BOCC department page naming the county EMS / fire-rescue department (Baker: the county's own ArcGIS layer "BCFR EMS & Career Fire Districts", last edit 2024-04-24, three district polygons covering 99.8% of the county by our overlay against Census TIGER; the polygons carry district numbers only, the provider comes from the layer title/description).
- **Partial (1): Madison**: the page names Madison County Fire Rescue and a billing line, nothing on EMS or ambulances.
- **Not sourced (3): Holmes** (county site is a parked stub), **Taylor** (Fire & Rescue page: supports EMS "on an as-needed basis", EMS provider not named), **Washington** (county site lists Emergency Management only).
- No statewide FL service-area layer exists. The sweep's other FL polygon layers (Brevard, Pinellas, Collier, Leon, Escambia, Bay, Sumter, Jackson MED zones) are single counties already tier A in FL_911.json; not re-pulled.

## Caveats
- Transport is not stated on any cited page. `transport: true` rests on the FL DOH licence type ALS/T (states/FL_parsed.json, same basis FL_911.json uses) and is stated as such in each row.
- Union's live site is Cloudflare-walled (a Chrome visit hit the verification screen and was closed, not bypassed); the row cites an Internet Archive 2025 capture.
- Lafayette: county page says "Emergency Medical Services", FL licence is "Lafayette County Rescue"; row uses the licence name so the roster row is replaced, not duplicated.

## Spot check from a source the rows do not cite (CMS 2024 Medicare ambulance billing, cms/orgs/2024_labeled.json)
- Baker: County Of Baker, Macclenny, 648 emergency transports, share 1.0.
- DeSoto: Desoto County Fire Rescue, Arcadia, 658, share 1.0.
- Union: Union County BOCC, Lake Butler, 208, share 1.0. (Also Liberty 61, Lafayette 182, Hardee 243, Madison 554.)
- For the unsourced: Holmes BOCC 557 (0.90) and Washington County Ambulance 791 (0.77) bill emergencies, Taylor none; a county page is still needed.

## Dead ends
holmescountyfl.org (lander stub); bakercountyfl.org live (Cloudflare 403, archive homepage shows "Emergency Medical Services (Coming Soon)"); taylorcountygov.com/departments/ems (404); washingtonfl.gov/departments/ems is Emergency Management; domain guesses unioncountyfl.gov/.org, holmescountyfl.com, bakercountyfl.gov do not resolve.
