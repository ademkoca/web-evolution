// Compare page: shows two eras of the same page side by side.
// Each side is an iframe of index.html at one layer (?embed=1 keeps it quiet),
// and a slider decides how much of each one you see.

// Keep in sync with STAGES in controller.js.
const ERAS = [
  { id: 'html', year: '1991', label: 'Plain HTML' },
  { id: 'retro', year: '1996', label: '90s styling' },
  { id: 'flash', year: '~1999', label: 'Flash & DHTML' },
  { id: 'web2', year: '~2006', label: 'Web 2.0' },
  { id: 'skeuo', year: '~2010', label: 'Skeuomorphism' },
  { id: 'flat', year: '~2013', label: 'Flat design' },
  { id: 'brutal', year: '~2020', label: 'Neo-brutalism' },
  { id: 'css', year: 'Today', label: 'Modern CSS' },
  { id: 'js', year: 'Today', label: 'Modern CSS + JavaScript' },
];

// Only used inside the embedded copies: hide the controls bar and the Flash splash,
// and remove offsets that only exist because of the controls bar.
const EMBED_CSS = `
  .layer-controls, .skip-link { display: none !important; }
  body::before, body::after { display: none !important; }
  .toc { top: 16px !important; }
  html { scroll-padding-top: 0 !important; scroll-behavior: auto !important; }
`;

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const split = $('split');
const sides = {
  left: { frame: $('frame-left'), select: $('left-era'), chip: $('chip-left') },
  right: { frame: $('frame-right'), select: $('right-era'), chip: $('chip-right') },
};
const sync = $('sync');

const byId = (id) => ERAS.find((era) => era.id === id);
const params = new URLSearchParams(location.search);
const pick = (name, fallback) => (byId(params.get(name)) ? params.get(name) : fallback);

for (const { select } of Object.values(sides)) {
  for (const era of ERAS) {
    select.append(new Option(`${era.year} · ${era.label}`, era.id));
  }
}

// ---------- loading an era into a side ----------

function load(side, id) {
  const { frame, select, chip } = sides[side];
  const era = byId(id);
  select.value = id;
  chip.textContent = `${era.year} · ${era.label}`;
  frame.title = `${side === 'left' ? 'Left' : 'Right'} era: ${era.label}`;
  frame.src = `index.html?layer=${id}&embed=1`;
  updateAddress();
}

function updateAddress() {
  const url = new URL(location.href);
  url.search = `?left=${sides.left.select.value}&right=${sides.right.select.value}`;
  history.replaceState(null, '', url);
  $('back-link').href = `index.html?layer=${sides.left.select.value}`;
}

for (const side of ['left', 'right']) {
  sides[side].select.addEventListener('change', () => load(side, sides[side].select.value));
  sides[side].frame.addEventListener('load', () => onFrameLoad(side));
}

// Swapping reloads both sides, so remember where you were and restore it once both are back.
let pending = null;

$('swap').addEventListener('click', () => {
  const win = sides.left.frame.contentWindow;
  pending = win?.document.body ? { anchor: readAnchor(win), remaining: 2 } : null;
  const left = sides.left.select.value;
  load('left', sides.right.select.value);
  load('right', left);
});

// ---------- scroll sync ----------
// The two eras have different heights, so the page is matched by section:
// whichever section is at the top on one side, and how far into it, is
// reproduced on the other side.

const sections = (doc) => [...doc.querySelectorAll('#top, main > section, .site-footer')];

function readAnchor(win) {
  const list = sections(win.document);
  let current = list[0];
  for (const el of list) {
    if (el.getBoundingClientRect().top <= 1) current = el;
    else break;
  }
  const rect = current.getBoundingClientRect();
  return { index: list.indexOf(current), fraction: rect.height ? Math.min(Math.max(-rect.top / rect.height, 0), 1) : 0 };
}

function applyAnchor(win, anchor) {
  const list = sections(win.document);
  const el = list[Math.min(anchor.index, list.length - 1)];
  if (!el) return;
  const rect = el.getBoundingClientRect();
  win.scrollTo({ top: win.scrollY + rect.top + anchor.fraction * rect.height, behavior: 'instant' });
}

let ignore = { side: null, until: 0 };
let frameRequest = 0;

function onScroll(from) {
  if (!sync.checked) return;
  if (ignore.side === from && performance.now() < ignore.until) return;
  cancelAnimationFrame(frameRequest);
  frameRequest = requestAnimationFrame(() => {
    const to = from === 'left' ? 'right' : 'left';
    const source = sides[from].frame.contentWindow;
    const target = sides[to].frame.contentWindow;
    if (!source?.document.body || !target?.document.body) return;
    ignore = { side: to, until: performance.now() + 120 };
    applyAnchor(target, readAnchor(source));
  });
}

function onFrameLoad(side) {
  const { frame } = sides[side];
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) return;
  doc.head.append(Object.assign(doc.createElement('style'), { textContent: EMBED_CSS }));
  win.addEventListener('scroll', () => onScroll(side), { passive: true });

  if (pending) {
    const { anchor } = pending;
    if (--pending.remaining === 0) pending = null;
    setTimeout(() => applyAnchor(win, anchor), 250);
    return;
  }

  // A newly chosen era jumps to where the other side currently is.
  const other = side === 'left' ? 'right' : 'left';
  const otherWin = sides[other].frame.contentWindow;
  if (sync.checked && otherWin?.document.body && otherWin.scrollY > 0) {
    // Wait a moment: the era's stylesheet and layout settle just after load.
    setTimeout(() => applyAnchor(win, readAnchor(otherWin)), 250);
  }
}

// ---------- the divider ----------

function setSplit(percent) {
  const value = Math.min(Math.max(percent, 0), 100);
  stage.style.setProperty('--split', `${value}%`);
  split.value = String(value);
  sides.left.chip.hidden = value < 18;
  sides.right.chip.hidden = value > 82;
}

split.addEventListener('input', () => setSplit(Number(split.value)));

const divider = $('divider');
divider.addEventListener('pointerdown', (event) => {
  divider.setPointerCapture(event.pointerId);
  stage.classList.add('is-dragging');
  event.preventDefault();
});
divider.addEventListener('pointermove', (event) => {
  if (!divider.hasPointerCapture(event.pointerId)) return;
  const rect = stage.getBoundingClientRect();
  setSplit(((event.clientX - rect.left) / rect.width) * 100);
});
const endDrag = (event) => {
  if (divider.hasPointerCapture(event.pointerId)) divider.releasePointerCapture(event.pointerId);
  stage.classList.remove('is-dragging');
};
divider.addEventListener('pointerup', endDrag);
divider.addEventListener('pointercancel', endDrag);

// ---------- start ----------

setSplit(50);
load('left', pick('left', 'retro'));
load('right', pick('right', 'css'));
