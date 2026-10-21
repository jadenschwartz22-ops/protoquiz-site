"""ND ambulance (EMS) / QRU / rescue boundary layers x ND county polygons -> per-county coverage and per-service share.
Raster overlay (PIL fill on an equal-area-corrected grid, ~0.0025 deg pixels, ~250 m). Usage: overlay.py <downloads dir> <out json>"""
import json, sys, math, numpy as np, collections
from PIL import Image, ImageDraw
D = sys.argv[1] + '/'; PX = 0.0025; K = math.cos(math.radians(47.5))
def polys(g): return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
cty = json.load(open(D + 'county_bnd.json'))['features']
L = {k: json.load(open(D + k + '.geojson'))['features'] for k in ('ems', 'qru', 'rescue')}
x0, y0, x1, y1 = -105.0, 45.8, -96.0, 49.2
W, H = int((x1 - x0) * K / PX) + 1, int((y1 - y0) / PX) + 1
def mask(g):
    im = Image.new('1', (W, H), 0); dr = ImageDraw.Draw(im)
    for p in polys(g):
        for i, r in enumerate(p):
            dr.polygon([((x - x0) * K / PX, (y1 - y) / PX) for x, y in r], fill=1 if i == 0 else 0)
    return np.array(im, bool)
M = {k: [(f['properties']['DsplayName'].strip(), mask(f['geometry'])) for f in v] for k, v in L.items()}
out = {}
for cf in cty:
    p = cf['properties']; cm = mask(cf['geometry']); n = int(cm.sum()); res = {'fips': p['FIPS'], 'name': p['NAME'], 'pixels': n}
    for lk, ms in M.items():
        cov = np.zeros_like(cm); per = {}; cnt = np.zeros(cm.shape, np.uint8)
        for nm, m in ms:
            h = m & cm
            if h.any(): per[nm] = per.get(nm, np.zeros_like(cm)) | h
        for nm, h in per.items(): cov |= h; cnt += h
        res[lk] = {'coverage': round(float(cov.sum() / n), 4), 'share': {nm: round(float(h.sum() / n), 4) for nm, h in sorted(per.items(), key=lambda kv: -kv[1].sum())}}
        if lk == 'ems': res[lk]['overlap_share'] = round(float((cnt > 1).sum() / n), 4)
    out[p['FIPS']] = res; print(p['NAME'], res['ems']['coverage'], list(res['ems']['share'].items())[:3], flush=True)
json.dump(out, open(sys.argv[2], 'w'), indent=1)
