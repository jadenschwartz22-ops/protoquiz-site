# AL verify pull, 2026-10-22

File: `AL_verify_2026-10.json`. 5 counties A (Morgan, Lauderdale, Chilton, Wilcox, Greene; pop 287,840), 4 held (Limestone, Marshall, Blount, Pickens). Skipped (already in AL_local): Madison, Jefferson, Lee, Montgomery. Not reached: the other 54, incl. Mobile, Baldwin, Tuscaloosa, Shelby, Calhoun (stopped at the 60-min cap).

## Method and search tooling
- DuckDuckGo html/lite, Mojeek, Brave and Startpage all served captchas; Bing via curl returned junk. Google News RSS works (`news.google.com/rss/search?q=`); its article links decode to the publisher URL via the `batchexecute` garturlreq call (signature + timestamp read from the rss/articles page). Every quote is from the opened publisher page, raw in `web_raw/AL/v/`.
- Step 4: `AL_adph.json` transport licences per county (address county only).

## Licence cross-check per A county
- Morgan: only licensee HH Health System dba Decatur Morgan EMS; Decatur, Hartselle, Falkville FDs non-transport. amr.net still has an undated "Lifeguard in the Morgan County Community" page (Hartselle); not on the ADPH list and the 911 board says one provider for all of Morgan since 2024, so treated as stale.
- Lauderdale: only Lifeguard Lauderdale; Florence FD non-transport.
- Chilton: RPS-Chilton + Clanton FD, both explained.
- Wilcox, Greene: single licensee each (MedCare; Greene County EMS).

## Held, what's missing
- Limestone: Huntsville/Madison city parts in Limestone (likely HEMSI) unconfirmed.
- Marshall: Boaz Fire/Rescue transport role unconfirmed.
- Blount: AmeriPro start date; Blountsville FD and Oneonta (2026 ambulance ordinance) roles.
- Pickens: no page naming the current operator after NorthStar left.

## Map answers likely wrong
- Blount: map lists Lifeguard Ambulance; AmeriPro won the county 911 contract in Nov 2025 (WVTM).
- Limestone: map lists only Athens Limestone EMS; likely missing HEMSI for the Huntsville/Madison parts (unproven).

## Spot check
Morgan (largest): WAFF 2026-10-20 agrees Decatur Morgan EMS serves Decatur. Chilton (mid): Clanton Advertiser 2026-09-28 says "RPS will be primary". Greene (rural): WVUA 2026-07-09 confirms the county ambulance service is Greene's own, temporarily suspended in July.
