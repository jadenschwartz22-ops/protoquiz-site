# NH public EMS unit directory (2026-10-21 pull)

File: `states/NH_public_2026-10.json` (`meta` + 305 `rows`). Raw: `downloads/nh/ems-units-list-with-chiefs.archive.pdf` (+ `nh.txt`, pdftotext).

## Source
NH Dept of Safety, Division of Fire Standards & EMS, "EMS Unit Directory Including Chief and Service Email"
(RespondNH grouped report, generated 2026-04-01, 18 pp). Official URL
`https://www.mm.nh.gov/files/uploads/fstems/documents/ems-units-list-with-chiefs.pdf`; that host does not
resolve from this machine and fstems.dos.nh.gov 403s. Pulled from the Wayback capture
`web.archive.org/web/20260510121728id_/https://mm.nh.gov/...` (curl, Chrome UA). PDF modified 2026-04-01 (matches).

## Parse
pdfplumber word positions against the header column x-bounds (the PDF is one long HTML table cut into pages, so
`extract_tables` splits rows at page breaks; word-position parse does not). Page 17 is a second list ("no chief
reported", 16 rows, different columns). Check: PDF footers say Count 289 + Count 16 = 305; parsed 305; 305 distinct
licence numbers; every row eyeballed for page-break bleed (footer text removed).

## Fields
name, street, city, state, zip, county_listed, licence_no, licence_expires (all 12/31/2027 but one 03/18/2027),
phone, chief, email, org_type (Fire Department 207 / Private, Non Hospital 48 / Governmental, Non-Fire 33 /
Hospital Based 17), classification (EMS Transport with Fire 114 / EMS Transport 51 / EMS Non-Transport with Fire 96 /
EMS Non-Transport 38 / EMS Non-Transport with PD 6), transport (our boolean from classification: Transport* = true,
Non-Transport* = false), operating_status (Combination 123 / Career 82 / Volunteer 53 / Call 47),
no_chief_reported, `county` + `county_basis`, in_state. `response_area` and `flag_911` are null on every row:
the source has neither.

County: the source county cell is blank for 12 NH rows (Deering, Henniker, Jefferson, Littleton, Milan, Milford,
Pelham, Stratham, Surry, Washington, Webster, Westmoreland). Filled from the Census 2024 gazetteer municipality
(`geo/2024_Gaz_cousubs_national.txt`), marked `county_basis: derived`. 20 rows are out of state (VT 9, MA 7, ME 4:
Alert Ambulance, Rescue Inc, Lifeflight of Maine, Portsmouth Naval Shipyard, etc.); `in_state: false`, county is the
listed out-of-state county.

## What we already held
`states/NH_bureau.json` has the same 305-unit population (name, city, county, classification, org_type). This pull
adds licence no./expiry, chief, email, operating status and the blank-county repair; 11 unit names differ (renames).
Transport counts by county (in-state, classification starts "EMS Transport"): Rockingham 34, Merrimack 21,
Grafton 20, Hillsborough 20, Carroll 13, Belknap 10, Cheshire 10, Coos 9, Strafford 9, Sullivan 4 (150 total).

## Verdict (tiers per RESUME_911_MAP.md / VOCABULARY.md)
- Tier A (a state record names the provider for that county): NONE of the 10 counties. The directory lists licensed
  units at their street address. It has no service area, response zone, town assignment or 911 flag. NH does not
  publish a response-area record; towns assign their own fire/EMS.
- Tier C evidence for all 10 counties: roster units located in the county with an official transport flag
  ("EMS Transport with Fire" = a fire department that carries patients, a stronger tell than most rosters).
- Tier B for a county = this roster plus Medicare 2024 emergency-majority biller in the county (the existing
  `county_911.json` already does this: 7 B, 3 C). This file changes none of those.
- Limits: a multi-town private carrier sits in one county (AMR at 380 West Hollis St Nashua, Hillsborough; Action
  Ambulance, Center Ossipee; Alert Ambulance is in Fall River MA) so address county mislocates it. A town's fire
  department that lists "Non-Transport with Fire" may still be the 911 responder while a neighbour or private
  service carries; the directory cannot say who.
- Unlock for tier A: town-by-town (municipal contracts, dispatch/PSAP lists, mutual-aid compacts) or an NH records
  request to the Bureau of EMS for the ambulance service coverage list by community. Not drafted here.

No spot check was run (no tier A rows written).

## Gap research verdicts (2026-10-21; meta.county_page_note, read by county_911_all.py)
Research: /private/tmp/claude-501/-Users-jadenschwartz/fd1f49d6-d68f-42ee-8308-1d7181310a89/scratchpad/gap-research.md (also gap/ captures). No tier changes. Every county carries one short note: official records do not publish 911 response areas; answer inferred from licensed services by location; source needed from the Bureau of EMS Licensing (the unit licence application has a coverage-area section: towns, % of town). The records request is NOT sent; the card says "Source needed", not "requested". Change the wording only after it is sent.
