# OH county-level NG911 / GIS EMS boundaries (5 counties found), pulled 2026-10-21

File: `states/OH_public_2026-10.json` = `meta` + 39 `rows` (one per layer x label) + `county_verdict` (6 counties). Raw + scripts: `downloads/oh_2026-10/`
(`*.geojson`, `ems_all.geojson`, `county_overlay.json`, `parse_oh_public.py`; overlay by `downloads/wi_2026-10/shp_overlay.py 39 label`).

## Sources (no statewide layer exists; these are county layers on public ArcGIS Online)
- Wood: `.../services2.arcgis.com/MlJ0G8iWUyC7jAmu/.../Wood_County_EMS_Emergency_Service_Boundary/FeatureServer/0` (geohio hosting org), 27 polygons, data edit 2026-06-01. 99.6% of county. **Tier A.**
- Huron: same org, `Huron_EMS_Boundary`, 5 polygons, edit 2026-07-17. 99.7%. **Tier A** with note: labels are short names (NCEMS 49.8%, WILLARD 19.7%, CITIZENS 18.5%, FIRELANDS 10.5%, PLYMOUTH 1.2%), not expanded.
- Paulding: Paulding County engineer, `Paulding_County_EMS_Districts` layer 4, 8 polygons, edit 2024-03-14. 99.8%. **Tier A** with note: labels are codes (PLDG EMS, OAK EMS, ANT EMS, PYN EMS, SCOTT EMS, GR HILL EMS, OTT EMS), township/village zones, agency names not given.
- Fayette: `911_Fire_EMS` layer 1, 35 polygons (an ESN table), edit **2022-05-27 = stale**. Held (tier left alone); also reaches into Pickaway (31% of that county), held.
- Lucas: `Lucas_County_EMS_ESB_Boundary` holds one named polygon (Rossford EMS, 0.9% of Lucas) + one blank. Not usable; held.
- All come from Ohio's NG911 emergency service boundary schema (DsplayName, Agency_ID...) except Paulding and Fayette. "from the county's NG911/GIS layer", not a licence record.

## Honesty
No layer has a transport field: every row transport=false and kept. Wood's labels include township zones and a school ("Elmwood High School") and a few fire-service labels. Tier A here means the county's own boundary layer names who covers the whole county; it does not say who carries patients. Counties: A 3 (Wood 131k, Huron 58k, Paulding 18k = 1.8% of Ohio), held 3.

## Spot check (source the rows do not cite)
- Wood / Bowling Green: layer has "Bowling Green EMS" (2.1% of county); bgohio.org/fire carries "Ambulance Billing and Records Requests" and "minimum EMS certification of EMT-Basic ... many are Paramedics" for the Fire Division. Agrees (city runs ambulance billing).
- Huron and Paulding: no independent page reachable by curl (pauldingcounty*, huron county, Willard, Plymouth hosts timed out; citizensambulance.org loads but no county sentence found). Not confirmed.

## Dead ends (one line each)
- ODPS/OEMS roster: records request only (see OH_DEADEND*.README.md); OH eLicense single-record.
- gis.ohio.gov REST root returns nothing to curl; OGRIP NG911 statewide data not public. `OhioCounties_NG911Readiness` is a survey, not boundaries.
- Sweep layers: BTFD EMS districts (grid pages), Franklin-style "EMS" (7 shapes, 2022, no names), COVID/zip layers: not service areas.
- More counties likely exist on county auditor/GIS hubs (Lorain, Summit, Hamilton ...) but the AGOL name search only surfaced these five.
