# ipv6gg

IPv6 good game – ein kleines Browser-game zum Thema IPv6.

## Überblick

Dieses Projekt soll spielerisch den Umgang mit IPv6-Adressen erleichtern.  
Ziel ist es, durch kurze Runden typische Aufgaben und Stolpersteine rund um IPv6 kennenzulernen – zum Beispiel Präfixe, Subnetting oder Adressnotation.

### GitHub Pages (Deployment)

Dieses Repo ist für GitHub Pages vorbereitet (GitHub Actions Workflow in `.github/workflows/pages.yml`).

- **Einmalig aktivieren**: In GitHub unter `Settings` → `Pages` als Source **GitHub Actions** auswählen.
- **Deploy auslösen**: Änderungen committen und nach `main` pushen. Danach baut und deployt die Action automatisch.
- **URL**: Nach dem ersten Deploy findest du die URL in der Action-Ausgabe und unter `Settings` → `Pages`.

### Audio-Assets (Effekte)

Level-Up-Sounds sind sprachabhängige MP3-Dateien (anhand der Spracheinstellung); Kombo-/Router-Sounds sind je eine Datei. Die vollständige Liste mit Dateinamen findest du in [docs/audio-assets.md](docs/audio-assets.md). Die Dateien liegen im Unterordner `sound/` (z. B. `sound/ipv6-track1.mp3`). Ohne diese Dateien laufen die Effekte still (kein Fehler).

### Lokal starten (Quick-Test)

Du kannst die Seite lokal als static files hosten, z.B. mit Python:

```bash
python -m http.server 666
```

Danach im Browser `http://localhost:666` öffnen.

## Contributing

Pull Requests und Vorschläge zu Spielmechaniken, UX oder Code-Struktur sind willkommen.

