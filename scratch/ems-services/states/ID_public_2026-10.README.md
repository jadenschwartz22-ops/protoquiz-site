# ID county EMS coverage (state DHW), pulled 2026-10-21

File: `states/ID_public_2026-10.json` (meta + 65 agency rows + county_verdict for all 44 counties). Raw/tools: `downloads/id_2026-10/` (`County_EMS_Coverage.json`, `Partial_County_EMS_Coverage.json`, `Transport_/Non_transport_911_Response_Agency_Stations_2022_7.json`, `build_id_lane911b.py`).

## Source
Idaho Dept of Health and Welfare EMS Bureau (ArcGIS owner dcoleman_dhw): `County_EMS_Coverage` (31 rows, "911 Response EMS agencies with full county coverage areas", item edit 2022-01-25) and `Partial_County_EMS_Coverage` (13 counties split by ZIP, edit 2023-07-03). Base https://services1.arcgis.com/CNPdEkvnGl65jCX8/arcgis/rest/services/. Transport from the state's own Transport / Non_transport 911 Response station layers (Service_Type). The earlier `ID_dhw911.json` pull is the same family.

## Result
All 44 counties are named: 31 single agency (Jerome and Twin Falls both Magic Valley Paramedics), 13 split counties with 2-6 agencies named by ZIP area (all named, none picked; ZIP population is a rough guide only).
**Data vintage is Sept 2021** (layer snippet "911 Response Stations 9/1/2021"), 5 years old. Per the stale rule every county is recorded `A-supportable-stale` with a page_note and the existing tier left alone; the master decides whether a 2021 state record plus the spot check is enough. 4 agencies lack a transport label (Lost River EMT's, Benewah County EMS, St. Maries Ambulance, St. Mary's Hospital Ambulance).

## Spot check
Ada County Paramedics is live (adacounty.id.gov/paramedics, "Ada County Paramedics"), consistent with "Ada County-City EMS System". Bannock/Kootenai agency sites blocked or empty (403/blank); not checked.
