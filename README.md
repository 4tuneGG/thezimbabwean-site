# [theZimbabwean].company — supplier landing page

Static landing page for the supplier / maker network. Hosted on GitHub Pages.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The live page. Self-contained — no build step, no dependencies. |
| `banner.jpg` | Hero background (Joina City, Harare). 817x540 — see note below. |
| `Suppliers.dc.html` | Original design-tool export, kept for reference. **Not** served; it needs a `support.js` runtime that isn't in this repo. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |
| `CNAME` | Custom domain. Holds `zimbabwean.company`. |

## Editing

Everything is in `index.html`. To change the WhatsApp number, edit one line near the bottom:

```js
var WHATSAPP_NUMBER = "071 386 6434";
```

Local numbers (`071…`) are converted to international format (`26371…`) automatically.

## The banner image

`banner.jpg` is only 817x540, so it upscales on desktop. The cream scrim over it
(`.hero-scrim`) is doing double duty: it keeps the headline readable and it stops the
upscaling from reading as blur. If a higher-resolution version turns up — 2000px wide or
more — drop it in as `banner.jpg` and the scrim can be lightened.

## How the form works

There's no backend. On submit, the page builds a formatted message from the fields
and opens `https://wa.me/<number>?text=<message>` so the enquiry lands in WhatsApp
with everything already typed out. If the popup is blocked, it navigates directly instead.

## Domain

Live at <https://zimbabwean.company> (and `www.`, which serves the same page).

The domain is registered with Cloudflare and the DNS lives there: four A and
four AAAA records on the apex pointing at GitHub Pages, plus `www` as a CNAME
to `4tunegg.github.io`. All nine are **DNS-only (grey cloud), not proxied** --
putting Cloudflare's proxy in front of Pages blocks the challenge GitHub needs
to renew the TLS certificate. If the certificate ever stops renewing, check
that first.

If you do ever want the records proxied, Cloudflare's SSL/TLS mode must be
**Full** -- "Flexible" sends plain HTTP to Pages, which forces HTTPS, and the
two bounce off each other in a redirect loop.

## Deploying

Push to `main`. GitHub Pages redeploys automatically (usually under a minute).
