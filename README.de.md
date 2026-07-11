<div align="center">

# 𓂀 Horus Client

**Der offene Minecraft-Client-Launcher.**
Ein Client im NoRisk-/Feather-Stil, neu gebaut als freie Software — mit wegdesignten Paywalls.

MIT-Lizenz · null Abhängigkeiten · keine Telemetrie · kein Echtgeld-Store · kein Account-Zwang

[English 🇬🇧](README.md) · [Schnellstart](#schnellstart-windows) · [Features](#alles-drin) · [Architektur](#architektur)

<img src="docs/screenshots/home.png" alt="Horus Startbildschirm" width="860">

</div>

---

## Der Launcher startet das Spiel — der Rest ist im Spiel

Horus zieht eine klare Grenze, genau wie NoRisk:

- **Der Launcher** ist eine schmale Icon-Leiste + ein Startbildschirm mit deinem 3D-Skin und einem großen **LAUNCH**-Button. Seine Aufgaben: **Instanz** wählen, **Cosmetics** verwalten, **Inhalte pro Instanz** hinzufügen (Mods/Packs/Shader von Modrinth & CurseForge) und **Social**.
- **In Minecraft** öffnet **Rechte Umschalttaste** das In-Game-Overlay: das **MOD MENU** (alle eingebauten Client-Mods — hier eingestellt, nie im Launcher), **Minispiele**, Cosmetics-Schnellwechsel, HUD-Editor, Social und Screenshots.

<div align="center">
<img src="docs/screenshots/cosmetics.png" alt="Cape-Browser mit allen Vanilla-Capes" width="425"> <img src="docs/screenshots/ingame.png" alt="In-Game Right-Shift-Overlay" width="425">
<img src="docs/screenshots/discover.png" alt="Inhalte pro Instanz von Modrinth und CurseForge" width="425"> <img src="docs/screenshots/ingame-menu.png" alt="In-Game-Mod-Menü" width="425">
</div>

## Alles drin

| | |
|---|---|
| 🎬 **NoRisk-Style-Launcher** | Schmale Icon-Leiste, Topbar mit Instanz + Account + Freunden, zentraler 3D-Skin, großer LAUNCH-Button mit Versionsauswahl, Live-NEWS-Panel. |
| 🧥 **Alle Vanilla-Capes 1:1** | **Alle** offiziellen Minecraft-Capes — Migrator, Cherry Blossom, 15th Anniversary, jedes MineCon, Vanilla, Mojang (Studios + Classic), Realms, Translator, Cobalt, Scrolls, Prismarine, Turtle, Founder's, Purple Heart, Common/Home/Menace, Snowman, Spade, Birthday u. v. m. — als scharfe Pixel-Art, plus Community-Capes. Browser mit **All / My Capes / Favorites / Vanilla**, Suche, Favoriten und Live-3D-Vorschau. |
| 🎨 **Cape-Studio** | Eigene Capes **gratis** gestalten: 10×16-Pixel-Editor mit Füllen/Spiegeln, PNG-Import/-Export, Start von jedem Vanilla-Cape als Vorlage. |
| 📦 **Inhalte pro Instanz** | Mods, Resource Packs und Shader **pro Instanz** aus **Modrinth** und **CurseForge** hinzufügen, Ein-Klick-Installation, Verifiziert-Badges, Bewertungen, Auto-Updates. |
| 🏪 **Integrierte Content-Plattform** | Eigene Mods/Packs direkt im Launcher **hochladen** → **Admin-Review** → Verifiziert-Badge → Ein-Klick-Install für alle. **Server-Pakete** bündeln Mods + Einstellungen eines Servers hinter einem **Beitreten**-Button. |
| 🎮 **In-Game-Overlay** | Rechte Umschalttaste in der Welt → MOD MENU (40+ eingebaute Module), Minispiele (Tetris/Pong/Tic-Tac-Toe/Snake), HUD-Editor, Cosmetics, Social, Screenshot. |
| 💬 **Social überall** | Freundesanfragen, Status, Chats, Feed, Benachrichtigungen — im Launcher **und** im In-Game-Overlay. Optional & selbst hostbar. |
| 🪙 **Coins, Quests, Horus+** | Coins in der App verdienen (nie mit Geld) für Shop-Cosmetics; das NRC+-Tier wird **mit Coins** bezahlt. |
| ⬇️ **Echter Launcher-Kern** | Jede Minecraft-Version aus Mojangs offiziellen Metadaten, SHA-1-verifizierte Parallel-Downloads, **Fabric/Quilt**-Auto-Profile, Offline- + Microsoft-Device-Code-Login, **Bedrock**-Start unter Windows. |
| 🎨 **Themes & API** | Dark/Midnight/Sandstone/Light + Akzentfarbe; offene Server-Overlay-API ([docs/server-api.md](docs/server-api.md)). |

## Schnellstart (Windows)

1. Node.js einmalig installieren: `winget install OpenJS.NodeJS.LTS` (und Java zum Spielen: `winget install EclipseAdoptium.Temurin.21.JRE`)
2. [Repository herunterladen](https://github.com/Han4Star2/MinecraftClient/archive/refs/heads/main.zip) und entpacken
3. **Doppelklick auf `Horus.bat`** — das Backend startet und Horus öffnet sich als eigenes App-Fenster (Edge-`--app`-Modus, ohne Browser-Leisten)

Kein `npm install`, kein Build-Schritt — Horus hat **null Abhängigkeiten**.

<details>
<summary>Linux / macOS / manueller Start</summary>

```bash
git clone https://github.com/Han4Star2/MinecraftClient
cd MinecraftClient
npm start            # = node server/index.js → http://127.0.0.1:7411

node server/index.js --portable   # alle Daten in ./data
node server/index.js --data <dir> --port 7411 --no-open
```
</details>

```bash
npm test             # ZIP-Reader, Regel-Engine, API+Economy, Offline-Dry-Run-Launch (E2E)
npm run screenshots  # docs/screenshots per Headless-Chromium neu erzeugen
```

### Mit Microsoft anmelden

Einstellungen → Konto → Sitzungstyp `msa`. Horus implementiert den
Standard-Device-Code-Flow; als Open Source liefert es **keine eingebetteten
Geheimnisse** mit — du trägst einmalig eine Azure-*Anwendungs-ID (Client-ID)*
ein: [portal.azure.com](https://portal.azure.com) → App-Registrierungen → Neu →
Kontotyp „persönliche Microsoft-Konten“, *Öffentliche Clientflows zulassen*
aktivieren. Dauert ~3 Minuten, ist kostenlos, und das Token verlässt nie
deinen Rechner (`msa-session.json`, chmod 600). Der Offline-Modus funktioniert
ganz ohne.

### Mods

Profil wählen (z. B. Fabric + 1.21.5), **Mods → Mehr Mods holen** öffnen und
aus **Modrinth** (ohne Key) oder **CurseForge** (kostenloser Key in
Einstellungen → Netzwerk) installieren. Alles landet als normale Jars im
Standard-`mods/`-Ordner des Profils — `.jar` ⇄ `.jar.disabled`-Umschaltung,
Metadaten aus `fabric.mod.json`/`mcmod.info`. Forge-/NeoForge-Automatisierung
steht auf der Roadmap; bestehende Installationen funktionieren über das
gemeinsame Spielverzeichnis weiter.

### Bedrock

Profil mit Loader **Bedrock Edition** anlegen — der Start übergibt per
`minecraft://` an die Microsoft-Store-App (Windows). Das Umschalten zwischen
Bedrock-*Versionen* erfordert Appx-Sideloading, das Store-Apps einem Launcher
nicht sauber erlauben; kombiniere Horus dafür mit einem dedizierten
Version-Switcher — ehrlich dokumentiert statt halbgar.

## Die Coin-Economy (nirgendwo eine Kreditkarte)

```
Täglicher Check-in (Streak-Bonus) ─┐
Quests (täglich/wöchentlich/einmal)┼──► Coins ──► Shop-Artikel · Collections · Horus+
Minispiele (≤ 300/Tag)            ─┘
```

Preise, Quests und Drops sind offene Daten in
[`app/js/shopCatalog.js`](app/js/shopCatalog.js). Das Backend speichert die
Economy als JSON (`economy.json`) — dein Spielstand: sichern, editieren, er
gehört dir. Eigene Capes aus dem Studio sind immer gratis.

## NoRisk-/Feather-Features — und was Horus besser macht

| Anderswo | In Horus |
|---|---|
| Cosmetics kosten Echtgeld | Coins werden **nur in der App verdient** — im Code existiert kein Bezahlpfad |
| Premium kostet €/Monat | Horus+ kostet **Coins** und bietet sinngemäß dasselbe (Monats-Drops, Rabatte, größere Limits) |
| Proprietärer Client, geschlossenes Shop-Backend | MIT-lizenziert, local-first: Katalog, Economy und Cosmetics sind offene Daten auf deiner Platte |
| Cosmetics hängen an Account-Servern | Lokal gerendert; für alle Horus-Spieler sichtbar; eigene Capes als PNG exportierbar |
| Social-Ebene am Vendor-Backend | Heute local-first, offenes Protokoll + selbst hostbares Relay dokumentiert ([docs/server-api.md](docs/server-api.md)) |
| Electron-Klasse beim Ressourcenverbrauch | Abhängigkeitsfreier Node-Kern + Vanilla-JS-UI (~90 KB) im vorhandenen Webview |
| Account-Zwang | Offline-Sessions eingebaut; Microsoft-Login optional |
| Telemetrie | Keine. Es gibt keinen Analytics-Code zum Abschalten. |

## Architektur

```
┌──────────────────────────────────────────────────────────────┐
│  app/          Vanilla JS + CSS, kein Build-Schritt           │
│  ├─ pages/     Home News Bibliothek Mods HUD Shop Garderobe   │
│  │             Minispiele Social Welten Screenshots Settings  │
│  └─ js/        Router · i18n DE/EN · SSE-Client · Demo-Modus  │
│                Economy · 200+-Artikel-Katalog · CSS-3D-Player │
│                (Skins, Capes, Hüte, Wings, Pets, Nametags)    │
├────────────────────────── HTTP + SSE ────────────────────────┤
│  server/       Node ≥18, null npm-Abhängigkeiten              │
│  ├─ launcher   Regel-Engine · Args (modern+legacy) · Natives  │
│  │             Prozess-Supervisor · Bedrock-Übergabe          │
│  ├─ meta       Mojang-Manifest (gecacht, mirrorfähig) ·       │
│  │             Fabric/Quilt-Profil-Merge                      │
│  ├─ downloads  Parallel-Queue · SHA-1-Verify · Resume-Skip    │
│  ├─ zip        minimaler Reader (Natives, Mod-Metadaten)      │
│  ├─ net        Redirects · Timeouts · CONNECT-Proxy           │
│  ├─ msa        Device-Code-Kette (MSA→XBL→XSTS→MC)            │
│  ├─ ping       Server List Ping (Live-Status der News-Seite)  │
│  ├─ modrinth / curseforge   zwei Mod-Quellen, normale Jars    │
│  └─ store      Settings/Profile/Economy als offenes JSON      │
└──────────────────────────────────────────────────────────────┘
```

Daten liegen in `~/.horus` (oder `./data` mit `--portable`): offenes JSON für
Settings, Profile und Economy; geteilte hash-verifizierte `libraries/`,
`versions/`, `assets/`; isolierte Spielverzeichnisse pro Profil. Bereits
genutzte Versionen starten offline aus dem Cache; die mitgelieferte
Fallback-Versionsliste ist klar markiert und erfindet nie Hashes.

## Tests

`npm test` (abhängigkeitsfreies `node:test`): ZIP-Round-Trip gegen einen
unabhängigen Writer inkl. Zip-Slip-Schutz · Regel-Engine · Maven-Mapping ·
Loader-Merge · Offline-UUID · API-Smoke-Test inkl. **Economy-Persistenz** ·
kompletter **Dry-Run-Launch** gegen einen lokalen Fixture-Meta-Server,
Ende-zu-Ende hash-verifiziert. Die UI wird zusätzlich von einer
Playwright-Interaktionssuite abgedeckt (22 Schritte: Kauf→Anlegen,
Cape-Studio, Minispiele, Social, Themes, Overlay-API) — null Konsolenfehler.

## Roadmap

Forge-/NeoForge-Installer-Automatisierung · Companion-Mod mit dem
`horus:api`-Plugin-Channel · selbst gehostetes Social-Relay · Skin-Upload ·
Bedrock-Versionswechsel über Sideload-Tooling · signierte Release-Bundles.

## Lizenz

[MIT](LICENSE). Nicht verbunden mit Mojang, Microsoft, Feather oder NoRisk.
„Minecraft“ ist eine Marke von Mojang Synergies AB. Horus startet das Spiel,
das dir gehört, über offizielle Metadaten und verteilt niemals Spieldateien.
