// JavaScript layer.
// mount(era) adds the scripting that was typical for that era and returns a
// function that takes all of it away again, so turning JavaScript off really
// leaves the page as it was. What each era gets is listed in ERA_FEATURES.
// (Keep the descriptions in controller.js and compare.js in sync with it.)

const ERA_FEATURES = {
  // ~1999, DHTML: showy effects
  flash: ['typewriter', 'cursorTrail', 'skipIntro', 'poll'],
  // ~2006, Ajax: pages that react without reloading
  web2: ['lightbox', 'table', 'poll'],
  // ~2010, jQuery: smooth scrolling and fade-ins
  skeuo: ['reveal', 'smoothScroll', 'backToTop', 'poll'],
  // ~2013, Bootstrap plugins: scrollspy, counters, sortable tables
  flat: ['scrollspy', 'counters', 'sortTable', 'backToTop'],
  // ~2020: small helpful widgets
  brutal: ['table', 'copy', 'counters', 'poll'],
  // ~2021: ambient effects
  glass: ['progress', 'reveal', 'spotlight', 'scrollspy'],
  // today: all of it
  css: ['progress', 'reveal', 'scrollspy', 'counters', 'table', 'poll', 'copy', 'timeOnPage'],
};

export function mount(era = 'css') {
  const cleanups = [];
  const ctx = {
    era,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    cleanup: (fn) => cleanups.push(fn),
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    },
    add(node) {
      cleanups.push(() => node.remove());
      return node;
    },
  };

  setupTools(ctx);
  for (const name of ERA_FEATURES[era] ?? ERA_FEATURES.css) {
    FEATURES[name](ctx);
  }

  return () => {
    while (cleanups.length) cleanups.pop()();
  };
}

// ---------- helpers ----------

function el(tag, props = {}, text) {
  const node = Object.assign(document.createElement(tag), props);
  if (text != null) node.textContent = text;
  return node;
}

// Removes classes and drops the attribute if nothing is left, so the DOM ends up exactly as it started.
function removeClass(node, ...names) {
  node.classList.remove(...names);
  if (!node.classList.length) node.removeAttribute('class');
}

function badge(ctx, target, label, position = 'beforeend') {
  if (!target) return;
  const node = el('span', { className: 'js-badge' }, `⚡ JS · ${label}`);
  node.setAttribute('aria-hidden', 'true');
  target.insertAdjacentElement(position, ctx.add(node));
}

// ---------- tools: label switch (+ theme switch in the modern era) ----------

function setupTools(ctx) {
  const bar = document.querySelector('.layer-controls--top');
  if (!bar) return;
  const root = document.documentElement;
  const tools = ctx.add(el('div', { className: 'js-tools' }));

  // Only the modern stylesheet has a dark theme to switch to.
  const themeBtn = ctx.era === 'css' ? el('button', { type: 'button' }) : null;
  if (themeBtn) {
    const isDark = () =>
      root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const renderTheme = () => {
      themeBtn.textContent = isDark() ? '☀️ Light theme' : '🌙 Dark theme';
      themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    };
    ctx.on(themeBtn, 'click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      renderTheme();
    });
    renderTheme();
    ctx.cleanup(() => delete root.dataset.theme);
  }

  const badgeToggle = el('input', { type: 'checkbox', checked: true });
  const badgeLabel = el('label');
  badgeLabel.append(badgeToggle, ' Show ⚡ JS labels');
  ctx.on(badgeToggle, 'change', () => root.classList.toggle('hide-js-badges', !badgeToggle.checked));
  ctx.cleanup(() => removeClass(root, 'hide-js-badges'));

  tools.append(...(themeBtn ? [themeBtn] : []), badgeLabel);
  bar.querySelector('.layer-note')?.before(tools);
}

// ---------- reading progress bar ----------

function setupProgressBar(ctx) {
  const bar = document.querySelector('.layer-controls--top');
  if (!bar) return;
  const track = ctx.add(el('div', { className: 'read-progress' }));
  track.setAttribute('aria-hidden', 'true');
  const fill = el('span');
  track.append(fill);
  bar.append(track);

  let frame = 0;
  const update = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    fill.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };
  ctx.on(window, 'scroll', schedule, { passive: true });
  ctx.on(window, 'resize', schedule);
  ctx.cleanup(() => cancelAnimationFrame(frame));
  update();
}

