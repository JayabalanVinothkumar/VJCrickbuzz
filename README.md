# Crease – ad-free live cricket for iPhone

A Cricbuzz-style cricket app with **no ads**, installed on your iPhone home screen.
All data (live scores, full scorecards, ball-by-ball commentary, match info, news) comes from **ESPNcricinfo**.

## What's in it
- **Home** – featured live and recent matches (swipe), upcoming fixtures, latest news
- **Matches** – Live / Recent / Upcoming, grouped by series
- **Match screen** – Live (batters at the crease, current bowlers, last wicket, recent balls), Scorecard (every innings, extras, fall of wickets, bowling), Commentary (ball by ball, 4/6/W highlighted), Info (venue, toss, umpires, player of the match)
- Auto-refresh during live play (every 20 s by default), dark mode, last scores kept for offline use
- Demo data until the relay is connected, so you can try it straight away

## Files
| File | Purpose |
|---|---|
| `index.html` | the whole app |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | home-screen install + offline shell |
| `relay/worker.js` | the free Cloudflare Worker that fetches ESPNcricinfo data for the app |

## Setup (about 10 minutes, free)

### 1. Put the app on GitHub Pages
1. On github.com create a new public repository named **`VJCrickbuzz`**.
2. Upload `index.html`, `manifest.webmanifest`, `sw.js`, `icon-180.png`, `icon-192.png`, `icon-512.png` (the `relay` folder can go too; it is not used by the page).
3. **Settings → Pages →** Source: *Deploy from a branch*, branch `main`, folder `/ (root)` → Save.
4. After a minute the app is at `https://jayabalanvinothkumar.github.io/VJCrickbuzz/`.

### 2. Create the relay (Cloudflare Worker)
Safari blocks a web page from reading ESPNcricinfo directly, so this tiny Worker fetches the data for you.
1. **dash.cloudflare.com → Workers & Pages → Create →** "Hello World" Worker, name it `crease-relay`, **Deploy**.
2. **Edit code**, delete everything, paste the full content of `relay/worker.js`, **Deploy**.
3. Optional but recommended: **Settings → Variables and Secrets → Add →** type *Secret*, name `RELAY_KEY`, any password. Deploy.
4. Check it in Safari: `https://crease-relay.<your-subdomain>.workers.dev/ping` should show `{"ok":true,...}`.

### 3. Install on the iPhone
1. Open `https://jayabalanvinothkumar.github.io/VJCrickbuzz/` in **Safari**.
2. Share button → **Add to Home Screen** → Add.
3. Open Crease from the home screen → **More** → enter the relay URL (and password) → **Save** → **Test relay**.
   It should say "✅ Works – N matches found".

## How the data is fetched
The relay first asks ESPNcricinfo's JSON API (the same one their own site uses). If that is refused, it loads the normal espncricinfo.com page and reads the data embedded in it. If both fail, the app falls back to ESPNcricinfo's live-scores RSS feed (basic scores only), then to the last saved scores.
ESPNcricinfo can change its site at any time; if scores stop loading, the **Test relay** message shows the reason.

## Updating
Change files, upload them to the repo again, and bump `CACHE = "crease-v1"` in `sw.js` (v2, v3 …) so the iPhone picks up the new version. Close and reopen the app twice.

*Unofficial app for personal use. Data © ESPNcricinfo.*
