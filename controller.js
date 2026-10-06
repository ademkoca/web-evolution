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
      js: { available: false, reason: 'JavaScript did not exist yet. It was created in 1995, four years after the first web page.' },
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
      tabTitle: '~*~ Welcome to my Homepage!!! ~*~',
      year: '1996',
      label: '90s styling',
      shortLabel: 'the 90s',
      addLabel: '90s styling',
      css: 'layers/retro.css',
      js: { available: false, reason: 'JavaScript was brand new in 1995–96 and pages like this rarely used it. It becomes worth switching on from the Flash & DHTML era.' },
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
      tabTitle: 'THE EVOLUTION OF THE WEB » Enter site',
      year: '1999',
      label: 'Flash & DHTML (~1999)',
      shortLabel: 'Flash & DHTML',
      addLabel: 'Flash & DHTML',
      css: 'layers/flash.css',
      js: { available: true, name: 'DHTML scripting', features: 'a typewriter intro, a neon cursor trail, a "Skip intro" button while the loading splash plays, and instant form feedback' },
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
      tabTitle: 'The Evolution of the Web (beta)',
      year: '2006',
      label: 'Web 2.0 (~2006)',
      shortLabel: 'Web 2.0',
      addLabel: 'Web 2.0',
      css: 'layers/web2.css',
      js: { available: true, name: 'Ajax-style scripting', features: 'click-to-enlarge images in a lightbox, a milestones table you can sort and filter live, and a form that sends in the background' },
      summary: 'Glossy, friendly and rounded: gradients, soft shadows, big buttons and "beta" badges. Sites became places to take part, and they started to look like it.',
      era: {
        browsers: 'Firefox 2, Internet Explorer 7, Safari 2',
        fonts: 'Lucida Grande, Verdana, Helvetica',
        colours: 'Pastel gradients, glossy highlights, reflections',
        techniques: 'Rounded corners made with background images and nested divs (CSS border-radius only arrived around 2009–2011), Ajax, drop shadows, "beta" badges',
      },
    },
    {
      id: 'skeuo',
      tabTitle: 'My Notebook: The Evolution of the Web',
      year: '2010',
      label: 'Skeuomorphism (~2010)',
      shortLabel: 'skeuomorphism',
      addLabel: 'skeuomorphism',
      css: 'layers/skeuo.css',
      js: { available: true, name: 'jQuery-style scripting', features: 'sections that fade in as you scroll, smooth scrolling for the contents links, a back-to-top button, and instant form feedback' },
      summary: 'Screens that imitate real objects: leather, stitching, paper and wood. Phones and faster browsers made it possible to fake textures and depth, and designers did, until flat design swept it away.',
      era: {
        browsers: 'Safari 5, Chrome, Firefox 3.6, and the first iPhones and iPads',
        fonts: 'Georgia, Helvetica Neue and handwriting-style fonts',
        colours: 'Leather brown, linen, wood, paper cream and gold',
        techniques: 'CSS3 gradients, box-shadow and text-shadow for "embossed" text, texture images, stitched borders, @font-face web fonts',
      },
    },
    {
      id: 'flat',
      tabTitle: 'The Evolution of the Web | Responsive Template',
      year: '2013',
      label: 'Flat design (~2013)',
      shortLabel: 'flat design',
      addLabel: 'flat design',
      css: 'layers/flat.css',
      js: { available: true, name: 'Bootstrap-style plugins', features: 'a scrollspy that highlights where you are, counters that count up, a sortable table and a back-to-top button' },
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
      tabTitle: 'THE EVOLUTION OF THE WEB!!',
      year: '2020',
      label: 'Neo-brutalism (~2020)',
      shortLabel: 'neo-brutalism',
      addLabel: 'neo-brutalism',
      css: 'layers/brutal.css',
      js: { available: true, name: 'small helpful widgets', features: 'copy buttons on code, a sortable and filterable table, counters and instant form feedback' },
      summary: 'A deliberate reaction to polished design: thick black borders, hard shadows, monospace type and loud colours. Raw on purpose.',
      era: {
        browsers: 'Evergreen Chrome, Firefox and Safari',
        fonts: 'Monospace and grotesque sans-serif',
        colours: 'Saturated blocks (yellow, pink, mint) and plain black',
        techniques: 'CSS custom properties, thick borders, hard offset box-shadows, buttons that "press" into their shadow',
      },
    },
    {
      id: 'glass',
      tabTitle: 'The Evolution of the Web ◇ Frosted',
      year: '2021',
      label: 'Glassmorphism (~2021)',
      shortLabel: 'glassmorphism',
      addLabel: 'glassmorphism',
      css: 'layers/glass.css',
      js: { available: true, name: 'ambient effects', features: 'a reading progress bar, panels that blur into focus as you scroll, a cursor spotlight and a scrollspy' },
      summary: 'Frosted glass: translucent panels that blur whatever is behind them, floating over a glowing gradient. The look spread after macOS Big Sur (2020) and Windows 11 (2021) made blur and transparency part of the system design.',
      era: {
        browsers: 'Safari, Chrome and Edge, and Firefox from 2022 (backdrop-filter support)',
        fonts: 'System fonts and clean sans-serifs such as Inter',
        colours: 'Deep gradients with vivid glows, behind white translucent panels',
        techniques: 'backdrop-filter blur, semi-transparent backgrounds, thin light borders, soft shadows, blurred colour gradients',
      },
    },
    {
      id: 'css',
      year: 'Today',
      label: 'Modern CSS',
      shortLabel: 'modern CSS',
      addLabel: 'modern CSS',
      css: 'layers/modern.css',
      js: { available: true, name: 'modern scripting', features: 'a progress bar, fade-ins, a scrollspy, counters, a sortable and filterable table, copy buttons, instant form feedback, a live timer and a light/dark switch' },
      summary: 'One modern stylesheet: colour, typography, spacing and a responsive grid layout. Not a single tag in the HTML changed.',
      era: {
        browsers: 'Evergreen Chrome, Firefox, Safari and Edge',
        fonts: 'The system font (system-ui)',
        colours: 'Custom-property palettes, automatic dark mode',
        techniques: 'Grid, flexbox, custom properties, color-mix(), :has(), prefers-color-scheme and prefers-reduced-motion',
      },
    },
  ];

  // Back, "remove everything" and the primary "Add next layer" button for a given stage.
  function buttonsFor(index) {
    const buttons = [];
    if (index > 0) buttons.push({ to: index - 1, text: `← Back to ${STAGES[index - 1].shortLabel}` });
    if (index > 1) buttons.push({ to: 0, js: false, reset: true, text: 'Remove everything' });
    if (index < STAGES.length - 1) buttons.push({ to: index + 1, text: `Add ${STAGES[index + 1].addLabel} →`, primary: true });
    return buttons;
  }

  const APP_SRC = 'layers/app.js';
  const JS_CSS = 'layers/js.css';
  const params = new URLSearchParams(location.search);
  // compare.html shows two eras side by side in iframes of this page with ?embed=1:
  // those copies don't count visits or touch the address bar.
  const EMBED = params.get('embed') === '1';
  const BASE_TITLE = document.title;
  const files = {};
  let current = -1;
  let jsWanted = false; // what the visitor asked for (it carries over from era to era)
  let jsActive = false; // whether the scripts are really running (the era has to allow it)
  let unmountApp = null;
  let queue = Promise.resolve();

  function stateFromUrl() {
    const layer = params.get('layer');
    let index = STAGES.findIndex((s) => s.id === layer);
    let js = params.get('js') === '1';
    if (layer === 'js') {
      // Links from when JavaScript was still a layer of its own
      index = STAGES.findIndex((s) => s.id === 'css');
      js = true;
    }
    return { index: index === -1 ? 0 : index, js };
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

  // The styles for what JavaScript adds are only present while JavaScript is on.
  function setJsStylesheet(on) {
    const existing = document.getElementById('js-css');
    if (!on) {
      existing?.remove();
      return Promise.resolve();
    }
    if (existing) return existing.ready;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = JS_CSS;
    link.id = 'js-css';
    link.ready = new Promise((resolve) => {
      link.onload = link.onerror = resolve;
    });
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

  // Moves to an era and/or turns JavaScript on or off. The era and the JavaScript switch are
  // independent: JavaScript only runs while the era allows it, and what it does depends on the era.
  async function applyState(nextIndex, nextJs) {
    const wantJs = nextJs ?? jsWanted;
    if (nextIndex === current && wantJs === jsWanted) return;
    const from = { stage: STAGES[current] ?? null, active: jsActive };
    const to = STAGES[nextIndex];
    const nextActive = wantJs && to.js.available;
    const anchor = captureScrollAnchor();

    // Stop the scripts first, so they can tidy up while the styles they use still exist.
    // They also restart when the era changes, because each era gets different scripting.
    if (unmountApp && (!nextActive || nextIndex !== current)) {
      unmountApp();
      unmountApp = null;
      jsActive = false;
    }
    await setStylesheet(to.css);
    await setJsStylesheet(nextActive);
    if (nextActive && !unmountApp) {
      const app = await import(new URL(APP_SRC, document.baseURI).href);
      unmountApp = app.mount(to.id);
    }

    const previous = current;
    current = nextIndex;
    jsWanted = wantJs;
    jsActive = nextActive;
    document.documentElement.dataset.layer = to.id;
    document.documentElement.dataset.js = jsActive ? 'on' : 'off';
    updateUrl();
    updateTabTitle(to);
    renderControls();
    restoreScrollAnchor(anchor);
    renderWhatChanged(from, { stage: to, active: jsActive }, previous === -1);
  }

  function go(next, js) {
    queue = queue.then(() => applyState(next, js)).catch((err) => console.error(err));
    return queue;
  }

  // Each era gets its own tab title, like a site of that time might have had.
  function updateTabTitle(stage) {
    const title = stage.tabTitle ?? BASE_TITLE;
    document.title = jsActive ? `⚡ ${title}` : title;
  }

  function updateUrl() {
    const id = STAGES[current].id;
    // The survey form says which era and JavaScript state the answer was sent from.
    const layerField = document.querySelector('#poll-form input[name="layer"]');
    if (layerField) layerField.value = id;
    const jsField = document.querySelector('#poll-form input[name="javascript"]');
    if (jsField) jsField.value = jsActive ? 'on' : 'off';
    if (EMBED) return;
    const query = new URLSearchParams();
    if (id !== 'html') query.set('layer', id);
    if (jsWanted) query.set('js', '1');
    const url = new URL(location.href);
    url.search = query.toString() ? `?${query}` : '';
    history.replaceState(null, '', url);
  }

  function renderControls() {
    const stage = STAGES[current];
    document.querySelectorAll('[data-layer-status]').forEach((el) => {
      el.textContent = `Now showing: ${stage.label} (layer ${current + 1} of ${STAGES.length})${jsActive ? ', JavaScript on' : ''}`;
    });

    const focusedBox = document.activeElement?.closest('[data-layer-buttons]');
    const focusedJs = document.activeElement?.classList.contains('layer-btn--js');
    document.querySelectorAll('[data-layer-buttons]').forEach((box) => {
      const buttons = buttonsFor(current).map((spec) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = spec.text;
        button.className = spec.primary ? 'layer-btn layer-btn--primary' : spec.reset ? 'layer-btn layer-btn--reset' : 'layer-btn';
        button.addEventListener('click', () => go(spec.to, spec.js));
        return button;
      });
      buttons.push(jsButton(), compareLink());
      box.replaceChildren(...buttons);
      if (box === focusedBox) {
        const next = focusedJs ? box.querySelector('.layer-btn--js:not([disabled])') : null;
        (next ?? box.querySelector('.layer-btn--primary') ?? box.querySelector('button')).focus({ preventScroll: true });
      }
    });

    renderJsStatus();
    renderTimeline();
  }

  // The JavaScript switch: on or off, in any era that can use scripting.
  function jsButton() {
    const stage = STAGES[current];
    const button = el('button');
    button.type = 'button';
    button.className = 'layer-btn layer-btn--js';
    if (!stage.js.available) {
      button.textContent = '⚡ JavaScript: n/a';
      button.disabled = true;
      button.title = stage.js.reason;
      return button;
    }
    button.textContent = `⚡ JavaScript: ${jsActive ? 'ON' : 'OFF'}`;
    button.classList.toggle('is-on', jsActive);
    button.setAttribute('aria-pressed', String(jsActive));
    button.title = jsActive ? 'Turn JavaScript off' : 'Turn JavaScript on';
    button.addEventListener('click', () => go(current, !jsWanted));
    return button;
  }

  // One line saying what the JavaScript switch does here (or why it can't be used).
  // The first part is short enough for a phone; the rest is hidden there but stays in the panel.
  function renderJsStatus() {
    const { js } = STAGES[current];
    let short;
    let more;
    if (!js.available) {
      short = jsWanted ? 'JavaScript is paused in this era.' : "JavaScript isn't available in this era.";
      more = `${js.reason}${jsWanted ? ' It switches back on when you reach an era that can use it.' : ''}`;
    } else if (jsActive) {
      short = `⚡ JavaScript is on (${js.name}).`;
      more = `It adds ${js.features}.`;
    } else {
      short = 'JavaScript is off.';
      more = `Turn it on to add ${js.features}.`;
    }
    document.querySelectorAll('[data-js-status]').forEach((node) => {
      const extra = el('span', ` ${more}`);
      extra.className = 'js-status__more';
      node.replaceChildren(short, extra);
    });
  }

  // Opens compare.html. With JavaScript available it compares this era with and without it;
  // otherwise it compares this era with the next one.
  function compareLink() {
    const stage = STAGES[current];
    const query = stage.js.available
      ? `left=${stage.id}&ljs=${jsActive ? 1 : 0}&right=${stage.id}&rjs=${jsActive ? 0 : 1}`
      : `left=${stage.id}&ljs=0&right=${STAGES[current + 1].id}&rjs=0`;
    const link = el('a', 'Compare ⇄');
    link.className = 'layer-btn layer-btn--compare';
    link.title = 'Compare two eras side by side';
    link.href = `compare.html?${query}`;
    return link;
  }

  // A row of clickable year markers, one per era, to jump straight to any of them.
  function renderTimeline() {
    const focusedIndex = [...document.querySelectorAll('[data-era-timeline] button')].findIndex((b) => b === document.activeElement);
    document.querySelectorAll('[data-era-timeline]').forEach((box) => {
      const list = el('ol');
      STAGES.forEach((stage, index) => {
        const item = el('li');
        const button = el('button', stage.year);
        button.type = 'button';
        button.title = stage.label;
        button.setAttribute('aria-label', `${stage.label}${stage.year === 'Today' ? '' : `, ${stage.year}`}`);
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

    const jsFiles = [JS_CSS, APP_SRC];
    const fromCss = from.stage?.css ?? null;
    const toCss = to.stage.css;
    const sameEra = from.stage === to.stage;
    const added = [];
    const removed = [];
    if (toCss && toCss !== fromCss) added.push(toCss);
    if (fromCss && fromCss !== toCss) removed.push(fromCss);
    if (to.active && !from.active) added.push(...jsFiles);
    if (from.active && !to.active) removed.push(...jsFiles);

    const page = await getFile(location.pathname);
    const sizes = {};
    for (const path of new Set([...added, ...removed, toCss, ...(to.active ? jsFiles : [])].filter(Boolean))) {
      sizes[path] = (await getFile(path))?.bytes ?? 0;
    }

    const nodes = [el('p', to.stage.summary)];

    // Era card: what the web looked like and was built with at the time.
    const { js } = to.stage;
    const card = el('dl');
    card.className = 'era-card';
    [['Era', to.stage.year === 'Today' ? 'Today' : `Around ${to.stage.year}`],
      ['Browsers', to.stage.era.browsers],
      ['Fonts', to.stage.era.fonts],
      ['Colours', to.stage.era.colours],
      ['Techniques', to.stage.era.techniques],
      ['JavaScript', js.available ? `${js.name}: ${js.features}` : `Not available. ${js.reason}`]].forEach(([term, text]) => {
      card.append(el('dt', term), el('dd', text));
    });
    nodes.push(card);

    // What switching JavaScript on or off in this era did.
    if (sameEra && to.active && !from.active) {
      nodes.push(el('p', `⚡ JavaScript is now on. Same HTML, same CSS: the page now also has ${js.features}. Look for the ⚡ JS labels.`));
    } else if (sameEra && from.active && !to.active) {
      nodes.push(el('p', 'JavaScript is off again. The page is back to just HTML and CSS.'));
    } else if (to.active) {
      nodes.push(el('p', `⚡ JavaScript is on, and in this era it adds ${js.features}.`));
    }

    if (added.length || removed.length) {
      const list = el('ul');
      added.forEach((path) => list.append(el('li', `Added ${path} (+${formatKB(sizes[path])})`)));
      removed.forEach((path) => list.append(el('li', `Removed ${path} (−${formatKB(sizes[path])})`)));
      nodes.push(list);
    } else if (initial) {
      nodes.push(el('p', 'Nothing has been added yet.'));
    }

    const cssBytes = toCss ? sizes[toCss] : 0;
    const jsBytes = to.active ? (sizes[APP_SRC] ?? 0) + (sizes[JS_CSS] ?? 0) : 0;
    const weight = [`HTML ${page ? formatKB(page.bytes) : '?'}`, `CSS ${formatKB(cssBytes)}`, `JS ${formatKB(jsBytes)}`].join(' + ');
    nodes.push(el('p', `Page weight now: ${weight}. (This switcher script isn't counted: it's the frame, not the exhibit.)`));

    // Show the newest file's code: the JavaScript if it was just added, otherwise the stylesheet.
    const shown = added.includes(APP_SRC) ? APP_SRC : added.find((path) => !jsFiles.includes(path));
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

  // Start loading the stylesheets straight away to avoid a flash of unstyled content
  // when the page is opened at a styled layer.
  const initial = stateFromUrl();
  if (STAGES[initial.index].css) setStylesheet(STAGES[initial.index].css);
  if (initial.js && STAGES[initial.index].js.available) setJsStylesheet(true);

  const start = () => {
    go(initial.index, initial.js);
    if (!EMBED) startCounter();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
