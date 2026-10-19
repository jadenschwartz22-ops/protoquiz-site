// Back/forward keeps your place on the research and census pages: the scroll position,
// plus any "Show all" list you had opened. Without this Safari lands at the top (or at the
// #states anchor) after a round trip to a state page. Saved per page in sessionStorage.
(function () {
  var key = 'rn:' + location.pathname + location.search, store;
  try { store = window.sessionStorage; history.scrollRestoration = 'manual'; } catch (e) { return; }
  var save = function () {
    try {
      var open = []; document.querySelectorAll('.clip').forEach(function (el, i) { if (el.classList.contains('all')) open.push(i); });
      store.setItem(key, JSON.stringify({ y: Math.round(window.scrollY), open: open }));
    } catch (e) { /* storage blocked: the page still works */ }
  };
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!nav || (nav.type !== 'back_forward' && nav.type !== 'reload')) return;
  var s; try { s = JSON.parse(store.getItem(key)); } catch (e) { return; }
  if (!s) return;
  var lists = document.querySelectorAll('.clip');
  (s.open || []).forEach(function (i) { var el = lists[i], b = el && el.nextElementSibling; if (el) el.classList.add('all'); if (b && b.classList.contains('more')) b.remove(); });
  var go = function () { window.scrollTo(0, s.y); };
  // Layout settles late (fonts, the 1 MB map): jump now, then again once everything has painted.
  go(); requestAnimationFrame(go); addEventListener('load', go);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
})();
