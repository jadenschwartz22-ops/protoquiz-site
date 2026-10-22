# TN local sources, 2026-10-22 (verify lane update)

File: TN_local_2026-10.json. Raw captures: web_raw/TN/ (f.sh, g.py helpers; auto_*.txt are crawler captures).
Result after the verify lane: 30 counties A (3.78M of 7.23M people), 15 held, 50 not reached.

Kept from the first lane (16 A): Davidson, Knox, Hamilton, Rutherford, Williamson, Montgomery, Washington, Bradley, Putnam, Anderson, Robertson, Jefferson, Bedford, Lawrence, Campbell, Cheatham. Their weak points are unchanged (Knox: news not county site; Hamilton: county page 404; Cheatham: undated).
New A (14): Greene, Tipton, Loudon, Coffee, Hawkins, Giles, Hickman, Lewis, Scott, Unicoi, Union, Morgan, Marion, Sequatchie.
  Weaker A, read before relying: Tipton (2020 company release plus 2026 directory), Marion and Sequatchie (Puckett company page plus directory, no county page), Morgan (page last edited 2020), Greene (guidebook text, date 2026-08-29 may be a republish).
Held, researched this lane (8 new): Maury (Spring Hill Maury side is Williamson Health), Cumberland (Crossville city ambulance plan, Sept 2025), Monroe (2014 page), Claiborne (no area; LLC), Marshall (no ambulance wording), Roane (no 911 wording), Hamblen, Madison (no current page).
Original held, not resolved (7): Shelby, Sumner, Wilson, Carter, Blount, Sullivan, Sevier. Sevier now has the county EMS station list (6 stations, no Gatlinburg) but Gatlinburg Fire is a second primary-911 licence and its site is script-rendered.
Not reached: 50 smaller counties (Dickson, McMinn, Gibson, Franklin, Fayette, Warren, Cocke, Lincoln, Dyer, Rhea, Weakley, Henry and others). Stopped when the 25 WebSearch budget was spent.

Method: county sites via curl crawler (domain guess + nav/sitemap scan), news and company releases via WebSearch leads then opened pages, TN directory (states/TN_directory.json) used as the state licence cross-check: a county counts as complete only when the directory lists no other licence based in it (true for every new A except Franklin, Sevier, Shelby, which are not A).

Spot check against a source the row does not cite as source_url (limited by search budget; the directory is cited as second_source on most rows):
- Largest new A, Greene: WCYB 2015 (search summary only, not opened) says Greene County EMS handles all emergency calls; agrees. Opened WJHL 2024 names the same agency.
- Mid, Coffee: TN directory "COFFEE COUNTY EMS", primary 911; agrees.
- Rural, Scott: TN directory "SCOTT COUNTY AMBULANCE SERVICE", primary 911; agrees.

Contradictions with the current map: Knox (first lane, unchanged): directory says Priority Ambulance, county contract is AMR/Rural-Metro. Loudon, Tipton, Marion, Sequatchie are private contractors the map already shows as the directory names; no change.
Dead ends added: hamiltontn.gov, madisoncountytn.gov, hamblencountytn.gov, mauryregional.com/ems (404/403), gatlinburgtn.gov (JS), cherokeega.com (403).
