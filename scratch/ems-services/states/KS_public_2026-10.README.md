# KS NG911 EMS boundaries, pulled 2026-10-21

File: `states/KS_public_2026-10.json` (meta + 307 rows by label + county_verdict for 105 counties). Raw/tools: `downloads/ks_2026-10/` (`ems.geojson`, `ems_labeled.geojson`, `county_overlay.json`, `build_ks_lane911b.py`; overlay tool `downloads/mo_2026-10/ovl_gen_lane911b.py`).

## Source (a state NG911 compilation, not a licence record)
Kansas NG911 "Kansas_ESB" layer 0 `Kansas_EMS`, owner KSNG911 (Kansas 911 Coordinating Council), 366 polygons, last edit 2026-10-13, ESB_TYPE EMS, stewarded by the county PSAPs.
https://services6.arcgis.com/7XhimSpf8B7lHIMy/arcgis/rest/services/Kansas_ESB/FeatureServer/0 (layers 1-4 fire, law, rescue, fire auto-aid not used).
Label = DISPLAY (the PSAP's name). 90 polygons carry only station codes (1A, EMS STATION 2, EMS (3,1,5,2,4)) and are kept as `?unnamed zones`, never read as a provider. "AMR" is taken as named.

## Counts (>=95% of the county by named polygons)
A 55 (a named polygon >=30% matches a KBEMS ground-ambulance licence name in states/KS_imagetrend.json), **A-unverified 35** (named, but names are community or generic names such as "KINSLEY EMS", "SALINE EMS", "AMR" in Shawnee, no licence match; same kind of fact, owner decides), partial-unnamed 7 (covered by station-code zones only: Butler, Crawford, Dickinson, Douglas, Ellis, Ford, Jefferson), partial 5 (Atchison, Geary, Leavenworth, Linn, Riley), none 3 (Johnson, Miami, Wyandotte: metro counties use fire codes or are absent).
`transport: true` only when a KBEMS ground licence name matches (the bare name "AMR" is not matched); else false and kept. "FIRST RESPONDER" labels (Phillips) are never transport.

## Spot check against KBEMS roster (states/KS_imagetrend.json, a source the rows only use for transport)
- Lyon: layer "LYON COUNTY EMS" vs roster "LYON COUNTY CITY OF EMPORIA" (same service, different name).
- Saline: layer "SALINE EMS" vs roster "SALINA FIRE DEPARTMENT" + "LIFE TOUCH EMS INC": the PSAP label does not match a licensee name; why Saline is A-unverified.
- Edwards: layer "KINSLEY EMS" vs roster "EDWARDS COUNTY AMBULANCE"; Kiowa: "GREENSBURG EMS" vs "KIOWA COUNTY EMS". Same place, different names. `kbems_ground_licences_with_address_in_county` is stored on each county to let a human reconcile.
Conclusion: the layer shows WHO the PSAP dispatches for each area, but the label is free text. Use it as tier A for "names an EMS provider for the whole county", not as a licence-exact name.

## Dead ends
KS.json (HIFLD 2008 stations) and `EMS Stations 2008` layers are points; KBEMS roster has no service area field.
