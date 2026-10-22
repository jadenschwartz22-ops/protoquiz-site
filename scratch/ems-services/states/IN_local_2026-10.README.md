# IN local county sources, 2026-10-22

File: `IN_local_2026-10.json`. Raw pages: `web_raw/IN/` (home/ = county homepages probed at <name>county.in.gov, co.<name>.in.us, in.gov/counties/<name>; ems/ = EMS pages linked from them).
Method: crawled county homepages for EMS/ambulance links; for county-run services whose page lacks a coverage sentence, "whole county" rests on the 2022 run-share (>=94%) in `IN_public_2026-10.json`, cited as second_source.

A (13, pop 671,171): La Porte, Tippecanoe, Bartholomew, Jackson, Owen, Steuben, Greene, Putnam, Washington, Parke, Posey, Jay, Spencer.
Held (5): Vanderburgh (EFD took city 2026-07-01 and Center/Perry/Union 2026-06-30; Armstrong/German/Scott unconfirmed), Clark (New Chapel out 2024-09; Heartland 2024 interim; current unknown), Martin (page says sole, 2022 data says Knox County EMS 54%), Randolph (four agencies, no areas), Cass (county EMS vs 2022 St. Vincent Kokomo 62%).
Skipped: Marion, Lake, Allen, Hamilton, St. Joseph, Elkhart, Hendricks, Porter, Johnson, Madison, Monroe and all others: multi-agency or no county EMS page found in time.

Sources: county pages listed per row; franciscanhealth.org/teas; crh.org/service-centers/emergency-services; 14news.com 2026-06-30; news.wnin.org 2026-05-26; wdrb.com 2024.

## Spot check (source the row does not cite as primary)
- Largest, La Porte (111k): 2022 run data, La Porte County EMS 96% of county runs. Agrees.
- Mid, Bartholomew (85k): The Republic (search snippet, site 403s) "Columbus Regional Hospital's EMS service will provide 911 emergency ambulance service to all areas of Bartholomew County"; 2022 run data 90%. Agrees.
- Rural, Parke (16.5k): 2022 run data, Parke County EMS & Transportation Service 94%. Agrees.

## Dead ends
- therepublic.com 403 direct, archive id_ capture empty.
- Benton (bentoncounty.in.gov/department/EMS) and Ripley (ripleycounty.in.gov/ems/) EMS pages render empty (JS).
- in.gov/counties/<name>/ homepages: only Randolph added a new EMS link.
