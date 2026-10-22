# GA public-record rows for blank counties (pulled 2026-10-21)

Files: `states/GA_public_2026-10.json` (3 rows). Tools: `downloads/ga_2026-10/county_sites.py` (domain probe + one-level crawl), `ga_probe_sites.py`, `path_probe.py`. Raw: `downloads/ga_2026-10/ga_sites/`, `ems_ga.geojson`.

## Result (the 18 blank counties in county_911.json today: Baker Baldwin Ben Hill Brooks Chattooga Clay Clinch Cook Decatur Echols Lamar Lanier Mitchell Pike Quitman Randolph Taliaferro Treutlen; the brief said 20, the file shows 18 with no providers at all and 7 at D)
- **A-supportable (2): Randolph** (county EMS, "primary 911 EMS service to nearly 8,000 people spread over 431 square miles", county page), **Mitchell** (AmeriPro EMS, private contractor, "911 service for the citizens of Mitchell County ... Three 24-hour ALS 911 ambulance", county page).
- **Partial (1): Brooks**: county 911 page lists "Brooks County EMS ... SGMC (South Georgia Medical Center), Valdosta"; terse, no transport/area sentence.
- **Ambiguous (1): Decatur**: county EMS page shows "Grady EMS", a Bainbridge phone, and a link to grady-ems.org, which now redirects to Grady Health System (Atlanta). Not rowed; page_note in the verdict.
- **Nothing found (14)**: Baker, Baldwin, Ben Hill, Chattooga, Clay (domain parked), Clinch, Cook, Echols, Lamar (Fire & Rescue page only; volunteers "trained in ... EMS"), Lanier, Pike (E-911 page: dispatches to "all Fire Departments and Emergency Medical Services"), Quitman, Taliaferro, Treutlen. Several county sites have no EMS page; Ben Hill, Lanier, Treutlen, Quitman domains not found by guesswork.

## Statewide layers (dead ends)
- GIO "Emergency Medical Services Boundaries" (portal.gio.georgia.gov .../Hosted/Emergency_Medical_Services_Boundaries/FeatureServer, edit 2026-03-16): 5 polygons, all Newton County NG911 zones "EMS 1".."EMS 5", no provider names. Newton is tier D; zones unnamed, so nothing to add. The same-named layer on services7 (NatalieLee_GaGeoInfoOffice) has 0 features.
- DPH publishes no zoning list (see GA_zoning.README.md).

## Spot check
Not independently confirmed: CMS 2024 has no Randolph/Mitchell/Brooks County billing entity (Cuthbert, Camilla, Quitman ZIPs) and states/GA_grant.json (positive-only, zoned transport agencies) lists neither Randolph nor Mitchell, so absence proves nothing. Randolph's page is a county government page with a specific population/area claim; Mitchell's names a contractor and the county department. Recommend a phone call to either county before tier A is shown publicly.
