# NE Rescue/EMS Response Areas, pulled 2026-10-21

File: `states/NE_public_2026-10.json` (meta + 506 label rows + county_verdict for 93 counties). Raw/tools: `downloads/ne_2026-10/` (`ems.geojson`, `county_overlay.json`, `build_ne_lane911b.py`).

## Source (state-hosted NG911 compilation)
"Rescue/EMS Response Areas" (layer EMS911), state GIS server https://gis.ne.gov/Enterprise/rest/services/Rescue_District_Response_Area/FeatureServer/0, owner christian.nielsen@Nebraska.gov, last edit 2026-10-01, 977 polygons. Description: areas covered by different EMS providers, maintained locally by PSAPs. This is the same layer as the old `states/NE.json` (977 features), which was written off for having no transport field; it IS the service-area source.
Only 623 of 977 polygons carry DateUpdate (2014-02 to 2026-06).

## Counts
**A 92** of 93 (named polygons cover >=95%); partial 1 = Douglas (Omaha): 283 Douglas County GIS polygons have a blank DsplayName.
Label quality is mixed and is stored per county (`label_mix_by_area_share`): service-word names (X AMB, X RESCUE, X EMS) 249 labels, bare town/district names 175, acronyms (GRFD, PAFD, BVFD) 80. 52 counties have >=50% of area with service-word labels. Rows are `transport: false` (layer does not say it carries patients); NE roster (NE_ems_assessment.json) gives counts only.
Treat acronym/town labels as "provider named loosely"; the owner may want to downgrade counties whose labels are mostly acronyms.

## Spot check
Not independently checked against county pages (time). Sarpy returns GRFD/PAFD/SPFD (Gretna, Papillion, South Papillion fire-rescue) which matches known Sarpy County fire-rescue districts from general knowledge only.

## Dead ends
None; NE.json and NE_ems_assessment.pdf unchanged.
