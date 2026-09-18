"""Freeze today's PER-COUNTY answer so the registry can show change over time.

Why this exists: `county_911.json` is one file that every build overwrites, and a
county row carries no date. The aggregate `snapshot.py` stores national and
per-state rollups only, so "this county flipped from public to private in March"
was unanswerable today AND unrecoverable later -- the prior state was destroyed on
each rebuild. This is the census's `dose_history` lesson applied to the map: the
one thing a later phase cannot reconstruct is the history nobody kept.

Shape: `county_history/YYYY-MM-DD.json`, one file per build date, keyed by 5-digit
FIPS. Only the fields that actually move are kept (tier, ownership, the answering
agencies, and the provider count) -- name, state and population are stable and
live in `county_911.json`, so repeating them here would triple the file for
nothing.

Append-only by construction: a date file is written once and never rewritten.
Re-running the same day is a no-op unless --force, so a second build cannot
silently rewrite the morning's answer.

Run: python3 snapshot_counties.py [--force] [label]
"""
import json, os, sys, datetime, collections

SRC = 'county_911.json'
DIR = 'county_history'

# Only what can change between builds. `answer` is sorted so a pure reordering
# upstream does not read as a real change in a later diff.
def row(d):
    return {
        'tier': d['tier'],
        'own': d['ownership'],
        'ans': sorted(d['answer']),
        'n': len(d.get('providers', [])),
    }

def main():
    args = [a for a in sys.argv[1:] if a != '--force']
    force = '--force' in sys.argv
    label = args[0] if args else ''

    if not os.path.exists(SRC):
        sys.exit(f'{SRC} not found -- run county_911_all.py first')

    S = json.load(open(SRC))
    os.makedirs(DIR, exist_ok=True)
    date = datetime.date.today().isoformat()
    out = f'{DIR}/{date}.json'

    if os.path.exists(out) and not force:
        print(f'{out} already exists -- today is already recorded, nothing written.')
        print('Pass --force only if you mean to replace it.')
        return

    counties = {fips: row(d) for fips, d in S.items()}
    tiers = collections.Counter(r['tier'] for r in counties.values())
    owns = collections.Counter(r['own'] for r in counties.values())

    json.dump({
        'date': date,
        'label': label,
        'source': SRC,
        'counties': counties,
        # Stamped so a reader can sanity-check a file without recounting 3,144 rows.
        'totals': {'counties': len(counties), 'tiers': dict(tiers), 'ownership': dict(owns)},
    }, open(out, 'w'), separators=(',', ':'))

    kb = os.path.getsize(out) // 1024
    print(f'wrote {out} -- {len(counties)} counties, {kb} KB')
    print('  tiers:', dict(tiers))
    print('  ownership:', dict(owns))

if __name__ == '__main__':
    main()
