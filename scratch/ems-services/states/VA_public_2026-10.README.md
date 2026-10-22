# VA public 2026-10 (one county gained; statewide layer is a dead end)

File: `states/VA_public_2026-10.json` (1 row, 1 county_verdict add, same `add` shape as WA/NV).

## Gained
- Albemarle (pop ~116k): Albemarle County Fire Rescue, county page https://www.albemarle.org/government/fire-rescue/about-us ("emergency medical treatment and transport", career staff plus nine volunteer fire and rescue agencies). Read in Chrome 2026-10-21 (curl, archive and WebFetch 403, as VA_911.README.md says). OEMS roster agrees (licence 00939, ground ambulance ALS/BLS). Same method as VA_911.json. Volunteer squads CARS (00109) and Western Albemarle (00121) also hold ambulance licences; the split is not sourced. Tier A supportable like the other VA county pages.

## Dead ends (do not repeat)
- VGIN NG911 (vginmaps.vdem.virginia.gov/arcgis/rest/services/NG911): services are PSAP, provisioning and RCL layers only; no EMS emergency service boundary layer statewide (checked folder listing; VGIN hub search for "ems", "ambulance" gives only Orange Co., Bedford Co. and VA_Landmarks points).
- County EMS layers from the sweep, all unusable as provider-of-record: Charlotte Co. `EMS_FIRE_RESPONSE_AREAS` (68 polygons, edit 2025-10; DsplayName is dispatch order codes like "CO4-Co5-Co6-STA8", no agency names), Orange Co. `EMS Districts` (MapServer 3, no JSON from curl; station first-due districts), `ems_districts_07142021` (token required), `EMS_Station_Districts` and `Hanover_Fire_EMS_Jurisdictions` (layer id differs; Hanover already in VA_911.json).
- VA OEMS roster (`VA_oems.json`) has name, address, classes and medical director only: no service area or locality field.
- Frederick Co. fcva.us: guessed department paths 404 in Chrome; not found in time. Portsmouth and Montgomery not retried.
- Spot check: Albemarle is the only new row and cites the county page; the roster is a second source that the row text does not quote. A three-county check was not done for VA (one row).
