# VA local 2026-10 verify lane
Rows: 17 (11 A, 6 held). Keys are FIPS; county and same-named city answered separately (Fairfax 51059/51600, Roanoke 51161/51770). Richmond County 51159 not reached.
A: Fairfax Co, Fairfax city, Arlington, Norfolk, Alexandria, Newport News, Chesapeake, Hampton, Suffolk, Stafford, Chesterfield (four named squads). Held: Loudoun, Henrico, Richmond city, Spotsylvania, Roanoke city, Roanoke Co.
Skipped per brief: Prince William, Virginia Beach, Hanover. Albemarle stays with VA_public_2026-10.json.
Method: re-opened each VA_911.json source (web_raw/VA/row*.txt), evidence strings auto-checked (failures re-sourced: Hampton and Fairfax city via archive, Roanoke city via fee compendium archive, Suffolk current page, Arlington via WebFetch). Completeness rule: every OEMS roster ground-ambulance licence with a locality address was read; clearly commercial/hospital/industrial licences are treated as non-911; volunteer squads or unexplained nonprofits with no page = held.
Stopped after the largest ~25 jurisdictions; everything below Roanoke County in population, plus Richmond County, Falls Church, Manassas, Manassas Park, Portsmouth, Frederick, Montgomery, Albemarle neighbours: not reached.
Spot check: Fairfax Co (largest) agrees with the OEMS roster; Suffolk (mid) roster lists SUFFOLK FIRE & RESCUE only; Stafford (rural-ish) roster lists the county department only.
Wrong in current map: Fairfax Co (was tier D after the name collision, right answer FCFRD), Fairfax city (right answer City of Fairfax FD), Roanoke city is Roanoke Fire-EMS only, Roanoke County is RCFRD (combination).

## Promoted 2026-10-22 from VA_verify_2026-10.json (audit pass, AUDIT_VERIFY_VA_2026-10-22.md second pass)
Added as A: James City Co, York Co, Charlottesville city, King George Co, Goochland Co, Winchester city, Colonial Heights city, Williamsburg city, Manassas Park city, Poquoson city (27 FIPS total).
