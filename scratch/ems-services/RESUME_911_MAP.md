# 911 EMS Response Map: where we are and how to resume

Written 2026-09-12 after Jaden graded Denver metro, Adams, Aurora and Larimer as correct.
Read this first when county scraping resumes. Companion files: `SOURCES.md` (per-state
source ledger), `VOCABULARY.md` (public vocabulary, tiers), `RECORDS_REQUESTS.md` (21 drafted,
none sent), `HUNT_BRIEF.md` (the original roster hunt brief), `states/CO_metro_911.README.md`
(worked example of a graded metro).

## The question

For every county: when you call 911, which agency carries the patient, and who owns it.
Not "ambulance companies in the county". Interfacility-only carriers, air, event and
critical-care units are noise. Aurora Fire Rescue answers the 911 call and does not
transport; Falck does. That distinction is the product.

## Where we are (2026-09-12, map v3)

3,144 counties. Tier is the strength of the evidence, colour is ownership of the answer.

| Tier | Meaning | Counties | Population |
|---|---|---|---|
| A | a state or agency record names the provider for that county (service area, zone, contract, standards-of-cover) | 403 | 23% |
| B | roster agency located in the county and Medicare 2024 shows it bills mostly emergencies | 596 | 29% |
| C | roster agency located in the county, unconfirmed | 1,164 | 26% |
| D | only a Medicare emergency-majority biller located in the county | 682 | 19% |
| none | nothing usable | 299 | 2% |

Tier A states: AZ (CON), CA (EOA), CT (PSAR), MN (PSA), MS (county list), HI, DC, GA 131 of
159 (zoned roster + council minutes), OR 19 of 36 (ASA layer), CO 11 of 64 (metro rows).

Human-graded correct: Denver, Arapahoe, Jefferson (Arvada), Douglas, Broomfield, Boulder,
Weld, El Paso, Pueblo, Adams, Larimer. Georgia grading by Jaden still pending.

Known wrong by construction (fix before publishing any state as done):
- Tiers B, C, D place an agency at its licence or billing address. South Metro sits under
  Arapahoe not Douglas; UCHealth EMS sits in Weld (Windsor HQ) while it serves Larimer;
  National EMS sits in Oconee while it serves Clarke. Every private or hospital system
  with one HQ and many counties is mislocated this way.
- State rosters include IFT-only, air and CCT licences. The Medicare tick is the only
  filter today; volunteer squads that never bill Medicare are invisible to it.
- A county with two providers of record and one roster hit shows one name.
- Ownership on provider-of-record rows comes from the row's `ownership` string, else the
  name classifier (89.5%). Richmond GA (Gold Cross) is "unknown" because the zoning row
  carried no ownership.

## Per-state standing, sorted by unconfirmed population

`pop unconf` = share of the state's people living in tier C, D or blank counties.

| st | counties | A | B | C | D | none | pop unconf | what unlocks it |
|---|---|---|---|---|---|---|---|---|
| FL | 67 | 0 | 14 | 50 | 2 | 1 | 77% | county COPCN ordinances (each BOCC names its 911 provider); FL records request |
| TX | 254 | 0 | 44 | 167 | 3 | 40 | 55% | DSHS roster has no 911 field; county-by-county: ESD and county EMS pages, city contracts; TX records request |
| IL | 102 | 0 | 0 | 0 | 91 | 11 | 100% | IDPH verification API is WAF-gated (real browser unlocks); EMS System resource-hospital plans list agencies by county |
| OH | 88 | 0 | 0 | 0 | 87 | 1 | 100% | ODPS EMS roster needs the records request; county EMS pages are the fallback |
| NC | 100 | 0 | 17 | 74 | 7 | 2 | 77% | OEMS roster HAS the 911 field; county EMS is the provider in most counties, map from county sites |
| VA | 133 | 0 | 23 | 48 | 39 | 23 | 94% | OEMS agency list + county/city fire-EMS pages; many independent cities |
| TN | 95 | 0 | 0 | 0 | 71 | 24 | 100% | TN publishes only totals; county EMS pages (most counties run county EMS); records request |
| MD | 24 | 0 | 0 | 0 | 24 | 0 | 100% | MIEMSS jurisdictional pages are login-walled; each county has one jurisdictional program, 24 pages by hand |
| IN | 92 | 0 | 4 | 47 | 33 | 8 | 83% | IDHS roster has 911 field; county sites |
| LA | 64 | 0 | 0 | 0 | 22 | 42 | 100% | parish sites; Acadian dominates; LA records request |
| OK | 77 | 0 | 0 | 0 | 62 | 15 | 100% | OSDH roster needs request; county/city sites |
| MO | 115 | 0 | 44 | 59 | 2 | 10 | 62% | ambulance districts are public bodies with statutory boundaries; MO roster has 911 field |
| SC | 46 | 0 | 16 | 27 | 1 | 2 | 68% | county EMS nearly everywhere; DHEC roster has 911 field |
| UT | 29 | 0 | 0 | 29 | 0 | 0 | 100% | BEMS licenses by exclusive geographic area: the licence IS the service area, pull it |
| IA | 99 | 0 | 0 | 70 | 22 | 7 | 100% | IDPH roster; county EMS associations; many volunteer |
| AR | 75 | 0 | 0 | 0 | 35 | 40 | 100% | ADH roster needs request; county sites |
| AL | 67 | 0 | 16 | 50 | 0 | 1 | 58% | county sites; ADPH roster is licence-only |
| KY | 120 | 0 | 21 | 95 | 2 | 2 | 62% | KBEMS roster has 911 field; county sites |
| KS | 105 | 0 | 8 | 95 | 1 | 1 | 95% | KBEMS roster; county EMS nearly everywhere (county-run = easy public) |
| MI | 83 | 0 | 32 | 43 | 2 | 6 | 27% | LARA roster has 911 field; MCA (medical control authority) plans list agencies by county |
| NE | 93 | 0 | 0 | 0 | 80 | 13 | 100% | NE publishes only totals; volunteer rescue squads, county sites |
| ID | 44 | 0 | 0 | 0 | 39 | 5 | 100% | Idaho roster has 911 field but the county pull failed; rerun |
| NM | 33 | 0 | 0 | 31 | 2 | 0 | 100% | NM roster has 911 field; PRC certificates carry territory |
| WY, AK, MT, SD, ND, NV | | | | | | | | thin rosters; county/borough sites; small population, low priority |

