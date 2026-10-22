# WI verify lane, 2026-10-22

Output: `states/WI_verify_2026-10.json` (5 counties: A 3, held 2). Raw licence pull: `states/WI_lms_2026-10.json`. Helpers and captures: `states/web_raw/WI/v/`.

## New state source: WI DHS E-Licensing public lookup
Pointed to by Mark Mandler (WI DHS EMS Section Manager, email 2026-10-20): https://www.wi-emss.org/lms/public/portal#/lookup (ImageTrend LMS, Angular).
- API: `POST https://www.wi-emss.org/lms/admin/api/api/services/PublicLookupService` (note the doubled `/api/api`), JSON body
  `{"enterprise_id":"e5362813-073d-41cc-b783-272252f189d9","records_offset":0,"records_total":1000}`. Count: `.../services/getservicelookupcount` (910). No auth, reCAPTCHA disabled.
- Fields per service: service_name, address/city/county/postal (HQ), phone, website, primary_license_number/issue/expiry/status/level,
  primary_type_of_service (911 Transporting 368, 911 Non-Transporting 358, Training Center 58, TEMS 57, Community EMS 30, Interfacility 16, Air 14, CCT 5, ALS Intercept 1),
  other_service_types, classification (municipal volunteer/combination/full time, private NFP/FP, district, hospital, tribal), organization_type.
- NO service area, primary county or 911 designation in the public data. `serviceareacounties` / `serviceareacities` / `serviceareacensustracts` exist but return 401.
  "county" is the HQ address county only (e.g. "Lincoln County EMS - Tomahawk" is filed under Marathon; Mayo Clinic Ambulance under Eau Claire though it serves Superior).
- "(DROPPED)" in a name marks a service that has left (Sparta Area Ambulance, Long Lake-Tipler Rescue Squad) though status still reads Current.

## Counties
A: Door (county service, page says all towns, villages, cities and islands), Marquette (county page: "county wide ... covers the 464 square miles"), Florence (county-run since Jan 2024, three stations, "countywide system").
Held: Waushara (only licensed transporter, four stations match the four NG911 zones, but no page says whole county), Rusk (county page names no area; neighbours' zones reach in).
Not reached / dead ends this run (all have one transport licence based in the county): Lincoln (co.lincoln.wi.us unreachable, no Wayback EMS page; licences Merrill + Tomahawk units),
Menominee (Menominee Tribal Ambulance; no tribal EMS page found), Burnett (North Memorial WI Region; northmemorial.com does not name counties), Taylor, Sawyer, Jackson, Oneida, Douglas, Calumet.
Stopped at ~55 minutes.

## Leads for the next lane (headlines only, pages not opened: Google News links would not decode)
- La Crosse: "La Crosse fire to staff ambulance 24/7, following council vote" (WIZM, 2026-02-17) and "Gundersen Health System Ambulance acquires Sparta Area Ambulance Service" (WEAU, 2025-10-06).
  The map shows Tri-State Ambulance only; La Crosse FD (licensed 911 non-transporting, Paramedic) and Gundersen/Emplify (Sparta zone, ~18% of county) may also carry patients. Treat La Crosse as unproven.
- Douglas: "Douglas County EMS" (Superior) is licensed 911 NON-transporting; Mayo Clinic Ambulance (licensed under Eau Claire) has 75% of the NG911 area. The map answer "Gordon-Wascott EMS" alone is incomplete.

## Notes
- Marquette: the county's NG911 polygons are labelled 80, 81, 83 and "WSSO" (11%). The county EMS page claims the whole 464 sq mi and no other transporter is licensed in the county; the WSSO zone was not otherwise explained.
- Florence: NG911 layer still carries pre-2024 Aspirus/Integrity/Florence Rescue combinations; the map answer built from it is WRONG.

## Spot check (source the row does not cite)
- Door: licence list shows Door County Emergency Medical Service as the only transporter and 12 first-responder groups; agrees.
- Florence: licence list shows Florence County EMS current, Long Lake-Tipler marked DROPPED; agrees with the 2024 article.
- Marquette: licence list shows Marquette County EMS (Paramedic) as the only transporter; agrees with the county page.
