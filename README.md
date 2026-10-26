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

## Lead tracking (Meta pixel)

The page reports to the Meta dataset **Zim.company Data**, ID `1670660514650846`,
owned by the **Supply The Gallery** business portfolio. Ads run from
**Zim.company Ad Account A** (`1094165106862577`).

Two events fire:

| Event | When | Sent with |
| --- | --- | --- |
| `PageView` | Every page load, from the base code in `<head>`. | Nothing extra. |
| `Lead` | The supplier submits the form, just before the WhatsApp hand-off. | `content_name` = the "What you do" dropdown value. |

`Lead` is fired from inside the submit handler rather than set up as a codeless
button rule in Events Manager. Codeless rules match on button text, and this
button navigates away to `wa.me` immediately -- firing it ourselves is the only
way to be sure the event leaves the page first. Don't add a rule for
"Continue on WhatsApp" in Events Manager as well, or every lead counts twice.

Nothing from the form body goes to Meta. The name, location, product
description and link are the supplier's own words and stay out of the event.
The dropdown value is a fixed list of five options, so it carries no personal
detail and tells us which kind of supplier is answering the ad.

### Setting up the ads against this

1. **Verify the domain.** Business settings -> Brand safety -> Domains, add
   `zimbabwean.company`. Use the meta-tag method and paste the tag into
   `index.html` next to the other `<meta>` tags. Without this, Meta won't let
   the ad account optimise for events on a domain it can't prove you own.
2. **Check the event arrives.** Events Manager -> the dataset -> Test events,
   then load <https://zimbabwean.company>, fill the form and submit. `PageView`
   and `Lead` should both appear.
3. **Rank `Lead` first** in Aggregated Event Measurement for the domain, so it
   survives iOS opt-outs.
4. **Build the campaign** on objective **Leads**, conversion location
   **Website**, and pick `Lead` on this dataset as the conversion event. The
   existing Page post can be used as the creative via "Use existing post".

No custom conversion is needed -- `Lead` is a standard event, so it is
selectable directly once it has fired at least once. Add one only if you later
want to split leads by `content_name` (manufacturers vs artists, say).

## Domain

Live at <https://zimbabwean.company> (and `www.`, which serves the same page).

The domain is registered with Cloudflare and the DNS lives there: four A and
four AAAA records on the apex pointing at GitHub Pages, plus `www` as a CNAME
to `4tunegg.github.io`.

**GitHub Pages hosts the files; Cloudflare proxies them.** All nine records are
proxied (orange cloud), and that is deliberate -- GitHub Pages' IP range
(185.199.108-111.153) is unreachable from Zimbabwean networks, on both fixed
line and mobile. Unproxied, the site resolved fine and then timed out on
connect for exactly the audience it is for. Proxied, visitors reach
Cloudflare's edge instead and Cloudflare fetches from GitHub, so the blocked
range never appears in the path.

Two things this depends on, so don't change them casually:

- **SSL/TLS mode must stay `Full`.** "Flexible" sends plain HTTP to Pages,
  which forces HTTPS, and the two bounce off each other in a redirect loop.
  `Full` also means Cloudflare won't reject the origin certificate if GitHub
  ever fails to renew it, which proxying can cause.
- **The `_github-pages-challenge-4tunegg` TXT record must stay.** It is what
  keeps the domain verified against takeover. It is a DNS record, so the proxy
  doesn't affect it.

The records were unproxied up to 2026-10-15, which was necessary while GitHub
issued the certificate and verified domain ownership -- the proxy blocks the
challenge both of those need. Both are complete, so that constraint is gone.
If the certificate ever needs reissuing, grey-cloud the records, let GitHub
issue, then turn the proxy back on.

## Deploying

Push to `main`. GitHub Pages redeploys automatically (usually under a minute).
