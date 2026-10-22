# KY verify lane, 2026-10-22 (second KY lane, 60 min, no sub-agents, 0 WebSearch)

File: `states/KY_verify_2026-10.json` (builder: session scratchpad `kyv.py`, not kept). Raw captures: `states/web_raw/KY/v/`.
Skipped: every county in `KY_local_2026-10.json`, plus Christian and McCracken (already tier A on the atlas).

## Result
- A (18, pop 646,651): Scott, Jessamine, Franklin, Nelson, Barren, Hopkins, Calloway, Marshall, Boyle, Montgomery,
  Logan, Woodford, Taylor, Carter, Lincoln, Anderson, Rowan, Allen.
- held (2): Clark (Cross Medical Response licence 1700, Class Ia with a 911 permit, area Clark County, unexplained;
  Winchester source is 2019), Graves (only a 2025 news line naming "Mayfield EMS"; no page from the service).
- Not reached (biggest first): Bullitt, Oldham, Pulaski, Laurel, Pike, Shelby, Boyd, Henderson, Whitley, Greenup,
  Floyd, Muhlenberg, Meade, Knox, Grayson, Perry, Grant, Harlan, Ohio, Mercer, Bell, Johnson, Breckinridge and smaller.
  Stopped after Allen (pop 22k).

## Method (every A row)
1. Step 4 first: KBEMS EMS Directory 2026-08-01 (`KY_public_2026-10.json`) lists exactly one Class Ia 911-transport
   licence whose area is the whole county (Logan: two licences, both Logan County EMS; IFT-typed AmeriPro/SkyLife/
   Vanderbilt, Class III/V/VIII and plant-only Class IV rows explained as non-911). That row is quoted as `licence_evidence`.
2. One opened local page (agency/county site or 2024+ news) confirming the agency runs the county's ambulance service now.
3. Cities over 20k checked: Georgetown (joint city-county EMS), Nicholasville (Jessamine EMS), Frankfort (city FD is the
   licensee). No other KY city over 20k falls in these counties.
4. `second_source` = NG911 EMS boundary label only where the label names the agency (blank where it names a PSAP).

## Weak points (audit first)
- Page does not itself say "transport" (rests on KBEMS licence text): Scott (EMS1 2026), Hopkins (2026 news, "life-saving
  measures"), Logan (2026 news, "assisted at the scene"), Woodford (2026 news on its director), Franklin (chief's
  statement + Med 1-5 apparatus), Lincoln (2024-10 archive), Allen.
- Anderson source is a 2022 archived county page ("only certificate of need"); KBEMS 2026 shows no change.
- Jessamine and Lincoln pages are Wayback captures (2025-08, 2024-10); live sites refused curl.
- No contradictions with the current map found in the 20 counties researched (all already named the same agency).

## Search tips
- KY county sites are often ky.gov SharePoint or CivicPlus; `/sitemap.xml` worked for boylecountyky.gov, marshallcountyky.gov,
  frankfort.ky.gov, mcfdems.com. Google News RSS "<agency>" transported finds dated news quotes quickly.
