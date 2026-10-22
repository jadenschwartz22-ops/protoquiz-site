# TN verify lane, 2026-10-22 (50 counties not in TN_local_2026-10.json)

File: TN_verify_2026-10.json. Raw captures: web_raw/TN/v/ (dir50.txt = full TN EMS Directory licence list for all 50 counties, c_<COUNTY>.html raw POST results; *.html/*.txt = opened pages).
Result: 3 A (Cocke, Henry, Fentress; 90,608 people), 3 held (Weakley, McMinn, Franklin), 44 not reached.

Licence cross-check (step 4): POST County=<X> to https://internet.health.tn.gov/EMSDirectory, sequential curl with cookie jar, all 50 returned 200 (2026-10-22). Single-licence counties (only the PRIMARY 911 service): Benton, Bledsoe, Cannon, Carroll, Chester, Clay, Cocke, Crockett, Decatur, Dyer, Fentress, Grainger, Grundy, Hardeman, Hardin, Henderson, Henry, Houston, Humphreys, Jackson, Johnson, Lake, Lauderdale, Lincoln, Macon, McNairy, Moore, Obion, Perry, Pickett, Polk, Rhea, Smith, Stewart, Trousdale, Van Buren, White, Wayne. Extra licences to explain before any A: Dickson (First Call BLS), McMinn (Resolute EMS ALS 5402, Englewood Rural FD BLS), Gibson (Humboldt Area Rescue Squad & EMS BLS), Fayette (PHI rotor), Warren and DeKalb (Saint Thomas EMS, hospital), Haywood (Haywood EMS ALS 10330, untagged), Meigs (Prestige BLS), Weakley (Martin Fire & EMS ALS), Franklin (two PRIMARY 911), Hancock/Overton (invalid vehicle only).
Leads for the next lane: Henderson Medicare biller is "Ambulance Services of Lexington, Inc." (directory: Henderson County EMS); Rhea biller "Rhea Ambulance Services LLC" (directory: Rhea County Ambulance Service); Hardin biller is Hardin County General Hospital. Director Mitchell Mooney runs Henderson, Decatur and Houston (same operator likely).

Search: Bing and DuckDuckGo html return junk or a captcha. Google News RSS works; its article links decode with web_raw/TN/v helper logic (fetch rss/articles/<id>?hl=en-US&gl=US&ceid=US:en, read data-n-a-sg/ts, POST batchexecute garturlreq). County sites: most are JS (Revize/Wix) and give no EMS text to curl; sitemaps empty. fentresscountytn.gov/ambulance/ works. WBIR and WKRN return 403 (Wayback also 403 for WBIR).

Spot checks (source the row does not cite as source_url):
- Largest A, Cocke: Newport Plain Talk 2026-09-16 shows Priority Ambulance running the Newport station; agrees. (WBIR 2025-04-22 "Cocke County approves five-year contract extension with Priority Ambulance" seen as a news title only, page 403.)
- Mid, Henry: TN directory sole licence AMR HENRY COUNTY, PRIMARY 911; agrees.
- Rural, Fentress: TN directory sole licence, PRIMARY 911; Medicare 2024 biller "Fentress County"; agrees.

Weak points: Henry rests on a 2025 news item ("provides emergency medical services through the Henry County Hospital"), no county or contract page. Cocke rests on the company page plus directory; no county page opened.
Stopped at the 60-minute cap. Not reached (by size): Dickson, Gibson, Fayette, Warren, Lincoln, Dyer, Rhea, Obion, White, Carroll, Henderson, Hardin, Macon, McNairy, Hardeman, Grainger, Lauderdale, Overton, DeKalb, Smith, Humphreys, Johnson, Polk, Chester, Haywood, Benton, Wayne, Bledsoe, Cannon, Stewart, Grundy, Crockett, Meigs, Jackson, Trousdale, Decatur, Perry, Houston, Clay, Hancock, Moore, Van Buren, Lake, Pickett.
