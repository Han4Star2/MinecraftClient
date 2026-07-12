# Horus Server API

Game servers (and local tools) can talk to the Horus client through a small,
open HTTP + SSE surface. No proprietary payloads, no obfuscation — everything
is plain JSON you can implement from any server plugin in a few lines.

> The API listens on the player's machine (`http://127.0.0.1:7411`) and is
> localhost-bound. Server plugins reach it through the companion mod's plugin
> channel (`horus:api`, roadmap) or the player runs local tooling against it
> directly. Nothing here can be triggered from the open internet.

## Overlays

Push a notification/overlay into the client UI:

```
POST /api/serverapi/overlay
Content-Type: application/json

{
  "title": "CTF",                 // optional, ≤ 60 chars
  "text": "Blue team captured the flag!",   // ≤ 240 chars
  "kind": "info"                  // info | ok | err
}
```

The client renders it instantly (toast today; positionable HUD overlay
planned). Delivered to every open Horus window via the same SSE stream the
launcher uses:

```
GET /api/events        → text/event-stream
data: {"type":"overlay","payload":{"title":"CTF","text":"…","kind":"info"}}
```

Try it while Horus is running:

```bash
curl -X POST http://127.0.0.1:7411/api/serverapi/overlay \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","text":"from your server","kind":"ok"}'
```

## Custom HUD elements (developer API)

Register your own HUD element — it appears in the HUD editor (Misc group,
draggable/scalable/colorable like every built-in) and renders its text live.
POST the same id again to update the text:

```bash
curl -X POST http://127.0.0.1:7411/api/serverapi/hud \
  -H 'Content-Type: application/json' \
  -d '{"id":"queue","label":"Queue position","text":"#3 in queue"}'
```

Rules: `id` is `[a-z0-9_-]` (≤32 chars, prefixed `api-` internally),
`label` ≤40 chars, `text` ≤120 chars. Elements persist in the user's HUD
layout; the user can hide or delete them like anything else — the client
stays theirs, not yours.

## Everything else is the same API the UI uses

The client keeps no private endpoints. Useful ones for tooling:

| Endpoint | What it does |
|---|---|
| `GET /api/status` | client version, OS, memory, current launch state |
| `GET /api/ping?host=mc.hypixel.net` | real Server List Ping (players, MOTD, latency) |
| `POST /api/launch {profileId, server}` | start the game, optionally straight onto a server |
| `GET /api/events` | SSE: launch phases, download progress, game log lines, overlays |
| `GET/PUT /api/economy` | the local cosmetics economy (coins, owned, quests) |

## Planned (documented before built, like everything in Horus)

- `horus:api` plugin channel in the companion mod: input fields, buttons and
  custom GUI payloads rendered by the client, results POSTed back to the server.
- Signed server manifests so players can verify what a server is allowed to show.
