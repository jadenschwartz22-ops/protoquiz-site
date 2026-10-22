# TN verify lane, run 3 (2026-10-22)

File: TN_verify_2026-10.json, overwritten with only this run's 12 counties. Run 2's README is kept at web_raw/TN/v/TN_verify_run2_README_2026-10-22.md (its rows are already in TN_local).
Scope: the 25 counties still missing from TN_local. Raw pages, queries, helpers: web_raw/TN/v/ (f2.sh fetch, kw.py grep, gt.py Google News titles, bx.sh BLOX paper search, wp.sh WordPress search).
Result: 5 A (Lincoln, Dyer, Fayette, Overton, Polk; 159,519 people), 7 held, 13 not reached.

A:
- Lincoln: hhlincolnhealth.org ambulance page (modified 2026-02): Lincoln Health Ambulance Services, "citizens of Lincoln County", "911 emergency response". Sole licence (HH Health System EMS, 10327).
- Dyer: State Gazette 2025-01, county subsidy and contract with Medical Center EMS (West Tennessee Healthcare); State Gazette 2026-01 and 2026-03 show Medical Center EMS still answering. The county was considering its own service in 2025; no sign it started. Sole licence. Dyersburg (~16k) has no ambulances of its own.
- Overton: Livingston Enterprise 2025-06, county EMS from Livingston and Hanging Limb stations; Overton County News 2025-07, patients "transported ... by Overton County EMS". Other licence is Med-X, a wheelchair van service.
- Polk: AmeriPro locations page (undated, live 2026-10-22): "provides 911 ... ambulance services in Polk County". Sole licence.
- Fayette (weakest): county EMS pages are from 2017 (stations in Somerville, Oakland, Rossville, west Fayette; "medical transportation services"). The director, Glenn Miller, is the same as on the 2026 licence. The only other licence is PHI, a helicopter service based in Kentucky. Downgrade to held if the 2017 date is not enough.

Held:
- Chester: WBBJ 2026-05, Med Center EMS on a month-to-month deal while the county looks at a new provider.
- DeKalb, Warren: county EMS confirmed in 2026, but each county also has a Saint Thomas EMS licence (Smithville, McMinnville). NewsChannel 5 (2022): the McMinnville Saint Thomas ambulance serves Warren County. Whether either one takes 911 calls is unknown.
- Grundy: Warren County interlocal agreement (2025-09) to cover Grundy's valley areas, with no transport source for Grundy EMS.
- Rhea, Pickett: active in 2026 but no page says they transport.
- Dickson: the First Call BLS licence is still unexplained.

Not reached: Gibson (Humboldt Rescue Squad BLS licence too), Hardin, Lauderdale, Haywood (two ALS licences), Benton, Cannon, Stewart, Crockett, Meigs, Decatur, Houston, Hancock, Lake.
No county's current map answer was found wrong. Lincoln's operator brands itself "Lincoln Health Ambulance Services".

Sources that work: BLOX paper search RSS (`/search/?f=rss&q=`) on stategazette.com, overtoncountynews.com, rheaheraldnews.com, herald-citizen.com, dailypostathenian.com, clevelandbanner.com. WordPress REST search on wjle.com, theucnow.com, svalleynow.com. WBBJ article URLs can be guessed from the headline slug (Arc site, no search).
Dead ends: decoding Google News links (captcha after ~10); KTTN "Grundy County" is Missouri; WAFF "Lauderdale" is Alabama; 14 News "Gibson" is Indiana; lauderdalecountytn.org is the chamber site; ameriprohealth and lincolnhealthsystem sitemaps are empty.

Spot checks (source the row does not cite): Dyer, State Gazette 2026-03 transports by Medical Center EMS (cited as second source; independent of the 2025 row source); Overton, Overton County News 2025-07 transport line agrees; Polk, directory sole licence AmeriPro in Copperhill agrees.
Stopped at the 60-minute cap.
