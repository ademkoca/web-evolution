# The Evolution of the Web

An interactive single page that lets visitors add and remove the layers of a website, and travel through web design eras, to see what each one contributes. The content never changes, only the layers on top of it.

| # | Era (`?layer=`) | Stylesheet | JavaScript when switched on |
|---|-----------------|------------|-----------------------------|
| 1 | `html` (1991) | none | not available (JavaScript didn't exist yet) |
| 2 | `retro` (1996) | `layers/retro.css` | not available (too new, rarely used) |
| 3 | `flash` (~1999) | `layers/flash.css`, a CSS imitation of Flash & DHTML | typewriter intro, neon cursor trail, "Skip intro" button, form feedback |
| 4 | `web2` (~2006) | `layers/web2.css` | lightbox, live-filtering sortable table, background form sending |
| 5 | `skeuo` (~2010) | `layers/skeuo.css` | fade-ins, smooth scrolling, back-to-top, form feedback |
| 6 | `flat` (~2013) | `layers/flat.css` | scrollspy, counters, sortable table, back-to-top |
| 7 | `brutal` (~2020) | `layers/brutal.css` | copy buttons, sortable and filterable table, counters, form feedback |
| 8 | `glass` (~2021) | `layers/glass.css` | progress bar, blur-in reveal, cursor spotlight, scrollspy |
| 9 | `css` (today) | `layers/modern.css` | everything: progress bar, reveal, scrollspy, counters, table, copy buttons, form feedback, live timer, theme switch |

**JavaScript is a switch, separate from the era.** The `⚡ JavaScript: ON/OFF` button works in any era that can use scripting, and the choice carries over when you change era (it pauses in the 1991 and 1996 eras and resumes later). Each era gets different scripting, the kind that was typical for it. The list lives in `ERA_FEATURES` in `layers/app.js`; the matching descriptions shown to visitors are in `STAGES` in `controller.js`. Add `&js=1` to a link to open an era with JavaScript on (`?layer=flash&js=1`). Old `?layer=js` links still work and open modern CSS with JavaScript on.

Visitors move between eras with the **Add / Back** buttons or by clicking a year in the **era timeline**. The "What just changed?" panel shows an era card (browsers, fonts, colours and techniques of the time) and the code that was just added.

**Compare eras:** the "Compare ⇄" button opens `compare.html`, which shows two eras side by side with a draggable divider (or the slider underneath). Each side has its own ⚡ JS checkbox, so you can compare the same era with JavaScript off and on. Both sides scroll together, matched section by section. Each side is an iframe of `index.html?layer=…&embed=1`; embedded copies don't count visits.

**Tab titles:** each era sets its own browser-tab title (defined per stage in `controller.js`); the favicon stays the same.

## Run locally

The page uses `fetch()` and a dynamic `import()`, so it has to be served over HTTP (opening `index.html` as a file won't work). Either of these works:

- **VS Code Live Server:** right-click `index.html` → *Open with Live Server*.
- **Python:**
  ```sh
  python3 -m http.server 8000
  # open http://localhost:8000
  ```

Add `?layer=html|retro|flash|web2|skeuo|flat|brutal|glass|css` (and optionally `&js=1`) to the URL to open the page at a specific era.

## How it works

- `index.html` holds all the content. Its only script is `controller.js`.
- `controller.js` is the openly disclosed switcher. It adds and removes the layer stylesheet, adds `layers/js.css` and imports `layers/app.js` when JavaScript is switched on, draws the buttons and the era timeline, and fills the "What just changed?" panel. It also loads [GoatCounter](https://www.goatcounter.com/) to count visits (no cookies). It never applies any styling itself.
- `compare.html`, `compare.css` and `compare.js` are the comparison page. Its era list at the top of `compare.js` (including which eras allow JavaScript) must be kept in sync with `STAGES` in `controller.js` when an era is added.
- `layers/ui-shared.css` styles the controls bar for the newer eras. Each era stylesheet imports it and sets a few `--ui-*` variables to match its look.
- `layers/app.js` exports `mount(era)`, which starts that era's features and returns an `unmount()` function that removes every listener, observer, timer and injected element, so turning JavaScript off leaves the page exactly as it was. The script only adds classes and elements; how they look lives in `layers/js.css`, which each era themes through a few `--js-*` variables.
- All motion respects `prefers-reduced-motion` (the Flash loading splash is skipped).

## Deploy

It's a static site with no build step. Upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).
