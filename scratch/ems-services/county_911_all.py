"""County layer for every state: when you call 911 here, who transports?
Per county: providers from the state's rows (basis 'serves' when the source names the
county as service area -- CA EOA zones, AZ CON, MN PSA, MS county list, GA grant/zoning,
OR ASA, CT PSAR towns -- else 'located' = the agency's address county), Medicare
emergency-majority billers located in the county by ZIP, and a confidence tier:
  A  a provider-of-record source names the county
  B  a roster transporter located here that also bills Medicare emergencies from here
  C  a roster transporter located here, unconfirmed
  D  Medicare emergency billers only
  -  nothing
Answer ownership = public / private / hospital / mixed from the best available basis."""
import json, csv, collections, re, glob, os
from dedupe import agencies, key as agency_key
from report import load as source_rows
from transport import transport
from irs_match import norm
from report_who import PUBLIC
# Only rosters that ARE a 911 service-area grant (AZ certificates of necessity, HI, DC). CA, MN, MS, GA rosters locate an agency by address, so they stay inferred (AUDIT_TIER_A_2026-10-22.md).
SERVES = {'AZ', 'HI', 'DC'}
# Families that failed the 10-22 spot audit, and the counties an audit confirmed individually (kept named).
AUDIT_DEMOTE = {'AL','AK','AR','CA','CO','DE','DC','FL','GA','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','WA','WV','WI','WY'}   # every state but the families that passed: VT, AZ, CT, HI
AUDIT_KEEP = {'48181', '48441', '29183', '29073', '29227', '20155', '20071', '40131', '49041', '49013', '49009', '08031', '08093', '28049', '28033', '28081', '28055',
              '21047', '21145', '21189', '21103', '37183', '37119', '12103', '12113', '12037', '24031', '24510', '51153', '51810', '51085', '36001', '26085', '26127'}
FIPS = {}
for r in csv.DictReader(open('states/census_county_pop_2024.csv', encoding='latin-1')):
    if r['SUMLEV'] == '040': FIPS[r['STATE']] = r['STNAME']
ST_ABBR = {'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'}
# Lookup key for a county name as a source writes it: suffix and punctuation dropped (MN 'St Louis' / 'Ottertail' vs Census 'St. Louis' / 'Otter Tail').
def ckey(n): return re.sub(r'[^a-z0-9]', '', re.sub(r' (county|parish|borough|census area|municipality|city and borough|city)$', '', n.strip().lower()))
def counties():
    out = {}
    for r in csv.DictReader(open('states/census_county_pop_2024.csv', encoding='latin-1')):
        if r['SUMLEV'] == '050':
            st = ST_ABBR[r['STNAME']]; out[r['STATE'] + r['COUNTY']] = {'st': st, 'name': r['CTYNAME'], 'key': (st, ckey(r['CTYNAME'])), 'pop': int(r['POPESTIMATE2024'])}
    return out
def zip_county():
    best = {}
    for r in csv.DictReader(open('geo/zcta_county.txt', encoding='utf-8-sig'), delimiter='|'):
        z = r['GEOID_ZCTA5_20']; a = int(r['AREALAND_PART'] or 0)
        if z and (z not in best or a > best[z][1]): best[z] = (r['GEOID_COUNTY_20'], a)
    return best
def ct_town_county():
    m = {}
    for r in csv.DictReader(open('geo/2024_Gaz_cousubs_national.txt', encoding='latin-1'), delimiter='\t'):
        if r['USPS'] == 'CT': m[re.sub(r' town$', '', r['NAME'].strip()).lower()] = r['GEOID'][:5]
    return m
def or_asa():
    m = collections.defaultdict(set)
    for f in json.load(open('states/OR_ASA.json'))['features']:
        a = f['attributes']; 
        if a.get('ASA_AMBULANCE_PROVIDER_NAME') and a.get('COUNTY_NAME'): m[norm(a['ASA_AMBULANCE_PROVIDER_NAME'])].add(a['COUNTY_NAME'].title())
    return m
# Counties whose rows name only some towns (main-town sourcing) are NOT tier A: those providers are kept as 'located' evidence.
# Only these counties have a row that says the whole county (or an explicit countywide service) is covered.
PARTIAL_STATES = {'OH', 'IL', 'NJ', 'WA', 'PA'}
WHOLE_COUNTY = {('OH', 'Delaware'), ('NJ', 'Mercer'), ('NJ', 'Gloucester'), ('WA', 'Spokane'), ('WA', 'Thurston'), ('WA', 'Whatcom'),
                ('PA', 'Philadelphia'), ('PA', 'Montgomery'), ('PA', 'Bucks'), ('PA', 'Delaware'), ('PA', 'Chester'), ('PA', 'York'),
                ('PA', 'Berks'), ('PA', 'Cumberland'), ('PA', 'Centre'), ('PA', 'Northampton'), ('PA', 'Monroe')}
