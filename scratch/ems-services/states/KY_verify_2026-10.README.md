# KY verify lane, 2026-10-22 (third KY lane, ~55 min, no sub-agents, 0 WebSearch)

File: `states/KY_verify_2026-10.json` (overwritten; only the 9 counties researched this time). Raw captures and helper
scripts: `states/web_raw/KY/v4/` (f.py fetch, g.py Google News titles, b.py Bing News RSS, ss.py/sb.py site search).
Skipped: every county in `KY_local_2026-10.json`.

## Result
- A (4, pop 121,610): Henderson, Meade, Grayson, Hart.
- held (5): Bullitt (Mt. Washington Fire & EMS licence 1697 unconfirmed by a page), Oldham (see WRONG below),
  Breckinridge / Russell / Simpson (2026 news names "<County> EMS" responding; name differs from the licence holder or
  no transport wording).
- WRONG on the current map: Oldham. Map names AmeriPro; the county's 911 service is Oldham County EMS (Baptist Health
  operates it for the Oldham County Ambulance Taxing District; KBEMS 1633 mislabels it "without transport"). AmeriPro's
  licence 1707 lists Oldham but its found 911 contract is Henry County (from 2025-03).
- Not reached (biggest first): Pulaski, Laurel, Pike, Shelby, Boyd, Whitley, Greenup, Floyd, Muhlenberg, Knox, Perry,
  Grant, Harlan, Ohio, Mercer, Bell, Johnson, Spencer, Bourbon, Letcher, Marion, Wayne, Clay, Harrison, Adair, Garrard,
  Mason, McCreary, Rockcastle and smaller. Shelby, Muhlenberg, Perry, Mercer, Spencer, Adair: searched, nothing usable.

## Method
KY rule as in the audited second lane: one Class Ia whole-county 911 transport licence (KBEMS 2026-08-01) + an opened
2024+ local page naming the service for the county. Grayson and Meade's 2026 pages say "assisted/responded" (as Logan);
Meade adds a 2022 "transported" line. Henderson rests on the live undated Deaconess EMS page; the NG911 label
"AMR-Henderson" is an old name with no AMR licence in the county.

## Search tips (2026-10-22)
- Google News link decoding (batchexecute) gets a Google "sorry" block quickly; titles + `<source url>` still work.
- Bing News RSS (`bing.com/news/search?q=...&format=rss`) gives direct URLs; Bing web RSS is junk.
- WNKY site search (`wnky.com/?s=`) + article fetch works and covers south-central KY well. WHAS11 blocks curl
  (Akamai); MSN copies of WAVE/WHAS stories open via `assets.msn.com/content/view/v2/Detail/en-us/<id>`.
- Wayback was offline during this lane.
