# The Evolution of the Web

An interactive single page that lets visitors add and remove the layers of a website, and travel through web design eras, to see what each one contributes. The content never changes, only the layers on top of it.

| # | Layer (`?layer=`) | What's applied |
|---|-------------------|----------------|
| 1 | `html` (1991) | Nothing. Browser default styles. |
| 2 | `retro` (1996) | `layers/retro.css`, a recreation of the web around 1996 |
| 3 | `flash` (~1999) | `layers/flash.css`, a CSS imitation of the Flash & DHTML look (black, neon, loading splash) |
| 4 | `web2` (~2006) | `layers/web2.css`, glossy gradients, rounded corners, "beta" badges |
| 5 | `skeuo` (~2010) | `layers/skeuo.css`, leather, stitching, paper and wood |
| 6 | `flat` (~2013) | `layers/flat.css`, flat colour, Bootstrap-style grid |
| 7 | `brutal` (~2020) | `layers/brutal.css`, thick borders, hard shadows, monospace |
| 8 | `glass` (~2021) | `layers/glass.css`, frosted translucent panels over a glowing gradient |
| 9 | `css` (today) | `layers/modern.css` |
| 10 | `js` (today) | `layers/modern.css` + `layers/app.js` |

Visitors move between layers with the **Add / Back** buttons or by clicking a year in the **era timeline**. The "What just changed?" panel shows an era card (browsers, fonts, colours and techniques of the time) and the code that was just added.

**Compare eras:** the "Compare eras ⇄" button opens `compare.html`, which shows two eras side by side with a draggable divider (or the slider underneath). Both sides scroll together, matched section by section. Each side is an iframe of `index.html?layer=…&embed=1`; embedded copies don't count visits.

**Tab titles and icons:** each era sets its own browser-tab title and emoji icon, defined per stage in `controller.js`.

## Run locally

The page uses `fetch()` and a dynamic `import()`, so it has to be served over HTTP (opening `index.html` as a file won't work). Either of these works:

- **VS Code Live Server:** right-click `index.html` → *Open with Live Server*.
- **Python:**
  ```sh
  python3 -m http.server 8000
  # open http://localhost:8000
  ```

Add `?layer=html|retro|flash|web2|skeuo|flat|brutal|glass|css|js` to the URL to open the page at a specific layer.

## How it works

- `index.html` holds all the content. Its only script is `controller.js`.
- `controller.js` is the openly disclosed switcher. It adds and removes the layer stylesheet, imports `layers/app.js` for the JavaScript layer, draws the buttons and the era timeline, and fills the "What just changed?" panel. It also loads [GoatCounter](https://www.goatcounter.com/) to count visits (no cookies). It never applies any styling itself.
- `compare.html`, `compare.css` and `compare.js` are the comparison page. Its era list at the top of `compare.js` must be kept in sync with `STAGES` in `controller.js` when an era is added.
- `layers/ui-shared.css` styles the controls bar for the newer eras. Each era stylesheet imports it and sets a few `--ui-*` variables to match its look.
- `layers/app.js` exports `mount()`, which returns an `unmount()` function that removes every listener, observer, timer and injected element. Visual states (`.reveal`, `.js-badge`, …) live in `modern.css`. The script only toggles classes.
- All motion respects `prefers-reduced-motion` (the Flash loading splash is skipped).

## Deploy

It's a static site with no build step. Upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).
