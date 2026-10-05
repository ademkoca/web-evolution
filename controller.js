// The layer switcher.
// This is the only script that runs on every layer. It adds and removes the
// layer stylesheets and the page script, and nothing else. It never styles
// anything itself, so the HTML-only layer stays completely unstyled.
(() => {
  'use strict';

  // One entry per layer, in the order a visitor steps through them.
  // `era` feeds the "What just changed?" era card.
  const STAGES = [
    {
      id: 'html',
      year: '1991',
      label: 'HTML only',
      shortLabel: 'plain HTML',
      addLabel: 'plain HTML',
      css: null,
      js: false,
      summary: 'No CSS and no JavaScript. Everything you see comes from your browser\'s built-in defaults: black serif text, blue underlined links, images at their natural size.',
      era: {
        browsers: 'WorldWideWeb and the Line Mode Browser, then Mosaic (1993)',
        fonts: 'Whatever the browser picked (usually a serif)',
        colours: 'Black on white, blue links',
        techniques: 'Headings, paragraphs, links and lists. No styling at all.',
      },
    },
    {
      id: 'retro',
      year: '1996',
      label: '90s styling',
      shortLabel: 'the 90s',
      addLabel: '90s styling',
      css: 'layers/retro.css',
      js: false,
      summary: 'A recreation of the web around 1996. Back then this look came from presentational HTML such as <font>, bgcolor, <center> and layout tables. Here it comes from one stylesheet, so the HTML stays exactly the same.',
      era: {
        browsers: 'Netscape Navigator 2–3, Internet Explorer 3',
        fonts: 'Times New Roman, Arial, Comic Sans',
        colours: 'Grey backgrounds, default blue and purple links, the 216 "web-safe" colours',
        techniques: '<font> tags, bgcolor, nested layout tables, spacer GIFs, <blink> and <marquee>, frames',
      },
    },
    {
      id: 'flash',
      year: '1999',
      label: 'Flash & DHTML (~1999)',
      shortLabel: 'Flash & DHTML',
      addLabel: 'Flash & DHTML',
      css: 'layers/flash.css',
      js: false,
      summary: 'The "look at what the web can do" era: black pages, neon colours, metallic buttons and a loading splash. This is only a CSS imitation. The real thing needed a browser plugin (Flash) or JavaScript (DHTML), and this layer has neither.',
      era: {
        browsers: 'Internet Explorer 5, Netscape 4, and the Flash plugin',
        fonts: 'Verdana, Arial and tiny pixel fonts',
        colours: 'Black backgrounds, neon cyan and orange, metallic gradients',
        techniques: 'Flash intros ("Skip intro"), DHTML rollover menus, sliced-image layouts, animated GIFs',
      },
    },
    {
      id: 'web2',
      year: '2006',
      label: 'Web 2.0 (~2006)',
      shortLabel: 'Web 2.0',
      addLabel: 'Web 2.0',
      css: 'layers/web2.css',
      js: false,
      summary: 'Glossy, friendly and rounded: gradients, soft shadows, big buttons and "beta" badges. Sites became places to take part, and they started to look like it.',
      era: {
        browsers: 'Firefox 2, Internet Explorer 7, Safari 2',
        fonts: 'Lucida Grande, Verdana, Helvetica',
        colours: 'Pastel gradients, glossy highlights, reflections',
        techniques: 'Rounded corners made with background images and nested divs (CSS border-radius only arrived around 2009–2011), Ajax, drop shadows, "beta" badges',
      },
    },
    {
      id: 'flat',
      year: '2013',
      label: 'Flat design (~2013)',
      shortLabel: 'flat design',
      addLabel: 'flat design',
      css: 'layers/flat.css',
      js: false,
      summary: 'Out went gradients and shadows, in came flat colour, big type and a tidy grid. Bootstrap made this look the default for a generation of sites.',
      era: {
        browsers: 'Chrome, Firefox, Internet Explorer 10, Safari 7',
        fonts: 'Helvetica Neue, Open Sans (web fonts) and icon fonts',
        colours: 'The "Flat UI" palette: turquoise, midnight blue, red',
        techniques: 'Bootstrap\'s 12-column grid, hero banners, media queries for phones, no gradients or shadows',
      },
    },
    {
      id: 'brutal',
      year: '2020',
      label: 'Neo-brutalism (~2020)',
      shortLabel: 'neo-brutalism',
      addLabel: 'neo-brutalism',
      css: 'layers/brutal.css',
      js: false,
      summary: 'A deliberate reaction to polished design: thick black borders, hard shadows, monospace type and loud colours. Raw on purpose.',
      era: {
        browsers: 'Evergreen Chrome, Firefox and Safari',
        fonts: 'Monospace and grotesque sans-serif',
        colours: 'Saturated blocks (yellow, pink, mint) and plain black',
        techniques: 'CSS custom properties, thick borders, hard offset box-shadows, buttons that "press" into their shadow',
      },
    },
    {
      id: 'css',
      year: 'Today',
      label: 'Modern CSS',
      shortLabel: 'modern CSS',
      addLabel: 'modern CSS',
      css: 'layers/modern.css',
      js: false,
      summary: 'One modern stylesheet: colour, typography, spacing and a responsive grid layout. Not a single tag in the HTML changed.',
      era: {
        browsers: 'Evergreen Chrome, Firefox, Safari and Edge',
        fonts: 'The system font (system-ui)',
        colours: 'Custom-property palettes, automatic dark mode',
        techniques: 'Grid, flexbox, custom properties, color-mix(), :has(), prefers-color-scheme and prefers-reduced-motion',
      },
    },
    {
      id: 'js',
      year: 'JS',
      label: 'Modern CSS + JavaScript',
      shortLabel: 'modern CSS',
      addLabel: 'JavaScript',
      css: 'layers/modern.css',
      js: true,
      summary: 'JavaScript adds behaviour: a reading progress bar, a sortable table, counters, instant form feedback and a theme switch. Look for the ⚡ JS labels.',
      era: {
        browsers: 'Evergreen Chrome, Firefox, Safari and Edge',
        fonts: 'The system font (system-ui)',
        colours: 'Same as modern CSS, plus a light/dark switch',
        techniques: 'ES modules, IntersectionObserver, requestAnimationFrame, the DOM',
      },
    },
  ];

  // Back, "remove everything" and the primary "Add next layer" button for a given stage.
  function buttonsFor(index) {
    const last = STAGES.length - 1;
    const buttons = [];
    if (index > 0) {
      buttons.push({ to: index - 1, text: index === last ? '← Remove JavaScript' : `← Back to ${STAGES[index - 1].shortLabel}` });
    }
    if (index > 1) buttons.push({ to: 0, text: index === last ? 'Remove everything' : 'Remove all CSS' });
    if (index < last) buttons.push({ to: index + 1, text: `Add ${STAGES[index + 1].addLabel} →`, primary: true });
    return buttons;
  }

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
      const buttons = buttonsFor(current).map((spec) => {
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

    renderTimeline();
  }

  // A row of clickable year markers, one per layer, to jump straight to any era.
  function renderTimeline() {
    const focusedIndex = [...document.querySelectorAll('[data-era-timeline] button')].findIndex((b) => b === document.activeElement);
    document.querySelectorAll('[data-era-timeline]').forEach((box) => {
      const list = el('ol');
      STAGES.forEach((stage, index) => {
        const item = el('li');
        const button = el('button', stage.year);
        button.type = 'button';
        button.title = stage.label;
        button.setAttribute('aria-label', `${stage.label}${stage.year === 'Today' || stage.year === 'JS' ? '' : `, ${stage.year}`}`);
        if (index === current) button.setAttribute('aria-current', 'step');
        button.addEventListener('click', () => go(index));
        item.append(button);
        list.append(item);
      });
      box.replaceChildren(list);
    });
    if (focusedIndex !== -1) {
      document.querySelectorAll('[data-era-timeline]')[0]?.querySelectorAll('button')[focusedIndex]?.focus({ preventScroll: true });
    }
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

    // Era card: what the web looked like and was built with at the time.
    const card = el('dl');
    card.className = 'era-card';
    [['Era', `${to.year === 'Today' || to.year === 'JS' ? 'Today' : `Around ${to.year}`}`],
      ['Browsers', to.era.browsers],
      ['Fonts', to.era.fonts],
      ['Colours', to.era.colours],
      ['Techniques', to.era.techniques]].forEach(([term, text]) => {
      card.append(el('dt', term), el('dd', text));
    });
    nodes.push(card);

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
    // Give the script a moment to record this visit before asking for the total.
    script.onload = () => setTimeout(showCount, 1000);
    document.head.append(script);
  }

  // Needs "Allow adding visitor counts on public pages" enabled in GoatCounter.
  // GoatCounter answers 404 (with a count of 0) for pages it hasn't seen yet,
  // so the body is read whatever the status. Nothing is shown unless the count is above 0;
  // the 90s layer then keeps its fake counter.
  function showCount() {
    fetch(`${GOATCOUNTER}/counter/${encodeURIComponent(location.pathname)}.json`)
      .then((res) => res.json())
      .then(({ count }) => {
        const box = document.querySelector('[data-visitor-counter]');
        if (!box || !(parseInt(String(count).replace(/\D/g, ''), 10) > 0)) return;
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