def own_word(t):
    t = (t or '').lower()
    if t.startswith('mixed'): return 'mixed'
    if re.search(r'hospital', t): return 'hospital'
    if re.search(r'private|commercial|contractor', t): return 'private'
    if re.search(r'fire|municipal|district|public|county|city|third|government', t): return 'public'   # before volunteer: 'county fire (combination career/volunteer)'
    if re.search(r'non-?profit|volunteer', t): return 'private'
    return None
def own_of(p):
    m = p['own']
    if m in ('public', 'private', 'hospital', 'mixed'): return m      # Medicare / provider-of-record vocabulary
    return 'public' if m in PUBLIC or m == 'federal' else 'hospital' if m == 'hospital' else 'private' if m == 'private' else 'other'
def build():
    C = counties(); bykey = collections.defaultdict(list); ambiguous = collections.Counter()
    for k, v in C.items(): bykey[v['key']].append(k)
    def fips(st, county):
        ks = bykey.get((st, ckey(county)), [])
        if len(ks) > 1:   # a county and an independent city share the name (VA Fairfax/Richmond/Roanoke/Franklin, MD Baltimore, MO St. Louis): the source must say which, or the row is not placed
            said = re.search(r'\b(county|city)\b', county, re.I)
            ks = [k for k in ks if said and C[k]['name'].lower().endswith(' ' + said[1].lower())]
            if not ks: ambiguous[(st, county.strip())] += 1
        return ks[0] if len(ks) == 1 else None
    rows = [r for r in agencies() if transport(r) == 'transport' and r.get('response') != 'Transfer']   # TX roster flags interfacility-only licences
    # every county a source names for an agency: dedupe keeps one row per agency, so a roster written per service area (MN, WA, CA) would otherwise keep one county of many
    named = collections.defaultdict(set)
    for r in source_rows():
        if transport(r) == 'transport': named[agency_key(r)].update(c.strip() for c in re.split(r'[/,;]', r.get('county') or '') if c.strip())
    try: rec = json.load(open('states/county_recovered.json'))
    except FileNotFoundError: rec = {}
    zc = zip_county(); ctm = ct_town_county(); ora = or_asa()
    # tier-A provider-of-record rows: GA zoning, CO metro, and states/<ST>_911.json (never COUNTY_911_<ST>.json, county_911.py's draft)
    extra = {f: json.load(open(f)) for f in ['states/GA_zoning.json', 'states/CO_metro_911.json'] + sorted(glob.glob('states/[A-Z][A-Z]_911.json'))}
    S = {k: dict(v, providers=[], medicare=[]) for k, v in C.items()}
    def add(st, county, p):
        k = fips(st, county)
        if k: S[k]['providers'].append(p); return True
        return False
    for r in rows:
        st = r['state']; p = {'name': r['provider'], 'own': r['model'], 'sub': r.get('subtype'), 'src': r['model_source'], 'basis': 'serves' if st in SERVES else 'located'}
        if st == 'CT':
            for t in r.get('towns', []):
                g = ctm.get(t.lower())
                if g: S[g]['providers'].append(dict(p, basis='serves'))
            continue
        if st == 'OR':
            for c in ora.get(norm(r['provider']), []): add('OR', c, dict(p, basis='serves'))
            continue
        cty = '/'.join(sorted(named[agency_key(r)])) or r.get('county') or rec.get(f"{st}|{r['provider']}") or ''
        for c in re.split(r'[/,;]', cty):
            if c.strip(): add(st, c, dict(p))
    # official provider-of-record lists from the agents (GA zoning, CO metro), basis 'serves', tier A
    from model_of import model_of
    for f in json.load(open('states/OR_ASA.json'))['features']:
        a = f['attributes']; nm = a.get('ASA_AMBULANCE_PROVIDER_NAME'); c = a.get('COUNTY_NAME')
        if nm and c: add('OR', c.title(), {'name': nm.strip(), 'own': model_of(nm), 'sub': None, 'src': 'derived', 'basis': 'located', 'note': a.get('ASA_NAME')})
    for e in json.load(open('states/MS_county_providers.json')):   # 'Harrison - Cities of Biloxi and Gulfport': a named part of the county, kept partial
        for c in (e['county'] if isinstance(e['county'], list) else re.split(r'[/,;]', e['county'] or '')):
            c, _, area = re.sub(r'\s+MS$', '', c.strip()).partition(' - ')
            add('MS', c, {'name': e['provider'], 'own': model_of(e['provider']), 'sub': None, 'src': 'derived', 'basis': 'serves', 'partial': bool(area), 'note': '; '.join(x for x in (area.strip(), e.get('level')) if x)})
    ncid = {r['agency_number']: r['agency_id'] for r in json.load(open('states/NC_ownership.json'))}   # the OEMS Continuum record behind an NC roster row, so the row opens
    for f, d in extra.items():
        for e in d:
            if not e.get('provider') or e.get('transport', True) is not True: continue   # zoning rows carry no flag: a 911 zone IS the designation
            if re.search(r'SUPERSEDED|not named verbatim', (e.get('zone_note') or '') + (e.get('provider') or ''), re.I): continue
            url = e.get('source_url') or ''
            kind = 'state' if url.startswith('states/') or e.get('source_type') == 'regional council' else 'local'
            if url == 'states/NC_ownership.json': url = 'https://continuum.emspic.org/auth/agency/' + ncid[re.search(r'agency record (\d+)', e['evidence'])[1]]
            note = '; '.join(x for x in (e.get('zone_note') or e.get('area'), e.get('flag')) if x)   # flag: an unresolved conflict or a dated change
            est = e.get('st') or os.path.basename(f)[:2]
            part = est in PARTIAL_STATES and (est, e['county']) not in WHOLE_COUNTY
            add(est, e['county'], {'name': e['provider'], 'own': own_word(e.get('ownership')) or model_of(e['provider']), 'sub': None, 'src': 'provider-of-record', 'basis': 'located' if part else 'serves', 'partial': part, 'kind': kind, 'note': note, 'url': url})
    # TN DoH EMS Directory: each service listed once, under the county where it is LICENSED (a *PRIMARY 911 tag is strong evidence, not a service area). Never tier A: basis 'located', so B/C by the Medicare check.
    for e in json.load(open('states/TN_directory.json')):
        add('TN', e['county'], {'name': e['provider'], 'own': model_of(e['provider']), 'sub': None, 'src': 'directory', 'basis': 'located', 'note': e['evidence'], 'url': e['source_url']})
    # KY KBEMS EMS Directory (2026-08-01): each licence carries a verbatim Service Area Description, parsed per county (states/KY_public_2026-10.README.md).
    # A licence area is not an exclusive or dispatch assignment, so several operators may name one county; all are kept (tier A, several named providers, like GA zones).
    # Counties where the NG911 boundary layer names another operator are held at 'located' (B/C); part-county licences are listed beside the whole-county ones, 'located' + partial.
    KY_VIA = 'Kentucky Board of EMS licensed service areas (EMS Directory, 2026-08-01)'
    KY_OWN = {'Governmental, Non-Fire': 'public', 'Fire Department': 'public', 'Private, Non-Hospital': 'private', 'Community, Non-Profit': 'private', 'Hospital': 'hospital'}
    KY_CONFLICT = {'Lewis': 'NG911 EMS layer: PORTSMOUTH AMBULANCE SERVICE', 'Henderson': 'NG911 EMS layer: AMR-Henderson', 'Martin': 'NG911 EMS layer: PATRIOT EMS', 'Warren': 'NG911 EMS layer: Bowling Green Police Department (the PSAP)'}
    # KY_SPLIT: the licensed local agencies split the county (state layer: Campbell Fire/Rescue is a district, 77%), so every licensed row is listed, partial, never a whole-county claim.
    # A verdict's page_note is free text shown on the county card; the same note field works for any state.
    KY_SPLIT = {'Kenton', 'Campbell'}
    ky = json.load(open('states/KY_public_2026-10.json')); kyrow = {r['name']: r for r in ky['rows']}
    for v in ky['county_verdict'].values():
        c = v['county'].replace(' County', ''); held = c in KY_CONFLICT
        if v.get('page_note'): S[fips('KY', v['county'])]['note'] = v['page_note']
        for n in v['whole_county_services'] + v['part_county_services']:
            r = kyrow[n]; part = n in v['part_county_services'] or c in KY_SPLIT
            add('KY', c, {'name': re.sub(r' \(\d+\)$', '', n), 'own': KY_OWN[r['org_type']], 'sub': None, 'src': 'provider-of-record', 'basis': 'located' if held or part else 'serves', 'partial': part, 'kind': 'state', **({'show': True} if c in KY_SPLIT else {}),
                          'note': r['service_area_text'] + ('; ' + KY_CONFLICT[c] if held else ''), 'url': r['source_url'], 'via': KY_VIA})
    # ND HHS EMS service-area atlas (official, ND GIS Hub ambulance boundary layer, 2026-10-21): polygon-vs-county overlay, tier A where the ambulance polygons cover >=95% of the county (states/ND_public_2026-10.README.md).
    # A licensed service area is not an exclusive or dispatch assignment, so every service naming the county (>=1% of its area) is kept; none is picked. Quick-response units are not providers of record and are not read.
    ND_VIA = 'North Dakota HHS EMS service-area atlas (official), credited to the state EMS unit'
    nd = json.load(open('states/ND_public_2026-10.json'))
    for v in nd['county_verdict'].values():
        for s in v['services']:
            add('ND', v['county'], {'name': s['name'], 'own': model_of(s['name']), 'sub': None, 'src': 'provider-of-record', 'basis': 'serves' if v['tier'] == 'A' else 'located', 'partial': v['tier'] != 'A', 'kind': 'state',
                                    'note': f"{s['share']:.0%} of the county by the atlas ambulance service-area polygon", 'url': nd['meta']['atlas_url'], 'via': ND_VIA})
    # Gap-research verdicts (2026-10-21; WA NV NH RI VA FL MD): per county `drop` (roster names removed), `add` (sourced rows; a same-named roster row is replaced), `show` (names listed in a tier-B answer) and `page_note`;
    # meta.county_page_note puts one short note on every county of a state that publishes no 911 areas (NH, RI). Tiers are never set here: they follow the rows (states/<ST>_public_2026-10.README.md).
    # Verdict keys are county FIPS (the S key), so Baltimore city (24510) never collides with Baltimore County by name. FL: only the A-supportable counties are wired.
    for st in ('WA', 'NV', 'NH', 'RI', 'VA', 'FL', 'MD'):
        g = json.load(open(f'states/{st}_public_2026-10.json')); sn = g['meta'].get('county_page_note')
        for k in [k for k, d in S.items() if d['st'] == st and sn]: S[k]['note'] = sn
        for fk, v in g.get('county_verdict', {}).items():
            if st == 'FL' and v['tier'] != 'A': continue
            k = fk if fk in S else fips(st, v['county']); gone = set(v.get('drop', [])) | {a['name'] for a in v.get('add', [])}
            if v.get('page_note'): S[k]['note'] = v['page_note']
            S[k]['providers'] = [p for p in S[k]['providers'] if p['name'] not in gone]
            for p in S[k]['providers']:
                if p['name'] in v.get('show', []): p['show'] = True
            for a in v.get('add', []):
                S[k]['providers'].append({'name': a['name'], 'own': model_of(a['name']), 'sub': None, 'src': 'provider-of-record', 'basis': a['basis'], 'partial': a.get('partial', False), 'kind': a['kind'], 'note': a['note'], 'url': a['url'], **({'via': a['via']} if a.get('via') else {})})
    # Public-source state files (2026-10-21), one block per state, shapes differ. Every service the file names for a tier-A county is listed, none picked; tiers follow the rows.
    # pub(): a provider-of-record row; `transport` is the file's own value (True / False / None), never guessed from a name. basis 'serves' = the source names the county (or a named part of it).
    def pub(k, name, via, url, note, kind='state', basis='serves', partial=False, transport=None, own=None):
        S[k]['providers'].append({'name': name, 'own': own or model_of(name), 'sub': None, 'src': 'provider-of-record', 'basis': basis, 'partial': partial, 'kind': kind, 'note': note, 'url': url, 'via': via, 'transport': transport})
    def load(st): return json.load(open(f'states/{st}_public_2026-10.json'))
    def ck(st, v): return fips(st, v['county'])
    NOT_SAID = 'the source does not say this service carries patients'
    # UT: UGRC EMS Response Areas (NG911, compiled from Bureau of EMS licence descriptions + dispatch data). 29 of 29 counties >=97% covered. Confirmed non-transport units (QRU, SAR, training centres) are not read; unmatched names stay, transport unknown.
    UT_VIA = 'Utah UGRC EMS response areas, the state NG911 service areas layer (compiled from Bureau of EMS licence descriptions; not a licence record)'
    ut = load('UT'); utrow = {r['name']: r for r in ut['rows']}
    nt = lambda n: re.search(r'non transport|Training Center', utrow[n]['licence_class'] or '')
    for v in ut['county_verdict'].values():
        sv = [s for s in v['services'] if not nt(s['name'])] or v['services']   # a county whose only named service is a fuzzy-matched non-transport class keeps it, flagged (Emery)
        for s in sv:
            r = utrow[s['name']]
            if v['county'] == 'Daggett': continue   # VERIFY 10-21: the county runs the ambulance; the single district label is fire for the west only (county row below)
            pub(ck('UT', v), s['name'], UT_VIA, r['source_url'], 'named in the state EMS response-area layer for this county' + ('' if r['transport'] else f"; licence class {r['licence_class']}, transport not confirmed" if r['licence_class'] else '; licence class not matched, transport not confirmed'), transport=r['transport'])
    pub(ck('UT', {'county': 'Daggett'}), 'Daggett County Emergency Medical Services', 'Daggett County, Utah Emergency Medical Services page (county government)', 'https://www.daggettcounty.gov/98/Ambulance-Services', 'county department: emergency medical treatment and transport, paid volunteer EMTs; the state layer labels the county Flaming Gorge Fire and EMS District, which the county describes as fire protection for the west', kind='local', transport=True)
    for c, n in {'Salt Lake': 'Salt Lake City transport is run by Gold Cross in partnership with SLC Fire; the state layer lists responders, not Gold Cross.',
                 'Daggett': 'Ambulance operated by the Daggett County EMS department; Flaming Gorge Fire and EMS District covers the west only.',
                 'Uintah': 'Ute Tribe Ambulance unverified; Gold Cross has a Vernal base.'}.items(): S[ck('UT', {'county': c})]['note'] = n
    # VT: VCGI ambulance service areas, one provider of record per town (a compilation); 14 of 14 counties >=99.8% covered. Several services per county, alphabetical.
    VT_VIA = 'Vermont VCGI ambulance service areas, the state service-area layer (one provider of record per town)'
    vt = load('VT'); vtrow = {r['name']: r for r in vt['rows']}
    for fk, v in vt['county_verdict'].items():
        for s in v['services']:
            r = vtrow[s['name']]
            pub(fk, s['name'], VT_VIA, r['source_url'], 'assigned town by town in the state service-area layer' + ('' if r['transport'] else '; ' + NOT_SAID), transport=r['transport'])
    # TX: DETCOG, Panhandle and Bastrop 911 GIS service-area layers; only the A-supportable counties. Partial and held counties keep their tier and show the file's page_note.
    TX_VIA = 'Texas regional and county 911 GIS service-area layers (DETCOG, Panhandle, Bastrop), not the DSHS licence record'
    tx = load('TX')
    for fk, v in tx['county_verdict'].items():
        if v.get('page_note'): S[fk]['note'] = v['page_note']
        if v['tier'] != 'A': continue
        for s in v['services']: pub(fk, s['name'], TX_VIA, v['source_url'], 'named in the regional 911 GIS service-area layer; ' + NOT_SAID, kind='local')
    # OK: Regional Medical Response System EMS service-area maps (a regional EMS roster, not the OSDH licence record). A whole-county layer serves the county; a city layer serves its city limits only (partial).
    OK_VIA = 'Oklahoma Regional Medical Response System EMS service-area maps (a regional EMS roster, not the OSDH licence record)'
    ok = load('OK')
    for fk, v in ok['county_verdict'].items():
        if v.get('page_note'): S[fk]['note'] = v['page_note']
        if v['tier'] != 'A': continue
        for s in v['services']:   # `area` = a Regions 6/8 RSA map layer; `share` = a Region 2 agency polygon (second source)
            pub(fk, s['name'].replace(' (County Based)', ''), OK_VIA, v['source_url'] if 'area' in s else ok['meta']['sources'][1]['url'],
                (s['area'] + ' on the RSA map' if 'area' in s else f"{s['share']:.0%} of the county by the Region 2 agency polygons") + '; ' + NOT_SAID, kind='local', partial='area' in s and s['area'] != 'whole county')
    # MO: ambulance-district polygons (an osageadmin compilation, 2023) cross-checked with the DHSS ground-station layer. A 63 only; A-unverified (4), partial and none keep their tier and show the file's page_note.
    MO_VIA = 'Missouri ambulance-district boundaries, a compilation of district service areas (cross-checked with the MO DHSS ambulance station layer; not a state or licence record)'
    mo = load('MO'); morow = {r['name']: r for r in mo['rows']}
    for fk, v in mo['county_verdict'].items():
        if v.get('page_note'): S[fk]['note'] = v['page_note']
        if v['tier'] != 'A': continue
        for s in v['services']:
            r = morow[s['name']]; dh = r['dhss_name_match']
            pub(fk, dh[0] if len(dh) == 1 else s['name'], MO_VIA, r['source_url'], f"ambulance district layer name '{s['name']}'" + (f"; DHSS station layer: {', '.join(dh)}" if dh else '; no DHSS ground station of that name inside it'), kind='local', transport=r['transport'], own=own_word(r['ownership']) or 'public')
    # KS: NG911 EMS emergency service boundaries (Kansas 911 Coordinating Council, stewarded by the county PSAPs). A 55 only (named polygon matches a KBEMS ground licence); A-unverified (35) and partial keep their tier. The label is the PSAP's free text, not a licence-exact name.
    KS_VIA = 'Kansas NG911 EMS service area boundaries (Kansas 911 Coordinating Council, stewarded by the county PSAPs; not a licence record)'
    ks = load('KS'); ksrow = {r['name']: r for r in ks['rows']}
    for fk, v in ks['county_verdict'].items():
        if v.get('page_note'): S[fk]['note'] = v['page_note']
        if v['tier'] != 'A': continue
        for s in v['services']:
            rg = s.get('roster_ground_match') or []
            pub(fk, s['name'], KS_VIA, ksrow[s['name']]['source_url'], "the PSAP's label in the state NG911 layer" + (f"; KBEMS ground licence: {', '.join(rg)}" if rg else '; no KBEMS ground licence name matched'), transport=s.get('transport'))
    # WI: statewide NG911 EMS boundary layer (Office of Emergency Communications, county-submitted). A 62 only; the 7 partial and 3 none keep their tier. Fire and first-responder labels stay, transport False; "Verify EMS" placeholders are not providers.
    WI_VIA = 'Wisconsin NG911 EMS service area boundaries (Office of Emergency Communications, county-submitted; not a licence record)'
    wi = load('WI'); wirow = {r['name']: r for r in wi['rows']}
    for fk, v in wi['county_verdict'].items():
        if v.get('page_note'): S[fk]['note'] = v['page_note']
        if v['tier'] != 'A': continue
        for s in v['services']:
            if re.search(r'verify', s['name'], re.I): continue
            pub(fk, s['name'], WI_VIA, wirow[s['name']]['source_url'], "the county's label in the state NG911 layer" + ('' if s['transport'] else '; ' + NOT_SAID), transport=s['transport'])
    # OH: five county NG911/GIS layers found, no statewide layer. Wood, Huron, Paulding are A; the layer labels (Huron, Paulding) are the county's own short names, kept as written.
    OH_VIA = "Ohio county NG911/GIS EMS service area boundaries (the county's own layer; not a licence record)"
    oh = load('OH'); ohlay = {l['county_fips']: l for l in oh['meta']['layers'].values()}
    for fk in ('39173', '39077', '39125'):
        v = oh['county_verdict'][fk]
        if v.get('page_note'): S[fk]['note'] = v['page_note']
        for s in v['services']: pub(fk, s['name'], OH_VIA, ohlay[fk]['url'], "the county layer's label; " + NOT_SAID, kind='local', transport=False)
    # IA Linn, CO Park, MT Carbon, OR Marion: single-county layers (2026-10-21), spot-checked in VERIFY_2026-10-21.md. Tier A; no transport is asserted beyond what the file says.
    ia = load('IA'); IA_VIA = 'Linn County, Iowa E911 EMS emergency service area layer (maintained by Cedar Rapids / Linn County 911; a county NG911 layer, not a state record)'
    for s in ia['county_verdict']['19113']['services']: pub('19113', s['name'], IA_VIA, ia['rows'][0]['source_url'], "named in the county's E911 EMS service area layer", kind='local', transport=True)
    S['19113']['note'] = 'The Linn County Communications Division lists six ambulance services serving the county, the same six this layer names.'
    co = load('CO'); CO_VIA = 'Park County, Colorado GIS ambulance district service area layer (county-published, not a licence record)'
    for s in co['county_verdict']['08093']['services']:
        pub('08093', s['name'].replace('Ute Pass Regional Ambulance District', 'Ute Pass Regional Health Service District'), CO_VIA, co['rows'][0]['source_url'], 'named in the county ambulance district layer; the layer does not say this district carries patients', kind='local')
    S['08093']['note'] = co['county_verdict']['08093']['page_note']
    mt = load('MT'); MT_VIA = 'Carbon County, Montana EMS district service area layer (county-published, owner CarbonFire)'
    for s in mt['county_verdict']['30009']['services']:
        pub('30009', s['name'], MT_VIA, mt['rows'][0]['source_url'], ('Red Lodge Fire Rescue EMS: 911 medical response and interfacility transfers (redlodgefire.com/ems)' if s['name'] == 'Red Lodge' else 'named in the county EMS district layer; the layer does not say this district carries patients'), kind='local')
    S['30009']['note'] = mt['county_verdict']['30009']['page_note']
    orr = load('OR'); OR_VIA = 'Marion County, Oregon HHS ambulance service area layer (county-published; the holder of each ASA, not a licence record)'; orrow = {r['name']: r for r in orr['rows']}
    for s in orr['county_verdict']['41047']['services']:
        pub('41047', s['name'], OR_VIA, orrow[s['name']]['source_url'], 'holds an ambulance service area (ASA) in the county HHS layer; the layer does not say it transports', kind='local')
    S['41047']['note'] = 'The county layer names who holds each ambulance service area. Woodburn Ambulance and Marion County Fire District #1 are confirmed on their own sites; Lyons RFPD (the largest area share) and the other holders are unverified, and some fire districts may contract operation out.'
    # NE: page note only, no promotion (spot check weak: town and acronym labels, Buffalo had no source)
    for fk in load('NE')['county_verdict']: S[fk]['note'] = 'Named loosely from the state response-area layer (town and acronym labels); transport not confirmed.'
    # Read-only page notes, NO tier change and no providers: a stale, unnamed or non-911 source is a note on the card, never evidence.
    idn = load('ID')
    for fk, v in idn['county_verdict'].items():
        S[fk]['note'] = "From the state's 2021 layer, not yet reconfirmed (Idaho DHW EMS Bureau 911 response-agency layer, data as of Sept 2021): " + ', '.join(s['name'] for s in v['services']) + '. Tier left alone.'
    arn = load('AR')
    for fk, v in arn['county_verdict'].items():
        S[fk]['note'] = "From the state's 2021 NG911 ambulance service-area layer (data as of Sept 2021, stale, not yet reconfirmed): " + ', '.join(s['name'] for s in v['services']) + '. Tier left alone.'
    inn = load('IN')
    for fk, v in inn['county_verdict'].items():
        S[fk]['note'] = v['page_note'] + ' Most runs: ' + ', '.join(a['name'] for a in v['top_agencies']) + '.'
    for fk, v in load('LA')['county_verdict'].items():
        S[fk]['note'] = ('' if 'Acadian' in v['add'][0]['note'] else ', '.join(a['name'] for a in v['add']) + ': ') + v['add'][0]['note'] + ' Tier left alone.'
    # County-by-county local sources (2026-10-22 lanes, LANE_BRIEF_2026-10-22.md), one shape for every state. Last, so its page_note wins over the stale-layer notes above.
    # Tier A rows serve the county (partial rows a named part of it); held counties only carry their page_note.
    for f in sorted(glob.glob('states/*_local_2026-10.json')):
        g = json.load(open(f))
        for fk, v in g['county_verdict'].items():
            if v.get('page_note'): S[fk]['note'] = v['page_note']
            if v['tier'] != 'A': continue
            for s in v['services']:
                pub(fk, s['name'], g['meta']['via'], s['source_url'], (s.get('area') or 'whole county') + ': ' + s['evidence'], kind='local', partial=s.get('partial', False), transport=s.get('transport'), own=own_word(s.get('ownership')) or None)
                S[fk]['providers'][-1]['audited'] = True   # a lane row an audit lane passed (LANE_BRIEF_AUDIT.md); never demoted below
    ga = load('GA')['county_verdict']
    for fk in ('13243', '13205', '13027'):
        a = ga[fk]['add'][0]
        S[fk]['note'] = f"Candidate, not confirmed: {a['name']} ({a['via']}: {a['note']}). Tier left alone."
    for o in json.load(open('cms/orgs/2024_labeled.json')):
        z = zc.get(o['zip'])
        if z and z[0] in S: S[z[0]]['medicare'].append({'name': o['name'], 'own': o['own'], 'sub': o['subtype'], 'E': int(o['E']), 'share': round(o['share'], 2), 'emerg': o['share'] >= .5})
    # Audit 10-22 (states/AUDIT_*_2026-10-22*.md): a source family stays named only if every county checked was correct. A failed family falls
    # back to inferred except counties an audit confirmed one by one; county-by-county lane rows were audited separately and keep their basis.
    for k, d in S.items():
        if d['st'] == 'AZ': d['providers'] = [p for p in d['providers'] if not re.search(r'Alliance Ambulance|Critical Air|Ponderosa', p['name'])]   # interfacility-only certificates
        if d['st'] in AUDIT_DEMOTE and k not in AUDIT_KEEP:
            for p in d['providers']:
                if p['basis'] == 'serves' and not p.get('audited'): p['basis'] = 'located'
    if ambiguous: print('not placed, county or city not said:', dict(ambiguous))
    for k, d in S.items():
        d['medicare'].sort(key=lambda m: -m['E']); mnames = {norm(m['name']) for m in d['medicare'] if m['emerg']}
        seen = {}; ps = []
        for p in d['providers']:
            key = (norm(p['name']), p['basis'])
            if key in seen:
                src = lambda x: x.get('via') or x.get('url')
                if src(p) and not src(ps[seen[key]]): ps[seen[key]] = dict(p, confirmed=norm(p['name']) in mnames)   # the sourced row replaces a bare roster row
                continue
            seen[key] = len(ps); p['confirmed'] = norm(p['name']) in mnames; ps.append(p)
        d['providers'] = ps
        serves = [p for p in ps if p['basis'] == 'serves']; conf = [p for p in ps if p['confirmed']]
        if serves: tier, ans = 'A', serves
        elif conf: tier, ans = 'B', [p for p in ps if p.get('show')] or conf   # a split county lists every licensed local agency, not only the Medicare-matched names
        elif ps: tier, ans = 'C', ps
        elif any(m['emerg'] for m in d['medicare']): tier, ans = 'D', [dict(m, src='medicare') for m in d['medicare'] if m['emerg']]
        else: tier, ans = '-', []
        owns = set(); [owns.update(['public','private'] if own_of(p)=='mixed' else [own_of(p)]) for p in ans if p.get('own') and own_of(p) != 'other']
        via = next((p['via'] for p in ans if p.get('via')), None) or ('Tennessee Department of Health EMS Directory (licensed county)' if any(p.get('src') == 'directory' for p in ans) else None)
        if via: d['via'] = via
        d['partial'] = tier != 'A' and any(p.get('partial') for p in ps)
        d['tier'] = tier; d['answer'] = [p['name'] for p in ans]
        if tier == 'A': d['source'] = 'state' if any(p.get('kind', 'state') == 'state' for p in ans) else 'local'   # rows without kind came from a state layer
        d['ownership'] = ('mixed' if len(owns) > 1 else next(iter(owns)) if owns else 'unknown')
    return S
