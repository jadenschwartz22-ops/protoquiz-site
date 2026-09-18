# State of EMS Services — public vocabulary

Ruled 2026-09-10, before any number ships. Same discipline as the census
(`Backend/ems-router/docs/census.md`): every word on a public page has one meaning
fixed here, and hedge-words that sound precise without being defined are banned.

## The unit of analysis

**Who transports the 911 patient.** Not "is this a fire department". A fire
department that responds to a medical call but never carries the patient is not the
EMS provider for that call, and counting it as one turns a fire-response map into
something it is not.

## Words on the site

| Word | Meaning |
|---|---|
| Agency | One licensed EMS organisation as the state lists it. One row per licence, not per station or per vehicle. |
| Transporting agency | An agency the STATE records as carrying patients from the scene. Never inferred from a name, never from a certification level. |
| Non-transporting agency | An agency the state records as responding without carrying patients — a first-response engine or aid company. |
| Transport-verified state | A state that publishes a transport or provider-of-record field of its own. Only these states appear in transport figures. |
| Fire-based / private / third-service / hospital | Who OPERATES the agency. Separate question from whether it transports; a state can publish one without the other. |
| Provider of record | The agency legally assigned to answer 911 in an area (a franchise, CON, or exclusive operating area). Stronger than "transports" — it names WHO for a given place. |

## Words we do not use

- **"911 coverage"** for anything but a provider-of-record state. Knowing an agency
  transports does not tell you which calls it is dispatched to.
- **"National"** for a figure computed from the transport-verified states. They are
  self-selected — states that happen to publish the field — and weighted by roster
  size. The honest phrasing is "across the N states that publish it".
- **"Accuracy"** without naming what it was measured against.
- Any figure that blends `official` (the state's own field) with `derived` (our rules)
  or `model` provenance.

## Three provenances, always separate

A transport-restricted number has TWO independent provenances and a public page must
not merge them:

1. **The transport flag** — always the state's own field. 100% official.
2. **The ownership label** — `official` where the state publishes ownership,
   `derived` (read from the agency's name) elsewhere, and `web` where a subagent
   resolved it from the agency's own site, its municipality, a non-profit filing or
   news, with a source URL on every row. `web` is applied only where the name gave
   nothing, only at high or medium confidence, never over `official`. Measured blind
   against New York's own labels: 93% precision on committed answers. A published
   number states the share of each provenance beside it.

Alabama is the clearest case: its transport flag is official and its ownership label is
derived. Both facts belong beside any AL number.

## Hospital-owned agencies that ARE the city's 911 provider

Ruled: **hospital**, not third-service. Denver Health Paramedic Division is the case
that forced the ruling -- it is hospital-owned and hospital-operated while serving as
the City and County of Denver's 911 provider. "Third-service" means a standalone
GOVERNMENT EMS agency that is neither fire nor hospital; a hospital system running the
911 contract is the textbook hospital-based model, which is a real and distinct way of
delivering EMS and the reason the category exists.

Stated plainly on any public page: the model describes WHO OPERATES the agency, not who
holds the contract. The same rule already keeps "Falck Alameda County" private -- the
contract is named for the county, the operator is Falck.

## A county-NAMED agency is not necessarily county-RUN

Barrow County GA is served by AMR. "Barrow County EMS" on a list would read as a
government agency; the ambulance is a commercial contract. Measured against states that
publish their own ownership field, our "<County> EMS -> third-service" inference is
right only **73%** of the time (192 of 264; the rest: 43 private, 20 hospital, 9 fire).

A NAME CANNOT SEE A CONTRACT. This is the single weakest committed rule left, and it
biases in one direction: it over-counts PUBLIC and under-counts PRIVATE.

Consequences, all enforced:
- Any state publishing an ownership field OVERRIDES the inference. That is why
  harvesting ownership matters more than any additional state.
- A published public-vs-private number must say it is derived from names except where
  a state's own field was available, and must print the official share.
- Never describe a county-named agency as county-operated on an agency page.

## What a state's absence means

A state without a transport field is EXCLUDED, never defaulted. Absence of the field is
not evidence of non-transport. `transport.py` returns `None` for those states and every
report drops them rather than assuming.

## Two kinds of transport-verified state

- **Both sides** (AL FL IA MT NY SC) publish transporters AND non-transporters. Only
  these can measure how much counting non-transporters inflates a fire share.
- **Roster only** (AZ CA MO OR) list transporters by construction — a CON, an EOA or an
  ambulance licence roster. They can state who transports; they cannot measure the
  inflation, because the non-transporters were never in the file.

Never pool the two groups into one inflation figure.

## Standing exclusions, regardless of transport

- **Station floor** (AK GA MS OH TN): only the USGS/TNM station layer, 96.8% fire
  stations with no ownership field. Reads 90-97% fire-based as an ARTIFACT.
- **Fire-station-layer states** (CT DE KS MD NJ WV): the state's own source is a fire
  station list. MD reads 89% fire-based; that is the source's bias.

Neither group may stand beside a real roster state.

## Medicare tier (added 2026-09-12)

**Emergency-majority biller**: an organization whose Medicare ground-ambulance transports in
a year were at least half emergency-coded (A0427 ALS1-emergency, A0429 BLS-emergency, A0433
ALS2) against non-emergency (A0426, A0428, A0434). A proxy for "answers 911 and transports",
calibrated at 89% recall on state-verified 911 transporters. Reported by **organization
count** (one NPI = one organization, whatever its number of contracts) and by **transport
volume** (share of emergency transports billed). Vocabulary is coarser than the roster's:
**public** (any government unit; fire-based and third-service cannot be separated in a legal
billing name), **private** (commercial or non-profit, typed only from an IRS match or a
corporate form), **hospital**, **tribal**, **unknown**. A Medicare figure is never a roster
figure and is never pooled with one.

## Transport tiers in the headline (added 2026-09-12)

The headline pools only tiers **A** (the state's field names 911 scene transport, or the
state names a 911 provider of record) and **B** (the state's transport or licence-category
field). Tiers **C** (a roster of transporters by construction: ambulance licence, CON, EOA)
and **D** (a sample, or one side too thin) are reported apart, because an ambulance licence
does not say whether its holder answers 911.
