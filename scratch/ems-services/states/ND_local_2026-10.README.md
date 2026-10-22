# ND verify lane, 2026-10-22 (ND_local_2026-10.json)

53 counties: 50 A, 3 held (Mercer, McKenzie, Oliver). Population A 771,556.

## Sources
- ND HHS "North Dakota Licensed EMS Agencies (list)" 05/06/2025 xlsx (official, from hhs.nd.gov/health/EMS/EMS-Agency-Licensure; saved as web_raw/ND/EMS_Agencies_052025.xlsx): licence number, name, address, level. Ground Ambulance (BLS/ALS) and BLS substation rows are the transporters; Quick Response Units are not.
- DES/NDGIS Hub EMS boundary layer + service points re-pulled 10-22 (web_raw/ND/nd_ems_boundary.geojson, nd_points.geojson), county overlay re-run on Census county polygons (0.3% floor; under-1% services listed as slivers).
- Join: each atlas polygon name -> its atlas service point's town -> licence row in that town (manual overrides for renamed/odd labels: F-M EMS = Sanford Ambulance #35, Metro EMS = Metro Area Ambulance #12, Minot Community EMS = Trinity Health ambulance #88, Altru EMS = #48, "Ambulance Service Incorp" = CHI St. Francis, Breckenridge MN #174 (Wahpeton), Lemmon EMS = Lemmon EMT Association (SD), Sidney EMS = Richland County Ambulance (MT)).
## Findings
- All 53 counties are covered by licensed ground ambulance services (the state list has the units; Fargo FD, West Fargo FD, Grand Forks FD, Minot FD are QRU/non-transport, so Sanford, Altru, Trinity transport).
- Held: Beulah EMS (Mercer 46.9%, Oliver 10.8%) maps only to industrial plant ambulances in the 05/2025 list; Fairview EMS (McKenzie 6.8%) has no licence row. An older roster (states/ND_hhs.json) listed Beulah and Fairview/Savage stations, so they may be stations of Mercer County Ambulance and Richland County Ambulance (MT); no page confirms.
- Milnor EMS is resolved by sargentnd.com (Sargent County Ambulance, stations Milnor and Forman; state licence 40).
- Test Agency (licence 40000) in the state list is a dummy row and was ignored. GF AFB EMS (0.5%) and Minot AFB EMS (0.4%) are on-base polygons, not listed.
## Limits
- Agency-own pages were opened only for Sargent County (county page via search), Sanford (annual report via search) and Wahpeton-Breckenridge (news); other counties rest on the two official lists. The atlas is labelled preliminary; the 05/2025 list is 17 months old.
## Spot check (largest, mid, rural vs a source the row does not cite)
Cass (largest): Sanford Ambulance covers Fargo, West Fargo, Mapleton, Harwood (Sanford annual report). Burleigh: Metro Area Ambulance Service, 2940 N 19th St, Bismarck, 1983 private provider (CB Insights/RadioReference). Rural Sargent: matches sargentnd.com.
