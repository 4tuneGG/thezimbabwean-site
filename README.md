# [theZimbabwean].company — supplier landing page

Static landing page for the supplier / maker network. Hosted on GitHub Pages.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The live page. Self-contained — no build step, no dependencies. |
| `Suppliers.dc.html` | Original design-tool export, kept for reference. **Not** served; it needs a `support.js` runtime that isn't in this repo. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |
| `CNAME` | Custom domain (added when the domain is connected). |

## Editing

Everything is in `index.html`. To change the WhatsApp number, edit one line near the bottom:

```js
var WHATSAPP_NUMBER = "071 386 6434";
```

Local numbers (`071…`) are converted to international format (`26371…`) automatically.

## How the form works

There's no backend. On submit, the page builds a formatted message from the fields
and opens `https://wa.me/<number>?text=<message>` so the enquiry lands in WhatsApp
with everything already typed out. If the popup is blocked, it navigates directly instead.

## Deploying

Push to `main`. GitHub Pages redeploys automatically (usually under a minute).
