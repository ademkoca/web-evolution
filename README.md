# The Evolution of the Web

An interactive single page that lets visitors add and remove the layers of a website and see what each one contributes. The content never changes, only the layers on top of it.

| Layer | What's applied |
|-------|----------------|
| 1. HTML only | Nothing. Browser default styles. |
| 2. 90s styling | `layers/retro.css`, a recreation of the web around 1996 |
| 3. Modern CSS | `layers/modern.css` |
| 4. JavaScript | `layers/modern.css` + `layers/app.js` |

## Run locally

The page uses `fetch()` and a dynamic `import()`, so it has to be served over HTTP (opening `index.html` as a file won't work):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Add `?layer=html|retro|css|js` to the URL to open the page at a specific layer.

## How it works

- `index.html` holds all the content. Its only script is `controller.js`.
- `controller.js` is the openly disclosed switcher. It adds and removes the layer stylesheet, imports `layers/app.js` for the JavaScript layer, and fills the "What just changed?" panel with the added file's code and size. It never applies any styling itself.
- `layers/app.js` exports `mount()`, which returns an `unmount()` function that removes every listener, observer, timer and injected element. Visual states (`.reveal`, `.js-badge`, …) live in `modern.css`. The script only toggles classes.
- All motion respects `prefers-reduced-motion`.

## Deploy

It's a static site with no build step. Upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).
