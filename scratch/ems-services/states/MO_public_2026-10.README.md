# MO ambulance districts, pulled 2026-10-21

File: `states/MO_public_2026-10.json` (meta + 107 rows, one per district polygon + county_verdict for 115 county-level units). Raw/tools: `downloads/mo_2026-10/` (`amb_districts.geojson`, `dhss_stations.geojson`, `county_bnd.geojson`, `county_overlay_districts.json`, `ovl_gen_lane911b.py`, `build_mo_lane911b.py`).

## Source (say it honestly: a compilation, not a state or licence record)
`MO_AMBULANCE_DISTRICTS_view`, ArcGIS Online feature service owned by `osageadmin` (Osage Ambulance District GIS), 107 polygons, item edited 2023-04-05, Name field only (+ PopupInfo notes: website, tax, "Contracted to Cox/Medic One/Livingston FD").
URL: https://services3.arcgis.com/rqXILbzU9MpAga1A/arcgis/rest/services/MO_AMBULANCE_DISTRICTS_view/FeatureServer/0
Missouri ambulance districts are statutory political subdivisions, so a district boundary is a legal service area. The layer is 3.5 years old and unofficial, so tier A also requires a current official cross-check (below).

## Method
Raster overlay of the 107 polygons on Census TIGER counties (same test as ND/WA/KY, >=95% covered). Cross-check: MO DHSS Time Critical Diagnosis Unit `Ambulance_Services` layer (https://gis.mo.gov/arcgis/rest/services/DHSS/Ambulance_Services/FeatureServer/0, 536 stations, edited 2025-04): a ground station whose name matches the district sits inside the polygon.
Counts: **A 63** (covered >=95% and the largest district has a DHSS name match), **A-unverified 4** (Livingston, Shelby, Jefferson, Reynolds: covered, no name match; Livingston AD contracts to Chillicothe FD), partial 33, none 15. Pop in A counties 1.6M of 6.2M.
Several districts tile most counties; all named, none picked (Jefferson, Gasconade, Warren, Scott etc.). 99 of 107 district rows have a DHSS name match = `transport: true` (DHSS lists a ground-ambulance station); the other 8 are `transport: false`, kept.
Where districts contract operations out the row `ownership` says so (Dade/Ava -> Cox, Naylor-Neelyville/Dunklin -> Medic One).

## Spot check (sources the rows do not cite)
Taney: tcad.net "TANEY COUNTY AMBULANCE DISTRICT (TCAD) is an emergency medical service". Audrain: audrainambulance.com "Emergency services for Audrain County". Warren: warrencountyambulance.com "Warren County" EMS site. All agree.

## Limits and dead ends
- Not covered (partial/none): metro and city-run EMS (St. Louis city/county, Jackson, Clay, Platte, Greene, Boone, Cole, Jasper, Laclede, Phelps, Franklin partial). Those need city/county pages. Cass County has a 2026 county layer (`County_EMS_Districts`, 9 polygons: Belton, Central Cass, Garden City, Pleasant Hill, South Metro, West Peculiar, Harrisonville EMS) but it is an EMS/first-response district layer that does not say who transports; not used.
- DHSS gives stations only (points), no service area; `data.mo.gov` Ground Ambulance directory (e7p8-a69d, 456 rows, updated 2026-09-28) has the HQ county only.
- Layer misses: ~116 real districts vs 107 polygons; Howell and Carter, Douglas, Franklin are partial for that reason (not verified).
- DHSS ArcGIS Hosted folder needs a token. No state ambulance-district polygon layer found on gis.mo.gov.
