# NM verify pass, 2026-10-22

Sources
- NM 911 Program (DFA) EMS boundary layer: https://services3.arcgis.com/5GeA0r0IN0Q5uQUC/arcgis/rest/services/EMS_boundaries/FeatureServer/1 (1,169 polygons, last edit 2023-04-26; still the only statewide layer, ArcGIS search found nothing newer from dfa911 or anyone else). Overlaid on the DFA County_WGS84 layer: `web_raw/NM/v/ov.py` -> `web_raw/NM/v/ov.json` (share of each county per Agency_ID).
- NM DOH EMS Bureau list, provided by the EMS Bureau 2026-10-21 (Kyle Thornton), `web_raw/NM/kyle/`: combined DOT/Bureau ambulance list 2024-08-06 (103 ambulance services = the state record of ambulance service), all-agency list 2025-04-30 (licence level per agency), first-responder codes 2026-06-18 (agency still active).
- `states/NM_imagetrend.json` (licence level + "with/without transport" + county) for the step-4 licence cross-check.
- Agency pages: sanjuanregional.com/ems-ambulance, hidalgocounty.org/ems/, navajoems.org/our-mission.

Rule applied: A only when every boundary in the county maps to a service on the Bureau ambulance list (or a tribal service on the Bureau list that transports), and no other transport licence (DOT service or transport-capable rescue) based in the county is unexplained. Military boundaries (Melrose Air Force Range) are not public 911 areas.

A (6, pop 193,145): San Juan, Luna, Los Alamos, Roosevelt, Mora, Hidalgo.
Held, researched (4): Lea (Kent EMS, private DOT ambulance in Hobbs, role unknown; no website found), Eddy (Eddy County Fire & Rescue transport-capable rescue), De Baca (Lake Sumner Fire & Rescue transport-capable rescue), Sierra (Las Palomas EMS, Hillsboro FD transport-capable rescues).
Held from the layer alone, not researched further: boundaries with no ambulance on the Bureau list or a known change: Bernalillo, Sandoval, Santa Fe, Grant, Catron, Torrance, San Miguel, Cibola, McKinley (fire-district/chapter boundaries, transporter not named); Doña Ana, Otero, Chaves, Lincoln (Bureau list notes leases to AMR/PHS expiring 2023-2026); Valencia (vendor code `ve-amb`, unknown); Rio Arriba (Española code covers 70%); Colfax (Maxwell 18%), Union (Grenville, Capulin), Quay (House, Forrest), Harding (Harding County FD), Curry (Grady VFD rescue 24%), Guadalupe (layer gives all to Santa Rosa but Vaughn Ambulance is licensed), Taos (Taos Fire Rescue pending transport licence).

Current map answers found wrong
- San Juan: lists SJCFR West Zone as a transporter; its 2025 Bureau licence is non-transport. Right answer: San Juan Regional EMS + Navajo Nation EMS (Shiprock).
- Roosevelt: missing Portales Fire Dept. (the county seat's ambulance) and Melrose Fire and Ambulance (northwest corner).
- De Baca: lists Melrose Air Force Range; it is a bombing range, not a public 911 transporter.

Flags: Roosevelt's `ci-melrosefield` boundary is read as Melrose Fire and Ambulance from its code; no page names it. Hidalgo's county page says "four other volunteer departments" while the layer and licence lists show three (Playas, Animas, Cotton City).
