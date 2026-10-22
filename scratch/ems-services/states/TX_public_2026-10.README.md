# TX regional/county 911 GIS service-area layers, pulled 2026-10-21

File: `states/TX_public_2026-10.json` = `meta` + 72 `rows` (one per distinct service name per source) + `county_verdict` (36 counties: **31 A-supportable, 3 partial, 2 held**).
Raw + tools: `downloads/tx_2026-10/` (`detcog.geojson`, `panhandle.geojson`, `bastrop.geojson`, `cty_48.geojson` TIGER counties, `tx_overlay.py` shapely equal-area overlay (EPSG 5070), `tx_build_public.py`, `*_overlay.json`/`*_ov.json`, `dshs_rows.json`).
Label (use this on the page): "from regional and county 911 GIS service-area layers", not the DSHS licence record. None of the layers carries a transport flag or ownership; no `transport` is set.

## Sources (all public ArcGIS REST, no login)
1. DETCOG (Deep East Texas COG regional 911) "EMS Agency" layer, `https://services1.arcgis.com/z3DZ2dwxv2tyH8pc/arcgis/rest/services/DETCOG_Regional_EMS_Agency/FeatureServer/140`, 37 polygons, last edit 2026-10-20. 11 counties.
2. Texas Panhandle "EMS Boundaries" (description: EMS districts covering the 24 rural counties of the Texas Panhandle), `https://services8.arcgis.com/OpbGEllMqef1LMjj/arcgis/rest/services/EMS_Boundaries/FeatureServer/0`, 55 polygons, edit 2026-06-30 (ArcGIS owner `jschaumburg`; the publishing body is not named in the layer, treat as the Panhandle regional 911 GIS).
3. Bastrop County GIS "Emergency Service Boundary for Medical (EMS)", `https://services3.arcgis.com/wdTkTU0MdZbNBEZy/arcgis/rest/services/EmergencyServiceBoundaryMedical/FeatureServer/0`, 1 polygon, edit 2026-09-23.

## Method and test
Same as ND/WA/KY: layer polygons x TIGER county (tigerweb State_County/11), equal-area; services listed = >=1% of county; tier A-supportable when named services cover >=95%. Placeholder polygons labelled "Verify EMS" (DETCOG) are counted as unnamed. Services overlap (not a ranking); all named, none picked.
- Panhandle: all 24 counties 99.98-100% covered, 2-7 services each (Armstrong, Briscoe, Carson, Castro, Childress, Collingsworth, Dallam, Deaf Smith, Donley, Gray, Hall, Hansford, Hartley, Hemphill, Hutchinson, Lipscomb, Moore, Ochiltree, Oldham, Parmer, Roberts, Sherman, Swisher, Wheeler). Pantex EMS (plant) and Boys Ranch EMS are in the layer; "Groom Volunteer EMS" etc. are volunteer services.
- DETCOG A: Angelina, Houston, Nacogdoches, San Jacinto, Shelby (96.7% named), Trinity, Tyler. Partial: Newton (18% named, 82% "Verify EMS"), Sabine (85%), San Augustine (90%).
- **Held (conflict with the DSHS roster of 2026-10-02, tier left alone):** Bastrop (layer: Acadian EMS 100%; roster: new Bastrop County ESD 3 licence, 911, 16 units, first licensed 2026-02-23, likely a transition) and Polk (layer: Allegiance Mobile Health EMS 100%; roster: Texan EMS LLC, Livingston, 911 & Transfer). Ask the county before changing.
- Not used: DETCOG's other counties are outside the 254 only by edge slivers; LECD Lubbock "EMS Districts" (Lubbock already A; covers 0.3% of Hale, so Hale not changed); Harris GHC911 ESN EMS (Harris already A); MCHD Montgomery (A already).
- Pre-change tiers of the 31 A counties: C 25, B 2, none 4; 437k people. All are small; the large TX counties were already A from the city/county pages.

## Spot check (source the rows do not cite: DSHS roster of 2026-10-02, `states/TX_dshs_roster_2026-10.xlsx`)
- Ochiltree: layer Perryton EMS 81% + Spearman EMS 19%; roster Ochiltree County Hospital District, Perryton, 911 & Transfer. Consistent.
- Nacogdoches: layer "Memorial Hospital" 93% + Garrison Volunteer Ambulance 7%; roster Nacogdoches County Hospital District dba Nacogdoches County EMS, 911 & Transfer. Consistent; the layer's name is a hospital name, noted on the card.
- Hansford: layer Gruver EMS 59% + Spearman EMS 41%; roster Hansford County Hospital District (Hansford County Hospital EMS, Spearman), 911 & Transfer. Spearman consistent; Gruver has no roster licence in Hansford (volunteer service licensed elsewhere or unlicensed in the roster).
- Conflicts found: Polk and Bastrop (above). Angelina: Allegiance 96% by area vs the roster's City of Lufkin Fire (Emergency 911, 8 units) = the city; read as city + rest of county.

## Limits and dead ends
- Layers are response/service areas, not licences or dispatch orders. Volunteer and plant services appear. Allegiance appears as "Allegiance EMS" and "Allegiance Mobile Health EMS" (same operator, two spellings, kept as the state wrote them).
- Searched ArcGIS Online for COG/county layers (ETCOG, CAPCOG, BVCOG, Texoma, Ark-Tex, Concho Valley, WCTCOG, ALAMO, RGCOG, Gregg, Wichita, Hunt, Henderson, Orange, Hardin, Brazoria): nothing public naming EMS providers except the three above. CAPCOG "Regional ESZ boundaries" is ESZ codes, not provider names (not opened further). `New_EMS_Districts` (jfore_cop) has only district codes (C1, E2...). Midland/Austin/Sherman/Owasso layers are single-city.
- Still no source: Wichita, Gregg, Tom Green, Hunt, Henderson, Orange, Bowie, Victoria and the other mid-size counties listed C or none.
