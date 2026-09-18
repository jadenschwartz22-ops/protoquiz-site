# Verification playbook — how to spend tokens turning guesses into facts

Written 2026-09-18, when the registry went on the site behind an honesty wall. This is
the standing answer to "we have tokens to spare, what should an agent go check?" Read
`RESUME_911_MAP.md` first for what the tiers mean; this file is only about what to do next.

## The rule that governs everything here

A county is publishable as KNOWN only at **tier A**: a state or agency record that names
the provider *for that county*. Tiers B/C/D are leads. An agent's job is to move a county
from a lead to a named source, or to prove it cannot be moved and say so.

**Never** let an agent "confirm" a county from the same roster the guess came from. That
is not verification, it is the same inference twice.

## Where the value is (2026-09-18 counts)

Unverified = tiers C, D and blank. Ranked by PEOPLE, not counties, because a 2,000-person
county costs the same tokens as a 2,000,000-person one and is worth a thousandth as much.

| State | Unverified counties | People | What unlocks it |
|---|---|---|---|
| FL | 53 | 17.9M | County COPCN ordinances — each BOCC names its 911 provider by name |
| TX | 210 | 17.2M | ESD and county EMS pages, city contracts; DSHS roster has no 911 field |
| IL | 102 | 12.7M | EMS System resource-hospital plans list agencies by county |
| OH | 88 | 11.9M | Records request (drafted); county EMS pages are the fallback |
| NC | 83 | 8.5M | OEMS roster HAS a 911 field — likely the cheapest large win on this list |
| VA | 110 | 8.3M | OEMS list + county/city fire-EMS pages; many independent cities |
| TN | 95 | 7.2M | County EMS pages; most counties run county EMS |
| MD | 24 | 6.3M | 24 jurisdictional programs, one page each, by hand |

**Start with NC.** Its state roster already carries the 911 field, so it is a parse, not a
hunt — the best ratio of population-verified to tokens on the board. FL is the biggest
prize but is 67 separate county ordinances.

## What one agent-run looks like

Scope: **one state**, never "go verify the map". Give the agent:

1. This file and `RESUME_911_MAP.md`.
2. The state's current rows: `python3 -c "import json;S=json.load(open('county_911.json'));print({k:v for k,v in S.items() if v['st']=='NC'})"`
3. The row schema and the tier-A bar: a source that names the county.
4. The rule that raw captures go to `states/web_raw/`, never pasted into a summary.
5. No WebSearch. Direct URLs only — the hunt is the expensive part and it is already done
   in `SOURCES.md`.

Output is a `states/COUNTY_911_<ST>.json` of `{fips: {provider, ownership, source_url,
quote}}`, where **quote** is the sentence from the source that names the county. A row with
no quote is not a tier A row.

Then: `python3 county_911_all.py && python3 snapshot_counties.py && python3 county_changes.py`
and read what moved. `county_changes.py` separates a real ownership change from a tier
improvement; a verification run should produce almost entirely the second kind. If it
produces a pile of "ANSWER MOVED", the agent probably replaced good rows with worse ones.

## The trap that will bite

**A tier C→A improvement is not a real-world change.** When Florida's COPCN ordinances land,
several hundred counties will move from a guessed private company to a named county service
in a single build. That is our sourcing improving, not Florida municipalising its EMS.
Nothing on the site may chart it as change. This is the single most damaging mistake this
volume could make, and `county_changes.py` exists to keep the two apart.

## Cheap wins that are not county work

- **The 53% problem.** 86% of state-table ownership labels are read from the agency's name
  and agree with the state's own label only 53% of the time. Any state that publishes
  `dAgency.13` fixes thousands of rows at once — better value per token than any county hunt.
  `RECORDS_REQUESTS.md` has 21 drafted asks; none have been sent. Sending them costs nothing
  but time.
- **Grading.** Jaden knows GA and CO. A county he grades is worth more than ten an agent
  guesses, and it calibrates everything else. GA grading is still pending.
- **The station-list eleven.** AK GA MS OH TN CT DE KS MD NJ WV have no usable roster at all.
  Until a records request lands, no amount of agent time improves them — do not spend it.

## When corrections arrive

`/research/registry/#correct` posts to `contactForm` with source `research-registry-correction`,
landing in Firestore `contact_submissions`. A reported county jumps the queue: someone who
works there is a better source than any roster, and the whole point of publishing early is
to collect exactly this. Verify it against a record before flipping the row — a correction
is a lead too, just a much better one.
