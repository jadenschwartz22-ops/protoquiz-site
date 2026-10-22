# SC verify run 9 audit, 2026-10-22

Input `SC_verify9_2026-10.json` (6 A). Captures in `web_raw/SC/audit9/`. All quotes re-found on re-fetched pages. Licence roster `SC.json` re-checked: each county has exactly one 911 transport licence based in it, the named service (Clarendon's East Palmetto is convalescent only; Laurens' ZF EMS and County Fire are non-transport). No city over 20k in any. Promoted all 6 into `SC_local_2026-10.json` (27 -> 33 rows).

- 45059 Laurens: FAIL. Laurens County EMS page says "sole 911 provider" (also on 2024 Wayback), yet the 2026-06-27 council story describes a county contract with Prisma Health for a 24/7 paramedic ambulance and a council member objecting to Prisma as "ambulance provider in place of Laurens County EMS" (Cross Hill context). Scope unresolved: own 911 zone vs overflow vs staffing a county unit, and which area. GoLaurens search and county site gave nothing more. Held.
- 45039 Fairfield: PASS. County page "ALS rural county 911 service ... 6 ambulances from 6 substations"; WIS 2024-09-26 ambulance fleet. No contractor found.
- 45011 Barnwell: PASS. AmeriPro locations page (current) "911 ... in Barnwell County"; WRDW 2024-03-05 motion effective 2024-04-01 for three years -> runs to 2027-03-31, past the 2027-01 line. No other provider since Thorne left.
- 45081 Saluda: PASS. WRDW 2026-07-28 substation ambulance, 890 emergency calls; county EMS page (24h, 911). Only licence; no overflow contract found.
- 45061 Lee: FAIL. County page undated (Wayback copies 2020-2024); own search found EMS1 2024-07-01: Lee County Fire Department volunteer "rescue branch" to transport patients to hospitals during delayed EMS response. Not shown to be running or under the EMS licence; unexplained possible transporter. Held.
- 45027 Clarendon: PASS. Manning Live 2025-09-04 ride-along shows CCFR ambulance transport; Manning Live 2026-01-11 confirms the merged county fire/EMS department. Only 911 transport licence; East Palmetto non-emergency.

Low-acuity/overflow (Lexington MedTrust class): none found for the four passes; Laurens' Prisma is the only such contract and it is held.
