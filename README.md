# [theZimbabwean].company — supplier landing page

Static landing page for the supplier / maker network. Hosted on GitHub Pages.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The live page. Self-contained — no build step, no dependencies. |
| `banner.jpg` | Hero background (Joina City, Harare). 817x540 — see note below. |
| `Suppliers.dc.html` | Original design-tool export, kept for reference. **Not** served; it needs a `support.js` runtime that isn't in this repo. |
| `worker/capi.js` | Cloudflare Worker behind `zimbabwean.company/capi`. Relays events to Meta's Conversions API. Deployed separately from the site -- see below. |
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

Four events fire, one per step of the funnel:

| Event | When | Sent with |
| --- | --- | --- |
| `PageView` | Every page load, from the base code in `<head>`. | Nothing extra. |
| `ViewContent` | The form section scrolls into view. | `content_name` = `Supplier form`. |
| `FormStart` | The first field is typed in or chosen. Custom event, not a standard one -- Meta has no standard event for starting a form. | Nothing extra. |
| `Lead` | The submit button is pressed, just before the WhatsApp hand-off. | `content_name` = the "What you do" dropdown value. |

`Lead` is the conversion the ad set optimises for.

### Why `Lead` fires on the button, not on the message being sent

The honest answer is that the page cannot see the message being sent. The
hand-off opens `wa.me` in WhatsApp, which is a different application; nothing
comes back. The button press -- with every required field filled, since the
form is validated first -- is the last thing this page can observe.

The gap is real and worth remembering when reading the numbers: someone can
press the button, land in WhatsApp and never hit send. So `Lead` counts intent
to message, not messages received. Judge cost per lead against what actually
arrives in WhatsApp, not against the figure in Ads Manager.

`ViewContent` and `FormStart` exist to make that gap visible from the other
side. If `ViewContent` is high and `FormStart` is low, the form is being seen
and ignored. If `FormStart` is high and `Lead` is low, people are starting and
giving up partway -- a form problem, not an ad problem.

All three are fired from the page's own code rather than set up as codeless
rules in Events Manager. Codeless rules match on button text, and this button
navigates away immediately; firing them ourselves is the only way to be sure
the event leaves the page first. Don't add rules for the same actions in
Events Manager as well, or everything counts twice.

Nothing from the form body goes to Meta. The name, location, product
description and link are the supplier's own words and stay out of the events.
The dropdown value is a fixed list of five options, so it carries no personal
detail and tells us which kind of supplier is answering the ad.

### Setting up the ads against this

1. **Verify the domain.** Done -- the `facebook-domain-verification` meta tag
   is in `index.html` and Business settings has confirmed it. Leave the tag
   where it is; verification is rechecked, not one-and-done.
2. **Check the events arrive.** Events Manager -> the dataset -> Test events,
   then load <https://zimbabwean.company>, scroll to the form, fill it and
   submit. All four should appear in order.
3. **Rank `Lead` first** in Aggregated Event Measurement for the domain, so it
   survives iOS opt-outs.
4. **Build the campaign** on objective **Leads**, conversion location
   **Website**, and pick `Lead` on this dataset as the conversion event.

Until `Lead` has fired at least once, Events Manager reports the dataset as
having no conversion events set up, and the ad set has nothing to optimise
toward. One real submission clears it.

No custom conversion is needed -- `Lead` is a standard event, so it is
selectable directly once it has fired. Add one only if you later want to split
leads by `content_name` (manufacturers vs artists, say).

## The Conversions API relay

Every event is sent twice: once by the browser pixel, once server-side by a
Cloudflare Worker. Meta matches the pair on `event_name` + `event_id` and
counts it once.

This is not belt and braces. The browser copy is the one that goes missing --
ad blockers drop `fbevents.js`, iOS tracking restrictions drop the request,
and a page navigating to WhatsApp can kill it mid-flight. The server copy
leaves from Cloudflare and none of that applies.

| | |
| --- | --- |
| Worker | `zim-capi`, source in `worker/capi.js` |
| Routes | `zimbabwean.company/capi`, `www.zimbabwean.company/capi` |
| Account | `3bef49b210224eedf429fc66c061a006` |
| Zone | `7da0bc45b27ffc740d530f1d9779fa26` |

It sits on the site's own domain on purpose. Same-origin means no CORS
preflight, and -- the part that matters -- the browser sends the `_fbp` and
`_fbc` cookies, which are most of how Meta matches a visitor to a person who
saw the ad. A separate subdomain would not get them.

The page uses `navigator.sendBeacon`, which the browser promises to deliver
even while the page is being torn down. That is the same failure the WhatsApp
hand-off used to cause, solved properly rather than by waiting half a second.

### The access token

`FB_ACCESS_TOKEN` is a Worker secret. It is not in this repo, not in
`worker/capi.js`, and must never be committed.

To set or rotate it:

1. In Meta Business settings, create a System User with access to the
   Zim.company Data dataset, and generate a token with `ads_management`.
2. Cloudflare dashboard -> Workers & Pages -> `zim-capi` -> Settings ->
   Variables and Secrets -> add `FB_ACCESS_TOKEN`, **Encrypt**, save.

Until it is set the Worker logs a line and returns `204`. Events are dropped
rather than erroring, so the page is never affected -- which also means a
missing token fails quietly. If server events stop appearing in Events
Manager, check the token first.

`DATASET_ID` is a plain variable, already set to `1670660514650846`.

### Checking it works

Events Manager shows the source of each event. Once the token is set, events
should arrive marked both *Browser* and *Server*, with deduplication reported.
Seeing double the expected count means the `event_id` is not matching.

The endpoint only accepts `POST` from this site's own origin -- anything else
gets `403`. That matters: it is a public URL, and without the check anyone
could post fake conversions, which would corrupt the signal the campaign
optimises on rather than merely the reporting.

To redeploy after editing `worker/capi.js`, upload it to the `zim-capi` Worker
script. Pushing to `main` deploys the site only; the Worker is separate.

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
