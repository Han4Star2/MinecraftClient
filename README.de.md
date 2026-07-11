<div align="center">

# 🪶 Quill Launcher

**Ein offener, federleichter Minecraft-Launcher.**
Das Feather-Client-Erlebnis — von Grund auf neu gebaut, mit behobenen Schwächen.

MIT-Lizenz · null Abhängigkeiten · keine Telemetrie · kein Account nötig

[English 🇬🇧](README.md) · [Schnellstart](#schnellstart) · [Behobene Schwächen](#feather-schwächen--so-behebt-quill-sie) · [Architektur](#architektur)

<img src="docs/screenshots/home.png" alt="Quill Startbildschirm" width="820">

</div>

---

## Was ist das?

Quill baut nach, was Feather-artige Clients großartig macht — das moderne
dunkle UI, das Mod-Menü, den HUD-Editor, Kosmetik, Profile — als **vollständig
offene Software**, und repariert dabei gezielt die Schwachstellen des Originals:

| | |
|---|---|
| 🎛️ **Mod-Menü** | Kartenraster im Feather-Stil: 40+ eingebaute Module (Keystrokes, CPS, Zoom, Toggle Sprint, Scoreboard, …) aktivieren, favorisieren und über echte Einstellungsdialoge konfigurieren |
| 🖥️ **HUD-Editor** | Jedes Overlay frei per Drag & Drop platzieren, Zentrier-Snapping, pro Element Größe/Farbe/Transparenz/Hintergrund, Live-Vorschauwerte |
| 🧢 **Kosmetik** | Capes, Hüte, Flügel, Bandanas, Rucksäcke, Emotes — gerendert auf einer CSS-3D-Voxel-Figur. **Alles ist kostenlos.** |
| 📚 **Bibliothek** | Beliebig viele Installationen, jede vollständig isoliert: eigener Mods-Ordner, RAM, Java, JVM-Argumente, Spielverzeichnis. JSON-Import/-Export |
| ⬇️ **Echter Launcher-Kern** | Mojang-Versionsmetadaten, SHA-1-verifizierte parallele Downloads, Natives-Extraktion, Fabric/Quilt-Profil-Merging, Offline- + Microsoft-Login, Live-Log-Konsole |
| 🔌 **Modrinth integriert** | Mods suchen und als normale Jars in den Standard-Ordner `mods/` installieren — dieselben Dateien versteht jeder andere Launcher |

<div align="center">
<img src="docs/screenshots/mods.png" alt="Mod-Menü" width="410"> <img src="docs/screenshots/hud.png" alt="HUD-Editor" width="410">
<img src="docs/screenshots/cosmetics.png" alt="Kosmetik" width="410"> <img src="docs/screenshots/library.png" alt="Bibliothek" width="410">
</div>

## Schnellstart

Voraussetzungen: **Node.js ≥ 18** (und eine Java-Laufzeit, um das Spiel selbst zu starten).

```bash
git clone https://github.com/Han4Star2/MinecraftClient
cd MinecraftClient
npm start          # = node server/index.js — öffnet http://127.0.0.1:7411
```

Das war's. Kein `npm install` — Quill hat **null Abhängigkeiten**.

Nützliche Flags:

```text
node server/index.js
  --port 7411      # UI-/API-Port (nur localhost)
  --portable       # alle Daten in ./data statt ~/.quill
  --data <dir>     # explizites Datenverzeichnis
  --no-open        # Browser nicht automatisch öffnen
```

Die Oberfläche läuft auch ohne Backend (einfach `app/index.html` statisch
hosten): Sie wechselt in den **Demo-Modus** mit lokaler Speicherung — das
Badge unten in der Seitenleiste zeigt den aktiven Modus an.

```bash
npm test             # ZIP-Reader, Regel-Engine, API, Offline-Dry-Run-Launch (E2E)
npm run screenshots  # docs/screenshots per Headless-Chromium neu erzeugen
```

## Feather-Schwächen → so behebt Quill sie

| Feather-Schwäche | Quills Lösung |
|---|---|
| **Proprietär** — Quellcode nicht vollständig offen | Alles hier ist MIT. Prüfen, forken, weitergeben. Keine Blobs, keine Obfuskierung, kein Nach-Hause-Telefonieren. |
| **Kostenpflichtige Kosmetik** | Jedes Cape, jeder Hut, jeder Flügel ist gratis, als offene Daten definiert (`app/js/catalog.js`) und lokal gerendert. Es gibt keinen Store, der etwas verkaufen könnte. |
| **Schwerer Launcher** (Electron-Klasse bei RAM/CPU) | Abhängigkeitsfreier Node-Kern (~35 MB RSS) + Vanilla-JS-UI (~60 KB, ohne Build-Schritt) im Browser/Webview, den du ohnehin hast. Animationen sind reines CSS, respektieren `prefers-reduced-motion` und lassen sich komplett abschalten. |
| **Ökosystem-Lock-in** | Überall offenes JSON: Profile als einfache Dateien ex-/importierbar, das Spielverzeichnis spricht das Vanilla-`.minecraft`-Format (ein bestehendes Verzeichnis einfach eintragen — funktioniert), der Meta-Server ist ein **konfigurierbarer Mirror** (Einstellungen → Netzwerk), die Social-Ebene ist optional und selbst hostbar. |
| **Große Modpacks fragil** | Kein proprietäres Mod-Format: Standard-`mods/`-Ordner mit `.jar`/`.jar.disabled`-Umschaltung, echte Loader-Metadaten (Fabric/Quilt-Profile exakt nach offizieller Spezifikation gemerged), Profil-Isolation, Modrinth installiert normale Jars. |
| **Account-Zwang** | Offline-Sessions sind erstklassig unterstützt (UUIDv3, funktioniert im Einzelspieler und auf Offline-Mode-Servern). Microsoft-Login ist optional — als Standard-Device-Code-Flow mit **deiner eigenen** Azure-Client-ID; Open Source liefert keine Geheimnisse mit. |
| *(Bonus)* Telemetrie | Keine. Es gibt keinen Analytics-Code, den man abschalten müsste. |

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│  app/            Vanilla JS + CSS, kein Build-Schritt        │
│  ├─ pages/       Home · Bibliothek · Mods · HUD · Kosmetik · │
│  │               Freunde · Screenshots · Einstellungen       │
│  └─ js/          Hash-Router · i18n (DE/EN) · SSE-Client ·   │
│                  Demo-Modus-Fallback · CSS-3D-Skin-Renderer  │
├──────────────────────── HTTP + SSE ─────────────────────────┤
│  server/         Node ≥18, null npm-Abhängigkeiten           │
│  ├─ index.js     Static-Hosting · REST-API · CLI-Flags       │
│  ├─ launcher.js  Regel-Engine · Argument-Builder (modern +   │
│  │               legacy) · Prozess-Supervisor · Spielzeit    │
│  ├─ meta.js      Mojang-Manifest + Versions-JSON (gecacht,   │
│  │               mirrorfähig) · Fabric/Quilt-Profil-Merge    │
│  ├─ downloads.js Parallel-Queue, SHA-1-Verify, Resume-Skip   │
│  ├─ zip.js       Minimaler ZIP-Reader (Natives, Mod-Metadaten)│
│  ├─ net.js       HTTP-Client: Redirects, Timeouts, CONNECT-  │
│  │               Proxy, Loopback-Bypass                      │
│  ├─ msa.js       Device-Code-Kette (MSA→XBL→XSTS→MC)         │
│  ├─ mods.js      Verwaltung des Standard-mods/-Ordners       │
│  ├─ modrinth.js  Suche + Installation normaler Jars          │
│  └─ store.js     Einstellungen/Profile als einfaches JSON    │
└─────────────────────────────────────────────────────────────┘
```

**Datenablage** — standardmäßig `~/.quill`, mit `--portable` in `./data`:
`settings.json`, `profiles.json`, `libraries/`, `versions/`, `assets/`
(geteilt, hash-verifiziert, über Profile hinweg wiederverwendet),
`profiles/<id>/` (isolierte Spielverzeichnisse mit eigenem `mods/`).

**Offline-Verhalten** — bereits genutzte Versionen starten aus dem Cache; die
Versionsauswahl fällt auf eine mitgelieferte Liste zurück (klar markiert, ohne
erfundene Hashes); Fehlermeldungen sagen präzise, wofür einmalig eine
Online-Verbindung nötig ist. Downloads überspringen Dateien, deren SHA-1
bereits stimmt.

## Tests

`npm test` führt eine abhängigkeitsfreie `node:test`-Suite aus:

- **ZIP-Reader** im Round-Trip gegen einen unabhängig implementierten Writer,
  inklusive Zip-Slip-Schutz und Mod-Metadaten,
- **Regel-Engine**, Maven-Koordinaten-Mapping, Loader-Profil-Merge,
  Offline-UUID-Stabilität,
- **API-Smoke-Test** gegen einen echten Serverprozess mit temporärem Datenverzeichnis,
- **kompletter Dry-Run-Launch** gegen einen lokalen Fixture-Meta-Server:
  Manifest → Versions-JSON → hash-verifizierte Downloads → Natives-Extraktion
  → finales Java-Kommando, Ende-zu-Ende geprüft, vollständig offline.

## Roadmap

- Forge-/NeoForge-Installer-Automatisierung (heute: ehrliche Fehlermeldung +
  Interop über gemeinsames Spielverzeichnis mit bestehenden Installationen)
- Skin-Upload / Skins per Spielername laden (online)
- Selbst hostbares Friends-Relay (Protokollskizze in `app/js/pages/friends.js`)
- Fertige `.deb`/`.msi`/`.dmg`-Pakete um einen System-Webview

## Lizenz

[MIT](LICENSE). Nicht mit Mojang, Microsoft oder Feather verbunden —
„Minecraft“ ist eine Marke von Mojang Synergies AB. Quill startet das Spiel,
das dir gehört, über offizielle Metadaten und verteilt niemals Spieldateien.
