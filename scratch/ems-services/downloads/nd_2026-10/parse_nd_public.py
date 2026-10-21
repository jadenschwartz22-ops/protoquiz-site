"""Builds states/ND_public_2026-10.json from downloads/nd_2026-10 (raw geojson + county_overlay.json from overlay_nd.py). Run from scratch/ems-services: python3 downloads/nd_2026-10/parse_nd_public.py"""
import json, re, datetime, collections
D = 'downloads/nd_2026-10/'; MIN_SHARE = 0.01; A_COVER = 0.95
EMS = json.load(open(D + 'ems.geojson'))['features']; QRU = json.load(open(D + 'qru.geojson'))['features']
PTS = json.load(open(D + 'points.geojson'))['features']; OV = json.load(open(D + 'county_overlay.json'))
FIX = [(r'\bEms\b', 'EMS'), (r'\bAfb\b', 'AFB'), (r'^Gf\b', 'GF'), (r'^F-m\b', 'F-M'), (r'^Lamoure\b', 'LaMoure'), (r'^Mc([a-z])', lambda m: 'Mc' + m.group(1).upper())]
def pretty(n):
    n = n.strip().title()
    for a, b in FIX: n = re.sub(a, b, n)
    return n
iso = lambda ms: datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%Y-%m-%d') if ms else None
rows = {}
for f in EMS:
    p = f['properties']; k = p['DsplayName'].strip(); r = rows.setdefault(k, {'name': pretty(k), 'state_name': k, 'polygons': 0, 'sources': set(), 'updated': [], 'ambulance_locations': []})
    r['polygons'] += 1; r['sources'].add(p['SOURCE']); r['updated'].append(p['DateUpdate'])
for f in PTS:
    p = f['properties']
    if 'AMBULANCE' in (p['ES_NGUID'] or '') and (p['NAME'] or '').strip() in rows:
        rows[p['NAME'].strip()]['ambulance_locations'].append({'address': (p['ADDRESS'] or '').strip(), 'community': (p['Post_Comm'] or '').strip()})
for r in rows.values():
    r['sources'] = sorted(r['sources']); r['updated'] = max(iso(u) for u in r['updated'] if u) ; r['has_location_point'] = bool(r['ambulance_locations'])
    r['source_url'] = 'https://services1.arcgis.com/GOcSXpzwBHyk2nog/arcgis/rest/services/NDGISHUB_Emergency_Medical_Services_Boundary/FeatureServer/0'
verdict = {}
for fips, o in sorted(OV.items(), key=lambda kv: kv[1]['name']):
    sh = o['ems']['share']; svc = [(n, s) for n, s in sh.items() if s >= MIN_SHARE]
    verdict[fips] = {'county': o['name'], 'ems_coverage': o['ems']['coverage'], 'ems_overlap_share': o['ems']['overlap_share'],
        'services': sorted(({'name': rows[n]['name'], 'share': s} for n, s in svc), key=lambda x: x['name']),   # alphabetical: area share is not a ranking of who answers
        'slivers_under_1pct': [{'name': rows[n]['name'], 'share': s} for n, s in sh.items() if s < MIN_SHARE],
        'qru_units_not_counted': [{'name': n, 'share': s} for n, s in o['qru']['share'].items() if s >= MIN_SHARE], 'qru_coverage': o['qru']['coverage'],
        'rescue_coverage_not_counted': o['rescue']['coverage'],
        'tier': 'A' if o['ems']['coverage'] >= A_COVER else ('partial' if o['ems']['coverage'] > 0 else 'none')}
meta = {'retrieved': '2026-10-21', 'atlas_url': 'https://des-ndgov.maps.arcgis.com/apps/instant/atlas/index.html?appid=8d96c5ab33674fccaa7a71997a0f9997&webmap=16ad17bd65754482922d22eb40ae7617',
        'webmap_item': '16ad17bd65754482922d22eb40ae7617', 'layer': 'NDGISHUB_Emergency_Medical_Services_Boundary (FeatureServer/0)', 'layer_last_edit': iso(1767040881997),
        'polygons': len(EMS), 'distinct_services': len(rows), 'qru_polygons': len(QRU), 'min_share_listed': MIN_SHARE, 'a_threshold': A_COVER,
        'tier_counts': dict(collections.Counter(v['tier'] for v in verdict.values()))}
json.dump({'meta': meta, 'rows': sorted(rows.values(), key=lambda r: r['name']), 'county_verdict': verdict}, open('states/ND_public_2026-10.json', 'w'), indent=1)
print(meta)
