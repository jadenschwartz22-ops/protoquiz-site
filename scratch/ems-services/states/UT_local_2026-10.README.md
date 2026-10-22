# UT verify lane, 2026-10-22 (UT_local_2026-10.json)

26 counties written: 20 A, 6 held. Sevier, Duchesne, Daggett skipped (already confirmed). Not reached: none other of the 29 (Sevier/Duchesne/Daggett aside, all 26 were worked).
A: Salt Lake, Utah, Davis, Washington, Iron, Summit, Uintah, Wasatch, Sanpete, Carbon, Emery, Grand, Kane, Beaver, Garfield, Rich, Wayne, Piute, Juab, Millard.
Held: Weber (Plain City, Washington Terrace), Cache (south ambulance contract out to bid, north QRUs), Box Elder, Tooele, Morgan (Mountain Green), San Juan (Bluff, Inscription House).

## Sources
- UGRC EMS Response Areas re-pulled (web_raw/UT/ugrc_ems.geojson) and county boundaries (ut_counties.geojson), re-overlaid in UTM 12N with a 0.03% floor (the old 1% cutoff dropped American Fork, Springville, Pleasant Grove; restored).
- Bureau of EMS licence roster (UT_imagetrend.json): every ground licence based in each county checked against the polygons.
- State of Utah Medicaid Ambulance Assessment 1/12/2026 (web_raw/UT/medicaid_2026Q2.htm/.json): per-provider ground transports, CY2024. This is the transport proof for most agencies (the fuzzy `licence_class` match in UT_public was unreliable, e.g. Parowan matched to Beaver).
- Utah Legislative Auditor General 2024 (audit2024.pdf), UFA 911 transport page, SLCPD release 10/21/2025, Brighton resolution 2025-R-12-2, Cache County RFP 12/10/2025, Dutch John notice, St George News 2015.
Salt Lake City: SLC FD is a licensed non-transport paramedic rescue (#1804L); Gold Cross (#1812L) transports (auditor + SLCPD release + roster).

## Limits
- Most agencies are proven by the Medicaid transport count + licence roster + UGRC polygon, not by the agency's own page (most Utah agencies have no easily found page; direct URL guesses mostly 404). Iron's Beryl/Parowan/Cedar City names are inferred to be Gold Cross stations.
- Summit's South Summit ambulance rests on the Medicaid line only; structure changed 1/1/2024.
- Unexplained licences noted, not resolved: Summit Vista #1872D (Taylorsville), Intermountain Power Service Corp #1404L (Delta), Deseret G&T #2402L (Uintah, in layer 0.1%). Treated as designation/industrial.
## Spot check (point-in-polygon of 80 cities against the layer, a source the rows do not cite)
Largest (Salt Lake): Taylorsville, Millcreek, Cottonwood Heights, Herriman, Riverton, Midvale, Magna all fall in UFA; Salt Lake City falls in the SLC FD (non-transport) polygon, hence Gold Cross. Mid (Utah): Cedar Hills -> American Fork, Vineyard/Lindon -> Orem, Elk Ridge/Genola -> Payson, all in the file. Rural (Kane/Beaver/Rich): single licensed ground service each, matches.
