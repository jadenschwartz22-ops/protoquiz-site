# SC local pull, 2026-10-22

File: `SC_local_2026-10.json`. 21 counties tier A (4.44M of 5.48M people), 1 held (Anderson), 24 not researched (all under 40k except Oconee 82k, Greenwood 70k, Laurens 70k, Georgetown 66k, Cherokee 58k, Chesterfield 44k).

## Sources
County EMS pages (Greenville, Charleston, Horry, Beaufort, Aiken, Pickens, Florence, Lancaster, Sumter, Orangeburg, Darlington, Edgefield, McCormick, Jasper, Lexington); Wayback `2025id_` captures for Cloudflare-blocked county sites (Richland, Spartanburg, Berkeley, Dorchester, Kershaw); JEMS/Charlotte Observer 2025-03-20 for York's franchised hospital/rescue-squad system. Raw captures in `web_raw/SC/`.

## Tier A
Greenville, Charleston, Richland, Horry, Spartanburg, Lexington, York (3 services, mixed), Berkeley, Beaufort, Aiken (flag), Dorchester, Pickens, Florence, Lancaster, Sumter (+ Guardian contract ambulances), Orangeburg, Kershaw (weakest), Darlington, Edgefield, McCormick, Jasper.

## Held
Anderson: county runs 15 paramedic QRVs (non-transport); a private contractor adds up to 17 transport units but the county page does not name it. Medshore/Guardian (Priority Ambulance) is the likely name; no county source ties it.

## Not done / dead ends
- Cloudflare 403s every curl and WebFetch on richlandcountysc.gov, spartanburgcounty.gov, yorkcountysc.gov, berkeleycountysc.gov, aikencountysc.gov (the civicplus mirror `sc-aikencounty.civicplus.com` and `sc-orangeburgcounty.civicplus.com` are NOT blocked, try `sc-<county>.civicplus.com`), dorchestercountysc.gov, kershaw.sc.gov, chestercountysc.gov. Wayback `web/2025id_/<exact current URL>` works (use `--compressed`); wrong URLs 404; `archive.org/wayback/available` 429s.
- Not researched: Oconee, Greenwood, Laurens, Georgetown, Cherokee, Chesterfield and the 18 smallest. Hampton, Abbeville, Allendale, Marion county sites had no EMS page found by guessing.
- Open: York Atrium/Fort Mill EMS deal outcome; Aiken private 911 helpers; Lexington MedTrust and Orangeburg MedTrust (search snippets only).

## Spot check (source the row does not cite)
- Greenville (largest): RadioReference wiki lists "Greenville County EMS" pager tones and frequencies. Agrees.
- Dorchester (mid): ABC4 News 2026 community paramedic story names Dorchester County EMS as the county's ambulance service. Agrees.
- Edgefield (rural): RadioReference lists EMS tones for the county but names no agency; not independently confirmed beyond the county's own page.


## Verify lane update, 2026-10-22
Result: 19 tier A (3,377,293 people), 8 held, 19 not reached (all under 40k except Oconee 82k, Laurens 70k). Previous file before this lane saved at `web_raw/SC/SC_local_before_verify.json`.
- Resolved to A: Beaufort (County EMS + Hilton Head Island Fire Rescue), Lexington (County EMS + MedTrust, EMS1 2025-06-18), Kershaw.
- New A: Greenwood, Colleton (sole 9-1-1 provider quote).
- Held, answer known: Horry (HCFR + Myrtle Beach FD + North Myrtle Beach Rescue Squad; Garden City side unverified), York (Piedmont + Atrium Health Fort Mill EMS; River Hills/Lake Wylie now Piedmont; Tri-Star Medics licence unexplained), Spartanburg (county EMS; Landrum Rescue Squad licence unexplained), Anderson (county QRVs + Medshore; Fork and Pelzer Rescue Squad licences, contract term ends ~Sept 2026), Orangeburg (OCEMS + MedTrust 3-year contract Sept 2023, current status unsourced).
- Held, not resolved: Georgetown (county + Midway + Murrells Inlet-Garden City), Cherokee (no ambulance wording), Chesterfield (6 rescue squads + Lifeguard EMS, no county source).
- Existing A rows kept per instruction but with `licence_flags` (DPH roster transport licensees not named in the row): Greenville (Prisma Health Ambulance Service), Charleston (Boeing FD, College of Charleston), Berkeley (Goose Creek FD, Hanahan Fire/EMS, Cooper River Partners), Aiken (Aiken Rescue Inc., Jackson First Alert Rescue Squad, Savannah River Site Fire/EMS), Pickens (Clemson University Fire & EMS, Metrolina Ambulance), Florence (Johnsonville, Pamplico, Timmonsville rescue squads), Darlington (Hartsville, Lamar rescue squads). Under the strict step-4 rule these are not complete.
- Not reached: Oconee, Laurens, Newberry, Chester, Clarendon, Williamsburg, Marion, Dillon, Union, Marlboro, Abbeville, Barnwell, Fairfield, Saluda, Hampton, Lee, Calhoun, Bamberg, Allendale. Bamberg uses Medshore (T&D 2021-03-05, ems1) per a lead only.
- Spot check (source not cited by the row): Beaufort (largest new A) HHI FAQ vs county page agree; Colleton (rural) DPH roster lists only Colleton County Fire & Rescue as licensed 911 transporter; Greenwood same.
