# UT EMS response areas (state GIS), pulled 2026-10-21

File: `states/UT_public_2026-10.json` (`meta`, 123 `rows`, `county_verdict` for 29 counties). Not yet wired into `county_911_all.py`.

## Source
UGRC "Utah EMS Response Areas" (`https://opendata.gis.utah.gov/datasets/utah-ems-response-areas`), FeatureServer
`services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/EMSResponseAreas/FeatureServer/0`, 123 polygons, layer description dated 2026-06-29.
Description: built for NG911, "primary EMS response agency for a given location", compiled from the written descriptions in the
Bureau of EMS and Preparedness licensing database, gaps and conflicts resolved with CAD data. Service levels vary, "generally include 911 scene response".
Found after the Bureau director (Bornemeier, 10-21) answered "We do not release that"; the state publishes it anyway.

## Method
Overlay of the 123 polygons on `Utah_County_Boundaries` (UGRC, 29 counties), UTM 12N equal area (shapely). Services listed for a county cover >= 1% of it.
All 29 counties are 97-100% covered (supportable tier A by the WA/KY/ND rule). Script: scratchpad `ut/ov.py`, `ut/build.py`.

## Caveats (read before wiring)
- Area share is not population (Syracuse 66% of Davis is mostly the Great Salt Lake). List agencies, never percentages.
- Polygons include non-transport first responders and some SAR/industrial units. `licence_class` is a fuzzy match to `UT_imagetrend.json`:
  86 ground-ambulance, 20 non-transport, 17 unmatched (transport unknown, e.g. Eagle Mountain (UFA), Park City FD, Santa Clara Ivins, Mapleton).
- Label as "from the state's NG911 EMS response-area layer", not a licence record (UGRC compilation).
- Spot check still owed from a source these rows do not cite (Salt Lake, Utah, Uintah; Gold Cross Eastern/Southern, UFA).
