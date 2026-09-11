// assets/app-toggle.js — the shift switcher and the screen carousel.
//
// The app ships two identities (BrandKit: Night Shift amber console, Day Shift cool
// slate). This page does not describe that, it BECOMES it: the toggle sets
// [data-shift] on <html> and every token in app.css is redefined, so the hero, the
// chrome, the conveyor and the screenshots all move together.
//
// One screenshot could never show the app, so the phone cycles eight screens. Day and
// night are the SAME eight in the same order, which is what makes the shift toggle
// honest: you are comparing one screen against itself, not two unrelated ones.
//
// Night is the default: it is the app's own default and the look the live site
// carries. The choice is
// remembered, wrapped in try/catch because private windows throw on localStorage.
(() => {
  const KEY = 'pq-shift';
  const HOLD = 4200;

  const SCREENS = [
    ['study-hub',         'Study hub'],
    ['protocols',         'Protocols'],
    ['scenario',          'Scenario briefing'],
    ['spaced-repetition', 'Spaced repetition'],
    ['quiz-results',      'Quiz results'],
    ['algorithm-quiz',    'Algorithm quiz'],
    ['nremt',             'NREMT prep'],
    ['compete',           'Compete'],
  ];

  const root = document.documentElement;
  const shot = document.querySelector('[data-shot]');
  const caption = document.querySelector('[data-shot-caption]');
  const dotWrap = document.querySelector('.shot-dots');
  const buttons = [...document.querySelectorAll('[data-set]')];
  if (!shot) return;

  const state = { platform: 'ios', shift: 'night', i: 0 };
  const label = { ios: 'iPhone', android: 'Android', night: 'Night Shift', day: 'Day Shift' };

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'night' || saved === 'day') state.shift = saved;
  } catch (e) { /* private window: keep the default */ }

  // A shot that 404s is never shown: the frame keeps the last good image rather than
  // flashing a broken icon. That is what lets night shots land file-by-file.
  const missing = new Set();
  // iOS shots are `{shift}-{key}.png`; Android shots carry a `-android-` infix and
  // fall back to the iOS capture of the same screen, so the platform toggle never
  // stalls on a screen Android has not been captured for yet.
  const candidates = (shift, key) => state.platform === 'android'
    ? [`/app-shots/${shift}-android-${key}.png`, `/app-shots/${shift}-${key}.png`]
    : [`/app-shots/${shift}-${key}.png`];

  const loadable = url => new Promise(resolve => {
    if (missing.has(url)) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => { missing.add(url); resolve(false); };
    img.src = url;
  });
  // Resolves to the first URL that loads, or null.
  const preload = async (shift, key) => {
    for (const url of candidates(shift, key)) if (await loadable(url)) return url;
    return null;
  };

  const dots = SCREENS.map(([key, name], i) => {
    if (!dotWrap) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shot-dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', name);
    b.addEventListener('click', () => { show(i); rearm(); });
    dotWrap.appendChild(b);
    return b;
  });

  const syncDots = () => dots.forEach((d, i) => {
    if (!d) return;
    d.classList.toggle('on', i === state.i);
    d.setAttribute('aria-selected', String(i === state.i));
  });

  async function show(i) {
    const [key, name] = SCREENS[i];
    const url = await preload(state.shift, key);
    if (!url) return false;
    state.i = i;
    shot.src = url;
    shot.alt = `${name} on ${label[state.platform]} in ${label[state.shift]}`;
    if (caption) caption.textContent = `${name} · ${label[state.platform]} · ${label[state.shift]}`;
    syncDots();
    return true;
  }

  // Advance to the next screen that actually exists, so a half-delivered night set
  // cycles only what is there instead of stalling on a gap.
  async function advance() {
    for (let n = 1; n <= SCREENS.length; n++) {
      if (await show((state.i + n) % SCREENS.length)) return;
    }
  }

  let timer = null;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const rearm = () => {
    clearInterval(timer);
    if (!still.matches) timer = setInterval(advance, HOLD);
  };
  // Cycling in a background tab burns battery to show nobody anything.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer); else rearm();
  });

  const syncButtons = () => {
    for (const b of buttons) {
      const [axis, value] = b.dataset.set.split(':');
      const on = state[axis] === value;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };

  // Does this shift have ANY screenshot? Until the night set lands, flipping to night
  // would repaint the page as night while the frame still showed a day screen, and the
  // caption would say so. Claiming a shift we cannot show is worse than not offering it,
  // so the control disables itself and says why. It re-enables the moment a file exists.
  const shiftHasShots = async shift => {
    for (const [key] of SCREENS) if (await preload(shift, key)) return true;
    return false;
  };

  const gateShift = async () => {
    for (const b of buttons) {
      const [axis, value] = b.dataset.set.split(':');
      if (axis !== 'shift') continue;
      const ok = await shiftHasShots(value);
      b.disabled = !ok;
      b.classList.toggle('unavailable', !ok);
      if (ok) b.removeAttribute('title');
      else b.setAttribute('title', `${label[value]} screenshots are coming soon`);
    }
  };

  const applyShift = async () => {
    root.setAttribute('data-shift', state.shift);
    syncButtons();
    // Hold the current screen across a shift change: the point of the toggle is to see
    // ONE screen both ways. Only fall forward if this screen is missing in the new shift.
    if (!(await show(state.i))) await advance();
  };

  for (const b of buttons) {
    b.addEventListener('click', async () => {
      const [axis, value] = b.dataset.set.split(':');
      if (axis === 'shift' && !(await shiftHasShots(value))) return;
      state[axis] = value;
      if (axis === 'shift') {
        try { localStorage.setItem(KEY, value); } catch (e) { /* ignore */ }
      }
      // Both axes repaint the frame: a platform change swaps the capture in place.
      await applyShift();
      rearm();
    });
  }

  // A remembered night preference must not survive into a build with no night shots.
  (async () => {
    if (!(await shiftHasShots(state.shift))) state.shift = state.shift === 'night' ? 'day' : 'night';
    await applyShift();
    await gateShift();
    rearm();
  })();
})();