// ---------- reveal on scroll ----------

function setupReveal(ctx) {
  badge(ctx, document.querySelector('#intro h2'), 'sections fade in as you scroll');
  if (ctx.reducedMotion || !('IntersectionObserver' in window)) return;

  const items = [...document.querySelectorAll('main > section > *')];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  // Anything already on screen (or above it) animates in once, gently staggered,
  // so adding the JavaScript layer is noticeable straight away.
  let onScreen = 0;
  const showNow = [];
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    item.classList.add('reveal');
    if (rect.top < innerHeight) {
      if (rect.bottom > 0) item.style.transitionDelay = `${Math.min(onScreen++, 8) * 60}ms`;
      showNow.push(item);
    } else {
      observer.observe(item);
    }
  }
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => showNow.forEach((item) => item.classList.add('is-visible')));
  });

  ctx.cleanup(() => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    for (const item of items) {
      removeClass(item, 'reveal', 'is-visible');
      item.style.removeProperty('transition-delay');
      if (!item.getAttribute('style')) item.removeAttribute('style');
    }
  });
}

// ---------- scrollspy: highlight the current section in the contents ----------

function setupScrollspy(ctx) {
  const links = new Map(
    [...document.querySelectorAll('.toc a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]),
  );
  if (!links.size || !('IntersectionObserver' in window)) return;
  badge(ctx, document.querySelector('#toc-title'), 'tracks your place');

  let active = null;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (active) removeClass(active, 'is-active');
        active?.removeAttribute('aria-current');
        active = links.get(entry.target.id);
        active?.classList.add('is-active');
        active?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-35% 0px -60% 0px' },
  );
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });

  ctx.cleanup(() => {
    observer.disconnect();
    if (active) removeClass(active, 'is-active');
    active?.removeAttribute('aria-current');
  });
}

// ---------- animated counters ----------

function setupCounters(ctx) {
  const numbers = [...document.querySelectorAll('[data-count]')];
  if (!numbers.length) return;
  badge(ctx, document.querySelector('#numbers h2'), 'counts up');
  if (ctx.reducedMotion || !('IntersectionObserver' in window)) return;

  const frames = new Set();
  const animate = (node) => {
    const target = Number(node.dataset.count);
    const duration = 900 + target * 25;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      node.textContent = String(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frames.add(requestAnimationFrame(step));
    };
    node.textContent = '0';
    frames.add(requestAnimationFrame(step));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        animate(entry.target);
      }
    },
    { threshold: 0.6 },
  );
  numbers.forEach((node) => observer.observe(node));

  ctx.cleanup(() => {
    observer.disconnect();
    frames.forEach(cancelAnimationFrame);
    numbers.forEach((node) => (node.textContent = node.dataset.count));
  });
}

// ---------- sortable + filterable table ----------

