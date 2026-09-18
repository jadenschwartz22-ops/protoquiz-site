# Editions and timelines — making uploads carry their weight

Written 2026-09-18, after Jaden rejected "published beats uploaded, always":

> "idk uploads are a good start man ... not a lot is published thats kinda the whole
> point ... need proper versioning and timeline showing changes etc ... same with agency
> map like published is great not always published we might have to do some digging"

He is right and the earlier framing was wrong. Requiring a publisher URL would cut the
census from 1,710 documents to 106. Agencies not publishing is the PROBLEM THE PROJECT
EXISTS TO SOLVE, not a filter to apply to our own corpus.

## What is actually broken (measured, not assumed)

Document identity is a CONTENT HASH. Two people upload the same protocol PDF — a
different scan, crop, or partial upload — and it hashes differently, so the census reads
them as successive REVISIONS of each other. Only the last survives as `current`.

| | count |
|---|---|
| documents | 1,710 |
| of those, `current` | 237 |
| with a publisher `sourceUrl` | 106 |
| without (app uploads) | 1,604 |
| in `pending_review`, no agency | 386 |

Denver Metro is the clean case: **264 documents, 1 current** — but only FIVE real
editions exist.

| effectiveDate | uploads |
|---|---|
| 2024-01-01 | 1 |
| 2025-01-01 | 1 |
| 2025-07-01 | 108 |
| 2026-01-01 | 147 |
| 2026-07-01 | 7 |

147 people uploaded the January 2026 edition. The census threw away 146 of them and
called the survivor a revision. National EMS: 23 copies of 2024-09-01, 22 superseded.

## The fix: an EDITION is `agency + effectiveDate`

Not the file hash. The hash stays as the identity of a FILE; the edition is what the
census publishes and versions.

Measured on the current corpus: **1,045 documents with an agency and a date collapse to
309 editions.** Denver Metro comes out at exactly its five. Nothing is discarded — the
147 uploads become 147 independent confirmations of one edition, which is EVIDENCE, not
noise. An edition with 147 uploads is better attested than one with 1.

`effectiveDate` is present on **72% of uploads** (1,157 of 1,604), extracted from the
document's own text, so the edition key does not depend on who uploaded it.

### What this needs
1. A `editionKey = agencyKey + effectiveDate` on every document row.
2. `status: current` becomes a property of the EDITION (the newest edition is current),
   not of the last file to arrive.
3. `uploadCount` per edition, published. It is the confidence signal uploads give us and
   it is currently thrown away.
4. The 28% of uploads with no `effectiveDate` stay as today — one file, one document,
   unversioned. They are not wrong, they are just not placeable on a timeline yet.

## The timeline, and the blocker in the way

**47 of 210 agencies already have 2+ editions** — a real timeline, today:

| agency | editions | span |
|---|---|---|
| Michigan MDHHS | 8 | 2022-12-16 → 2025-10-15 |
| Sacramento County | 5 | 2016-07-14 → 2026-05-01 |
| Denver Metro | 5 | 2024-01-01 → 2026-07-01 |
| Massachusetts DPH | 5 | 2024-04-22 → 2026-09-01 |
| Berrien County MCA | 5 | 2022-12-16 → 2026-08-15 |

**BLOCKER, verified:** `compare.json`'s `sourceKeys` is mostly AGENCY KEYS, not document
hashes (`'boulder-county-ems'`, `'arlington-ems-system'`; only 20 of a 165-key sample are
64-char hashes). So the published site data ties a medication fact to an AGENCY, not to
an EDITION, and "what changed between Denver Metro Jan 2026 and Jul 2026" cannot be
computed from what the site has.

It IS computable: `rows_private.json` carries **both `hash` and `effectiveDate` on every
dose row**. The data exists; it is on the wrong side of the v3 privacy split.

### What this needs
A new published file — `editions.json` — computed where the rows already are, carrying
per edition: `agencyKey`, `effectiveDate`, `versionLabel`, `uploadCount`, the medication
KEY SET, and per-medication presence. Key sets and counts, never dose values, so the
privacy line v3 drew is not crossed.

That is a **contract change in the router repo**, not an additive site file: per
`census-build.mjs:1502`, `writeSiteJson` unlinks any `data/census/*.json` not in
`SITE_FILES`, so a new file added only on the site side is deleted by the next nightly
build. `editions.json` must join `SITE_FILES` and share the manifest's `schemaVersion`.

## What it buys, in Jaden's words

"when national updates protocols soon we can see their differences and then multiply this
across the whole country."

National EMS 2024-09-01 is already in the census with 38 medications. When the next
edition lands, an edition diff says exactly what changed — added, dropped, re-dosed —
and the same machinery runs for all 47 agencies that already have a timeline, then for
every agency as second editions arrive. THAT is the census's compounding asset: not a
snapshot of American EMS, but a record of how it moves.

## The same problem on the coverage map

"published is great not always published we might have to do some digging."

Identical shape, and `VERIFY_PLAYBOOK.md` already handles it: tier A is a source naming
the county, and everything below is a lead. The parallel rule is the same one as here —
a weaker source is kept and LABELLED, never discarded and never silently promoted. What
the map still lacks is the edition idea: a county's answer has no `asOf`, so
`county_history/` (started 2026-09-18) is the only record that it ever changed.

## Order of work

1. **Read the `pending_review` queue by reason from Firestore** (386 docs; the site JSON
   strips `stateReason`, so this cannot be done from the repo). `docs/census.md` says to
   group by reason and work the biggest bucket. This is the cheapest corpus gain on the
   board and it is pure backfill, no schema change.
2. `editionKey` + `uploadCount` in the builder. T2. Nothing published changes shape yet.
3. `editions.json` into `SITE_FILES`. **T3 — contract change**, needs the router repo and
   a schemaVersion bump.
4. The timeline UI on an agency page, then the National EMS diff as the worked example.
5. Only then, the cross-country roll-up Jaden is actually after.

## What NOT to do

- Do not drop uploads for lacking a publisher URL. That was the wrong instinct; it would
  delete 94% of the corpus to protect a purity rule nobody asked for.
- Do not treat a re-upload as a revision. That is the bug.
- Do not publish a dose value per edition. Key sets and presence only — the v3 split is
  deliberate.
- Do not chart an edition appearing as a real-world change. A 2016 Sacramento edition
  arriving in the corpus today is us reading it, not Sacramento changing anything. Same
  rule as the map's tier C→A, and it will be just as tempting to get wrong.
