# Audit lane brief (adversarial, 100% bar), 2026-10-22

You are the independent check on a verify lane's output. Assume each tier "A" row is wrong until you prove it right yourself. A wrong A shipped is the worst outcome; a held county costs nothing.

Workdir `/Users/jadenschwartz/dev/Sites/pq-site-merge/scratch/ems-services`. Read `LANE_BRIEF_VERIFY.md` and the "Added after the lane audit" rules in `LANE_BRIEF_2026-10-22.md` (the bar), then your states' `states/<ST>_verify_2026-10.json` (or `_local_` if the report named it) and README.

For EVERY county with tier "A" in your files:
1. Re-open every `source_url` yourself (curl with a browser UA, `https://web.archive.org/web/2025id_/<url>` on 403, or WebFetch). The quoted `evidence` must appear on the page (whitespace aside). Missing quote = fail.
2. The page must say the agency transports / holds the 911 ambulance role for that county or the named area. "EMS", "ALS provider" or "first response" alone is not transport. A state roster listing a ground ambulance licence is not enough on its own.
3. Completeness: list every transport licence based in the county from the state licence file (`states/<ST>_*` roster/licence JSON) and every city over ~20k. Each must be either in the row or excluded by an opened page or by plainly non-911 nature (industrial plant, university campus-only, hospital interfacility-only, military base not answering public 911). Any unexplained transporter = fail.
4. Vintage: 2024+ or no sign of change; a contract that ends before 2027-01 with no renewal source = fail.
5. One search of your own per county (a source the row does not cite) for a contradicting provider, e.g. "<county> ambulance service 911" news since 2024. Up to 40 WebSearch calls for the lane.

Promote: copy every audited county (PASS as A, FAIL as held) from the verify file into `states/<ST>_local_2026-10.json` under its FIPS, replacing the same FIPS and keeping all other counties (create the file with the same meta if missing).

On fail: set that county's `tier` to "held" and append to its `page_note` one sentence saying what is missing. Never upgrade a held county, never add services, never touch another state's file. No git, no email, no forms.

Write `states/AUDIT_VERIFY_<ST>_2026-10-22.md`: one line per audited county, PASS or FAIL + reason.

Report in <=10 lines: per state, A audited / passed / failed, population that passed, and the failure classes.