Near-done states, spot-check only: PA (2% unconf), CO 5%, VT 5%, MN 8%, NY 11%, NJ 11%,
GA 15% (20 blank pending ORA), NH 15%, ME 17%, WI 25%, MI 27%, ND 28%, WA 28%, MA 34%.

## What worked (use in this order)

1. **The state licence roster's service-level field.** Colorado's CDPHE roster says
   "Licensed Ground Ambulance Service" for transporters and "Other EMS Agency" for
   non-transport departments. That single field separated Aurora Fire (no) from Falck
   (yes), Wellington Fire (no) from UCHealth EMS (yes). Before scraping a state's
   counties, read its roster schema for a transport / non-transport tell and for a
   service-area or 911 field. `transport.py` NINE_ONE_ONE lists the 16 states with a 911
   field; `SOURCES.md` records each roster's fields.
2. **Accreditation and planning documents.** CFAI-accredited departments publish a
   Community Risk Assessment / Standards of Cover that states in one paragraph who
   transports and under what contract (Aurora, p.75). Search a city's fire page for
   "Standards of Cover", "Annual Report", "Strategic Plan"; download with curl and read
   with `pdftotext -layout`.
3. **Board minutes.** Fire district and ambulance district minutes record contracts,
   addenda and in-service dates (South Adams County: first district ambulance 2 April
   2026, Platte Valley Ambulance contract reduced). Scanned minutes need
   `pdftoppm -r 200 -png` then `tesseract`. Both tools are installed.
4. **911 centre agency lists.** The PSAP page names what it dispatches (Fort Collins 911:
   "Poudre Fire Authority, UCHealth EMS and Wellington Fire Protection District").
