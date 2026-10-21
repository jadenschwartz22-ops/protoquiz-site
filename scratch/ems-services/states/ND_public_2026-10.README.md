# ND EMS service-area atlas (official), pulled 2026-10-21

File: `states/ND_public_2026-10.json` = `meta` + 127 `rows` (one per distinct service name, 147 polygons) + `county_verdict` (53 counties).
Raw: `downloads/nd_2026-10/` (`webmap_16ad17bd.json`, layer `meta_*.json`, `ems.geojson`, `qru.geojson`, `rescue.geojson`, `points.geojson`,
`county_bnd.json`, `county_overlay.json`, scripts `overlay_nd.py` and `parse_nd_public.py`).

## Source
ND HHS EMS Unit director (Christopher Price) replied 2026-10-21: "Location and service area information is available here" =
`https://des-ndgov.maps.arcgis.com/apps/instant/atlas/index.html?appid=8d96c5ab33674fccaa7a71997a0f9997&webmap=16ad17bd65754482922d22eb40ae7617`
and "the information on your map is not entirely accurate." The atlas is an ArcGIS Instant App; webmap item `16ad17bd65754482922d22eb40ae7617`
(`.../sharing/rest/content/items/<id>/data?f=json`). It is hosted by the ND Department of Emergency Services (DES) on the ND GIS Hub
(`services1.arcgis.com/GOcSXpzwBHyk2nog`), not by HHS; the polygons are DES-maintained, with some drawn by county 911 coordinators
(SOURCE field: DES 120, McKenzie County 911 8, Richland 5, Cass 5, Williams 4, Burleigh 3, Bismarck 1, Grand Forks 1).

## Layers in the webmap (operational)
Ambulance: group "Emergency Medical Services" = `NDGISHUB_Emergency_Medical_Services_Boundary` FeatureServer/0 (**147 polygons**, last edit 2025-12-29,
polygon DateUpdate 2018-06 to 2025-12) + `NDGISHUB_Emergency_Service_Point` (718 points; EMS locations are the `ES_NGUID LIKE '%AMBULANCE%'` subset).
Other groups, pulled and NOT used for the answer: Quick Response Unit boundary (54 polygons; non-transport), Rescue boundary (80; rescue, not ambulance),
Law and Fire (not pulled). Context layers only: County Boundaries, Tribal Lands, Census points, roads, address points, PLSS, townships.
Layer description: "geographic extent of each ND DOH licensed ambulance service area (and or licensed sub-station) ... used for determining which
ambulance service is associated with a 9-1-1 incident location ... under continuous development as the 53 counties transition to Enhanced 9-1-1 / NG911 ...
**this data is preliminary**."

## Fields (ambulance layer)
OBJECTID, DiscrpAgID, DateUpdate, Effective, Expire (3 rows 3000-01-01 = open), ES_NGUID, State, Agency_ID, ServiceURI/URN/Num, AVcard_URI,
**DsplayName** (the service), SOURCE, NOTES (empty), shape. No ownership field, no licence number, no level, no county field, no transport flag
(the layer is ambulance by definition). Paged by `resultOffset`/`resultRecordCount=500`, `outSR=4326`, `f=geojson`; counts 147/54/80/718 match `returnCountOnly`.

## County test (ours, stated)
Raster overlay (PIL, ~250 m pixels, equal-area corrected) of the ambulance polygons on the ND GIS Hub county layer (53). A county is tier-A-supportable when
the union of ambulance polygons covers >= 95% of its area (same test as WA and KY). Services listed for a county = those whose polygon covers >= 1% of the county;
smaller overlaps (boundary jitter, a neighbour's edge) are kept in `slivers_under_1pct`, not shown. Quick-response units are recorded as `qru_units_not_counted`
and never read as the provider.
- **Result: all 53 counties are >= 99.93% covered (tier A supportable), 0 partial.** Each lists 2 to 10 services (259 service-county pairs; McLean 10).
  No county has a single service of record: ND ambulance areas are per-town and tile the state, so every county is several services' areas. All are named, none is picked;
  names are in alphabetical order, area share is not a ranking of who answers (Cass: Casselton 39% by area, F-M EMS 15%, but F-M is the Fargo-Moorhead service).
- Polygon overlap between services is small (largest Sioux 3.5%, Grand Forks 2.0% of county area).

## Wired into the county map (branch lane/nd-public, from lane/ky-public)
`county_911_all.py` ND block after the KY block. ND was **B28 C21 D3 none1, now A53**. Only ND counties changed (53) vs lane/ky-public, proven by full county_911.json diff.
Public text (`via`): "North Dakota HHS EMS service-area atlas (official), credited to the state EMS unit". Ownership: the atlas has none; it comes from `model_of(name)`
(derived), which reads 49 counties unknown and 4 public. Do not publish an ND ownership share beside an official share.

## Old ND answers vs the atlas (what the director probably meant)
Old rows were roster agencies by licence address county: usually ONE service per county, so a county looked single-provider when the atlas shows 3 to 10.
Biggest differences:
- Metro counties named the wrong or a minor service: Grand Forks old "Larimore Ambulance" only (atlas: Altru EMS 45%, Larimore 36%, Northwood 20%); Ward old "Berthold" only
  (atlas lists Minot Community EMS, Berthold, Ryder-Makoti, Kenmare, Max, Velva, Plaza); Williams old "Ray Community Ambulance District" only (atlas adds Williston EMS, Grenora, Tioga);
  Cass old missed F-M EMS and Page EMS.
- Burleigh old answer was "ND Department of Health-Emergency Preparedness & Response" (a roster artefact); atlas: Metro EMS, Wilton EMS, Kidder EMS.
- Four counties had no service in common with the atlas: Burleigh, McKenzie (atlas: Watford City, Sidney, Williston, ...), Divide (Crosby, Grenora, Ray Community), Billings (Belfield, Medora, Beach).
- Emmons was blank; atlas: Emmons County EMS, Napoleon EMS, Metro EMS.
- Mercer and McLean old lists carried industrial/mine services (Coyote Creek Mine, Dakota Gasification, Falkirk Mine, REC-Coal Creek) that are not in the ambulance layer.
- Old Sioux "Standing Rock Ambulance - McLaughlin, SD" is Standing Rock EMS in the atlas (82% of Sioux).

## Limits and open
- The layer says it is preliminary. A licensed service area is not an exclusive franchise and not a dispatch assignment; WA/KY wording applies.
- Not independently verified from a source the layer does not cite: spot-check Burleigh, Grand Forks and one rural county against county or service pages before leaning on it.
- "Ambulance Service Incorp" (Richland, 25%) is a name the atlas gives with no town; one service, not identified. "Lemmon EMS" has a polygon but no EMS location point.
- Names are the state's DsplayName, title-cased by `parse_nd_public.py` (e.g. "McHenry EMS"); mapping to roster agencies/licences was not done (the atlas has no licence number).
- DES and HHS both appear around this data; the public text credits the state EMS unit per the owner's wording. Ask the EMS unit whether HHS licensing or DES maintenance should be named.
- county_history/2026-10-21.json already existed (KY lane), so no new snapshot was written; `python3 snapshot_counties.py --force` would overwrite it.
