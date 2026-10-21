# AR NG911 ambulance service-area polygons (STALE 2021), pulled 2026-10-21

File: `states/AR_public_2026-10.json` = `meta` + 114 `rows` (service names) + `county_verdict` (75 counties). **Do not raise any tier from this file: the layer is dated 2021-09-15 (5 years; rule is 3).** All 75 counties are 99.99-100% covered by named polygons, so it would be A-supportable if the owner accepts a 2021 vintage; every county carries `tier: null`, `stale: true` and a `page_note`.
Raw + tools: `downloads/ar_2026-10/` (`ems.geojson`, `ar_ov.json`, `cty_05.geojson`, `ar_build_public.py`, `wm.json`, `wm_adh.json`).

## Source
`https://services.arcgis.com/PwY9ZuZRDiI5nXUB/arcgis/rest/services/EMS_20210915_2/FeatureServer/0` ("EMS2", 123 polygons, 114 names, NG911 ESB schema), layer edit 2021-09-15; used in web map "Ambulance Service Areas (Revised)" (`7fc0b7d4446a405dbf7523efc050a721`, modified 2021-12-18, owner Katy_Hattenhauer / Arkansas GIS Office). Names are the state's `DsplayName` (e.g. "MEMS", "Wash. Co. Reg. Amb. Auth, Central EMS"); no ownership or transport field; some are "(Transfer Only)" and span a county (Benton: Arkansas Paramed Transfer, Total Life Care EMS) so a Benton row would need those removed. Polygons overlap.
**A newer layer exists but is not public:** the ADH web map "ADH - Emergency Medical Service" (`9a6326f0239f4c828eae4859fabb0bf1`, modified 2026-07-22) points at "NG911 EMS BOUNDARY" `https://gis.arkansas.gov/arcgis/rest/services/Apps/NG911_Boundaries/FeatureServer/3`; the REST service answers 404 "Service not found" (the Apps folder lists only `NG911_Boundaries_Comment`). Ask the Arkansas GIS Office / ADH EMS for a current export, or open the web map in a browser to see if it renders with sign-in.

## Spot check (source the rows do not cite: `county_911.json` roster answers)
- Pulaski: MEMS 99.7% (+ Jacksonville FD 3.6%); roster "Little Rock Ambulance Authority" (MEMS is its trade name). Consistent.
- Washington: Wash. Co. Reg. Amb. Auth 88% + Springdale FD 12%; roster "Washington County Regional Ambulance Authority", "City Of Springdale". Consistent.
- Sebastian: Sebastian County EMS 84% + Fort Smith EMS 15%; roster "Fort Smith Emergency Medical Services". Consistent.

## Dead ends
ADH EMS points `Health/FeatureServer/0` and `Ambulance_Service_Sations` (EMResource surge sheet, 2020) hold no areas (see `AR_gis_*README.md`). AGFC/MORAP "EMS" layers are ecological, not ambulance.
