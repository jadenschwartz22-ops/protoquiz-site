# CA verify lane, 2026-10-22

Output: `CA_verify_2026-10.json` (13 counties researched; 3 A, 10 held). Raw captures in `web_raw/CA/`.

## Sources
- EMSA "Ambulance Areas, Ground / EOA Status", as of January 2026, revised 1/14/2026:
  https://emsa.ca.gov/wp-content/uploads/sites/71/2026/01/Jan_26_AmbulanceEOAStatus.pdf
  (parsed rows: `web_raw/CA/eoa_2026_rows.json`). `ca/ca_zones.json` came from the July 2023 edition
  (pdfs/ca_eoa.pdf, ModDate 2023-07-25), so it is superseded.
- Ventura County 2024 EMS Plan (letter dated 2025-07-23), Ambulance Zone Summary Forms ASA 1-7.
- San Mateo County 911 Dispatch services page (smcgov.org/911dispatch/services).
- Alameda County BOS item HCSA_388852 (June 2025): AMR West agreement, service from 7/1/2026.
- San Joaquin County BOS news 2026-02-10: CENCAL Fire and EMS Authority, Zones X and Y, from 5/1/2026.
- Idyllwild Town Crier 2023-11-14: Riverside AMR contract expires 2026-06-30, extensions denied.

## Key finding: the EMSA table lags
Even the Jan 2026 EMSA list predates real 2026 changes (Alameda to AMR West 7/1/2026; San Joaquin to
CENCAL 5/1/2026; Riverside AMR contract end 6/30/2026; Solano and Santa Clara RFPs in flight). Do NOT promote
counties from the EMSA table alone; each needs a LEMSA/board source dated 2025+.

## A
- Ventura (ASA 1,6 Gold Coast; ASA 2-5,7 AMR; VCFD rescue ambulances as subcontract)
- San Mateo (AMR county except South San Francisco; SSF Fire)
- Contra Costa (Con Fire + AMR subcontract ERA I/II/V; Moraga-Orinda FPD; San Ramon Valley FPD)
Licence cross-check (EMSA roster 2022): extra names explained (REACH = air; Bayshore = BLS IFT;
Lifeline = assets to Gold Coast 2021 per Ventura plan; VC Sheriff = air/SAR).

## Held (notes in JSON)
Los Angeles (not completed), San Diego (Harmony Grove unnamed), Orange, Riverside, San Bernardino,
Santa Clara, Alameda, Sacramento, San Joaquin, Solano.

## Not reached
All other 45 counties. Stopped at ~55 min; WebSearch budget for the session was exhausted.

## Spot check
Ventura (largest A): county provider page (hca.venturacounty.gov .../providers-and-job-links) confirms
AMR covers Simi Valley, Moorpark, Thousand Oaks, Camarillo, Ventura, Santa Paula, Fillmore; it still lists
Lifeline (stale, see plan). San Mateo: dispatch page agrees. Contra Costa: Alameda BOS item agrees on AMR.
