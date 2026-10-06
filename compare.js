// Compare page: shows two eras of the same page side by side.
// Each side is an iframe of index.html at one layer (?embed=1 keeps it quiet),
// and a slider decides how much of each one you see.

// Keep in sync with STAGES in controller.js (`js` says whether JavaScript can be switched on in that era).
const ERAS = [
  { id: 'html', year: '1991', label: 'Plain HTML', js: false },
  { id: 'retro', year: '1996', label: '90s styling', js: false },
  { id: 'flash', year: '~1999', label: 'Flash & DHTML', js: true },
  { id: 'web2', year: '~2006', label: 'Web 2.0', js: true },
  { id: 'skeuo', year: '~2010', label: 'Skeuomorphism', js: true },
  { id: 'flat', year: '~2013', label: 'Flat design', js: true },
  { id: 'brutal', year: '~2020', label: 'Neo-brutalism', js: true },
  { id: 'glass', year: '~2021', label: 'Glassmorphism', js: true },
  { id: 'css', year: 'Today', label: 'Modern CSS', js: true },
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
  left: { frame: $('frame-left'), select: $('left-era'), js: $('left-js'), chip: $('chip-left') },
  right: { frame: $('frame-right'), select: $('right-era'), js: $('right-js'), chip: $('chip-right') },
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

function load(side, id, js = false) {
  const { frame, select, chip, js: jsBox } = sides[side];
  const era = byId(id);
  const useJs = js && era.js;
  select.value = id;
  jsBox.disabled = !era.js;
  jsBox.checked = useJs;
  jsBox.title = era.js ? '' : 'JavaScript is not available in this era';
  chip.textContent = `${era.year} · ${era.label}${useJs ? ' · ⚡ JS' : ''}`;
  frame.title = `${side === 'left' ? 'Left' : 'Right'} side: ${era.label}${useJs ? ' with JavaScript' : ''}`;
  frame.src = `index.html?layer=${id}${useJs ? '&js=1' : ''}&embed=1`;
  updateAddress();
}

function updateAddress() {
  const { left, right } = sides;
  const url = new URL(location.href);
  url.search = `?left=${left.select.value}&ljs=${left.js.checked ? 1 : 0}&right=${right.select.value}&rjs=${right.js.checked ? 1 : 0}`;
  history.replaceState(null, '', url);
  $('back-link').href = `index.html?layer=${left.select.value}${left.js.checked ? '&js=1' : ''}`;
}

for (const side of ['left', 'right']) {
  const { select, js, frame } = sides[side];
  select.addEventListener('change', () => load(side, select.value, js.checked));
  js.addEventListener('change', () => load(side, select.value, js.checked));
  frame.addEventListener('load', () => onFrameLoad(side));
}

// Swapping reloads both sides, so remember where you were and restore it once both are back.
let pending = null;

$('swap').addEventListener('click', () => {
  const win = sides.left.frame.contentWindow;
  pending = win?.document.body ? { anchor: readAnchor(win), remaining: 2 } : null;
  const left = { id: sides.left.select.value, js: sides.left.js.checked };
  load('left', sides.right.select.value, sides.right.js.checked);
  load('right', left.id, left.js);
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
load('left', pick('left', 'retro'), params.get('ljs') === '1');
load('right', pick('right', 'css'), params.get('rjs') === '1');
