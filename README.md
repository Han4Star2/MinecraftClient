<div align="center">

# 𓂀 Horus Client

**The open Minecraft client-launcher.**
A NoRisk-/Feather-style client, rebuilt as free software — with the paywalls designed out.

MIT licensed · zero dependencies · no telemetry · no real-money store · no account required

[Deutsch 🇩🇪](README.de.md) · [Quick start](#quick-start-windows) · [Features](#everything-inside) · [Architecture](#architecture)

<img src="docs/screenshots/home.png" alt="Horus launch screen" width="860">

</div>

---

## The launcher launches the game — the rest lives in-game

Horus draws a clear line, exactly like NoRisk:

- **The launcher** is a thin icon rail + a launch screen with your 3D skin and a big **LAUNCH** button. Its jobs: pick an **instance**, manage **cosmetics**, add **per-instance content** (mods/packs/shaders from Modrinth & CurseForge), and **social**.
- **In Minecraft**, pressing **Right Shift** opens the in-game overlay: the **MOD MENU** (all built-in client mods — configured here, never in the launcher), **minigames**, cosmetics quick-swap, HUD editor, social and screenshots.

<div align="center">
<img src="docs/screenshots/cosmetics.png" alt="Cape browser with every vanilla cape" width="425"> <img src="docs/screenshots/ingame.png" alt="In-game Right Shift overlay" width="425">
<img src="docs/screenshots/discover.png" alt="Per-instance content from Modrinth and CurseForge" width="425"> <img src="docs/screenshots/ingame-menu.png" alt="In-game mod menu" width="425">
</div>

## Everything inside

| | |
|---|---|
| 🎬 **NoRisk-style launcher** | Thin icon rail, top bar with instance + account + friends, centered 3D skin render, big LAUNCH button with a version dropdown, and a live NEWS panel. |
| 🧥 **Every vanilla cape 1:1** | **All** official Minecraft capes — Migrator, Cherry Blossom, 15th Anniversary, every MineCon, Vanilla, Mojang (Studios + classic), Realms, Translator, Cobalt, Scrolls, Prismarine, Turtle, Founder's, Purple Heart, Common/Home/Menace, Snowman, Spade, Birthday and more — as crisp pixel art, plus community capes. Browser with **All / My Capes / Favorites / Vanilla** tabs, search, favorites and a live 3D preview. |
| 🎨 **Cape Studio** | Design your own capes **for free**: 10×16 pixel editor with fill/mirror, PNG import/export, start from any vanilla cape as a template. |
| 📦 **Per-instance content** | Add mods, resource packs and shaders **per instance** from **Modrinth** and **CurseForge**, one-click install, verified badges, ratings, auto-updates. |
| 🏪 **Integrated content platform** | Upload your own mods/packs directly in the launcher → **admin review** → verified badge → one-click install for everyone. **Server packs** bundle a server's mods + settings behind one **Join** button. |
| 🎮 **In-game overlay** | Right Shift in a world → MOD MENU (40+ built-in modules), minigames (Tetris/Pong/Tic-Tac-Toe/Snake), HUD editor, cosmetics, social, screenshot. |
| 💬 **Social everywhere** | Friend requests, status, chats, feed, notifications — in the launcher **and** the in-game overlay. Optional & self-hostable. |
| 🪙 **Coins, quests, Horus+** | Earn coins in-app (never with money) for shop cosmetics; the NRC+-style tier is paid **with coins**. |
| ⬇️ **Real launcher core** | Every Minecraft version from Mojang's official metadata, SHA-1-verified parallel downloads, **Fabric/Quilt** auto-profiles, offline + Microsoft device-code login, **Bedrock** launch on Windows. |
| 🎨 **Themes & API** | Dark/Midnight/Sandstone/Light + accent color; open server overlay API ([docs/server-api.md](docs/server-api.md)). |

## Quick start (Windows)

Horus ships as a **real native Windows app** — `Horus.exe`: its own window,
its own taskbar icon, no browser tab, no console window. It's a ~6 MB
compiled program that manages the zero-dependency Node backend for you and
lets you **launch real Minecraft instances** through it (genuine Mojang
version downloads, SHA-1 verified, Fabric/Quilt, Microsoft login — all of it,
not a demo).

1. Install Node.js once: `winget install OpenJS.NodeJS.LTS` (and Java for playing: `winget install EclipseAdoptium.Temurin.21.JRE`)
2. [Download this repository](https://github.com/Han4Star2/MinecraftClient/archive/refs/heads/main.zip) and unzip it
3. Build the native app (needs [Go](https://go.dev/dl/), builds in seconds, cross-compiles fine even from Linux/macOS):
   ```bash
   cd windows-app && ./build.sh
   ```
   then copy `windows-app/dist/Horus.exe` into the repo root.
4. **Double-click `Horus.exe`** — a real window opens, the backend starts behind it automatically.

No `windows-app/dist/Horus.exe` yet? `Horus.bat` at the repo root is a
fallback that opens Horus in an app-mode Edge window instead — same backend,
same features, just a browser-hosted window rather than a native one. See
[windows-app/README.md](windows-app/README.md) for how the native app works
and why it's Go+WebView2 rather than Electron.

No `npm install`, no build step for the launcher itself — Horus has **zero dependencies**.

<details>
<summary>Linux / macOS / manual start</summary>

```bash
git clone https://github.com/Han4Star2/MinecraftClient
cd MinecraftClient
npm start            # = node server/index.js → http://127.0.0.1:7411

node server/index.js --portable   # keep all data in ./data
node server/index.js --data <dir> --port 7411 --no-open
```
</details>

```bash
npm test             # zip reader, rules engine, API+economy, offline dry-run launch e2e
npm run screenshots  # regenerate docs/screenshots via headless Chromium
```

### Signing in with Microsoft

Settings → Account → session type `msa`. Horus implements the standard
device-code flow; being open source it ships **no embedded secrets**, so you
paste an Azure *application (client) ID* once:
[portal.azure.com](https://portal.azure.com) → App registrations → New →
account type “personal Microsoft accounts”, enable *Allow public client flows*.
Takes ~3 minutes, free, and the token never leaves your machine
(`msa-session.json`, chmod 600). Offline mode works without any of this.

### Mods

Pick a profile (e.g. Fabric + 1.21.5), open **Mods → Get more mods** and
install from **Modrinth** (no key) or **CurseForge** (free key in Settings →
Network). Everything lands as plain jars in the profile's standard `mods/`
folder — `.jar` ⇄ `.jar.disabled` toggling, metadata read from
`fabric.mod.json`/`mcmod.info`. Forge/NeoForge automation is on the roadmap;
existing installations keep working through the shared game directory.

### Bedrock

Create a profile with loader **Bedrock Edition** — launching hands off to the
Microsoft-Store app via `minecraft://` (Windows). Switching between Bedrock
*versions* requires appx sideloading, which Store apps don't allow a launcher
to automate cleanly; pair Horus with a dedicated version switcher for that —
honestly documented instead of half-working.

## The coin economy (no credit card, anywhere)

```
daily check-in (streak bonus) ─┐
quests (daily/weekly/once)  ───┼──► coins ──► shop items · collections · Horus+
minigames (≤300/day)        ───┘
```

Prices, quests and drop rates are plain data in
[`app/js/shopCatalog.js`](app/js/shopCatalog.js). The backend persists the
economy as JSON (`economy.json`) — it's *your* save file: back it up, edit it,
it's yours. Custom capes from the studio are always free and never counted
against anything.

## NoRisk/Feather feature parity — and what Horus fixes

| Elsewhere | In Horus |
|---|---|
| Cosmetics cost real money | Coins are **earned in-app only** — there is no payment path in the codebase |
| Premium tier costs €/month | Horus+ costs **coins** and is otherwise identical in spirit (monthly drops, discounts, bigger limits) |
| Proprietary client, closed shop backend | MIT-licensed, local-first: shop catalog, economy and cosmetics are open data on your disk |
| Cosmetics tied to their account servers | Rendered locally; visible to anyone on Horus; custom capes exportable as PNG |
| Social layer tied to vendor infra | Local-first demo today, open protocol + self-hostable relay documented ([docs/server-api.md](docs/server-api.md)) |
| Electron-class footprint | Zero-dependency Node core + vanilla-JS UI (~90 KB), runs in the webview you already have |
| Account required | Offline sessions built in; Microsoft login optional |
| Telemetry | None. There is no analytics code to turn off. |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  app/          vanilla JS + CSS, no build step                │
│  ├─ pages/     home news library mods hud shop wardrobe       │
│  │             minigames social worlds screenshots settings   │
│  └─ js/        router · i18n EN/DE · SSE client · demo mode   │
│                economy · 200+ item catalog · CSS-3D player    │
│                (skins, capes, hats, wings, pets, nametags)    │
├────────────────────────── HTTP + SSE ────────────────────────┤
│  server/       Node ≥18, zero npm dependencies                │
│  ├─ launcher   rules engine · args (modern+legacy) · natives  │
│  │             process supervisor · Bedrock hand-off          │
│  ├─ meta       Mojang manifest (cached, mirrorable) ·         │
│  │             Fabric/Quilt profile merge                     │
│  ├─ downloads  parallel queue · SHA-1 verify · resume-skip    │
│  ├─ zip        minimal reader (natives, mod metadata)         │
│  ├─ net        redirects · timeouts · CONNECT proxy           │
│  ├─ msa        device-code chain (MSA→XBL→XSTS→MC)            │
│  ├─ ping       Server List Ping (news page live status)       │
│  ├─ modrinth / curseforge   two mod sources, plain jars       │
│  └─ store      settings/profiles/economy as plain JSON        │
└──────────────────────────────────────────────────────────────┘
```

Data lives in `~/.horus` (or `./data` with `--portable`): open JSON for
settings, profiles and economy; shared hash-verified `libraries/`, `versions/`,
`assets/`; isolated per-profile game dirs. Previously used versions launch
offline from cache; the bundled fallback version list is clearly marked and
never fakes hashes.

## Testing

`npm test` (dependency-free `node:test`): ZIP round-trip vs an independent
writer incl. zip-slip protection · rules engine · maven mapping · loader
merge · offline UUID · API smoke test incl. **economy persistence** · full
**dry-run launch** against a local fixture meta server, hash-verified end to
end. The UI is additionally exercised by a Playwright interaction suite
(22 steps: buy→equip flow, cape studio, minigames, social, themes, overlay
API) — zero console errors.

## Roadmap

Forge/NeoForge installer automation · companion mod with the `horus:api`
plugin channel · self-hosted social relay · skin upload · Bedrock version
switching via sideload tooling · signed release bundles.

## License

[MIT](LICENSE). Not affiliated with Mojang, Microsoft, Feather or NoRisk.
“Minecraft” is a trademark of Mojang Synergies AB. Horus launches the game you
own through official metadata and never redistributes game files.
