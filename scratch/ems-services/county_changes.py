"""What changed, county by county, between two dated snapshots.

`report_history.py` rolls the AGGREGATE snapshots into a national series. This is
the per-county counterpart: it answers "which counties moved, and how" -- the
question the registry volume is actually about.

A change is only interesting if the ANSWER moved (who shows up, or who owns them).
A tier change on its own usually means the evidence got better, not that the
service changed hands, so the two are reported separately and never summed.

Run: python3 county_changes.py [from-date] [to-date]
     (defaults: the two most recent snapshots)
"""
import json, os, sys, collections

DIR = 'county_history'
SRC = 'county_911.json'

def load(date):
    p = f'{DIR}/{date}.json'
    if not os.path.exists(p):
        sys.exit(f'no snapshot for {date} ({p})')
    return json.load(open(p))

def main():
    dates = sorted(f[:-5] for f in os.listdir(DIR) if f.endswith('.json')) if os.path.isdir(DIR) else []
    if len(dates) < 2 and len(sys.argv) < 3:
        print(f'{len(dates)} snapshot(s): {", ".join(dates) or "none"}')
        print('Need two to compare. Run snapshot_counties.py again on a later build.')
        return

    d0 = sys.argv[1] if len(sys.argv) > 1 else dates[-2]
    d1 = sys.argv[2] if len(sys.argv) > 2 else dates[-1]
    a, b = load(d0)['counties'], load(d1)['counties']

    # Names come from the live file, not the snapshots: they are stable, so
    # storing them per date would have tripled every snapshot for nothing.
    names = {}
    if os.path.exists(SRC):
        names = {k: f"{v['name']}, {v['st']}" for k, v in json.load(open(SRC)).items()}

    owner, tier, appeared, gone = [], [], [], []
    for fips in sorted(set(a) | set(b)):
        x, y = a.get(fips), b.get(fips)
        if x is None: appeared.append(fips); continue
        if y is None: gone.append(fips); continue
        if x['own'] != y['own'] or x['ans'] != y['ans']:
            owner.append((fips, x, y))
        elif x['tier'] != y['tier']:
            tier.append((fips, x['tier'], y['tier']))

    nm = lambda f: names.get(f, f)
    print(f'{d0} -> {d1}')
    print(f'  {len(owner)} counties where the answer moved')
    print(f'  {len(tier)} where only the evidence tier moved')
    if appeared or gone:
        print(f'  {len(appeared)} added, {len(gone)} removed')

    if owner:
        print('\nANSWER MOVED (who responds, or who owns them)')
        for fips, x, y in owner[:40]:
            print(f'  {nm(fips)}')
            if x['own'] != y['own']:
                print(f'    ownership: {x["own"]} -> {y["own"]}')
            if x['ans'] != y['ans']:
                print(f'    from: {", ".join(x["ans"]) or "(none)"}')
                print(f'      to: {", ".join(y["ans"]) or "(none)"}')
        if len(owner) > 40:
            print(f'  ... and {len(owner) - 40} more')

    if tier:
        print('\nEVIDENCE ONLY (same answer, better or worse sourcing)')
        moves = collections.Counter(f'{t0} -> {t1}' for _, t0, t1 in tier)
        for move, n in moves.most_common():
            print(f'  {move}: {n}')

if __name__ == '__main__':
    main()
