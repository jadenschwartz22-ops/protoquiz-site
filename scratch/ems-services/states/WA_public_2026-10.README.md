# WA DOH EMS agency primary response areas (2026-10-21 pull)

File: `states/WA_public_2026-10.json` (`meta` incl. `county_summary` for all 39 counties + 415 `rows`).
Raw: `downloads/wa/response_area_2026-10-21.json` (polygons, WGS84), `downloads/wa/wa_county_boundaries.json`
(WA DOH `County_Boundaries`, 39), `downloads/wa/index.html` (the map shell), `downloads/wa/wac_246-976-*.html`.

## Source
`https://fortress.wa.gov/doh/ems/index.html` is an ArcGIS Instant App (JS shell). The layer behind it is the DOH
ArcGIS Online feature service `Agency_Primary_Response_Area_view`
(`services8.arcgis.com/rGGrs6HCnw87OFOT/.../FeatureServer/0`, item 7f02e2b3569d45cab1190a96721c69f9, last edit
2025-03-28). We already held a 2026-09-10 pull of this layer as `states/WA_DOH.json` (415 features, identical
licence/name set); this pull re-fetched it with geometry and, new, attributed it to counties. Paged 100 at a time
(a single query truncates at 200 polygons).

## Fields
Source has only OBJECTID, License, Agency_Name_New, Shape area/length + polygon. The layer has NO county field and
NO 911 flag. Added: licence_type from the licence prefix (AMBV/AMB = licensed ground ambulance service, 255;
AIDV/AID/ADIV = aid service, non-transporting, 159; 1 blank), transport (true for ambulance, false for aid, state's
own licence class under RCW 18.73), join to `states/WA_stations.csv` (371 of 415 by licence: roster name, level,
vehicles, address city/county), and `counties` = polygon-vs-county overlay (shapely, equirectangular, our
derivation, labelled): share of the polygon in each county and share of the county it covers. 391 polygons sit in
one county, 24 span 2-3.

## What the polygon means
WAC 246-976-390(1)(b): verified ground ambulance services must meet response times "for all EMS and trauma
responses to response areas identified in their department-approved application on file". So an ambulance polygon is
the state's record of where that licensee is approved to respond. It is a licensed area, not a 911 dispatch
assignment, and WA does not make ambulance areas exclusive.

## County test (ours, stated)
A county is tier-A-supportable from this layer alone when the ambulance polygons' union covers >= 95% of the county
(2020 TIGER county, water included). Counted "conditional" when a roster AMBV licensee with an address in that county
has no polygon.
- A, clean: Garfield (Garfield Co FD1 99.8%), Stevens (Sheriff's Ambulance 50%, Chewelah Rural Ambulance Assn 28%,
  Deer Park Volunteer Ambulance 12%, Spokane Tribal Emergency Response 10%).
- A, conditional: Asotin (Asotin Co FD1 99.8%; Lewiston Fire Dept, ALS, Clarkston station, no polygon), Kittitas
  (Kittitas Valley F&R 74%, Upper Kittitas Medic One 26%; Snoqualmie FD licence with Easton station, no polygon),
  Walla Walla (City of Walla Walla FD 89%, FD4/FD5; Waitsburg Ambulance has no polygon; polygons overlap 11%).
  None of these 5 is in `WA_911.json` today; county_911.json has them at C.
- Area rows only (17 counties, cover 50-95%: e.g. Klickitat 93%, Kitsap 93%, Yakima 93%, Skagit 84%, Okanogan 86%,
  Lincoln 85%, Ferry 80%, Island 79%, Benton 75%, Thurston 75%): each polygon is a sourced "area + licensee" row like
  `WA_911.json` rows, but the county as a whole is not named. Do not move the county tier.
- Not supportable (17 counties, ambulance cover < 50%: King 46%, Pierce 47%, Snohomish 45%, Spokane 5%, Skamania 0%,
  Franklin 20%, Whatcom 33%, etc.): the largest private and hospital-district carriers are absent from the layer.
Full per-county numbers: `meta.county_summary`.

## Limits and warnings
- The layer is partial: 53 roster ambulance licences have no polygon, including AMR in King, Pierce, Spokane,
  Thurston, Yakima, Clark, Grant, plus Tri-Med, Falck, Rural/Metro, Olympic Ambulance, Life Flight.
- Yakima is the counterexample: Advanced Life Systems (private ALS, interfacility plus private emergency) is drawn
  over 92% of the county while the county-contract 911 transporter is AMR (see `WA_911.json`), which has no polygon.
  A blanket private polygon does not mean 911 provider; the >=95% test could pass such a county, so the five A
  counties were read by name (all local public/volunteer districts or a sheriff/tribal service).
- Not independently verified. Before publishing any of the five, spot-check each against a county or agency page
  (Stevens and Garfield first). Honest tier-A wording: "state-licensed ambulance response area", not "911 zone".
- Overlay uses 2020 county polygons with water; a county's coverage can read 1-3% low or high at coasts.
- The 14 counties with sourced rows in `WA_911.json` are unchanged; this layer does not replace those rows (its
  polygons name fire districts but omit the private BLS carrier in the same city, e.g. AMR Seattle/Spokane).

## Gap research verdicts (2026-10-21; applied via `county_verdict` in the JSON, read by county_911_all.py)
Research: /private/tmp/claude-501/-Users-jadenschwartz/fd1f49d6-d68f-42ee-8308-1d7181310a89/scratchpad/gap-research.md (also gap/ captures). Each verdict lists `sources`, `decision`, `drop`, `add`, `page_note`.
- Stevens: C -> A. Deer Park Ambulance added (Spokesman-Review 2026-03-09: with the Sheriff's, the only ALS agencies; Deer Park the only ALS transport in the south), Chewelah spelling fixed, four state-licensed response areas (union 99.9%) named. Boundary between Sheriff's and Chewelah areas not sourced (said on the card).
- Garfield: unchanged answer and tier (C); card says no source states the 911 assignment.
- Asotin: Clarkston Fire Department added (city ambulance, partial); held at C because Lewiston FD has no polygon, Clarkston is licensed only as an aid service and the Aug 2026 levy result was not found. Re-check before publishing.
- Walla Walla: Waitsburg Ambulance (ended 2019) replaced by Columbia County FD #3 (partial); held at C (county levy system is news, not a state area record).
- Kittitas: confirmed, no change.
