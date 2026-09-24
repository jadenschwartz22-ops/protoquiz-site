// One home for the census findings carousel. The /research hub and the /census landing
// both render it from assets/research-thumbs.json (built by build-research-thumbs.mjs).
import { readFileSync, existsSync } from 'node:fs';

const THUMBS_FILE = new URL('../assets/research-thumbs.json', import.meta.url);

// null when the thumbs were never built (a fresh clone, or the Pi nightly): callers skip
// the carousel rather than fail.
export const loadThumbs = () => (existsSync(THUMBS_FILE) ? JSON.parse(readFileSync(THUMBS_FILE, 'utf8')) : null);

const n = x => Number(x).toLocaleString('en-US');

export const censusSlides = t => (t ? [
  ['Same call, different dose', '/research/doses/', t.census, 'Lowest to highest adult dose. The box is the middle half; a dot means most agree.'],
  ['Where agencies split', '/research/carry/', t.carry, `Share of ${n(t.carryN)} agencies whose protocol lists it. Dashed line: half.`],
  ['Formulary size', '/research/carry/#formulary', t.formulary, t.formularyStats && `Medications per agency. Median ${t.formularyStats.median}, most ${t.formularyStats.max}.`],
  ['Procedures', null, '<div class="slide-soon"><span class="soon-badge">Next</span><span>RSI, blood, surgical airways and more, compared the same way.</span></div>', ''],
].filter(([, , chart]) => chart) : []);

// Census findings as a slideshow: CSS scroll-snap does the sliding and the swipe, the
// script only wires prev/next/dots to it. No autoplay.
export const slideshow = slides => `          <div class="vol-thumb slides" role="region" aria-roledescription="carousel" aria-label="Census findings">
            <div class="slides-track" tabindex="0">
${slides.map(([t, href, chart, cap], i) => `              <figure class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}: ${t}">
                <p class="slide-t"><span>${i + 1} / ${slides.length}</span>${t}</p>
                ${href ? `<a href="${href}" aria-label="${t}">${chart}</a>` : chart}
                ${cap ? `<figcaption>${cap}</figcaption>` : ''}
              </figure>`).join('\n')}
            </div>
            <div class="slides-nav">
              <button type="button" class="slides-btn" data-go="-1" aria-label="Previous slide">&lsaquo;</button>
${slides.map((_, i) => `              <button type="button" class="slides-dot" data-i="${i}" aria-label="Slide ${i + 1}"${i ? '' : ' aria-current="true"'}></button>`).join('\n')}
              <button type="button" class="slides-btn" data-go="1" aria-label="Next slide">&rsaquo;</button>
            </div>
          </div>`;

export const SLIDES_JS = `  <script>
  for (const s of document.querySelectorAll('.slides')) {
    const track = s.querySelector('.slides-track'), dots = [...s.querySelectorAll('.slides-dot')];
    const cur = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = i => track.scrollTo({ left: Math.max(0, Math.min(dots.length - 1, i)) * track.clientWidth,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    s.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) go(b.dataset.i ? +b.dataset.i : cur() + +b.dataset.go);
    });
    track.addEventListener('scroll', () => dots.forEach((d, i) => d.toggleAttribute('aria-current', i === cur())), { passive: true });
  }
  </script>`;
