# IN state EMS run records by county and agency (2022), pulled 2026-10-21. NOT tier-A evidence: all counties held.

File: `states/IN_public_2026-10.json` = `meta` + 200 `rows` (agency x county, >=50 runs and >=5% of that county's runs) + `county_verdict` (91 counties, all `tier: held` with `page_note`).
Raw + script: `downloads/in_2026-10/` (`runs_by_county_agency.json`, `parse_in_public.py`).

## Source
IndianaMap (IOT) hosted layer `https://gisdata.in.gov/server/rest/services/Hosted/EMS/FeatureServer/0` (a copy of `EMS_Impressions`), 1,024,662 point records of EMS
runs from the state's ImageTrend system, fields include `user_agencyname`, `user_typeofserviceagency`, `user_agencystatus`, `county`. Layer edit 2026-04-19; run dates
2022-01-01 to 2022-12-30. Only a server-side aggregate (`outStatistics`, group by county x agency x service type, 1,642 groups) was fetched; no incident rows, no addresses.
Public, no auth. Do not publish run counts per agency without checking with the owner; the page uses only the ranked names.

## Why held
It shows which agencies ran 911 scene calls in a county in 2022, not a licensed service area or contract. Data is over 3 years old, and only agencies reporting to the state system
appear: Marion has 302k runs, Monroe 507, Lawrence 119, Blackford 172 (21 counties under 2,000 runs, thin reporting). Mutual aid and geocode errors show as 1-run rows (filtered by the
50-run/5% rule). `transport` comes from the agency's own service-type field ("911 Response (Scene) with Transport Capability"); Indianapolis FD and Fort Wayne FD show "without transport".
Per brief the county tier is left alone; use as a cross-check for the C/B counties (e.g. Allen: Three Rivers Ambulance Authority 50.1%, Fort Wayne FD 18.9% non-transport; Marion:
Indianapolis EMS 51.4%, Indianapolis FD 27.7% non-transport; Lake: Gary FD, Hammond FD, Northwest Ambulance Service, Crown Point).

## Spot check (source the rows do not cite)
`states/IN.json` (IndianaMap EMS Stations 2022, station points): Allen has "THREE RIVERS AMBULANCE SERVICE" (Fort Wayne) and Lake has Hammond FD and Gary FD stations. Agrees with the run data.
Marion: no station named Indianapolis EMS in that file (the 2022 stations layer lists the fire stations); indy.gov / Eskenazi pages did not give a readable sentence by curl. Not confirmed.

## Dead ends (one line each)
- Sweep layers `EMS_Response` (Henry County), `Hanover_Township_EMS___Fire_view`, `Fire and EMS Zones` (Lake County): single-county, not opened further here; `EMScounts`, `EMS2020` are run/pull counts.
- No statewide Indiana service-area polygon found: gisdata.in.gov IDHS folder empty; AGOL owner DHSGIS_ingov holds dashboards and the survey layers only.
- IN 911 Board PSAP survey layer (`PSAP_2024_Survey_Features`) not an EMS provider layer.
