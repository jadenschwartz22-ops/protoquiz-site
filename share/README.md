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
node scripts/gen-reach-creative.mjs                              # default row
node scripts/gen-reach-creative.mjs --stats uploads,states,studying,pages
node scripts/gen-reach-creative.mjs --preset portrait
node scripts/gen-reach-creative.mjs --html-only                  # no PNG
```

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

Refresh `data/reach-stats.json` first if the numbers should be current — the
generator only reads it, it does not update it.

## Legacy

`gen-reach-image.mjs` renders the same data as pure SVG at three aspect ratios.
It never matched the creative's quality (see above) and is kept only for the
portrait/landscape/OG presets. Prefer `gen-reach-creative.mjs`.
