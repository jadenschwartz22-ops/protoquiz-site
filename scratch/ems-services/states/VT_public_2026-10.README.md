# VT ambulance service areas (official, VCGI / State of Vermont), pulled 2026-10-21

File: `states/VT_public_2026-10.json` = `meta` + 67 `rows` (one per service) + `county_verdict` (14 counties).
Raw: `downloads/vt_2026-10/` (`asa.geojson`, `meta.json`, `item.json`, `county_bnd.json` Census TIGERweb, `county_overlay.json`, scripts `ov_generic_vt.py`, `build_vt_public.py`).

## Source
VCGI "VT Ambulance Service Areas" (ArcGIS item 92590d21b8f94b9cbbff87b108b09d10, owner Services_VCGI, item modified 2026-08-28, layer data last edit 2025-12-08):
`https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Emergency_AmbulanceServiceAreas_SP_v1/FeatureServer/0`
(67 polygons, one per service; companion layer "VT Ambulance Service Providers" not pulled). Data steward named on the item is a State of Vermont employee.
Fields: Serv_Name, Cert_Level, address, Total_Tran (transports), Per_No_Tran, Cost_Per, Cost_Call, Cov_Area_1..17 (the towns covered).
Item text: "In towns with overlapping services, coverage area was assigned to the provider with the largest geographic area or servicing the greatest number of residents."
So it is ONE provider of record per town (a compilation, not a licence record); a disclaimer says some values were estimated and cost figures are allocations.

## County test (ours, stated)
shapely overlay in EPSG:5070 of the 67 polygons on Census TIGERweb counties (VT, 14). A county is tier-A-supportable at >=95% union coverage.
**All 14 counties are 99.8% to 100% covered (tier A supportable).** None has a single service of record: Vermont is town-by-town, every county lists 3 to 15 services
(slivers under 1% kept in `slivers_under_1pct`). Names are alphabetical, area share is not a ranking of who answers.

## Caveats
- `transport`: true only where Total_Tran is reported (>0); null for 6 services with no transport count (Richford, 45th Parallel EMS, Lancaster Fire Dept (NH), Woodsville Rescue (NH),
  Saint Michael's College Fire & Rescue, Granville Rescue Squad); kept, not dropped. Three rows are New Hampshire services covering Vermont border towns.
- Polygons look town-aligned; the item says some data are estimates. No ownership field (the master's name classifier supplies it; do not publish an official ownership share from this).
- Layer edit date 2025-12-08 (10 months old) is inside the 3-year rule.
- Similar names are separate services: "City of Barre" and "Town of Barre Dept. of EMS"; "Brattleboro Fire Department" (town polygon) and "Rescue Inc." (surrounding towns).

## Spot check (sources the rows do not cite; agency sites, 2026-10-21)
- Windham: rescueinc.org says Rescue Inc. "services 12 towns in Southern Vermont and 2 in Southern New Hampshire"; layer lists 11 Vermont towns (Brattleboro is the FD's polygon). Consistent within one town.
- Orleans/Essex: newportambulance.org "911, EMT to Paramedic service to towns we serve", layer gives Newport Ambulance 17 towns incl. Derby, Troy, Newport. Consistent (no town list on the site).
- Bennington: northshirerescue.org says "the 5 towns supported by the Manchester Rescue squad"; layer assigns 4 (Manchester, Dorset, Mount Tabor, Winhall). One town differs, likely because of the one-provider-per-town assignment rule.

## Dead ends
Vermont Dept of Health EMS pages were not needed. Stowe and Burlington municipal pages 403/404 to curl. No Chrome used.