5. **The fire agency's own EMS page** when the department does not transport: it names
   the partner ("PFA manages a contract for ambulance services with our partners,
   UCHealth").
6. **Internet Archive `id_` captures** for sites that 403 direct requests:
   `curl -L 'https://web.archive.org/web/2025id_/https://www.poudre-fire.org/...'`.
   Archive availability varies by day; it was down on 2026-09-12 morning and up by noon.
7. **Medicare 2024 emergency share** as the confirmation, never as the source
   (`cms/orgs/2024_labeled.json`, share ≥ 0.5). It also exposes mislabels: TVEMS bills as
   "Inc" and the name classifier called it private; the district page says special district.
8. **WebFetch on direct URLs** works when the page is server-rendered. Guess URL patterns
   from the site's nav (`/fire`, `/ems`, `/ambulance-services`, `/575/EMS-Ambulance-Billing`).

## What failed (do not spend time on it again)

- WebSearch: 200 calls per session, then gone. Spend them on state-level discovery, not
  county rows. Bing through WebFetch truncates the query to its first word; DuckDuckGo
  serves a captcha. Brave scraping 429s. Search engines are not a county tool.
- Newspaper sites (Denver Post, Coloradoan, Reporter-Herald) refuse the fetcher;
  Sentinel Colorado and CPR allow WordPress `?s=` search but rate-limit (429).
- JavaScript shells (county GIS portals, ArcGIS story maps, CivicPlus "One.aspx" pages
  sometimes) return nothing useful; ArcGIS jurisdiction maps hold the boundary but not
  the text. The Chrome extension, when connected, unlocks these and the Illinois WAF.
- python urllib fails under TLS interception; use curl via subprocess.
- `/tmp` gets wiped. Raw agent output goes to `states/web_raw/` or the scratchpad, never `/tmp`.
- Dead ends with READMEs: USFA registry (no transport export), OH eLicense (pharmacy
  proxy), MD jurisdictional pages (login), GA DPH (publishes no zoning list; ORA drafted),
  Adams County licensing page (moved to state in 2024).

## Rules of evidence for a tier A county row

A row goes into `states/<ST>_..._911.json` only with all of:
- `provider`: the agency name as the source writes it.
- `area`: which part of the county (a county can have several rows).
- `ownership`: a phrase the classifier can read: fire district, municipal fire, county
  EMS, hospital, private (contractor to X), public special district, mixed: ... .
- `transport`: true only if the source says the agency carries patients. A first-response
  fire department gets `transport: false` and is kept for the record.
- `source_url`: a URL a reader can open, or `states/<file>` for a roster field.
- `evidence`: the quoted sentence, page number for PDFs, date for minutes.
- `vintage`: the date the fact was true, not the date we found it.

Contracts change: Aurora rebid in 2025, Commerce City is mid-transition, Estes Park changed
owner. Prefer sources under a year old and record the year in `vintage`.

Row-level data is never published. Summaries carry the tier and the county count only.
Never blend official, derived and model ownership in one published number.

## Procedure per state (when resuming)

1. Read `SOURCES.md` for the state, `states/<ST>*.README.md`, and the roster schema. Decide
   the unlock from the table above. If it is a records request, send it (Jaden signs from
   jaden@; show every draft) and move to the next state; do not wait.
2. Structural states first: any state whose licence carries a territory (UT, NM PRC, MO
   ambulance districts, FL COPCN, NC/SC/KS/TN county EMS) gives tier A for the whole
   state from one document set. Do these before any city-by-city work.
3. County-by-county only for the metro counties that carry the population. Do not chase
   a 2,000-person county by hand; tier C is honest for it.
4. One agent per state, Sonnet for mechanical roster pulls, Opus when the answer needs
   judgement (split counties, contracts, transitions). Give the agent this file, the row
   schema, the curl user-agent, the archive trick, and the rule that it writes raw
   captures to `states/web_raw/`. Budget: no WebSearch inside agents; direct URLs only.
5. Every pull: `Counter(attributes['STATE'])` or the equivalent sanity count, then
   `python3 county_911_all.py && python3 snapshot_counties.py && python3 build_map.py`,
   then republish the same file path.
   Read the per-state tier line the builder prints and compare with the table above.
   **`snapshot_counties.py` is not optional.** `county_911.json` is overwritten by every
   build and a county row carries no date, so the previous answer is destroyed unless it
   was frozen first. It writes `county_history/YYYY-MM-DD.json` once per day and refuses
   to overwrite a date without `--force`. `python3 county_changes.py` then reports which
   counties moved between any two dates, keeping a real ownership flip separate from a
   tier change that only means the sourcing improved.
6. Before calling a state done: pick three counties (largest, a mid, a rural) and verify
   each from a source the row does not cite. Record the check in the state README.
   Jaden grades the states he knows (GA, CO); ask for others he can vouch for.

## Accuracy programme (assume the data is wrong until checked)

- Georgia grading by Jaden: pending. Twenty blank counties wait on the ORA request.
- `states/VALIDATION_SAMPLE_2026-09-12.csv`: 200 blind rows, transport and ownership
  verdict columns empty. Fill, compute the error rate by tier, print it on the page.
- Address-county fix: for every tier B/C row where the agency's Medicare billing is more
  than 3x the county's plausible volume, or the name is a multi-county system (AMR, Falck,
  Acadian, Global, hospital EMS), mark `basis: located-suspect` and hunt the service area.
- Every published state gets a three-county spot check recorded in its README.
- Refresh: `./refresh.sh "<label>"` monthly (rosters, snapshot, page); `cms_pull.py` when
  CMS releases 2025 (Medicare is annual); republish both artifacts.

## Priorities when scraping resumes

1. Send the 21 records requests. They cost nothing per day while waiting.
2. Structural unlocks: UT (licence territories), FL (COPCN), MO (districts), NM (PRC),
   NC/SC/KS/TN (county EMS pages), MI (MCA plans), IL (EMS System plans).
3. Metro counties of TX, FL, IL, OH, VA by the Colorado method: Standards of Cover,
   minutes, PSAP lists, archive captures.
4. Address-county cleanup for the multi-county systems.
5. Publish state by state, each with its spot check and the tier it earned. Thirty-eight
   honest states beat fifty blended ones.
