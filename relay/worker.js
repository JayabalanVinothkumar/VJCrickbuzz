// Crease relay - a tiny Cloudflare Worker (the free plan is plenty).
// The Crease web app cannot call ESPNcricinfo directly from Safari (the browser blocks
// cross-site requests), so this Worker fetches the data and passes it on - without any ads.
//
//   GET /ping                                   -> health check
//   GET /api/pages/matches/current?latest=true  -> live / recent / upcoming matches
//   GET /api/pages/match/home?seriesId=&matchId=
//   GET /api/pages/match/scorecard?seriesId=&matchId=
//   GET /api/pages/match/comments?seriesId=&matchId=&sortDirection=DESC
//   GET /rss/news                               -> ESPNcricinfo news RSS
//   GET /rss/live                               -> ESPNcricinfo live-scores RSS (fallback)
//
// /api/* first tries ESPNcricinfo's JSON API. If that is refused, it loads the matching
// espncricinfo.com page and returns the JSON data embedded in it (__NEXT_DATA__).
// Optional: add a Worker secret RELAY_KEY so only your app can use the relay.

const API = "https://hs-consumer-api.espncricinfo.com/v1/";
const SITE = "https://www.espncricinfo.com";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const PAGE_FOR = {
  "pages/matches/current": () => "/live-cricket-score",
  "pages/match/home": q => `/series/s-${q.get("seriesId")}/m-${q.get("matchId")}/live-cricket-score`,
  "pages/match/scorecard": q => `/series/s-${q.get("seriesId")}/m-${q.get("matchId")}/full-scorecard`,
  "pages/match/comments": q => `/series/s-${q.get("seriesId")}/m-${q.get("matchId")}/ball-by-ball-commentary`,
};
const TTL = { "pages/matches/current": 20, "pages/match/home": 15, "pages/match/scorecard": 15, "pages/match/comments": 10 };
const RSS = {
  news: SITE + "/rss/content/story/feeds/0.xml",
  live: "https://static.cricinfo.com/rss/livescores.xml",
};

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "content-type,x-relay-key",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname === "/ping") return json({ ok: true, app: "crease-relay", keyRequired: !!env.RELAY_KEY }, 200, cors);

    if (env.RELAY_KEY) {
      const k = req.headers.get("x-relay-key") || url.searchParams.get("key");
      if (k !== env.RELAY_KEY) return json({ error: "Wrong or missing relay password" }, 401, cors);
    }
    url.searchParams.delete("key");

    try {
      if (url.pathname.startsWith("/rss/")) {
        const src = RSS[url.pathname.slice(5)];
        if (!src) return json({ error: "Unknown feed" }, 404, cors);
        return await cached(ctx, "rss:" + src, 120, async () => {
          const r = await fetch(src, { headers: { "User-Agent": UA, "Accept": "application/rss+xml,text/xml,*/*" } });
          if (!r.ok) throw new Error("Feed HTTP " + r.status);
          return new Response(await r.text(), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
        }, cors);
      }

      if (url.pathname.startsWith("/api/")) {
        const path = url.pathname.slice(5).replace(/\/+$/, "");
        if (!PAGE_FOR[path]) return json({ error: "Unknown endpoint " + path }, 404, cors);
        const q = url.searchParams;
        if (!q.has("lang")) q.set("lang", "en");
        return await cached(ctx, "api:" + path + "?" + q.toString(), TTL[path] || 15, async () => {
          const errors = [];
          // 1) ESPNcricinfo JSON API
          try {
            const r = await fetch(API + path + "?" + q.toString(), {
              headers: { "User-Agent": UA, "Accept": "application/json, text/plain, */*", "Accept-Language": "en-GB,en;q=0.9", "Origin": SITE, "Referer": SITE + "/" },
            });
            if (r.ok) {
              const data = await r.json();
              return json({ source: "api", data });
            }
            errors.push("api " + r.status);
          } catch (e) { errors.push("api " + e.message); }
          // 2) The public web page, using the JSON embedded in it
          try {
            const r = await fetch(SITE + PAGE_FOR[path](q), {
              headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-GB,en;q=0.9" },
              redirect: "follow",
            });
            if (!r.ok) throw new Error("page " + r.status);
            const html = await r.text();
            const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (!m) throw new Error("page has no data block");
            const nd = JSON.parse(m[1]);
            const data = nd?.props?.appPageProps?.data ?? nd?.props?.pageProps ?? nd?.props ?? nd;
            return json({ source: "page", data });
          } catch (e) { errors.push(e.message); }
          throw new Error("ESPNcricinfo refused: " + errors.join(" | "));
        }, cors);
      }
      return json({ error: "Not found" }, 404, cors);
    } catch (e) {
      return json({ error: String(e.message || e) }, 502, cors);
    }
  },
};

// Small edge cache so many refreshes don't hit ESPNcricinfo each time.
async function cached(ctx, key, ttl, make, cors) {
  const cache = caches.default;
  const ck = new Request("https://crease-cache.local/" + encodeURIComponent(key));
  let res = await cache.match(ck);
  if (!res) {
    res = await make();
    const copy = new Response(res.clone().body, res);
    copy.headers.set("Cache-Control", "public, max-age=" + ttl);
    ctx.waitUntil(cache.put(ck, copy));
  }
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  out.headers.set("Cache-Control", "no-store");
  return out;
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra } });
}
