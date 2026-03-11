# ipv6gg

IPv6 good game – ein kleines Browser-game zum Thema IPv6.

**Repository:** [https://github.com/FullByte/ipv6gg](https://github.com/FullByte/ipv6gg)

## Überblick

Dieses Projekt soll spielerisch den Umgang mit IPv6-Adressen erleichtern.  
Ziel ist es, durch kurze Runden typische Aufgaben und Stolpersteine rund um IPv6 kennenzulernen – zum Beispiel Präfixe, Subnetting oder Adressnotation.

## Neu: Qualität & Onboarding

- Versionierte Einstellungen im LocalStorage (`ipv6gg_settings_v1`): Sprache, Schwierigkeit, Modus, Musik, Soundmodus, Touch und Tutorial-Status.
- Interaktives First-Run-Tutorial mit festen Beispielpaketen (einmalig, mit Skip-Option).
- End-of-Run-Metriken für Difficulty-Balancing:
  - Trefferquote
  - Durchschnittscombo
  - Lebensverlust pro Minute
- i18n-Härtung mit Fallback-Warnungen und i18n-Linter.

## Tests ohne Build-Step

Kernlogik-Regressionen (Browser-basiert):

- `core.js` enthält testbare Logik für Prefix-Match, Target-Findung, Difficulty-Regeln, Paketgenerator und Hard-Penalty.
- `duel-core.js` enthält testbare Duell-Entscheidungslogik (Endbedingung + Winner/Tie-Break).
- Test-Runner: `tests/index.html`

So startest du die Tests lokal:

1. Lokalen Static Server starten (z. B. `python -m http.server 666`).
2. Im Browser öffnen: `http://localhost:666/tests/`
3. Zusammenfassung und Einzeltests im Test-UI prüfen.

## i18n-Linter

- Linter-UI: `scripts/i18n-lint.html`
- Öffne die Seite lokal und prüfe die Browser-Konsole auf fehlende/zusätzliche Keys.

### GitHub Pages (Deployment)

Dieses Repo ist für GitHub Pages vorbereitet (GitHub Actions Workflow in `.github/workflows/pages.yml`).

- **Einmalig aktivieren**: In GitHub unter `Settings` → `Pages` als Source **GitHub Actions** auswählen.
- **Deploy auslösen**: Änderungen committen und nach `main` pushen. Danach baut und deployt die Action automatisch.
- **URL**: Nach dem ersten Deploy findest du die URL in der Action-Ausgabe und unter `Settings` → `Pages`.

### Audio-Assets (Effekte)

Level-Up-Sounds sind sprachabhängige MP3-Dateien (anhand der Spracheinstellung); Kombo-/Router-Sounds sind je eine Datei. Die vollständige Liste mit Dateinamen findest du in [docs/audio-assets.md](docs/audio-assets.md). Die Dateien liegen im Unterordner `sound/` (z. B. `sound/ipv6-track1.mp3`). Ohne diese Dateien laufen die Effekte still (kein Fehler).

### Schwierigkeitsmodi (Easy / Normal / Hard)

Die Schwierigkeit wird im Dropdown neben Sprache und Audio gewählt und ist nur vor Spielstart (oder nach Game Over) änderbar. Die aktive Schwierigkeit wird im HUD angezeigt.

- **Easy**
  - Route 3 ist deaktiviert: kein Ziel „2a10:42:3::/64“, keine Taste 3, keine Route-3-Pakete.
  - Langsameres Spiel: längeres Spawn-Intervall, geringere Fallgeschwindigkeit, längere TTL (Balancing-Pass: weiter entschärft).
  - Vorschlags-Highlight: der/die korrekten Ziel-Buttons (inkl. gültige bei Spezialpaketen) werden hervorgehoben.
- **Normal**
  - Standardverhalten wie bisher (alle fünf Routen, normales Tempo, kein Highlight).
- **Hard**
  - Mehr Paketvielfalt: höherer Anteil an Spezial- und Fehlversuch-Paketen, breitere Verteilung (Balancing-Pass: aggressiv, aber stabilisiert).
  - Fehlerstrafe: bei jedem Fehler (falsche Route, Timeout, Paket verloren) wird der Score auf den Level-Start zurückgesetzt, die Combo auf 0 gesetzt und ein Leben abgezogen.

### Spielmodi (Single / Duell)

- **Single**
  - Standardmodus wie bisher.
- **Duell (nur Desktop)**
  - Zwei parallele Spielfelder im Splitscreen.
  - Tastatur-Mapping: Spieler 1 mit `1-5`, Spieler 2 mit `6-0`.
  - Gemeinsame Schwierigkeit für beide Spieler.
  - Match endet sofort, wenn ein Spieler 0 Leben erreicht.
  - Tie-Break: Haben beide beim Ende 0 Leben, gewinnt der höhere Score; bei Gleichstand ist es ein Unentschieden.

### Lokal starten (Quick-Test)

Du kannst die Seite lokal als static files hosten, z.B. mit Python:

```bash
python -m http.server 666
```

Danach im Browser `http://localhost:666` öffnen.

## Contributing

Pull Requests und Vorschläge zu Spielmechaniken, UX oder Code-Struktur sind willkommen.  
→ [ipv6gg auf GitHub](https://github.com/FullByte/ipv6gg)
