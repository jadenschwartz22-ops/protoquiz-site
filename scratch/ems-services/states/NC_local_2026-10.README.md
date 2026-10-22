# NC local verify, 2026-10-22 (partial: 25 of 98 counties reached)

Wake and Mecklenburg skipped (AUDIT_KEEP). Raw captures: states/web_raw/NC/.
Method: county EMS page quote + NC OEMS Continuum roster (states/NC_ownership.json, 271 transport-capable agencies) as the state-licence cross-check. A = page says the service covers the county AND the roster shows no other transport licence in it (this also covers cities with own ambulances).

A (10, pop 2,105,130): Guilford, Forsyth, Durham, Union, New Hanover, Cleveland, Rutherford, Lee, Vance, Hertford.
Held (15): Cumberland, Jackson, Jones, Robeson, Iredell, Gaston, Brunswick, Pitt, Davidson, Orange, Rowan, Johnston, Buncombe, Catawba, Harnett (reason in each page_note).
Not reached: ~73 counties. Order followed population; the rest (Wayne, Moore, Craven, Nash, Lincoln, Rockingham, Burke, Chatham ... down) are untouched. Pages fetched but not conclusive (no coverage statement): Lenoir, Edgecombe, Greene, Swain (Qualla Boundary part unaddressed), Perquimans, Cherokee, Montgomery.

Tooling notes: Brave via curl blocks after ~3 rapid queries; county sites with JS menus defeat link crawling. buncombenc.gov and onslowcountync.gov, Womack, qcnews return 403 to curl.
Spot check against an independent source: NOT done (time). Weakest As: Forsyth and Cleveland (page says "throughout the county"/"across our 469 square miles", not "sole"); Vance page undated.
