# share/

Generated share images. **Do not hand-edit** — regenerate instead.

## The map creative (use this one)

`gen-reach-creative.mjs` reproduces the 1080x1080 map creative that runs as a
Reddit ad, driven by live `data/reach-stats.json`. It emits the SAME page the
original used — CSS, leader-line labels, layout all lifted from
`ProtoQuiz-Ads/creatives/map-campaign/_render` — and renders it in headless
Chrome. The browser doing real layout and font hinting is why this matches and a
hand-computed SVG did not.

A bare run reproduces the creative that actually runs as the Reddit ad: the
`country` headline over the full-density map, no hero number.

```bash
node scripts/gen-reach-creative.mjs                              # = the live ad
node scripts/gen-reach-creative.mjs --stats uploads,states,studying,pages
node scripts/gen-reach-creative.mjs --headline studying
node scripts/gen-reach-creative.mjs --headline none              # map only
node scripts/gen-reach-creative.mjs --headline-text "Line one|Line two|Hook"
node scripts/gen-reach-creative.mjs --hero studying              # big number
node scripts/gen-reach-creative.mjs --preset portrait
node scripts/gen-reach-creative.mjs --html-only                  # no PNG
```

### The hero number

`--hero <field>` promotes one stat to display size in the upper left, with a
caption that says what it MEANS ("MEDICS STUDYING THEIR OWN PROTOCOLS", not
"STUDYING"). The remaining `--stats` fields sit in the footer row.

Hero and headline both own the top-left, so asking for a hero drops the headline
unless you name one explicitly (`--hero uploads --headline agency`). Default is
`--hero none`: the headline treatment, which is what the live ad uses.

This is the main layout decision in the piece: with a hero, the map is texture
behind a claim; without one, the map has to carry the whole frame by itself.

`--min-label N` (default 1) sets how many uploads a city needs before it gets
NAMED. At 1 every city that FITS is named — matching the map on protoquiz.com,
where the packed look is the message. Labels that cannot fit without overlapping
another label or another city's dot are dropped, and their dot stays; expect
~77 of ~104 named at 1080x1080. Raise it (`--min-label 8`) for a sparser look.

### Choosing the headline

`--headline <preset>` picks a saved one. The LAST line always renders amber.

| preset | reads |
|---|---|
| `studying` | {studying} medics are studying / their EMS protocols. / Are you? |
| `country` *(default)* | Medics all over the country / are studying their protocols. / Are you? |
| `states` | Medics in {states} states are / studying their own protocols. / Are you? |
| `uploads` | {uploads} protocol documents. / Turned into real training. / Try yours free. |
| `agency` | Your protocols. Your quizzes. / Not generic EMS trivia. / Built by a medic. |
| `none` | no headline — the map takes the whole canvas |

`--headline-text "a|b|hook"` writes one inline (max 4 lines, pipe-separated).

Any headline can carry `{token}` placeholders — `{studying}` `{uploads}`
`{states}` `{protocols}` `{pages}` `{countries}` — filled from live stats, so a
saved headline never goes stale. An unknown token renders literally (a visible
`{typo}` beats a silent blank).

`country` is the default because it carries no number at all: only the footer
stats can age, and a regen fixes those. A headline that bakes in a count is how
an ad ended up running "337 medics" for 13 days while the real number was 373.

**What the ad copy test said (Reddit, Aug 22 – Sep 4, 2026):** the winner was
not a preset from this table — it was the ad-level headline "How well do you
actually know your EMS protocols?" at 2.76% CTR / $0.53 CPC, against "Quiz
yourself on your own EMS protocols" (1.48% / $1.15) on the same creative. The
question format won. Since 2026-09-04 that is the only copy running.

### Choosing the stat row

`--stats` takes a comma-separated list. Four fields read best at 1080 wide;
five shrinks the type; six will crowd.

| key | prints | source |
|---|---|---|
| `uploads` | UPLOADS | totalUploads |
| `protocols` | PROTOCOLS | distinctProtocols |
| `studying` | STUDYING | activeStudiers |
| `medics` | MEDICS | activeStudiers (same number, different framing) |
| `states` | STATES | statesRepresented |
| `countries` | COUNTRIES | countriesRepresented |
| `pages` | PAGES | pagesProcessed (abbreviated, e.g. 80.9k) |

An unknown key fails loudly and lists what's available.

### Refresh the numbers first

The generator only READS `data/reach-stats.json`; it never updates it. Pull
fresh numbers before generating, or you will publish whatever was last written:

```bash
node scripts/pull-firestore-stats.mjs      # rewrites data/reach-stats.json
node scripts/gen-reach-creative.mjs --headline none --stats uploads,states,studying,protocols,pages
```

Every run prints the `generatedAt` of the stats it used — check that line before
posting.

## Legacy

`gen-reach-image.mjs` renders the same data as pure SVG at three aspect ratios.
It never matched the creative's quality (see above) and is kept only for the
portrait/landscape/OG presets. Prefer `gen-reach-creative.mjs`.
