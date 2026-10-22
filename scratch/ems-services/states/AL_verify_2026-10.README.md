# AL verify pull 3, 2026-10-22

File: `AL_verify_2026-10.json` (overwritten; only this pass's counties). Pass 2's rows (Walker, Colbert, Macon, Lowndes, Perry A; Cherokee, Marion, DeKalb, Jackson, Coffee held) are in or were reviewed against `AL_local_2026-10.json`; not repeated here.

A (2, pop 52,079): Marengo, Lawrence.
Held (3): Bullock, Dallas, Cleburne.
Not reached: Hale, Clay, Choctaw (tried briefly, no usable page), then all other single-licence counties, Mobile, Baldwin, Tuscaloosa, Shelby, Calhoun, Houston, Etowah and the rest. Stopped at ~45 min: search was the blocker.

## Method
- Google News RSS titles still load, but the article-link decoder hits Google's "sorry" captcha after ~10 decodes, so links could not be opened from search this pass. Worked instead from TownNews site search (`/search/?q=...&s=start_time&sd=desc` on moultonadvertiser.com, blackbeltnewsnetwork.com, annistonstar.com) and provider/county sites. Raw pages and helper scripts in `web_raw/AL/v4/` (`f.sh` fetch, `ctx.py` context grep).
- Licence check: `AL_adph.json`, transport licences with COUNTY = the county.

## Licence cross-check per A county
- Marengo: only transport licence AmStar EMS - Marengo. No city over 20k (Demopolis ~7k). AmStar's own page names stations in Demopolis, Linden and Dixons Mills and 911 response across Marengo County.
- Lawrence: only transport licence Lawrence County EMS d/b/a Greg's Ambulance Service. No city over 20k (Moulton ~3k). Speake Fire and Rescue houses a backup Lawrence County EMS ambulance (partnership; Speake holds no licence). Huntsville Hospital's 2025 Lawrence deal is an outpatient facility, no ambulance takeover.

## Held, what's missing
- Bullock: Haynes is the only licence; Haynes homepage lists a Bullock Station in Union Springs and the 2026-08 state grants name its Bullock EMS stations, but no page says it answers 911 / transports in Bullock (Haynes' services page lists only Montgomery, Elmore, Pike, Tallapoosa). Needs a transport news item or county page.
- Dallas: JETS is the only licence; no page names it for Selma/Dallas 911. 15 volunteer rescue squads first-respond (BBNN 2023). Selma Times-Journal search is JS-only.
- Cleburne: Cleburne County EMS only licence; newest page found is 2020; cleburnecountyal.com EMA/911 page has no EMS provider; cleburnecountyems.com is a blank template. 2019 EMS1 title about a Georgia company planning Ranburne service unresolved.
- Dead ends: claycountyrescue.com is now a hijacked spam site; choctawcountyems.com is Choctaw County, OK; Clay Times-Journal paywalled.

## Map answers
No current map answer found wrong. Marengo (AmStar), Lawrence (Greg's), Bullock (Haynes) match the map names.

## Spot check
Lawrence (largest): Moulton Advertiser 2026-02 trailer fire "Firefighters provided immediate care until Lawrence County EMS arrived" agrees. Marengo (mid/rural): AmStar homepage "Ambulance Provider in Marengo county" agrees with the about page; licence list shows no other ground transporter.
