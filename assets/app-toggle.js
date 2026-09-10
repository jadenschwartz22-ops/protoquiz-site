// assets/app-toggle.js — the shift switcher.
//
// The app ships two identities (BrandKit: Night Shift amber console, Day Shift cool
// slate). This page does not describe that, it BECOMES it: the toggle sets
// [data-shift] on <html> and every token in app.css is redefined, so the hero, the
// chrome, the conveyor and the screenshots all move together.
//
// Day is the default so a cold visit matches the rest of the site. The choice is
// remembered, wrapped in try/catch because private windows throw on localStorage.
(() => {
  const KEY = 'pq-shift';
  const root = document.documentElement;
  const shot = document.querySelector('[data-shot]');
  const caption = document.querySelector('[data-shot-caption]');
  const buttons = [...document.querySelectorAll('[data-set]')];

  const state = { platform: 'ios', shift: 'day' };
  const label = { ios: 'iPhone', android: 'Android', night: 'Night Shift', day: 'Day Shift' };

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'night' || saved === 'day') state.shift = saved;
  } catch (e) { /* private window: keep the default */ }

  const sync = () => {
    root.setAttribute('data-shift', state.shift);
    if (shot) {
      shot.src = `/app-shots/${state.shift === 'night' ? 'night' : 'day'}-${state.platform}.png`;
      shot.alt = `ProtoQuiz on ${label[state.platform]} in ${label[state.shift]}`;
    }
    if (caption) caption.textContent = `${label[state.platform]} · ${label[state.shift]}`;
    for (const b of buttons) {
      const [axis, value] = b.dataset.set.split(':');
      const on = state[axis] === value;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const [axis, value] = b.dataset.set.split(':');
      state[axis] = value;
      if (axis === 'shift') {
        try { localStorage.setItem(KEY, value); } catch (e) { /* ignore */ }
      }
      sync();
    });
  }

  sync();
})();
