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

## Where the data comes from
- **Scores, scorecards, commentary, match info:** ESPNcricinfo's data through ESPN's public sports API (`site.web.api.espn.com`), called directly from the phone. ESPNcricinfo's own API blocks server requests, so this route is used instead; the match IDs are the same.
- **News:** the ESPNcricinfo news RSS feed, fetched by the Cloudflare Worker `crease-relay` (`https://crease-relay.vinoth-jey.workers.dev`), because Safari can't read that feed directly. The relay address is built into the app.
- If ESPN can't be reached, the app falls back to ESPNcricinfo's live-scores RSS (via the relay), then to the last saved scores.

## Live setup
- App: https://jayabalanvinothkumar.github.io/VJCrickbuzz/ (GitHub Pages, `main` branch)
- Relay: Cloudflare Worker `crease-relay` on the vinoth-jey.workers.dev subdomain, code in `relay/worker.js`

## Install on the iPhone
Open the app link in **Safari** → Share → **Add to Home Screen**.

## Updating
Change files, upload them to the repo again, and bump `CACHE = "crease-v1"` in `sw.js` (v2, v3 …) so the iPhone picks up the new version. Close and reopen the app twice.

*Unofficial app for personal use. Data © ESPNcricinfo.*
