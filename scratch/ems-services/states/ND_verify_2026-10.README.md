# ND verify lane, 2026-10-22 (ND_verify_2026-10.json)

Scope: the 27 ND counties held in ND_local_2026-10.json (22 small held after the Dickinson stale-licence class, plus Stark, Dunn, Mercer, McKenzie, Oliver). 81 distinct services.
Result: 0 A, 27 held. No county had every covering service shown operating in 2024+.

## Correction to the current answer
- Stark and Dunn: Dickinson Area Ambulance Service (licence 29) closed 6/30/2025; Dickinson Fire/EMS Department (city) took over 7/1/2025 (Dickinson Press, 7/2025). Rows now name the fire department.

## Confirmed operating 2024+ (quote + url in each row's verify_2024)
Dickinson Fire/EMS, Killdeer Area (AG opinion 12/2025), LaMoure Community Volunteer EMS (12/2025), Medina (now "Medina Ambulance District", 7/2026), Napoleon (10/2025), Edgeley (4/2025), Kenmare (4/2026), McKenzie County Ambulance (7/2026), Kulm (8/2025), Bowman Ambulance Service (SW Healthcare page, site 2026), New England Ambulance District (1/2024 meeting notice only), Lemmon (6/2026, at risk of closing), Rugby (5/2026 headline only).

## Leads not finished
- Sidney Health Center EMS (Sidney Herald 10/2026) may be the current name of Richland County Ambulance (MT), McKenzie 16%.
- New England + Regent voted on a combined ambulance district in 2016 (Dickinson Press); Regent's current status unknown.
- Finley merged into West Traill Ambulance in 2013 (Grand Forks Herald): the two Steele rows are one service.
- Divide County Ambulance District ran its own service after its contractor quit (2018); no 2024+ source found.

## Method and dead ends
- Google News RSS: 85 + 69 queries (one per service, two phrasings). Most small ND squads have no 2024+ news; URL decoding hit captchas in round 2.
- Forum Communications site search (thedickinsonpress, jamestownsun, inforum, grandforksherald /search?q=) works with curl; filtered links by town + ambulance slug. Bismarck Tribune and Sidney Herald search returned nothing to curl. gspublishing.net (Grant/Morton weeklies) is paywalled.
- No newer licence list than 05/06/2025 on hhs.nd.gov; 2026-28 re-licensure is via the login-only Big Picture system. services.ndhhs.gov/EMS/verify is a personnel form (not used).
- DES EMS boundary layer polygons were edited through 12/2025 but keep town labels (DICKINSON EMS updated 7/2025), so it cannot detect provider changes.
- County sites (*.nd.gov guesses) mostly do not resolve; Pembina County EMS page is JavaScript-only.
Raw captures: web_raw/ND/v4/ (out/, out2/, art/, fs/, site/).
