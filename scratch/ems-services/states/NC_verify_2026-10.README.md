# NC verify, 2026-10-22 (10 counties; skipped the 25 in NC_local_2026-10.json, plus Wake/Mecklenburg AUDIT_KEEP)

Order: counties where the NC OEMS Continuum roster (states/NC_ownership.json, field `county` = EMS System name, so "Wilkes County EMS System", "Washington-Tyrrell EMS", "Hoke County", "Camden County" must be matched loosely) shows exactly one transport licence, biggest first.
Step 4 = that roster: A only where the cited service is the sole "with Transport Capability" agency in the county's EMS System. Raw captures: states/web_raw/NC/v_*.{html,txt}.

A (7, pop 243,974): Burke, Stanly, Scotland, Northampton, Chowan, Camden, Pamlico.
Held (3): Wayne (page never says transport; Seymour Johnson AFB unaddressed), Hoke (Fort Bragg part; Womack licence sits under Cumberland), Yancey (county page names its own EMS; roster's sole transporter is "Heritage EMS").
No current map answer found wrong. Yancey is the one to resolve (Heritage EMS vs Yancey County EMS).

Not reached, single-licence (next): Granville, Person, Dare, Hyde (Cloudflare/Akamai 403, archive.org CDX "Temporarily Offline" today), McDowell, Bertie, Mitchell, Tyrrell (sites down or no EMS page found), Currituck (/fire-ems/ is 404; find real path), Caswell (Wix), Madison (no EMS page; JEMS lead only), Washington; prior lane found Lenoir, Edgecombe, Greene, Cherokee, Montgomery, Perquimans, Gates, Swain inconclusive. Multi-licence counties (Cabarrus, Onslow, Alamance, ...) untouched.

Tooling: DuckDuckGo html answered one query then blank; Bing via curl returns junk; Google News RSS works but links are news.google redirects. CivicPlus sites: /sitemap.xml lists every page (menus are JS) - the fastest way to find the EMS page.
