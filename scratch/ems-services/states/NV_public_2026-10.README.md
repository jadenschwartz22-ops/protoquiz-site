# NV public EMS directory (2026-10-21 pull)

File: `states/NV_public_2026-10.json` = `meta` + 135 `rows` + `county_verdict` (17 counties/independent city).
Raw: `downloads/nv_2026-10/` (`active-ground-services-12-5-25.pdf`, `active-air-services-and-capabilities-12-5-25.pdf`,
`active-non-emergent-mental-health-transport-list.pdf`, `index.html`, `NV_imagetrend_lookup_2026-10-21.json`, parse scripts).

## Source
DPBH / Nevada EMS Office, "EMS Agency Service Directory" `https://dpbh.nv.gov/regulatory/emergency-medical-systems-ems/emergency-medical-system-ems-agency-service-directory/`
(HTTP 200, page last updated 02/11/2026). Three PDFs, all effective 12/5/2025:
- Active Ground Ambulance Service List (4 pp): 49 rows, three columns only: Service Name, Service Website, Service Phone.
  Parsed with `pdftotext -bbox-layout` word positions (fixed columns). 3 rows say "No public release, internal use only" (Air Force/SG, Mike O'Callaghan
  Military Medical Center, NV National Security Site; Sandia too, 4 in all).
- Active Air Services and Capabilities: 15 air operators (AC Global, Air Med International, Air St. Luke's, Aircare 1, Angel MedFlight, Care Flight,
  Classic Air Care/MedX AirOne, Guardian Flight, Intermountain Life Flight, Latitude, Med Flight Air Ambulance, Mercy Air, REVA, Rural Medevac Alliance,
  Starlink Aviation, OptimuMedicine) with capability bullets. No bases, no counties; air rows are noise for the 911 question and are not in the JSON (the
  lookup's 21 Class VII rows are).
- Active Non-emergent Secured Mental Health Transport list: downloaded, not parsed (not 911).
The page itself says: "EMS agencies are broken down into four regions. Please note our office doesn't oversee Clark County."
Region 1: Carson City, Churchill, Douglas, Pershing, Storey. Region 2: Washoe. Region 3: Elko, Eureka, Humboldt, Lander, White Pine.
Region 4: Esmeralda, Lincoln, Lyon, Mineral, Nye. **The PDFs themselves are NOT grouped by region**: one flat alphabetical list, no county column.

## The roster that does carry county and class
The state's ImageTrend LMS public lookup (`nevada.imagetrendlicense.com`, pulled via `pull_imagetrend.py`, 135 rows, 3 more than the held
`states/NV_imagetrend.json` of 2026-09-10) adds roman class, licence no./expiry and ADDRESS county. All 49 PDF rows match a lookup row by name
(2 aliases: Esmeralda County Ambulance, Lincoln County Board of Commissioners DBA Lincoln County Ambulance Association). The JSON merges the two:
`in_state_ground_pdf` marks the 49 PDF rows; the other 86 are lookup-only (Clark County agencies, air, behavioural transport, out-of-state, a
"DNR-POLST Tracking" entry).

## Fields (rows)
name, lookup_name, license, license_expires, class (I 58, II 1, IV 4, VI 5, VII 21, VIII 3, blank 43), class_text, address_county / city / state,
state_region (from the page text above), in_state_ground_pdf, in_lookup, website, phone, transport (I/II/IV/VII true, VI false, else null), address_fips,
vintage. `is_911_flag` and `service_area` are null on every row: **Nevada publishes neither a 911 field nor a service area.** Class I is worded
"ground ambulance ... emergency and non-emergency transportation" which is not a 911 assignment. Six Class I rows have no Nevada county (Clark County
Fire Department x2 have no county cell; Sandia NM, Tooele UT, Gold Cross UT, Beaver Dam AZ are out of state).

## Verdict (tiers per RESUME_911_MAP.md / VOCABULARY.md)
- County tier A from these sources: **none of 17**. No service area, zone or provider of record is named.
- County tier C evidence: all 17 counties (100% of population) have at least one Class I ground licence with an address in the county. This is
  address-county roster evidence only. Clark (SNHD): the state PDFs omit it, the lookup lists 14 Class I Clark-address agencies (plus 2 Clark County Fire Department rows with no county cell) (AMR, Community, Medic West,
  LV Fire & Rescue, Henderson, North Las Vegas, Boulder City, Mesquite, Moapa Valley, Mount Charleston, Clark County Fire...), but no area.
- Name-implied county agencies (Elko County Ambulance Service, Esmeralda County Ambulance, Eureka County EMS, Lander County EMS, Lincoln County
  Ambulance Association, Nye County EMS Division, Pershing County Ambulance, White Pine County EMS, Mineral County Fire Department) look like county
  coverage, but a name is not a service area (VOCABULARY, 73% rule). Treat as C pending county sites or Medicare confirmation (tier B uses the existing Medicare pipeline).
- Already held at tier A outside this pull: Washoe (REMSA franchise, `states/NV_911.json`). Held lead not reviewed: `states/NV_LV.json` is the LVMPD NG911
  EMS responder layer for Clark (56 polygons named AMR 2, Medwest 22, Community 32; effective 2024-09-01); geometry is not in that file, so it needs a fresh
  pull plus a county overlay (as done for KY) before it can lift Clark to tier A.

## Limits
- Directory is a vendor/phone list; the lookup's county is the licence address. Multi-county rural coverage and fire-district (Lyon, Douglas, Storey, Washoe)
  boundaries are invisible. Carson City Fire Department is the only Carson City row.
- Nevada has no 911 NG911 EMS boundary layer found on ArcGIS search for the whole state; Clark's is on LVMPD's tenant (above).

## Gap research verdicts (2026-10-21; applied via `county_verdict`, read by county_911_all.py)
Research: /private/tmp/claude-501/-Users-jadenschwartz/fd1f49d6-d68f-42ee-8308-1d7181310a89/scratchpad/gap-research.md (also gap/ captures).
- Clark: held at C, flagged partial. The LVMPD NG911 EMS layer (EMS_Polygon, effective 2024-09-01) is the A-grade record for the valley and its three operators (AMR, Community, MedicWest) carry it; Henderson, North Las Vegas, Boulder City, Mesquite, Moapa Valley and Mount Charleston sit outside the layer, and Henderson/Boulder City/Mesquite rest on city websites seen only through search summaries, North Las Vegas has no record. Dropped Air Force/SG, O'Callaghan, OptimuMedicine, Guardian Elite. Not applied: dropping LV Fire & Rescue / NLV Fire (research calls them first response; not in the brief).
- Lyon: North Lyon County FPD added to the B answer (Fernley ambulance franchise); Mason Valley unverified.
- Churchill: NAS Fallon federal fire removed. Nye: NNSS and Round Mountain Gold removed, split unverified. Douglas, Mineral: cannot-verify notes only. Elko, Washoe and the rest: untouched.
