# County lane brief, 2026-10-22

Goal: name, from a public source, who answers 911 EMS (the TRANSPORTING agency) in as many counties of your states as you can in 60 minutes, biggest population first. Accuracy beats count: a wrong tier A is worse than a held county.

Workdir: `/Users/jadenschwartz/dev/Sites/pq-site-merge/scratch/ems-services`. Read first, nothing else in the tree:
- `RESUME_911_MAP.md` sections "What worked", "What failed", "Rules of evidence".
- Your states' existing `states/<ST>_*.README.md` (public pulls and DEADEND notes): do not repeat a dead end.
- County list + population + current tier: `../../data/county-911.json` (key = 5-digit FIPS; fields name, st, pop, tier). Skip counties already tier A.

Method (in order): county EMS page / county ordinance / ambulance district site; city fire department EMS page; 911 centre (PSAP) agency list; Standards of Cover / annual report PDFs (`pdftotext -layout`); board minutes; `https://web.archive.org/web/2025id_/<url>` for 403s. Fetch with `curl -sL -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15'` or WebFetch on direct URLs. WebSearch: at most 15 calls for the whole lane, to find a county's EMS site, never more. No forms, no logins, no email, no git commands, no Chrome.

Tier A needs ALL of: a source that names the agency for this county (or a named part of it), the source says it provides the 911 ambulance / emergency transport (not just first response), vintage 2024 or later (or an older source with no sign of change; note the year). A county split among several transporters is A only if the sources cover essentially all of it; otherwise `held` with what you found. Fire departments that only first-respond get `transport: false` and are kept.

Write ONE file per state: `states/<ST>_local_2026-10.json`, exactly:
```json
{"meta": {"state": "SC", "retrieved": "2026-10-22", "via": "county and agency websites (local sources)"},
 "county_verdict": {
  "45045": {"county": "Greenville", "tier": "A",
            "services": [{"name": "Greenville County EMS", "transport": true, "ownership": "county EMS", "partial": false, "area": "whole county",
                          "source_url": "https://...", "evidence": "quoted sentence from the source", "vintage": "2025"}],
            "page_note": "", "second_source": "url that independently agrees, if found"}}}
```
`ownership` is one of: county EMS, municipal fire, municipal EMS, fire district, public special district, hospital, private (contractor to <who>), nonprofit, tribal, mixed: <words>. `tier` is "A" or "held". Only counties you actually researched go in the file. Raw captures go to `states/web_raw/<ST>/` (never /tmp). Also write `states/<ST>_local_2026-10.README.md`: source list, counties A / held, and a three-county spot check (largest, mid, rural) against a source the row does not cite.

Report back in <=15 lines: per state, counties A / held / skipped and the population now A; anything contradicting the current map; dead ends worth recording.
