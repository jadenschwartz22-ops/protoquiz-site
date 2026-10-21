# OR: the 17 counties not yet tier A, pulled 2026-10-21

File: `states/OR_public_2026-10.json` (meta + 10 Marion ASA rows + county_verdict for the 17). Raw/tools: `downloads/or_2026-10/` (`asa.geojson` state layer, `marion_asa.geojson`, overlays, `build_or_lane911b.py`).

## Sources
1. Marion County HHS `AmbulanceServiceArea` layer (owner Marion_County), 10 polygons, edit 2025-10-31, boundaries last updated 2022-12 (layer description). Names the ASA holder per area (Salem Area Ambulance, Woodburn Ambulance Service, Santiam Memorial Hospital Ambulance, Lyons / Jefferson / Turner / St Paul RFPDs, Marion County Fire District #1, Keizer Fire District, Polk County Fire District #1). https://services1.arcgis.com/sYGZnQPdJ0azuLyn/arcgis/rest/services/AmbulanceServiceArea/FeatureServer/0
2. Oregon DHS/OHA `OREGON_AMBULANCE_SERVICE_AREAS` (owner dhs_heriford), 125 polygons in only 19 counties, edit 2025-12-19. Area names ("ASA 5", "MULTNOMAH ASA", towns) with a provider-name field filled for Lincoln, Lane, Morrow, Malheur, Deschutes only.

## Result
- **Marion: tier A** (10 named ASAs cover 99.9%; all named, none picked; several are fire districts that hold the ASA and may contract operation out).
- partial-areas 8 (Benton, Clackamas, Linn, Multnomah, Polk, Sherman, Harney, Wallowa): the state layer covers them with ASA names, not provider names; the provider is in the county ASA plan (not fetched). Tier left alone.
- none 8 (Baker, Columbia, Curry, Gilliam, Josephine, Union, Wheeler, Grant): not in the state layer, no county layer found.
- Linn County's own layer (cwalter_linnGIS, edit 2025-03) is also area-name only (SANTIAM, LEBANON, ALBANY, SWEET HOME...).

## Spot check
Not done from an outside source (time). Marion: the ASA names match the county HHS ASA list as published in the layer description only.
