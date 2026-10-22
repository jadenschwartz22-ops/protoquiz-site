# TN verify lane, run 2 (2026-10-22)

File: TN_verify_2026-10.json, overwritten with only this run's counties. The run 1 file (Weakley, McMinn, Franklin held; Cocke, Henry, Fentress since promoted) is kept at web_raw/TN/v/TN_verify_prev_run_2026-10-22.json.
Scope: the 47 TN counties not in TN_local_2026-10.json. Single-licence counties first (web_raw/TN/v/dir50.txt), biggest first.
Result: 15 A (293,536 people), 4 held, 28 not reached.

A: Obion, Carroll, Henderson, Macon, McNairy, Hardeman, Grainger, Humphreys, Johnson, Wayne, Jackson, Trousdale, Perry, Clay, Moore.
Held: White and Van Buren (2026 news names the county EMS at scenes, no transport wording); Bledsoe (no current transport source; directory shows no primary 911 tag); Smith (Smith County Rescue Squad, unlicensed, reports EMS crews moving patients; licence holder is Smith County Ambulance Service).
Not reached: Dickson, McMinn, Gibson, Franklin, Fayette, Warren, Lincoln, Dyer, Rhea, Weakley, Hardin, Lauderdale, Overton, DeKalb, Polk, Chester, Haywood, Benton, Cannon, Stewart, Grundy, Crockett, Meigs, Decatur, Houston, Hancock, Lake, Pickett.

Every A: one licence based in the county, tagged *PRIMARY 911, in the TN EMS Directory (dir50.txt, 2026-10-22), plus an opened page dated 2024+ (Henderson: 2021 page, with 2025 and 2026 sources showing the same operator). No city over 20k in any of them.

Sources that work:
- priorityambulance.com/brands/ (WordPress, curl fine): baptist-ambulance (Carroll, Obion, McNairy, Tipton, Shelby), firstcall-ambulance (Humphreys plus non-911 work in many Middle TN counties), priority-ambulancetn.
- Local papers via Google News RSS (gnx.py): McKenzie Banner, Macon County Chronicle, Lewis Herald, Wayne County News, Lexington Progress, Tippah News, UC Now, WSMV, WBBJ, Lebanon Democrat.
- graingercountyems.com (agency site).
Dead ends: county homepages (*countytn.gov/.org, *co.org) are JS with empty sitemaps for ~45 of 49 tried; wth.org Medical Center EMS pages name no counties (Dyer, Chester, Benton unresolved); guessed agency domains (<county>countyems.com) all failed except Grainger.

Operator facts the map name hides (names are not wrong): Carroll, Obion, McNairy licences are "Shoals Ambulance dba Baptist", i.e. Baptist Ambulance, a Priority Ambulance brand; Carroll fire chief 2026-10-10 publicly criticises Priority's staffing (about half of required). Perry County EMS has been run under county contract by Ambulance Services of Lexington (BradenHealth) since 2025-08; the same operator runs Henderson County EMS, and director Mitchell Mooney also heads Decatur and Houston (likely the same operator, unconfirmed).

Leads for the next lane: Dickson First Call BLS licence is probably non-emergency (First Call site lists Dickson among many counties); Dyer/Chester/Benton are West Tennessee Healthcare "Medical Center EMS" (need a county-named page); Lincoln is HH Health System (Huntsville Hospital) EMS.

Spot checks (source the row does not cite):
- Largest A, Obion: TN directory sole licence Shoals Ambulance dba Baptist-Obion County, Union City, PRIMARY 911; agrees.
- Mid, Grainger: TN directory sole licence Grainger County Ambulance Authority, director Mardy Bowen (same director named on graingercountyems.com); agrees.
- Rural, Clay: TN directory sole licence Clay County EMS, director Andrew Hall (UC Now names EMS Director Andy Hall); agrees.
Stopped near the 60-minute cap.