function setupTable(ctx, { filter = true } = {}) {
  const table = document.getElementById('milestones-table');
  if (!table) return;
  const tbody = table.tBodies[0];
  const originalRows = [...tbody.rows];
  const originalNodes = [...tbody.childNodes];
  const headers = [...table.tHead.rows[0].cells];
  badge(ctx, table.caption, filter ? 'sort & filter' : 'sortable columns');

  if (filter) {
    // Filter box above the table
    const tools = ctx.add(el('div', { className: 'table-tools' }));
    const label = el('label', {}, 'Filter milestones');
    const input = el('input', { type: 'search', placeholder: 'Try “CSS”, “Netscape” or “2005”' });
    const count = el('span', { className: 'table-count' });
    count.setAttribute('aria-live', 'polite');
    label.append(input);
    tools.append(label, count);
    table.closest('.table-wrap').before(tools);

    const empty = ctx.add(el('p', { className: 'no-results', hidden: true }, 'No milestones match that filter.'));
    table.after(empty);

    const applyFilter = () => {
      const query = input.value.trim().toLowerCase();
      let shown = 0;
      for (const row of originalRows) {
        const match = !query || row.textContent.toLowerCase().includes(query);
        row.hidden = !match;
        if (match) shown++;
      }
      count.textContent = `Showing ${shown} of ${originalRows.length}`;
      empty.hidden = shown > 0;
    };
    ctx.on(input, 'input', applyFilter);
    applyFilter();
  }

  // Sort buttons in the column headers
  let sortState = { column: -1, dir: 1 };
  const sortBy = (column) => {
    const dir = sortState.column === column ? -sortState.dir : 1;
    sortState = { column, dir };
    const numeric = column === 0;
    const value = (row) => row.cells[column].textContent.trim();
    const rows = [...tbody.rows].sort((a, b) => {
      const result = numeric ? Number(value(a)) - Number(value(b)) : value(a).localeCompare(value(b));
      return result * dir;
    });
    tbody.append(...rows);
    headers.forEach((th, i) => {
      th.setAttribute('aria-sort', i === column ? (dir === 1 ? 'ascending' : 'descending') : 'none');
    });
  };

  headers.forEach((th, i) => {
    const text = th.textContent;
    const button = el('button', { type: 'button', className: 'sort-btn' }, text);
    th.replaceChildren(button);
    th.setAttribute('aria-sort', 'none');
    ctx.on(button, 'click', () => sortBy(i));
    ctx.cleanup(() => {
      th.replaceChildren(text);
      th.removeAttribute('aria-sort');
    });
  });

  ctx.cleanup(() => {
    tbody.replaceChildren(...originalNodes);
    originalRows.forEach((row) => (row.hidden = false));
  });
}

// ---------- instant form feedback ----------

const POLL_REPLIES = {
  html: 'Plain HTML is underrated: it loads instantly and works everywhere.',
  retro: 'Ah, the 90s. Somewhere out there, a visitor counter is still ticking.',
  flash: 'Skip intro! Flash made the web exciting, and the plugin is gone for good.',
  web2: 'Gradients, glossy buttons and a "beta" badge. Peak 2006.',
  skeuo: 'Stitched leather on a screen. Charming, and a lot of pixels for a calendar.',
  flat: 'Take away the shadows and the grid does all the work.',
  brutal: 'Raw on purpose: sometimes ugly is the point.',
  glass: 'Frosted glass over a glowing gradient. Pretty, as long as you can still read the text.',
  css: 'Same HTML, completely new look. That is the separation of content and presentation.',
  js: 'Behaviour is the newest layer, and the easiest one to overdo.',
};

function setupPoll(ctx) {
  const form = document.getElementById('poll-form');
  if (!form) return;
  const textarea = form.querySelector('textarea');
  const fieldset = form.querySelector('fieldset');
  const submit = form.querySelector('button[type="submit"]');
  badge(ctx, form.querySelector('legend'), 'instant feedback');

  // Let JavaScript give friendlier messages than the browser's built-in validation.
  form.noValidate = true;
  ctx.cleanup(() => (form.noValidate = false));

  const feedback = ctx.add(el('p', { className: 'poll-feedback' }));
  feedback.setAttribute('aria-live', 'polite');
  fieldset.after(feedback);

  const counter = ctx.add(el('span', { className: 'char-count' }));
  textarea.after(counter);
  const updateCounter = () => {
    counter.textContent = `${textarea.value.length} / ${textarea.maxLength} characters`;
  };
  ctx.on(textarea, 'input', updateCounter);
  updateCounter();

  const selected = () => form.querySelector('input[name="choice"]:checked');
  const showError = (message) => {
    feedback.classList.add('is-error');
    feedback.textContent = message;
  };

  ctx.on(form, 'change', (event) => {
    if (event.target.name !== 'choice') return;
    feedback.classList.remove('is-error');
    feedback.textContent = POLL_REPLIES[event.target.id.replace('poll-', '')] ?? '';
  });

  // Sends the answer to Formspree in the background (the form's own action),
  // so the visitor stays on the page. Without this layer the browser submits it normally.
  let result = null;
  let sending = false;
  ctx.on(form, 'submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const choice = selected();
    if (!choice) {
      showError('Pick one of the layers first.');
      form.querySelector('input[name="choice"]').focus();
      return;
    }

    sending = true;
    submit.disabled = true;
    feedback.classList.remove('is-error');
    feedback.textContent = 'Sending…';
    result?.remove();
    result = null;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.errors?.map((e) => e.message).join(', ') || String(response.status));

      const why = textarea.value.trim();
      feedback.textContent = '';
      result = el('p', { className: 'poll-result' }, `Thanks! Your answer, “${choice.closest('label').textContent.trim()}”${why ? ` (“${why}”)` : ''}, was sent. No page reload needed.`);
      result.setAttribute('role', 'status');
      form.after(result);
      form.reset();
      updateCounter();
    } catch {
      showError('Sorry, that did not go through. Please try again in a moment.');
    } finally {
      sending = false;
      submit.disabled = false;
    }
  });
  ctx.cleanup(() => {
    result?.remove();
    submit.disabled = false;
  });
}