if __name__ == '__main__':
    S = build(); json.dump(S, open('county_911.json', 'w'))
    # slim file the site reads (scripts/build-research-*.mjs)
    json.dump({k: {**{f: d[f] for f in ('name', 'st', 'pop', 'tier', 'ownership')}, **({'source': d['source']} if d['tier'] == 'A' else {}), **({'partial': True} if d['partial'] else {}), **({'via': d['via']} if d.get('via') else {}), **({'note': d['note']} if d.get('note') else {})} for k, d in S.items()},
              open('../../data/county-911.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    # per-state files for /research/atlas/?state=XX: the slim fields plus the agencies on record
    def pretty(n):
        n = re.sub(r'\s+(DBA|D/B/A)\.?$', '', n.strip(), flags=re.I)
        if n.isupper(): n = re.sub(r'\b(Llc|Lp|Llp|Pllc|Ems|Esd|Emd|Ii|Iii)\b', lambda m: m.group(1).upper(), n.title())
        return re.sub(r'(?<=\w) (Of|And|The|For|At|In)\b', lambda m: m.group(0).lower(), n)
    # display only: test records, tax/finance offices and airport authorities are billing or roster noise, never an answer
    junk = re.compile(r'\btest\b|\bdemo\b|office of (the )?(tax|budget|revenue|finance|treasurer)|budget director|finance office|tax and revenue|treasurer|\bauditors?\b|\bfinance\b|comptroller|airports? authority|^\W*\d+\s', re.I)
    shown = lambda d: [pretty(a) for a in d['answer'] if not junk.search(a)]
    os.makedirs('../../data/atlas', exist_ok=True); byst = collections.defaultdict(dict)
    for k, d in S.items():
        byst[d['st']][k] = {**{f: d[f] for f in ('name', 'pop', 'tier', 'ownership')}, **({'source': d['source']} if d['tier'] == 'A' else {}),
                            **({'partial': True} if d['partial'] else {}), **({'via': d['via']} if d.get('via') else {}), **({'note': d['note']} if d.get('note') else {}), 'n': len(shown(d)), 'a': shown(d)[:12]}
    for st, v in byst.items(): json.dump(v, open(f'../../data/atlas/{st}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    tiers = collections.Counter(d['tier'] for d in S.values()); pop = collections.Counter()
    for d in S.values(): pop[d['tier']] += d['pop']
    tot = sum(d['pop'] for d in S.values())
    print('counties by tier:', dict(tiers), ' population share:', {k: f'{v/tot:.0%}' for k, v in pop.items()})
    print('ownership of answer:', collections.Counter(d['ownership'] for d in S.values() if d['tier'] != '-'))
    per = collections.defaultdict(collections.Counter)
    for d in S.values(): per[d['st']][d['tier']] += 1
    print(' '.join(f"{st}:{''.join(f'{t}{c}' for t, c in sorted(cn.items()))}" for st, cn in sorted(per.items())))
