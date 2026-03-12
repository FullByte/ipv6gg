# ipv6gg

IPv6 good game – ein kleines Browser-game zum Thema IPv6.

**Repository:** [https://github.com/FullByte/ipv6gg](https://github.com/FullByte/ipv6gg)

## Überblick

Dieses Projekt soll spielerisch den Umgang mit IPv6-Adressen erleichtern.  
Ziel ist es, durch kurze Runden typische Aufgaben und Stolpersteine rund um IPv6 kennenzulernen – zum Beispiel Präfixe, Subnetting oder Adressnotation.

## Tests ohne Build-Step

Kernlogik-Regressionen (Browser-basiert):

- `core.js` enthält testbare Logik für Prefix-Match, Target-Findung, Difficulty-Regeln, Paketgenerator und Hard-Penalty.
- `duel-core.js` enthält testbare Duell-Entscheidungslogik (Endbedingung + Winner/Tie-Break).
- Test-Runner: `tests/index.html`

So startest du die Tests lokal:

1. Lokalen Static Server starten (z. B. `python -m http.server 666`).
2. Im Browser öffnen: `http://localhost:666/tests/`
3. Zusammenfassung und Einzeltests im Test-UI prüfen.

### GitHub Pages (Deployment)

Dieses Repo ist für GitHub Pages vorbereitet (GitHub Actions Workflow in `.github/workflows/pages.yml`).

- **Einmalig aktivieren**: In GitHub unter `Settings` → `Pages` als Source **GitHub Actions** auswählen.
- **Deploy auslösen**: Änderungen committen und nach `main` pushen. Danach baut und deployt die Action automatisch.
- **URL**: Nach dem ersten Deploy findest du die URL in der Action-Ausgabe und unter `Settings` → `Pages`.

### Audio-Assets (Effekte)

Alle Effekt-MP3s sind kurz (z. B. unter 2 s) und werden parallel zur Hintergrundmusik abgespielt. **Level-Up** ist **sprachabhängig** (basierend auf der Spracheinstellung); die übrigen Effekte haben je eine Datei.

#### Level-Up (sprachabhängig, 10 Varianten 0–9 pro Sprache)

Die Level-Up-Sounds werden **anhand der aktuellen Spracheinstellung** gewählt. Pro Level-Up wählt das Spiel **zufällig** eine von 10 Dateien der gewählten Sprache und spielt jede Variante **höchstens einmal pro Runde**. Sobald alle 10 gespielt wurden, wird neu gemischt.

| Sprache  | Dateinamen (Variante 0–9)           |
| -------- | ----------------------------------- |
| Deutsch  | levelup-de-0.mp3 … levelup-de-9.mp3 |
| English  | levelup-en-0.mp3 … levelup-en-9.mp3 |
| Français | levelup-fr-0.mp3 … levelup-fr-9.mp3 |
| Español  | levelup-es-0.mp3 … levelup-es-9.mp3 |

Fehlende Dateien werden still ignoriert. Weniger Varianten: in `game.js` `LEVELUP_VARIANT_IDS` anpassen (z. B. `[0, 1, 2]`).

#### Deutsch

Sprüche:

- Kein Broadcast? Kein Drama.
- Fahre auf der Datenautobahn.
- Bleib ruhig und erweitere auf eine 48-Bit-Netzmaske.
- Mehr Bits! Mehr Freiheit!
- Ich habe mehr IPv6-Adressen als mein Toaster je brauchen wird.
- IPv4 hat 99 Probleme. IPv6 löst 128 davon.
- 64 bit net mask ist kein Vorschlag - es ist ein Lebensstil.
- Wer noch NAT braucht, hat IPv6 nicht verstanden.
- 128 bit - globale Address auf jedem Gerät!
- Happy Eyeballs ist kein Architekturprinzip!

#### English

Slogans

- No broadcast? No drama.
- Keep calm and expand to 48 bit net mask.
- Ride the Data Highway.
- More bits! More freedom!
- I have more IPv6 addresses than my toaster will ever need.
- IPv4 has 99 problems. IPv6 fixes 128 of them.
- A 64-bit prefix isn’t a suggestion - it’s a lifestyle.
- If you still need NAT, you didn’t understand IPv6.
- Happy Eyeballs is not an architecture principle!
- 128 bits — a global address on every device!

#### French

- Pas de broadcast ? Pas de drame.
- Reste calme et passe en /48.
- En route sur l’autoroute des données.
- Plus de bits ! Plus de liberté !
- J’ai plus d’adresses IPv6 que mon grille-pain n’en aura jamais besoin.
- Un préfixe de 64 bits n’est pas une suggestion — c’est un mode de vie.
- IPv4 a 99 problèmes. IPv6 en résout 128.
- Si tu as encore besoin de NAT, tu n’as pas compris IPv6.
- Happy Eyeballs n’est pas un principe d’architecture !
- 128 bits — une adresse globale sur chaque appareil !

#### Spanish

- ¿Sin broadcast? Sin drama.
- Mantén la calma y pásate a /48.
- Conduciendo por la autopista de los datos.
- ¡Más bits! ¡Más libertad!
- Un prefijo de 64 bits no es una sugerencia — es un estilo de vida.
- Tengo más direcciones IPv6 de las que mi tostadora necesitará jamás.
- IPv4 tiene 99 problemas. IPv6 resuelve 128.
- Si todavía necesitas NAT, no entendiste IPv6.
- ¡Happy Eyeballs no es un principio de arquitectura!
- 128 bits — ¡una dirección global en cada dispositivo!

#### Übrige Effekte (je eine Datei)

| Anlass                | Filename    |
| --------------------- | ----------- |
| Kombo (3er)           | combo.mp3   |
| Mega-Kombo (5er)      | mega.mp3    |
| Guter Router (10er)   | router.mp3  |
| Monster Router (20er) | monster.mp3 |

**Hinweis:** Alle Audio-Dateien liegen in diesem Ordner (`sound/`, z. B. `sound/ipv6-track1.mp3`). Ohne diese Dateien laufen die Effekte still (kein Fehler).

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