// ---------- copy buttons on code samples ----------

function setupCopyButtons(ctx) {
  if (!navigator.clipboard) return;
  badge(ctx, document.querySelector('#html h2'), 'copy buttons on code');
  for (const pre of document.querySelectorAll('main pre')) {
    const button = ctx.add(el('button', { type: 'button', className: 'copy-btn' }, 'Copy'));
    let timer = 0;
    ctx.on(button, 'click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code').textContent);
        button.textContent = 'Copied!';
      } catch {
        button.textContent = 'Copy failed';
      }
      clearTimeout(timer);
      timer = setTimeout(() => (button.textContent = 'Copy'), 1500);
    });
    ctx.cleanup(() => clearTimeout(timer));
    pre.append(button);
  }
}

// ---------- live "time on this page" ----------

function setupTimeOnPage(ctx) {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const line = ctx.add(el('p', { className: 'time-on-page' }));
  const time = el('strong');
  line.append("You've been on this page for ", time, '.');
  badge(ctx, line, 'live timer');
  footer.prepend(line);

  const render = () => {
    const seconds = Math.floor(performance.now() / 1000);
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    time.textContent = `${m}:${s}`;
  };
  render();
  const interval = setInterval(render, 1000);
  ctx.cleanup(() => clearInterval(interval));
}

// ---------- typewriter intro (DHTML era) ----------

function setupTypewriter(ctx) {
  const lead = document.querySelector('.site-header .lead');
  if (!lead) return;
  badge(ctx, lead, 'typed out live', 'afterend');
  if (ctx.reducedMotion) return;

  const original = lead.textContent;
  lead.style.minHeight = `${lead.offsetHeight}px`; // keep the layout from jumping while it types
  lead.classList.add('is-typing');
  let length = 0;
  const timer = setInterval(() => {
    length += 2;
    lead.textContent = original.slice(0, length);
    if (length >= original.length) {
      clearInterval(timer);
      finish();
    }
  }, 28);

  const finish = () => {
    removeClass(lead, 'is-typing');
    lead.style.removeProperty('min-height');
    if (!lead.getAttribute('style')) lead.removeAttribute('style');
  };

  ctx.cleanup(() => {
    clearInterval(timer);
    lead.textContent = original;
    finish();
  });
}

// ---------- neon cursor trail (DHTML era) ----------

function setupCursorTrail(ctx) {
  badge(ctx, document.querySelector('#toc-title'), 'neon cursor trail');
  if (ctx.reducedMotion) return;

  const dots = new Set();
  let last = 0;
  ctx.on(document, 'pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    const dot = el('div', { className: 'trail-dot' });
    dot.style.left = `${event.clientX}px`;
    dot.style.top = `${event.clientY}px`;
    dot.setAttribute('aria-hidden', 'true');
    dot.addEventListener('animationend', () => {
      dot.remove();
      dots.delete(dot);
    });
    document.body.append(dot);
    dots.add(dot);
  });
  ctx.cleanup(() => dots.forEach((dot) => dot.remove()));
}

// ---------- "Skip intro" while the loading splash plays (DHTML era) ----------

function setupSkipIntro(ctx) {
  const splash = getComputedStyle(document.body, '::before');
  if (splash.display === 'none' || splash.visibility !== 'visible') return; // the splash is already over

  const root = document.documentElement;
  const button = ctx.add(el('button', { type: 'button', className: 'skip-intro' }, 'Skip intro »'));
  document.body.append(button);
  ctx.on(button, 'click', () => {
    root.classList.add('skip-intro-now');
    button.remove();
  });
  const timer = setTimeout(() => button.remove(), 2800);
  ctx.cleanup(() => {
    clearTimeout(timer);
    removeClass(root, 'skip-intro-now');
  });
}

