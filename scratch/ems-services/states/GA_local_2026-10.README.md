# GA local sources, 2026-10-22 (verify lane)

File: GA_local_2026-10.json. Raw captures: web_raw/GA/ (f.sh, g.py helpers; auto_*.txt crawler captures).
Result: 13 counties A (2.39M of 11.18M people), 7 held, 139 not reached. Largest first, but several biggest counties stayed held.

A: Gwinnett, Hall, Walton, Forsyth, Richmond, Newton, Rockdale, Clarke, Morgan, Catoosa, Gordon, Haralson, Lee.
  Weaker A: Rockdale, Clarke, Morgan, Catoosa rest on the Priority Ambulance company pages (2026) and its 2023 release naming the nine exclusive 911 zones; no county page opened. Lee has no 911/exclusive wording (county Fire & Emergency Services "operates ALS ambulances at each station"). Gwinnett's transport proof is the 2026 county FAQ (34 ALS ambulances, "population of over one million") plus a 2011 fee story.
Held: DeKalb, Fulton, Cobb, Henry, Clayton, Cherokee, Chatham.
  DeKalb: AMR is "the primary emergency transportation service for the county" (AJC/Firehouse 2025-11-20; county release 404 on fetch); Fire Rescue appears to first-respond only; Atlanta slice and Grady unconfirmed.
  Fulton: Grady (Atlanta, College Park, East Point E-911) confirmed from Grady's page; AMR North Fulton, Grady south and Hapeville are from the audit file only; five zones not proved.
  Cobb: MAAS (zone provider since 2001) and Puckett (Southwest Cobb), no 2024+ source.
  Henry: AJC 2018 "sole 911 ambulance provider for all of Henry County"; needs a newer source.
Not reached: 139 counties (Chatham, Clayton, Cherokee, Muscogee, Paulding, Houston, Columbia, Coweta, Bibb, Douglas and the rest). Columbia (map: Gold Cross) is unchecked and Gold Cross left Richmond in April 2023.

Georgia notes: DPH does not publish the zoning plan (GA_zoning.README.md). Zone facts come from provider releases and county pages. The state licence list is not public, so step 4 (licence cross-check) could not be done; every GA A row is therefore "no other transporter found", not "none exists".

Spot check against a source the row does not cite as source_url:
- Largest A, Gwinnett: audit file cites gwinnettcounty.com news releases (about 44k transports a year); agrees.
- Mid, Hall: not independently checked (no second source opened).
- Rural, Gordon: Priority/AdventHealth not cross-checked; single county page.

WRONG on the current map: Richmond (map Gold Cross EMS; right answer Central EMS since April/May 2023, DPH zone award 2023-03-10); Newton (map "Critical Care Concepts and Strategies, Llc"; right answer Piedmont Newton Hospital's zone run by Priority Ambulance, Central/National EMS); DeKalb (map Dekalb County Fire; right answer AMR primary). Dead ends: cherokeega.com 403, dekalbcountyga.gov/node/1210060 404 on fetch, henrycountyga.gov ems page script-rendered, ajc.com pages load only partly.
