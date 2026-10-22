# Verify lane brief (100% bar), from 2026-10-22

Goal: every county of your state gets a CORRECT and COMPLETE answer to "who carries 911 patients here", each backed by a page a reader can open. The owner's bar is 100%: a named county that is wrong or missing a transporter is a failure. A county you cannot fully prove is `held`, never guessed.

Workdir `/Users/jadenschwartz/dev/Sites/pq-site-merge/scratch/ems-services`. Read first: `LANE_BRIEF_2026-10-22.md` (file shape, methods, and the "Added after the lane audit" rules), your state's audit findings in `states/AUDIT_*_2026-10-22*.md` (search for your state), and your state's existing `states/<ST>_*` READMEs. Current leads per county: `../../data/atlas/<ST>.json` (`a` = names shown, `tier`) and `county_911.json` (providers with url/note). The leads are where to START, not answers.

Per county, all of:
1. Every agency that carries 911 patients anywhere in the county: the county/district service, every city or fire department running its own ambulances (check each city over ~20k people), every contractor (including low-acuity/overflow contracts), tribal and military services that answer the public.
2. For each: an opened page that says it transports (or holds the 911 ambulance contract/zone) in that county or a named part of it, quoted verbatim, with the date (2024+ or no sign of change since).
3. Parts of the county: if the agencies together cover only part, the county is `held` with a page_note saying which parts are confirmed.
4. Cross-check the state licence list (if public) for every transport licence based in the county; an unexplained licensed transporter means not complete.

Output: `states/<ST>_verify_2026-10.json` in the brief's shape, only the counties you researched (the live file `states/<ST>_local_2026-10.json` is read-only for you; an audit lane promotes passing rows into it). `tier` "A" only when steps 1-4 hold. README alongside. No git, no email, no forms, no code edits. WebSearch: at most 25 calls. Work biggest population first; record where you stopped.

Report back in <=15 lines: counties A / held / not reached, population A, every county whose current map answer you found WRONG (with the right answer).