// ---------- lightbox (Ajax era) ----------

function setupLightbox(ctx) {
  const images = [...document.querySelectorAll('main figure img')];
  if (!images.length) return;
  badge(ctx, document.querySelector('#intro figcaption'), 'click an image to enlarge', 'afterend');

  let box = null;
  let opener = null;
  const close = () => {
    box?.remove();
    box = null;
    opener?.focus({ preventScroll: true });
  };
  const open = (image) => {
    opener = image;
    box = el('div', { className: 'lightbox' });
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', image.alt);
    const big = el('img', { src: image.currentSrc || image.src, alt: image.alt });
    const caption = el('p', {}, image.closest('figure')?.querySelector('figcaption')?.textContent ?? image.alt);
    const closeButton = el('button', { type: 'button' }, 'Close ✕');
    box.append(big, caption, closeButton);
    box.addEventListener('click', close);
    document.body.append(box);
    closeButton.focus();
  };

  images.forEach((image) => {
    image.classList.add('zoomable');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `Enlarge: ${image.alt}`);
    ctx.on(image, 'click', () => open(image));
    ctx.on(image, 'keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(image);
      }
    });
  });
  ctx.on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && box) close();
  });

  ctx.cleanup(() => {
    box?.remove();
    for (const image of images) {
      removeClass(image, 'zoomable');
      image.removeAttribute('tabindex');
      image.removeAttribute('role');
      image.removeAttribute('aria-label');
    }
  });
}

// ---------- smooth scrolling for the contents links (jQuery era) ----------

function setupSmoothScroll(ctx) {
  badge(ctx, document.querySelector('#toc-title'), 'smooth scrolling');
  ctx.on(document, 'click', (event) => {
    const link = event.target.closest?.('.toc a[href^="#"]');
    const target = link && document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: ctx.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
}

// ---------- back to top (jQuery / Bootstrap eras) ----------

function setupBackToTop(ctx) {
  const button = ctx.add(el('button', { type: 'button', className: 'back-to-top' }, '↑ Top'));
  button.setAttribute('aria-label', 'Back to top');
  document.body.append(button);

  const update = () => {
    const shown = scrollY > 500;
    button.classList.toggle('is-shown', shown);
    button.tabIndex = shown ? 0 : -1;
    button.setAttribute('aria-hidden', String(!shown));
  };
  ctx.on(window, 'scroll', update, { passive: true });
  ctx.on(button, 'click', () => scrollTo({ top: 0, behavior: ctx.reducedMotion ? 'auto' : 'smooth' }));
  update();
}

// ---------- cursor spotlight (glass era) ----------

function setupSpotlight(ctx) {
  badge(ctx, document.querySelector('.site-header .kicker'), 'cursor spotlight', 'afterend');
  if (ctx.reducedMotion) return;

  const light = ctx.add(el('div', { className: 'spotlight' }));
  light.setAttribute('aria-hidden', 'true');
  document.body.append(light);
  let frame = 0;
  ctx.on(document, 'pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const { clientX, clientY } = event;
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      light.style.setProperty('--mx', `${clientX}px`);
      light.style.setProperty('--my', `${clientY}px`);
    });
  });
  ctx.cleanup(() => cancelAnimationFrame(frame));
}

// ---------- which features exist ----------

const FEATURES = {
  progress: setupProgressBar,
  reveal: setupReveal,
  scrollspy: setupScrollspy,
  counters: setupCounters,
  table: (ctx) => setupTable(ctx, { filter: true }),
  sortTable: (ctx) => setupTable(ctx, { filter: false }),
  poll: setupPoll,
  copy: setupCopyButtons,
  timeOnPage: setupTimeOnPage,
  typewriter: setupTypewriter,
  cursorTrail: setupCursorTrail,
  skipIntro: setupSkipIntro,
  lightbox: setupLightbox,
  smoothScroll: setupSmoothScroll,
  backToTop: setupBackToTop,
  spotlight: setupSpotlight,
};
