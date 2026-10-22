# MN verify, 2026-10-22 (lane v5)

Output: `MN_verify_2026-10.json`, all 87 counties: 75 A (pop 4,353,914), 12 held (pop 1,439,237). Helpers + raw captures: `web_raw/MN/v5/` (psa.geojson, mesb.geojson, overlay_mn.py, overlay_mesb.py, holders.py, news.py, rss.py, build.py, kaxe_nash.html).

## Sources (opened today)
- OEMS Primary Service Area layer, queried fresh: services.arcgis.com/9OIuDHbyhmH91RfZ/.../EMSRB_Statewide/FeatureServer/0 (478 rows, data edited 2026-08-12). Item page arcgis.com/home/item.html?id=eea627ce674e4cc5ba621b1c800e9445 (owner OEMS_GIS): "Each ambulance service is licensed to provide care in an assigned PSA which has defined geographic boundaries." "This dataset is the authoritative source of ambulance service boundaries by Minnesota statute." (144E.06/144E.07).
- MESB metro 911 response map, queried fresh: enterprise.gisdata.mn.gov/aghost/rest/services/org_mn_mesb/bdry_ems/FeatureServer/0 (25 agencies, modified 2026-09-30): "each agency's response area as represented in the Master Street Address Guide (MSAG)". Replaces the stale `MN_MESB.json` (no geometry, no provenance).
- KAXE 2025-09-03 (Nashwauk/Meds-1 -> North Memorial).
- Google News RSS titles (links could not be decoded: Google "sorry" block): per-county 2-year screen + statewide change queries.

## Method
- Holders = the layer's own service/county rows (County attribute; 'St Louis'/'Ottertail' normalised), using the raw layer, not county_911.json. Geometry overlay on TIGER county lines gives each holder's share. Every geometric holder >=1% has a matching County row; holders <1% with no County row are boundary slivers and are left out (rule: "sources cover essentially all of it"). Holders with a County row are listed even when tiny.
- PSAs overlap (ALS over BLS, e.g. North Memorial Douglas 100% plus three BLS areas); all overlapping holders are listed. Coverage: union of PSAs vs county land share; three counties with real gaps held.
- Metro (10 MESB counties): a PSA holder is a 911 transporter only if it is also on the MESB 911 map. HealthPartners Medical Transportation (0401, all of Hennepin/Ramsey/Anoka/Dakota), Allina St. Paul (Inter-Facility) (0341) and M Health Fairview licence 219 in Hennepin/Ramsey are not on the 911 map: kept under `psa_holders_not_911`, not as services. Fairview stays a service where MESB shows it (Dakota, Isanti n/a, Anoka/Washington/Chisago held). Counties where the two maps disagree are held.
- Licence check: the OEMS licence directory (mn.gov/oems Service-Contact-Directory 2026-03-11 CSV) is behind a Radware captcha and the Wayback Machine was offline; not cross-checked. The layer carries each service's licence number (AmbLiceNum) and by statute every licensed ground service has a PSA. Tribal services not licensed by the state can be missing: Mdewakanton Ambulance (SMSC, Scott) is on the 911 map but not the PSA layer. Other tribal ambulances (Red Lake, Leech Lake, White Earth, Bois Forte, Grand Portage) are in the layer.
- >20k cities: no population-based city sweep was run. City fire ambulances (St. Paul, Edina, Burnsville, Hastings, Maplewood, Woodbury, White Bear Lake, Cottage Grove, Oakdale, Red Wing, Virginia, Cloquet Area FD) appear as their own PSA holders, and the metro cities are confirmed by the MSAG-based 911 map.
- Ownership is guessed from the name (hospital / municipal fire / tribal / "not checked"); not verified.

## Held (12)
Anoka (Elk River/Columbia Heights PSA pieces vs 911 map), Washington (Cottage Grove service-area change 8/2026), St. Louis (Tower-Ely ambulance partnership 7/2026), Scott (map conflicts + Mdewakanton), Carver (Chaska piece), Sherburne (Allina piece not on 911 map), Otter Tail (Ringdahl ending Pelican Rapids/Vergas service), Chisago (St. Croix EMS piece), Itasca (Nashwauk -> North Memorial 9/2025, county contract 1/2026), Houston, Koochiching, Yellow Medicine (PSA coverage gaps).

## Current map found wrong
- Hennepin, Ramsey, Dakota: map lists HealthPartners Medical Transportation (and M Health Fairview in Hennepin/Ramsey) as 911 holders; not on the 911 map. Ramsey also lacks Hennepin EMS (0.4%, St. Anthony edge).
- Polk: map names only Crookston Area Ambulance; layer adds Essentia Fosston, County EMS Fertile, North Valley Warren, Altru (Grand Forks), Oklee.
- Lake: map names only Lake County Ambulance; layer adds Ely Area Ambulance (27%) and Babbitt.
- Aitkin, Itasca: "Meds - 1 Ambulance Service" is North Memorial since 2024; Itasca "Nashwauk Ambulance Service" is North Memorial since 9/2025.

## Residual risk (for the audit)
- The layer lags acquisitions (Meds-1, Nashwauk names). The change screen is title-only and county-name queries collide with other states; a holder that closed or was taken over without news under its county name would be missed.
- Sanford Health completed its North Memorial acquisition 9/2026; North Memorial ambulances keep operating, names may change.

## Spot check (source the row does not cite)
- Largest, Hennepin: MESB 911 map independently names North Memorial, Hennepin EMS, Allina, Ridgeview, Edina Fire (+ Fort Snelling dispatcher-determined 0.4%) = the row's services. PASS.
- Mid, Aitkin: KAXE 2025 confirms Meds-1 Grand Rapids is North Memorial; row renamed. PASS for that holder.
- Rural: no independent rural source opened (time); not done.
