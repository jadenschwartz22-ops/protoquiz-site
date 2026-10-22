# VA audit of tier A rows, 2026-10-22 (adversarial, LANE_BRIEF_AUDIT.md)

- 51059 Fairfax County (pop 1,160,925): PASS. FCFRD billing page quote found (EMS transport billing in Fairfax County); OEMS roster: only FCFRD ground licence with a Fairfax address (MWAA licence is Dulles/Loudoun, Fort Belvoir military); own search found no private 911 contractor.
- 51600 Fairfax city (pop 26,340): PASS. Archive page quote found (city charges for ambulance transport, revenue to FD); roster only City of Fairfax FD; own search: city site lists two ALS transport units.
- 51013 Arlington County (pop 239,807): PASS. curl and archive 403; WebFetch shows 'including ambulance transportation, over 15,000 times per year'; roster only ACFD; own search: 2026 billing FAQ, private firms listed only as non-emergency options.
- 51710 Norfolk city (pop 231,105): PASS. Quote found ('responsible for providing all emergency medical service... medic (ambulance) fleet'); roster others are CHKD neonatal (hospital) and Nightingale air; own search: Fast Track EMS listing sends emergencies to 911/local station.
- 51510 Alexandria city (pop 159,102): PASS. Quote found; RIDE24 excluded by ALXnow 2024-07-01: 'will not respond to medical emergencies within the City's jurisdiction'; own search found no private 911 provider.
- 51700 Newport News city (pop 183,056): PASS. Quote found (fees charged to every patient transported by NNFD); roster others: Newport News Shipbuilding FD (industrial); own search found no contrary 911 provider.
- 51550 Chesapeake city (pop 254,997): FAIL. the cited page says EMS, not transport, and transport rests on the OEMS roster alone (fails the bar); Fast Track EMS and LifeWay commercial licences not excluded by an opened Chesapeake page.
- 51650 Hampton city (pop 137,596): FAIL. CARDINAL AMBULANCE SERVICE, INC. (OEMS 01327, BLS, 2112 Executive Drive, Hampton) is unexplained: no page found showing it is non-911.
- 51800 Suffolk city (pop 103,105): PASS. Quote found ('9 Advanced Life Support Ambulances'); roster only Suffolk Fire & Rescue; own search: 2025 WAVY on Suffolk F&R frontline ALS ambulances; Nansemond-Suffolk VRS holds no licence.
- 51179 Stafford County (pop 168,919): PASS. Quote found (EMS transport billing in Stafford County by SCFRD); roster only SCFRD in Stafford; LifeCare Medical Transports (00749, 1170 International Pkwy 22406, Stafford) excluded by SeniorNavigator listing ('if it is an emergency, call 911'); Incarnate is Woodbridge (Prince William).
- 51041 Chesterfield County (pop 389,793): PASS. All quotes found in 2026 CRA/SOC (22 staffed transport units; four VRS transports); roster: CFEMS + four squads, HCA VA Medical Transport is hospital-owned IFT, VSP Medflight air; own search found no private 911 contractor.

Audited 11, passed 9, failed 2; population passed 2,662,152, held 392,593.

## Second pass: VA_verify_2026-10.json tier A rows (audited 2026-10-22, captures in web_raw/VA/audit/)
All 14 evidence fragments found on freshly fetched pages (James City, Winchester via archive id_; rest live). Roster cross-check by place name, neighbouring ZIPs and Census geocoder on nearby licence addresses (AEC Medical Transport = Prince William Co, Apex = Manassas city, Cardinal = Hampton, ACFR/UVA MTN = Albemarle Co). Own search: Google News RSS per jurisdiction.
- 51095 James City County (pop 82,797): PASS. Quote found (archive); only JCC FD holds a transport licence (James City Rescue Squad is non-transport, Busch Gardens first response only); news: nothing contrary.
- 51199 York County (pop 71,410): PASS. Quote found ('EMS transport fee' by York County FD); only YCFLS licence in Yorktown/Tabb/Seaford/Grafton ZIPs; news 2026: York County FD only.
- 51540 Charlottesville city (pop 44,767): PASS. FAQ quote found (CARS and CFD ambulances bill in the city); ACFR about page limits its transport to 'residents and visitors of Albemarle County'; Cville Tomorrow 2026-01: CARS 'responds to 911 calls in the city'; UVA MTN hospital-owned; Seminole Trail/Stony Point non-transport.
- 51840 Winchester city (pop 27,800): PASS. Quote found (archive, CY2025 rates); only WFRD licence in 22601; Frederick Co companies are outside the city; Valley Medical Transport is Valley Health, booked by its own dispatch line (valleyhealthlink.com service page), note reworded.
- 51099 King George County (pop 28,816): PASS. Quote found; only KG Fire-Rescue licence; Colonial Beach/Oak Grove are Westmoreland non-transport; Navy Dahlgren unlicensed, mutual aid only.
- 51570 Colonial Heights city (pop 18,674): PASS. Quote found (city emergency ambulance transport under Fire & EMS); only CHFD licence; Progress-Index 2025: Southside Virginia Emergency Crew enters the city by mutual aid only.
- 51685 Manassas Park city (pop 16,611): PASS. SOC 2022 quote found ('advanced life support transport agency'); current apparatus page lists two medic units (Medic 509, 509B 2022); OEMS licence to 04/2027; no change in news; nearby private licences are outside the city.
- 51735 Poquoson city (pop 12,854): PASS. Quote found; VRS page: squad keeps one ambulance; only Poquoson F&R licence; news 2026-08 is a staffing story, no provider change.
- 51830 Williamsburg city (pop 16,030): PASS. Quote found (four ALS ambulances, mutual aid JCC/York); EMS Billing page live; only Williamsburg FD licence in the city.
- 51075 Goochland County (pop 28,223): PASS. Quote found (billing for EMS transports since 2013); Station 8 page 2025 ambulance; only Goochland Fire-Rescue licence.

Audited 10, passed 10, failed 0; population passed 347,982. Promoted all 10 into VA_local_2026-10.json (17 -> 27 FIPS; pre-promote copy web_raw/VA/audit/VA_local_before_promote.json).
