# WI statewide NG911 EMS boundary layer (official compilation), pulled 2026-10-21

File: `states/WI_public_2026-10.json` = `meta` + 588 `rows` (one per distinct DsplayName label, 2,475 polygons) + `county_verdict` (72 counties).
Raw: `downloads/wi_2026-10/` (`ems.geojson`, `meta2.json`, `county_overlay.json`; scripts `shp_overlay.py` (shapely, reusable for any state), `parse_wi_public.py`, `popshare.py`).

## Source
Wisconsin Office of Emergency Communications (ArcGIS owner `WI_OEC_GIS`), item "WI NG911 GIS Emergency Services Polygons and Road Centerline Data v2",
layer 2 `EmergencyMedicalServicesBoundary`:
`https://services3.arcgis.com/GoOAGCoqFEhZEh7f/arcgis/rest/services/WI_NG911_GIS_Service_Polygons_and_Road_Centerline_Data_v2/FeatureServer/2`
(same service: Fire 3, Law 4, Provisioning 5, PSAP 6). Layer dataLastEditDate 2026-10-18; polygon DateUpdate ranges 2003 to 2026-10-18
(2,156 of 2,475 are 2022 or newer, 1,230 are 2025-2026; 110 are from 2005, 38 from 2003). This is a compilation of county-submitted NG911 emergency service boundaries, NOT a licence record.
Label the source as "from the state's NG911 layer". No auth, no key; curl with browser UA, paged 1000 at a time.

## Method
Polygons x Census county polygons (`geo/counties-10m.json`, FIPS 55), shapely, equal-area EPSG:5070. Per county: union coverage of the layer and the
area share of each DsplayName (union, so fragmented labels do not double count). `services` lists labels with >=1% of county area, alphabetical
(area share is not a ranking of who answers). tier A = coverage >=95% AND labels are agency names. 62 counties (5.59M people, 93.8% of WI) are A.

## Honesty flags (read before wiring)
- The layer says who is responsible for EMS response in each zone. It has NO transport field. `transport` is true on 23 rows only where the label matches
  exactly (case/punctuation-insensitive) a "911 Transporting Service" in the state DHS licensed-service list (`states/WI_dhs.json`). 241 more labels have a
  core-name candidate in that list (`dhs_core_name_candidates_not_used`); not used, because names differ ("Mondovi Amb" vs "Mondovi Ambulance Service") and one
  label can map to a fire department vs a first-responder group. Fire-department and first-responder labels are kept with transport false.
- Several counties are many small zones from 3-10+ providers (Walworth, Grant, Adams); each lists all, none picked.
- 6 counties held at `partial` with a `page_note` because the label is not an agency name: Lincoln ("Lincoln County Sheriff" 100%), Rock ("Rock County
  Public Safety Agency" 100%, a dispatch agency), Menominee ("Med3" 99.6%), Marquette (80/81/83/WSSO), Adams (LEMS/RAMB/WAMB/DAMB/MEMS), Green (GEMS/AEMS/BEMS/BVEM...).
  The codes are the county's own and are not expanded here (never invent).
- 3 counties have no usable polygons (county did not submit EMS): Iowa 0.7%, Langlade 0.3%, Vilas 0.1%. Door is 92.8% covered (partial, 7th partial). Totals: A 62, partial 7, none 3.
- Labels carry county typos ("Northwest Amulance" in Oneida) and repeats ("Lifestar EMS"/"LIFESTAR EMS"); rows keep the source spelling.

## Spot check (source the rows do not cite)
- Sheboygan: layer gives Orange Cross Ambulance 74.7% of the county; orangecross.org: "provider of 911 Emergency Medical Services ... servicing Sheboygan County
  and several surrounding communities". Agrees.
- Juneau: layer gives MAUSTON EMS 74.8% (Tomah 7%, Elroy 6%); maustonems.org/about.html: Mauston Area Ambulance Association serves "the central, east, and southern
  areas of Juneau County" (City of Mauston, New Lisbon, Lyndon Station, Necedah, Hustler and 15 townships). Agrees.
- Menominee: layer label is "Med3" (99.6%); the DHS list has "Menominee Tribal Ambulance Service" (911 transporting). Consistent but the NG911 label does not
  name it; held partial. (La Crosse Tri-State and several county sites 403/timeouts: not usable.)

## Dead ends
Marshfield Clinic 8/10-minute 911 travel-time layers (`WI911EMSzones_*`) are drive-time models, not service areas: not used. EMSDistricts (UW-Madison) and county
ambulance-district layers (Sauk, Calumet, Marquette, Green) are subsets of this statewide layer; not needed.
