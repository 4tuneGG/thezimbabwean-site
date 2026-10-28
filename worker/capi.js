// Conversions API relay for the Zim.company dataset.
//
// The page sends each pixel event here as well as to the browser pixel, with a
// shared event_id so Meta can tell the two copies apart and count them once.
// The point is the events the browser copy loses: ad blockers, iOS tracking
// restrictions, and a page that navigates away mid-request all eat browser
// beacons. A server-to-server copy is not blockable.
//
// Deployed to a route on zimbabwean.company/capi, so it is same-origin with
// the site. That is deliberate -- it means no CORS preflight, and the browser
// sends the _fbp / _fbc cookies, which are what Meta matches a visitor on.
//
// FB_ACCESS_TOKEN is a secret set in the Cloudflare dashboard, never in this
// file and never in the repo.

const ALLOWED_EVENTS = ["PageView", "ViewContent", "FormStart", "Lead"];
const GRAPH_VERSION = "v21.0";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    // Only our own pages may post here. This endpoint is public, so without
    // the check anyone could inflate the conversion numbers the campaign
    // optimises on -- which would poison delivery, not just reporting.
    if (!fromOurSite(request)) {
      return new Response(null, { status: 403 });
    }

    // A missing token must never break the page. Dropping the server copy
    // costs us some matching; a failed request in the page costs us trust.
    if (!env.FB_ACCESS_TOKEN) {
      console.log("capi: FB_ACCESS_TOKEN is not set, dropping the event");
      return new Response(null, { status: 204 });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(null, { status: 400 });
    }

    if (!body || ALLOWED_EVENTS.indexOf(body.event_name) === -1) {
      return new Response(null, { status: 400 });
    }

    const cookies = parseCookies(request.headers.get("Cookie") || "");

    const event = {
      event_name: body.event_name,
      event_time: eventTime(body.event_time),
      event_id: String(body.event_id || "").slice(0, 100),
      event_source_url: trimString(body.event_source_url, 500),
      action_source: "website",
      user_data: dropEmpty({
        client_ip_address: request.headers.get("CF-Connecting-IP"),
        client_user_agent: request.headers.get("User-Agent"),
        fbp: cookies._fbp,
        fbc: cookies._fbc
      }),
      custom_data: customData(body.custom_data)
    };

    const url =
      "https://graph.facebook.com/" +
      GRAPH_VERSION +
      "/" +
      env.DATASET_ID +
      "/events?access_token=" +
      encodeURIComponent(env.FB_ACCESS_TOKEN);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] })
    });

    if (!res.ok) {
      // Logged rather than returned: the visitor cannot act on it, and the
      // page should carry on regardless. Read it with wrangler tail.
      console.log("capi: Meta rejected the event", res.status, await res.text());
    }

    return new Response(null, { status: 204 });
  }
};

function fromOurSite(request) {
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  // sendBeacon sets Origin; a plain fetch may only set Referer.
  const source = origin || referer || "";
  if (!source) return false;
  return (
    source.indexOf("https://zimbabwean.company") === 0 ||
    source.indexOf("https://www.zimbabwean.company") === 0
  );
}

function parseCookies(header) {
  const out = {};
  header.split(";").forEach(function (part) {
    const eq = part.indexOf("=");
    if (eq < 0) return;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  });
  return out;
}

// Meta rejects events dated in the future or more than seven days old, so a
// clock-skewed phone would otherwise lose its conversion entirely.
function eventTime(value) {
  const now = Math.floor(Date.now() / 1000);
  const t = Number(value);
  if (!isFinite(t) || t > now || t < now - 6 * 24 * 60 * 60) return now;
  return Math.floor(t);
}

function trimString(value, max) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

// Allow-list, not pass-through. The form body is the supplier's own words and
// has no business leaving our servers; only the dropdown value is wanted.
function customData(value) {
  if (!value || typeof value !== "object") return undefined;
  const name = trimString(value.content_name, 100);
  return name ? { content_name: name } : undefined;
}

function dropEmpty(obj) {
  const out = {};
  Object.keys(obj).forEach(function (key) {
    if (obj[key]) out[key] = obj[key];
  });
  return out;
}
