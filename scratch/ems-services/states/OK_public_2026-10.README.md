# OK EMS service-area maps (Regional Medical Response System), pulled 2026-10-21

File: `states/OK_public_2026-10.json` = `meta` + 50 `rows` + `county_verdict` (38 counties: **32 A-supportable, 6 partial**). Raw + tools: `downloads/ok_2026-10/` (`webmap_rsa.json`, `ok_rsa_parse.py`, `ok_rsa_rows.json`, `region2.geojson`, `region2_ov.json`, `cities.geojson`, `cty_40.geojson`, `ok_build_public.py`; overlay tool is `downloads/tx_2026-10/tx_overlay.py`).
Label: "from Oklahoma Regional Medical Response System EMS service-area maps" (a regional hospital-preparedness roster), not the OSDH licence record. Neither source says an agency transports; no `transport` set.

## Sources
1. **Oklahoma EMS RSA Map** (ArcGIS web map `61f5ca542f644a6c9e0ecd0e4f80dad3`, owner `OKRMRS68Director`, modified 2024-08-06): "EMS Response Service Areas for Oklahoma Homeland Security and Trauma Regions 6 & 8". 76 layers, each an agency, drawn as a definition-expression on the state county layer or the Oklahoma Tax Commission city-limits layer (`CITY_NAME = ...`). A county-based layer is the agency's whole county; city layers are city limits only. Parsed in `ok_rsa_rows.json`. 27 counties have a whole-county layer; carve-out city layers in the same county are listed with it (Beckham: Sinor/Elk City/Erick; Blaine: Okeene/Canton-Longdale; Kiowa: Sinor (Hobart); Texas: Hooker). Oklahoma, Cleveland, Canadian, Tulsa have only city layers (EMSA, Pafford, AMR, EMSStat, SSM St Anthony, Noble ...), so they are NOT A (unincorporated areas not named); those city lists are in the parsed file for later.
2. **Region 2 EMS Agency Service Areas** (FeatureServer `.../Region_2_EMS_Agency_Service_Areas`, owner `Landon.Sweeney_R2`, edit 2025-03-28): one polygon layer per agency for NE Oklahoma, overlaid on TIGER counties (>=95% = A): Craig, Kay, Mayes (MESTA), Ottawa, Payne, Rogers = A. Partial: Noble 94.3%, Pawnee 94.2%, Washington 85%, Nowata 78%, Delaware 70%, Osage 71% (tier left alone; Tulsa 22% not used).
Both maps are agency rosters by area; Region 2 polygons and the RSA map agree where they overlap (Craig/Mercy Regional, Ottawa/INTEGRIS+Quapaw, Rogers/Pafford+Oologah-Talala).

## Caveats
- RSA map is dated 2024-08 (2.2 years) and a regional preparedness map ("updated regularly"), not an official licence list; the county layers state a service, not an exclusive franchise.
- Survival Flight EMS is named for Kiowa and Cotton counties by the map; the name suggests air, the map does not say.
- Our city-to-county assignment (centroid) misplaces a few cities with duplicate names (Sand Springs, Cleveland, OK); those two were excluded from carve-outs.

## Spot check (source the rows do not cite: `county_911.json` roster/Medicare answers)
- Garfield: LIFE EMS; roster/Medicare "Life Emergency Medical Service, Inc." Consistent.
- Muskogee: Muskogee County EMS; roster "Muskogee County Emergency Medical Service". Consistent.
- Rogers: Pafford (71%) + Oologah-Talala (26%); roster "Oologah-Talala EMS District". Consistent (Pafford not in the old answer).

## Dead ends
- City of Sand Springs `EMS_ZONES` (INCOG ESZ, Creek/Tulsa/Osage, edit 2024-11): covers 46% of Tulsa, 23% of Creek; partial, not used. Kay County Fire and Ambulance District_WFL1 and Owasso EMS Boundary (single city) not opened beyond metadata. OSDH roster has no county field (`OK_2026.json`). No statewide polygon layer found.
- Still no source: Oklahoma, Tulsa, Cleveland, Canadian counties (the population left).
