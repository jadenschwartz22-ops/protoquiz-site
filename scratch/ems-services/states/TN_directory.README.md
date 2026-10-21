# Tennessee: Department of Health EMS Directory (county of licence)

Source: https://internet.health.tn.gov/EMSDirectory (Tennessee Department of Health, Emergency Medical Services). POST `County=X`, one county at a time, read in Chrome on 2026-10-21. (The 2026-09-11 curl attempts in `TN_DEADEND.README.md` got HTTP 500/403; a real browser session works.)
Rows: `states/TN_directory.json`, 101 rows over all 95 counties.

## What it is
237 services, each listed ONCE, under the county where it is LICENSED. A `*PRIMARY 911` tag marks a service the state records as a primary 911 provider. The directory is strong evidence, but it is not a service-area map: a service is not listed under the other counties it serves.

## Tier: B or C, never A
Tier A needs a record that names the provider for that county's service area (RESUME_911_MAP.md, rules of evidence). The directory names the county of licence, so it does not meet A (owner ruling 2026-10-21). Its rows enter with basis `located` ("a roster agency located in the county"): tier C, or tier B where the same name also shows as a Medicare 2024 emergency-majority biller (the existing rule, unchanged). Result: 15 B, 80 C. Names are matched to Medicare as the directory writes them; truncated names often miss, so B understates.
Public text: the county panel and state page say the answer comes from the "Tennessee Department of Health EMS Directory (licensed county)", credited to the state office (`via` field in `data/county-911.json` and `data/atlas/TN.json`).

## Rows
- 92 counties: the `*PRIMARY 911` service(s). Franklin (2), Sevier (2) and Shelby (5) have several; all are kept.
- Bledsoe (Bledsoe County EMS, 9956), Greene (Greene County-Greeneville EMS, 3001), Johnson (Johnson County Rescue Squad & EMS, 4602): licensed there, no primary tag. Added from the county's own pages 2026-10-21 (`tag: null`; evidence text says how strong). Greene is a joint county and city agency, countywide; Bledsoe is a county department, not seen named as the 911 provider; Johnson is a nonprofit.
- Names are the directory's, truncated at about 34 characters in places. No TN roster exists in `states/` to expand them (licence number is in each row as the join key).
- Not TN counties in the dropdown: Fulton (Twin City Ambulance dba KenTenn, 10226), St. Charles (Air Evac, 9987), Pulaski (Air Methods Kentucky, 10182); air or out-of-state services, no primary tag, not used.

## Limits
Licence county, not coverage: a primary-911 service can answer calls in neighbouring counties, and a county can be answered by a service licensed next door (Franklin is answered in part by Grundy EMS, which is licensed in Grundy). No follow-up to the state office was wanted. Wired in `county_911_all.py` (the `TN_directory.json` block before the Medicare merge).
