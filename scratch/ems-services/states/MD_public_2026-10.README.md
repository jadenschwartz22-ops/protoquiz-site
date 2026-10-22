# MD public 2026-10: MIEMSS list of Jurisdictional EMS Operational Programs (JEMSOPs)

File: `states/MD_public_2026-10.json` = `meta` + 28 `rows` (one per county/city/airport program) + `county_verdict` (24 jurisdictions, all A; `add` entries in the WA/NV shape). Raw: `downloads/md_2026-10/ar2026.pdf` (31 MB), `ar2026.txt` (pdftotext -layout), builder `downloads/md_2026-10/build_md_public.py`.

## Source
MIEMSS FY2025-26 Annual Report, p.75 "Jurisdictional EMS Operational Programs": "Maryland's 29 Jurisdictional EMS Operational Programs (JEMSOPs) provide 9-1-1 emergency medical response across the State", followed by the numbered list of the 29.
URL https://www.miemss.org/home/Portals/0/Docs/AnnualReports/Annual-Report-2026.pdf (linked from https://www.miemss.org/home/Publications), fetched by curl 2026-10-21, HTTP 200. The old dead end (MD_por.README.md) blocked on login-walled DNN pages; the /Portals/0/Docs/ PDFs are public. Report text runs through 2026-09-30 (ESPP paragraph), so vintage is current.
The earlier years' reports (same Publications page, back to 2006) probably carry the same list and could show history; not pulled.

## Method
List transcribed by hand from `ar2026.txt` lines 4555-4580 (two-column layout, read against the number sequence 1-29, all 29 present). 28 map to a county or Baltimore City; #19 Maryland State Police Aviation Command is statewide air and is not a county row. Three counties have more than one program: Anne Arundel (county FD, Annapolis City FD, BWI Fire Rescue at the airport), Wicomico (county DES, Salisbury FD), Worcester (county DES, Ocean City FD). City/airport programs are `partial: true` (inside the county, not countywide). Every county has exactly one county-level (or Baltimore City) program.

## Tier
All 24 jurisdictions are tier-A supportable on the rule "a state record names the provider for that county": the state EMS agency names the program of record per jurisdiction. Limits:
- The report says the programs provide 9-1-1 emergency medical response; it does NOT say per program that its own units carry patients. `transport` is `null` in the rows, with a note. The same report says the Emergency Services Transporter Supplemental Payment Program funds JEMSOPs, which points to transport, but it is not a per-program statement. Many Maryland counties use volunteer fire/rescue companies for ambulances under the county program (not sourced here); so the answer is "the county program of record", not necessarily the agency whose logo is on the ambulance.
- The list gives no ownership; rows use `county government` / `municipal fire` / `airport fire-rescue` from the program's own name.
- Baltimore city key: `county_911_all.cname()` strips " city", so "Baltimore city" becomes "baltimore" and collides with Baltimore County. The master wiring must key Baltimore city by FIPS 24510 (verdict keys are FIPS).
- Counted as 24 of 24; not all independent-provider detail (Montgomery's volunteer corporations, Prince George's volunteer companies) is shown.

## Spot check (sources the rows do not cite)
- Anne Arundel: aacounty.org/fire-department/emergency-medical-services lists an "EMS Fee for Service Transport Program" and "Transport Unit Locations" with ALS/BLS ambulances at county and volunteer company stations (capture `httpswwwaacountyorgfiredepartmentemergen.html`). Confirms the county fire department program and that volunteer companies run units inside it.
- Baltimore County: baltimorecountymd.gov/departments/fire lists "Emergency Medical Services" and "Ambulance Billing" under the Fire Department (capture `httpswwwbaltimorecountymdgovdepartmentsf.html`).
- Howard: howardcountymd.gov/fire-and-rescue-services: "Every station has at least one engine and one paramedic unit assigned", plus an "EMS Reimbursement" page. Washington: washco-md.net/emergency-services/ shows the Division of Emergency Services running EMS (EMS lieutenants, Oct 2026). Not checked for the other 20.

## Dead ends
- miemss.org/home/Public/EMS-Agency-Contacts renders only a Smartsheet dashboard of commercial ambulance services (JS shell); /home/regional-programs lists the five regional offices and their counties only (Region I Allegany+Garrett, II Washington+Frederick, III Baltimore City+Anne Arundel+Baltimore+Carroll+Harford+Howard, IV nine Eastern Shore counties, V Calvert+Charles+Montgomery+PG+St. Mary's); /home/ems-providers/compliance mentions "each jurisdictional program" without a list.
- MD iMAP MD_EMS FeatureServer: regions and regional offices only; MD_Fire: station points.
