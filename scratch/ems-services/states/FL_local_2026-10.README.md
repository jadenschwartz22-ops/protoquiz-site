# FL verify lane 2026-10-22 (stopped at 8 of 64 counties; 0 A, 8 held)

Output: states/FL_local_2026-10.json. Raw: states/web_raw/FL/ (Broward EMS-Providers 2023 archive PDF, PBCFR FY2026 fact sheet, Columbia BCC Feb 2026 backup agreement + minutes, JEMS and Polk pages).

Order worked: Broward, Miami-Dade, Palm Beach, Hillsborough, Orange, Duval, Polk, Columbia. Not reached: Lee, Brevard and the other 55 counties.

Why no tier A: the 100% bar needs an opened page per city transporter and an explanation of every FL DOH ALS/T licence in the county (states/FL_parsed.json). Large FL counties have 10-25 licences; city fire depts that hold ALS/T are unproven as 911 transporters.

Dead ends: broward.org EMS-Providers.pdf is 403 to curl and WebFetch (only the rev 2023-07-06 archive capture exists); miami.gov, hcfl.gov newsroom, coralgables.com fire, hallandalebeachfl.gov fire, jfrd Rescue page 404/403; WebFetch gives vague summaries on city pages, so use curl + pdftotext on PDFs. testorg.sheriff.org certificate errors.

Spot check (three-county, source not cited by row): not done for any A (none).
