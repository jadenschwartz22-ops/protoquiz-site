// assets/app-toggle.js — the store-screenshot switcher.
//
// Two independent axes: platform (ios|android) and theme (night|day). The app really
// does ship two identities per BrandKit.swift, so the page shows them rather than
// describing them. Both platforms carry both themes, hence two toggles and not one.
(() => {
  const shot = document.querySelector('[data-shot]');
  if (!shot) return;

  const caption = document.querySelector('[data-shot-caption]');
  const frame = document.querySelector('[data-phone]');
  const buttons = [...document.querySelectorAll('[data-set]')];
  const state = { platform: 'ios', theme: 'night' };
  const label = { ios: 'iPhone', android: 'Android', night: 'Night Shift', day: 'Day Shift' };

  const sync = () => {
    shot.src = `/app-shots/${state.theme}-${state.platform}.png`;
    shot.alt = `ProtoQuiz on ${label[state.platform]} in ${label[state.theme]}`;
    if (caption) caption.textContent = `${label[state.platform]} · ${label[state.theme]}`;
    if (frame) frame.classList.toggle('night', state.theme === 'night');
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
      sync();
    });
  }

  sync();
})();
