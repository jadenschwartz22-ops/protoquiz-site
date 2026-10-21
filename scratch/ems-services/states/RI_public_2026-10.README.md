# RI licensed ambulance services lookup (2026-10-21 pull)

File: `states/RI_public_2026-10.json` (`meta` + 82 `rows`). Raw: `downloads/ri/index.html`.

## Source
RI Department of Health, "Find Licensed Ambulance Services",
`https://datahealth.ri.gov/find/ambulanceservices/index.php` (plain GET, server-rendered, no JS or query needed).
Page header: "Total number of records displayed: 82 of 82" (the brief said 83; the page says 82). Parsed 82.

## Fields
name, street, city, state, zip, licence_no (EMS000xx), phone, level (Class A (ALS) 67 / Class B (BLS) 13 /
Class C (EMR) 2), chief. We add county (`county_basis: derived`): from ZIP via the Census 2020 ZCTA-county file
(`geo/zcta_county.txt`), county with most of the ZIP's land. 5 ZIPs straddle Kent/Providence (Central Coventry,
Coventry Fire District, Hope Jackson, Hopkins Hill, Scituate EMS) and carry `zip_spans_counties`. 77 rows are in
RI (Providence 38, Washington 14, Kent 12, Newport 9, Bristol 4 incl. those 5 as assigned); 5 are out of state
(Boston MedFlight, Brewster, Coastal Medical Transportation, Life Star CT, Med Trans NY). `transport`,
`response_area`, `flag_911` are null on every row: the page has none of them.

## What we already held
`states/RI.csv` holds the same 82 licences (all 82 licence numbers match) but no service level and Specialty blank;
`states/RI_transport_field.README.md` documents that the transport field exists only at vehicle-class level
(216-RICR-20-10-2 section 2.8) and is not in bulk data. New here: service level, chief, county derivation.
"Service level" is a capability class (ALS/BLS/EMR), NOT a transport flag; Class C (EMR) services are probably
first-responder only but the page does not say, so we set nothing.

## Verdict (tiers per RESUME_911_MAP.md / VOCABULARY.md)
- Tier A: NONE of the 5 counties. No area, zone, contract, or 911 field. RI has no county government, 911 answers
  are municipal (most towns are served by their own fire department or an ambulance association, visible in the
  names, but a name cannot see a contract).
- Tier C evidence for all 5 counties (Bristol, Kent, Newport, Providence, Washington): licensed service located in
  the county. Caveat: no transport field, so the list includes services that may not carry patients, and VOCABULARY
  says a state without a transport field is excluded rather than defaulted. Current `county_911.json` has RI
  counties at tier D (Medicare only, no roster providers); this derivation could lift them to C only if we accept an
  untyped roster as tier C.
- Tier B would need the Medicare 2024 emergency-share join per licensed service (not done here).
- Unlock for A/transport: RIDOH vehicle-class licence (A-1/B-1 transporting vs A-2/B-2 non-transporting) per service
  via the healthri.mylicense.com lookup one record at a time, or a RIDOH records request; municipal fire pages.

## Gap research verdicts (2026-10-21; meta.county_page_note, read by county_911_all.py)
Research: /private/tmp/claude-501/-Users-jadenschwartz/fd1f49d6-d68f-42ee-8308-1d7181310a89/scratchpad/gap-research.md (also gap/ captures). No tier changes (D). Every county carries one short note: no public 911 response areas, answer inferred from licence addresses and Medicare billing, source needed from RIDOH Center for EMS and RI E-911 (transfer table). Records requests NOT sent; wording is "Source needed" until they are.
