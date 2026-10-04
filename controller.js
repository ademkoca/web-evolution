// The layer switcher.
// This is the only script that runs on every layer. It adds and removes the
// layer stylesheets and the page script, and nothing else. It never styles
// anything itself, so the HTML-only layer stays completely unstyled.
(() => {
  'use strict';

  const STAGES = [
    {
      id: 'html',
      label: 'HTML only',
      css: null,
      js: false,
      summary: 'No CSS and no JavaScript. Everything you see comes from your browser\'s built-in defaults: black serif text, blue underlined links, images at their natural size.',
    },
    {
      id: 'retro',
      label: '90s styling',
      css: 'layers/retro.css',
      js: false,
      summary: 'A recreation of the web around 1996. Back then this look came from presentational HTML such as <font>, bgcolor, <center> and layout tables. Here it comes from one stylesheet, so the HTML stays exactly the same.',
    },
    {
      id: 'css',
      label: 'Modern CSS',
      css: 'layers/modern.css',
      js: false,
      summary: 'One modern stylesheet: colour, typography, spacing and a responsive grid layout. Not a single tag in the HTML changed.',
    },
    {
      id: 'js',
      label: 'Modern CSS + JavaScript',
      css: 'layers/modern.css',
      js: true,
      summary: 'JavaScript adds behaviour: a reading progress bar, a sortable table, counters, instant form feedback and a theme switch. Look for the ⚡ JS labels.',
    },
  ];

  const BUTTONS = [
    [{ to: 1, text: 'Add 90s styling →', primary: true }],
    [{ to: 0, text: '← Back to plain HTML' }, { to: 2, text: 'Add modern CSS →', primary: true }],
    [{ to: 1, text: '← Back to the 90s' }, { to: 0, text: 'Remove all CSS' }, { to: 3, text: 'Add JavaScript →', primary: true }],
    [{ to: 2, text: '← Remove JavaScript' }, { to: 0, text: 'Remove everything' }],
  ];

  const APP_SRC = 'layers/app.js';
  const files = {};
  let current = -1;
  let unmountApp = null;
  let queue = Promise.resolve();

  function stageFromUrl() {
    const id = new URLSearchParams(location.search).get('layer');
    const index = STAGES.findIndex((s) => s.id === id);
    return index === -1 ? 0 : index;
  }

  function getFile(path) {
    files[path] ??= fetch(path)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((text) => ({ text, bytes: new Blob([text]).size }))
      .catch(() => null);
    return files[path];
  }

  // Waits for a new stylesheet to load before removing the old one,
  // so swapping 90s styling for modern CSS never flashes unstyled content.
  function setStylesheet(href) {
    const old = document.getElementById('layer-css');
    if (old && old.getAttribute('href') === href) return old.ready;
    if (!href) {
      old?.remove();
      return Promise.resolve();
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.ready = new Promise((resolve) => {
      link.onload = link.onerror = () => {
        old?.remove();
        resolve();
      };
    });
    link.id = 'layer-css';
    if (old) old.id = '';
    document.head.append(link);
    return link.ready;
  }

  // Keeps whatever is at the top of the screen in place while the layout changes.
  function captureScrollAnchor() {
    if (window.scrollY === 0) return null;
    const bar = document.querySelector('.layer-controls--top');
    const barBottom = bar && getComputedStyle(bar).position === 'sticky' ? bar.getBoundingClientRect().bottom : 0;
    const candidates = document.querySelectorAll('main h2, main p, main li, main figure, main tr, main pre, .site-header, .site-footer p');
    for (const el of candidates) {
      if (el.getBoundingClientRect().bottom > barBottom) {
        return { el, top: el.getBoundingClientRect().top - barBottom };
      }
    }
    return null;
  }

  function restoreScrollAnchor(anchor) {
    if (!anchor) return;
    const bar = document.querySelector('.layer-controls--top');
    const barBottom = bar && getComputedStyle(bar).position === 'sticky' ? bar.getBoundingClientRect().bottom : 0;
    const delta = anchor.el.getBoundingClientRect().top - barBottom - anchor.top;
    window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' });
  }

  async function applyStage(next) {
    if (next === current) return;
    const from = STAGES[current] ?? { css: null, js: false };
    const to = STAGES[next];
    const anchor = captureScrollAnchor();

    // Remove JavaScript first, so it can tidy up while its styles still exist.
    if (unmountApp && !to.js) {
      unmountApp();
      unmountApp = null;
    }
    await setStylesheet(to.css);
    if (to.js && !unmountApp) {
      const app = await import(new URL(APP_SRC, document.baseURI).href);
      unmountApp = app.mount();
    }

    const previous = current;
    current = next;
    document.documentElement.dataset.layer = to.id;
    updateUrl(to.id);
    renderControls();
    restoreScrollAnchor(anchor);
    renderWhatChanged(from, to, previous === -1);
  }

  function go(next) {
    queue = queue.then(() => applyStage(next)).catch((err) => console.error(err));
    return queue;
  }

  function updateUrl(id) {
    const url = new URL(location.href);
    url.search = id === 'html' ? '' : `?layer=${id}`;
    history.replaceState(null, '', url);
    const field = document.querySelector('#poll-form input[name="layer"]');
    if (field) field.value = id;
  }

  function renderControls() {
    const stage = STAGES[current];
    document.querySelectorAll('[data-layer-status]').forEach((el) => {
      el.textContent = `Now showing: ${stage.label} (layer ${current + 1} of ${STAGES.length})`;
    });

    const focusedBox = document.activeElement?.closest('[data-layer-buttons]');
    document.querySelectorAll('[data-layer-buttons]').forEach((box) => {
      const buttons = BUTTONS[current].map((spec) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = spec.text;
        button.className = spec.primary ? 'layer-btn layer-btn--primary' : 'layer-btn';
        button.addEventListener('click', () => go(spec.to));
        return button;
      });
      box.replaceChildren(...buttons);
      if (box === focusedBox) {
        (box.querySelector('.layer-btn--primary') ?? box.querySelector('button')).focus({ preventScroll: true });
      }
    });
  }

  function formatKB(bytes) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function el(tag, text) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  }

  async function renderWhatChanged(from, to, initial) {
    const box = document.querySelector('[data-what-changed]');
    if (!box) return;

    const added = [];
    const removed = [];
    if (to.css && to.css !== from.css) added.push(to.css);
    if (from.css && from.css !== to.css) removed.push(from.css);
    if (to.js && !from.js) added.push(APP_SRC);
    if (from.js && !to.js) removed.push(APP_SRC);

    const page = await getFile(location.pathname);
    const sizes = {};
    for (const path of [...added, ...removed, to.css].filter(Boolean)) {
      sizes[path] = (await getFile(path))?.bytes ?? 0;
    }

    const nodes = [el('p', to.summary)];

    if (added.length || removed.length) {
      const list = el('ul');
      added.forEach((path) => list.append(el('li', `Added ${path} (+${formatKB(sizes[path])})`)));
      removed.forEach((path) => list.append(el('li', `Removed ${path} (−${formatKB(sizes[path])})`)));
      nodes.push(list);
    } else if (initial) {
      nodes.push(el('p', 'Nothing has been added yet.'));
    }

    const cssBytes = to.css ? sizes[to.css] : 0;
    const jsBytes = to.js ? sizes[APP_SRC] ?? 0 : 0;
    const weight = [`HTML ${page ? formatKB(page.bytes) : '?'}`, `CSS ${formatKB(cssBytes)}`, `JS ${formatKB(jsBytes)}`].join(' + ');
    nodes.push(el('p', `Page weight now: ${weight}. (This switcher script isn't counted: it's the frame, not the exhibit.)`));

    // Show the newest file's code: the JavaScript if it was just added, otherwise the stylesheet.
    const shown = added.includes(APP_SRC) ? APP_SRC : added[0];
    if (shown) {
      const file = await getFile(shown);
      if (file) {
        nodes.push(el('p', `Here's the code that was just added, ${shown}:`));
        const pre = el('pre');
        pre.append(el('code', file.text));
        nodes.push(pre);
      }
    } else if (removed.length) {
      nodes.push(el('p', 'Nothing was added. The removed code is no longer part of the page.'));
    }

    box.replaceChildren(...nodes);
  }

  // Visit counting via GoatCounter: privacy-friendly, no cookies, ignores localhost.
  // The page script records the visit; the public counter endpoint returns the total.
  const GOATCOUNTER = 'https://ademkoca.goatcounter.com';

  function startCounter() {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.goatcounter = `${GOATCOUNTER}/count`;
    script.src = '//gc.zgo.at/count.js';
    document.head.append(script);

    // Needs "Allow adding visitor counts on public pages" enabled in GoatCounter.
    // If the request fails, nothing is shown and the 90s layer keeps its fake counter.
    fetch(`${GOATCOUNTER}/counter/${encodeURIComponent(location.pathname)}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(({ count }) => {
        const box = document.querySelector('[data-visitor-counter]');
        if (!box || !count) return;
        box.textContent = `Visitors so far: ${count}`;
        box.hidden = false;
        document.documentElement.dataset.counter = 'live';
      })
      .catch(() => {});
  }

  // Start loading the stylesheet straight away to avoid a flash of unstyled content
  // when the page is opened at a styled layer.
  const initial = stageFromUrl();
  if (STAGES[initial].css) setStylesheet(STAGES[initial].css);

  const start = () => {
    go(initial);
    startCounter();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
