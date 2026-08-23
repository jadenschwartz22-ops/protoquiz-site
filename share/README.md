# share/

Generated share images. **Do not hand-edit** — regenerate instead.

## The map creative (use this one)

`gen-reach-creative.mjs` reproduces the 1080x1080 map creative that runs as a
Reddit ad, driven by live `data/reach-stats.json`. It emits the SAME page the
original used — CSS, leader-line labels, layout all lifted from
`ProtoQuiz-Ads/creatives/map-campaign/_render` — and renders it in headless
Chrome. The browser doing real layout and font hinting is why this matches and a
hand-computed SVG did not.

```bash
node scripts/gen-reach-creative.mjs                              # defaults
node scripts/gen-reach-creative.mjs --stats uploads,states,studying,pages
node scripts/gen-reach-creative.mjs --headline country
node scripts/gen-reach-creative.mjs --headline none              # map only
node scripts/gen-reach-creative.mjs --headline-text "Line one|Line two|Hook"
node scripts/gen-reach-creative.mjs --preset portrait
node scripts/gen-reach-creative.mjs --html-only                  # no PNG
```

### The hero number

`--hero <field>` promotes one stat to display size in the upper left, with a
caption that says what it MEANS ("MEDICS STUDYING THEIR OWN PROTOCOLS", not
"STUDYING"). The remaining `--stats` fields sit in the footer row. `--hero none`
falls back to a flat row of equal-weight numbers.

This is the main layout decision in the piece: with a hero, the map is texture
behind a claim; without one, the map has to carry the whole frame by itself.

`--min-label N` (default 8) sets how many uploads a city needs before it gets
NAMED. Every locale still gets a dot regardless — density comes from dots,
hierarchy comes from labels. Labeling every "1" was what made earlier versions
read as noise.

### Choosing the headline

`--headline <preset>` picks a saved one. The LAST line always renders amber.

| preset | reads |
|---|---|
| `studying` *(default)* | {studying} medics are studying / their EMS protocols. / Are you? |
| `country` | Medics all over the country / are studying their protocols. / Are you? |
| `states` | Medics in {states} states are / studying their own protocols. / Are you? |
| `uploads` | {uploads} protocol documents. / Turned into real training. / Try yours free. |
| `agency` | Your protocols. Your quizzes. / Not generic EMS trivia. / Built by a medic. |
| `none` | no headline — the map takes the whole canvas |

`--headline-text "a|b|hook"` writes one inline (max 4 lines, pipe-separated).

Any headline can carry `{token}` placeholders — `{studying}` `{uploads}`
`{states}` `{protocols}` `{pages}` `{countries}` — filled from live stats, so a
saved headline never goes stale. An unknown token renders literally (a visible
`{typo}` beats a silent blank).

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
