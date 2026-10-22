# AL local pull, 2026-10-22 (verify lane, out of time)

File: `AL_local_2026-10.json`. 1 county tier A (Madison, pop 423,355), 3 held (Jefferson, Lee, Montgomery), 63 not reached.

## Sources
HEMSI site (hemsi.org, hemsi.org/locations; raw in web_raw/AL/), The Plainsman 2019-12 (Lee), ADPH roster `AL_adph.json` (transport licensees by county).

## Useful for the next pass
- The ADPH roster (TRANSPORT_STATUS=Transport) is the cross-check list per county. Counties with ONE licensee: Madison (HH Health System EMS), Morgan (Decatur Morgan EMS), Limestone (Athens Limestone EMS), Marshall has 3, Lauderdale 1 (Lifeguard Ambulance). Morgan/Limestone licensee is the same Huntsville Hospital entity; a county page is still needed.
- Jefferson has ~25 licensees; Mobile has Mobile Fire Rescue, Mobile County EMS Systems Inc, Newman's, Dauphin Island FD; Baldwin has Gulf Shores, Orange Beach, Newman's, Lifeguard/MedStar; Tuscaloosa has Tuscaloosa Fire Rescue, Northport Fire Rescue, Northstar, Excelsior; Shelby is a patchwork of fire districts + RPS + Excelsior.
- Bing via curl (bing_search.py) returns junk for most local queries; WebSearch standard mode finds RadioReference and news only. Next step per AL_DEADEND: county commission / E-911 board pages one county at a time.

## Spot check
Madison (only county A): hemsi.org lists 14 stations / 36 ambulances; Huntsville Chamber member page agrees HEMSI is the Madison County ambulance provider.
