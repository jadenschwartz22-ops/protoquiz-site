# TX verify lane, 2026-10-22

File: `TX_verify_2026-10.json` (16 counties researched). Raw captures: `web_raw/TX/`.
Licence cross-check: `TX_dshs_roster_2026-10.xlsx` (DSHS roster 2026-10-02), filtered to Response_Type "Emergency 911" or "Both Emergency 911 & Transfer", by Mailing_County.

## A (3; 1,039,735 people)
- Montgomery 48339: MCHD ("operates the county's 911 ambulance service", mchd-tx.org/about, Wayback 2026-01-03) + HFD for the Houston city sliver. Only 911 licence in county = MCHD.
- Tom Green 48451: San Angelo FD ("provides ambulance service to all of Tom Green County", sanangelo.gov/234).
- Ector 48135: Odessa Fire Rescue (9 MICU ambulances, "Covers 904 square miles", odessa-tx.gov/271, 2026). Only 911 licence in county.

## Held (13)
Harris, Dallas, Tarrant, Bexar, Collin, Denton, Hidalgo, El Paso: not completed; page_note lists every roster 911 licence based in the county (the checklist for the next lane).
Travis, Williamson, Fort Bend, Midland, Smith: partial evidence in page_note.

## Map answers found wrong / stale
- Travis: Pflugerville ambulance moved from Allegiance Mobile Health to Travis County ESD 2 on 2026-10-01 (Community Impact 2026-07-15). Allegiance row is stale.
- Williamson: map omits ATCEMS ("parts of Williamson") and ESD 2 (Pflugerville part).
- Tom Green: map lists Med-Trans Corporation (air medical); SAFD is the ground 911 transporter for all of the county.
- Montgomery: omits HFD for the Houston city portion (small).

## Stopped
WebSearch budget exhausted by the session-wide cap after 6 calls. Not reached: every county below Williamson except Tom Green, Ector, Midland, Smith (spot picks of single-licence counties). Next cheap picks: Victoria, Gregg, Bowie, Parker, Rockwall, Liberty (one or two roster licences each). Dead ends: wilcotx.gov and mchd-tx.org 403 to WebFetch/curl (use Wayback id_ with --compressed); fortbendcountytx.gov EMS page 404.

## Spot check (source the row does not cite)
- Montgomery: DSHS roster has only MCHD (58 vehicles) based in the county. Agrees.
- Ector: roster has only Odessa Fire Rescue. Agrees.
- Tom Green: roster has San Angelo FD + Shannon AirMed 1 (air). Agrees for ground.
