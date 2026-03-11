/**
 * i18n for ipv6gg: German, English, French, Spanish.
 * Default: browser language if supported, else German.
 */
(function () {
  const STORAGE_KEY = "ipv6gg_lang";
  const SUPPORTED = ["de", "en", "fr", "es"];

  const strings = {
    de: {
      langName: "Deutsch",
      btn: { music: "[M]usik", sound: "[E]ffekte", touch: "[T]ouch", help: "[H]ilfe" },
      hotkey: { music: "m", sound: "e", touch: "t", help: "h" },
      toggle: { on: "An", off: "Aus" },
      aria: { music: "Musik umschalten", sound: "Effekte umschalten", touch: "Touch-Buttons umschalten", help: "Spielhilfe anzeigen", lang: "Sprache wählen", helpLink: "Hilfe anzeigen", difficulty: "Schwierigkeit wählen" },
      start: {
        intro1: "Du bist ein Router. Pakete fallen von oben mit IPv6-Zielen.",
        intro2: "Route per Tasten 1-5, oder Buttons (Touch=on) zum passenden Ziel.",
        intro3: "Longest Prefix Match gewinnt, z.B. 2001:db8:1::abcd passt zu /64.",
        helpHint: "Weitere Details siehe",
        helpLink: "[H]ilfe",
        btn: "Spiel starten!",
      },
      end: { title: "Verbindung getrennt!", score: "Dein Score", highscore: "Highscore", btn: "Nochmal spielen" },
      help: {
        title: "So funktioniert ipv6gg",
        p1: "Du spielst einen Router und musst jedes einfliegende IPv6-Paket an das richtige Zielnetz schicken, bevor seine Zeit abläuft.",
        p2: "Ziel: Route möglichst viele Pakete korrekt, um Score und Highscore zu steigern. Steuerung: Mit 1-5 oder Drag-and-Drop auf eine Route; Touch ist standardmäßig aktiv, die großen 1-5 Buttons unter dem Spielfeld lassen sich jederzeit ein/ausblenden.",
        p3: "Regel: Longest Prefix Match gewinnt, also immer das spezifischste passende Präfix. Routen: Route 1 und 2 sind /64-Netze, Route 3 ist 2a10:42:3::/64, Route 4 ist Link-Local Multicast für ff02::1, Route 5 blockt ungültige, nicht zuordenbare Ziele; als Merkhilfe steht bei Route 1-3 im UI zusätzlich Broadcast: ff0e::1.",
        p4: "Sonderfälle: Ab Level 3 erscheint ff0e::1 und darf auf Route 1, 2 oder 3; ab Level 5 treten Fälle für Route 4 und 5 häufiger auf. Das wichtigste Paket ist als AKTIV markiert, und Tasten 1-5 wirken immer auf dieses Paket.",
        p5: "Punkte: Korrekte Route +10, korrekter Fehlversuch +5, dazu Kombo-Bonus ab 5 Richtigen in Folge: +10 pro weiterem Kombo-Treffer. Kombo-Stufen: 5 = KOMBO, 10 = KRASSE KOMBO, 15 = GUTER ROUTER, 20 = MONSTER ROUTER.",
        p6: "Level: Das nächste Level kommt alle 200 Punkte; pro Level-Up gibt es +1 Leben.",
        p7: "Fehler: Falsche Route, Timeout oder verlorenes Paket kostet ein Leben. Game Over: Bei 0 Leben endet die Runde. Tipp: Kurze Präfixe sind allgemeiner, lange präziser.",
        repo: "Quellcode auf GitHub",
        hotkeys: "Hotkeys: Enter startet Spiel/Restart, M Music, E Effekte, T Touch, H Hilfe, Esc schließt die Hilfe.",
        close: "Verstanden",
      },
      toast: {
        welcome: "Willkommen bei ipv6gg",
        routeActive: "Route aktiv. Drücke 1-5 für das aktive Paket.",
        levelUp: "Level {{level}}: Mehr Traffic im Netz!",
        levelBonus: "Level Up Bonus: +1 Leben",
        prefixMatch: "Präfix match! -> {{label}}",
        comboBonus: "Kombo +{{n}}",
        combo: "KOMBO!",
        megaCombo: "KRASSE KOMBO!",
        goodRouter: "GUTER ROUTER!",
        monsterRouter: "MONSTER ROUTER!",
        isolate: "Fehlversuch korrekt isoliert (+5)",
        unknownTarget: "Unbekanntes Ziel.",
        specialOnly123: "Sonderpaket: Hier sind nur Route 1, 2 oder 3 gültig.",
        wrongCouldRoute: "Falsch: Paket hätte geroutet werden können.",
        wrongNetwork: "Falsches Netz gewählt.",
        timeout: "Timeout: Paket verworfen.",
        packetLost: "Paket verloren.",
        hardPenalty: "Hard: Score auf Level-Start zurückgesetzt.",
      },
      hud: { score: "Score", lives: "Leben", level: "Level", highscore: "Highscore", correct: "Richtig", wrong: "Falsch", combo: "KOMBO", bonus: "Bonus", difficulty: "Schwierigkeit", nextLevel: "Nächstes Level in {{points}} Punkten ({{progress}}/{{target}})" },
      stats: { routesTitle: "Routen 1–5 (Richtig/Falsch)" },
      difficulty: { easy: "Leicht", normal: "Normal", hard: "Schwer" },
      targets: { fail: "Fehlversuch", subtitleBroadcast: "Broadcast: ff0e::1", subtitleMulticast: "Link-Local Multicast", subtitleBlock: "Block ungültige Pakete" },
      packet: { active: "AKTIV" },
      soundMode: { person: "Person", effekt: "Effekt", off: "Aus" },
      log: {
        viewLog: "Log anzeigen",
        close: "Schließen",
        title: "Spiel-Log",
        entryHit: "✓ {{address}} → {{target}}. Richtig geroutet. +{{points}} Punkte (Gesamt {{score}}), Kombo x{{combo}}. {{livesWithTotal}}",
        entryMiss: "✗ {{address}} → gewählt: {{chosen}}; richtig wäre {{correct}}. {{reason}} {{comboLine}} {{livesWithTotal}}",
        entryIsolate: "✓ {{address}} → Fehlversuch. Korrekt isoliert. +{{points}} Punkte (Gesamt {{score}}), Kombo x{{combo}}. {{livesWithTotal}}",
        entryTimeout: "✗ {{address}} → Timeout. Hätte zu {{correct}} gemusst. {{comboLine}} {{livesWithTotal}}",
        entryLost: "✗ {{address}} → Paket verloren. Hätte zu {{correct}} gemusst. {{comboLine}} {{livesWithTotal}}",
        comboLine: "0 Punkte.",
        comboLost: "0 Punkte, Kombo war x{{combo}} (verloren).",
        livesChangePlus: "+1 Leben",
        livesChangeMinus: "−1 Leben",
        livesChangeZero: "±0 Leben",
        livesWithTotal: "{{livesChange}} (Gesamt {{lives}}).",
        hardPenaltySuffix: "(Hard: Score zurückgesetzt)",
      },
    },
    en: {
      langName: "English",
      btn: { music: "[M]usic", sound: "[E]ffects", touch: "[T]ouch", help: "[H]elp" },
      hotkey: { music: "m", sound: "e", touch: "t", help: "h" },
      toggle: { on: "On", off: "Off" },
      aria: { music: "Toggle music", sound: "Toggle effects", touch: "Toggle touch buttons", help: "Show help", lang: "Choose language", helpLink: "Show help", difficulty: "Choose difficulty" },
      start: {
        intro1: "You are a router. Packets fall from above with IPv6 destinations.",
        intro2: "Route with keys 1-5 or the on-screen buttons (touch=on) to the correct target.",
        intro3: "Longest Prefix Match wins, e.g. 2001:db8:1::abcd matches /64.",
        helpHint: "See",
        helpLink: "[H]elp",
        btn: "Start game!",
      },
      end: { title: "Connection lost!", score: "Your score", highscore: "Highscore", btn: "Play again" },
      help: {
        title: "How ipv6gg works",
        p1: "You play a router and must send each incoming IPv6 packet to the correct destination network before its time runs out.",
        p2: "Goal: Route as many packets correctly as possible to increase score and high score. Controls: Use 1-5 or drag-and-drop onto a route; touch is on by default; the large 1-5 buttons below the play area can be toggled.",
        p3: "Rule: Longest Prefix Match wins. Routes 1 and 2 are /64 networks, Route 3 is 2a10:42:3::/64, Route 4 is Link-Local Multicast for ff02::1, Route 5 blocks invalid, unroutable targets.",
        p4: "Special cases: From level 3, ff0e::1 appears and may go to Route 1, 2 or 3; from level 5, Route 4 and 5 cases appear more often. The priority packet is marked AKTIVE; keys 1-5 always affect it.",
        p5: "Points: Correct route +10, correct isolate +5; combo bonus from 5 correct in a row: +10 per further hit. Combo tiers: 5 = COMBO, 10 = MEGA COMBO, 15 = REAL ROUTER, 20 = MONSTER ROUTER.",
        p6: "Level: Next level every 200 points; each level-up gives +1 life.",
        p7: "Errors: Wrong route, timeout or lost packet costs one life. Game over at 0 lives.",
        repo: "Source code on GitHub",
        hotkeys: "Hotkeys: Enter start/restart, M Music, E Effects, T Touch, H Help, Esc close help.",
        close: "Got it",
      },
      toast: {
        welcome: "Welcome to ipv6gg",
        routeActive: "Route active. Press 1-5 for the active packet.",
        levelUp: "Level {{level}}: More traffic!",
        levelBonus: "Level up bonus: +1 life",
        prefixMatch: "Prefix match! -> {{label}}",
        comboBonus: "Combo +{{n}}",
        combo: "COMBO!",
        megaCombo: "MEGA COMBO!",
        goodRouter: "REAL ROUTER!",
        monsterRouter: "MONSTER ROUTER!",
        isolate: "Correctly isolated (+5)",
        unknownTarget: "Unknown target.",
        specialOnly123: "Special packet: only routes 1, 2 or 3 valid.",
        wrongCouldRoute: "Wrong: packet could have been routed.",
        wrongNetwork: "Wrong network.",
        timeout: "Timeout: packet dropped.",
        packetLost: "Packet lost.",
        hardPenalty: "Hard: Score reset to level start.",
      },
      hud: { score: "Score", lives: "Lives", level: "Level", highscore: "Highscore", correct: "Correct", wrong: "Wrong", combo: "COMBO", bonus: "Bonus", difficulty: "Difficulty", nextLevel: "Next level in {{points}} points ({{progress}}/{{target}})" },
      stats: { routesTitle: "Routes 1–5 (Correct/Wrong)" },
      difficulty: { easy: "Easy", normal: "Normal", hard: "Hard" },
      targets: { fail: "Isolate", subtitleBroadcast: "Broadcast: ff0e::1", subtitleMulticast: "Link-Local Multicast", subtitleBlock: "Block invalid packets" },
      packet: { active: "ACTIVE" },
      soundMode: { person: "Person", effekt: "Effect", off: "Off" },
      log: {
        viewLog: "View log",
        close: "Close",
        title: "Game log",
        entryHit: "✓ {{address}} → {{target}}. Routed correctly. +{{points}} points (Total {{score}}), Combo x{{combo}}. {{livesWithTotal}}",
        entryMiss: "✗ {{address}} → chosen: {{chosen}}; correct was {{correct}}. {{reason}} {{comboLine}} {{livesWithTotal}}",
        entryIsolate: "✓ {{address}} → Isolate. Correctly isolated. +{{points}} points (Total {{score}}), Combo x{{combo}}. {{livesWithTotal}}",
        entryTimeout: "✗ {{address}} → Timeout. Should have gone to {{correct}}. {{comboLine}} {{livesWithTotal}}",
        entryLost: "✗ {{address}} → Packet lost. Should have gone to {{correct}}. {{comboLine}} {{livesWithTotal}}",
        comboLine: "0 points.",
        comboLost: "0 points, Combo was x{{combo}} (lost).",
        livesChangePlus: "+1 life",
        livesChangeMinus: "−1 life",
        livesChangeZero: "±0 lives",
        livesWithTotal: "{{livesChange}} (Total {{lives}}).",
        hardPenaltySuffix: "(Hard: score reset)",
      },
    },
    fr: {
      langName: "Français",
      btn: { music: "[M]usique", sound: "[E]ffets", touch: "[T]ouch", help: "[A]ide" },
      hotkey: { music: "m", sound: "e", touch: "t", help: "a" },
      toggle: { on: "Activé", off: "Désactivé" },
      aria: { music: "Activer la musique", sound: "Activer les effets", touch: "Activer les boutons tactiles", help: "Afficher l'aide", lang: "Choisir la langue", helpLink: "Afficher l'aide", difficulty: "Choisir la difficulté" },
      start: {
        intro1: "Tu es un routeur. Les paquets tombent avec des destinations IPv6.",
        intro2: "Route avec les touches 1-5 ou les boutons (tactile=on) vers la bonne cible.",
        intro3: "Longest Prefix Match gagne, ex. 2001:db8:1::abcd correspond à /64.",
        helpHint: "Voir",
        helpLink: "[A]ide",
        btn: "Jouer !",
      },
      end: { title: "Connexion perdue !", score: "Votre score", highscore: "Meilleur score", btn: "Rejouer" },
      help: {
        title: "Comment fonctionne ipv6gg",
        p1: "Tu joues un routeur et dois envoyer chaque paquet IPv6 vers le bon réseau avant expiration.",
        p2: "Objectif : router le plus de paquets correctement. Contrôles : 1-5 ou glisser-déposer ; tactile activé par défaut.",
        p3: "Règle : Longest Prefix Match. Routes 1 et 2 = /64, Route 3 = 2a10:42:3::/64, Route 4 = multicast ff02::1, Route 5 = bloquer les invalides.",
        p4: "Cas spéciaux : à partir du niveau 3, ff0e::1 peut aller en Route 1, 2 ou 3. Le paquet prioritaire est marqué ACTIF.",
        p5: "Points : bonne route +10, bon isolement +5 ; combo à partir de 5 : +10. Combos : 5 = COMBO, 10 = MEGA COMBO, 15 = ROI DU ROUTEUR, 20 = MONSTER ROUTER.",
        p6: "Niveau : tous les 200 points, +1 vie.",
        p7: "Erreurs : mauvaise route ou timeout = -1 vie. Game over à 0 vies.",
        repo: "Code source sur GitHub",
        hotkeys: "Raccourcis : Entrée démarrer, M Musique, E Effets, T Touch, A Aide, Esc fermer.",
        close: "Compris",
      },
      toast: {
        welcome: "Bienvenue sur ipv6gg",
        routeActive: "Route active. Appuie sur 1-5 pour le paquet actif.",
        levelUp: "Niveau {{level}} : plus de trafic !",
        levelBonus: "Bonus niveau : +1 vie",
        prefixMatch: "Préfixe match ! -> {{label}}",
        comboBonus: "Combo +{{n}}",
        combo: "COMBO !",
        megaCombo: "MEGA COMBO !",
        goodRouter: "ROI DU ROUTEUR !",
        monsterRouter: "MONSTER ROUTER !",
        isolate: "Correctement isolé (+5)",
        unknownTarget: "Cible inconnue.",
        specialOnly123: "Paquet spécial : seules les routes 1, 2 ou 3.",
        wrongCouldRoute: "Faux : le paquet aurait pu être routé.",
        wrongNetwork: "Mauvais réseau.",
        timeout: "Timeout : paquet rejeté.",
        packetLost: "Paquet perdu.",
        hardPenalty: "Hard : score remis au début du niveau.",
      },
      hud: { score: "Score", lives: "Vies", level: "Niveau", highscore: "Meilleur score", correct: "Juste", wrong: "Faux", combo: "COMBO", bonus: "Bonus", difficulty: "Difficulté", nextLevel: "Prochain niveau dans {{points}} points ({{progress}}/{{target}})" },
      stats: { routesTitle: "Routes 1–5 (Juste/Faux)" },
      difficulty: { easy: "Facile", normal: "Normal", hard: "Difficile" },
      targets: { fail: "Isoler", subtitleBroadcast: "Broadcast: ff0e::1", subtitleMulticast: "Multicast link-local", subtitleBlock: "Bloquer paquets invalides" },
      packet: { active: "ACTIF" },
      soundMode: { person: "Personne", effekt: "Effet", off: "Désactivé" },
      log: {
        viewLog: "Voir le log",
        close: "Fermer",
        title: "Log de partie",
        entryHit: "✓ {{address}} → {{target}}. Routé correctement. +{{points}} points (Total {{score}}), Combo x{{combo}}. {{livesWithTotal}}",
        entryMiss: "✗ {{address}} → choisi : {{chosen}} ; correct était {{correct}}. {{reason}} {{comboLine}} {{livesWithTotal}}",
        entryIsolate: "✓ {{address}} → Isoler. Correctement isolé. +{{points}} points (Total {{score}}), Combo x{{combo}}. {{livesWithTotal}}",
        entryTimeout: "✗ {{address}} → Timeout. Devait aller vers {{correct}}. {{comboLine}} {{livesWithTotal}}",
        entryLost: "✗ {{address}} → Paquet perdu. Devait aller vers {{correct}}. {{comboLine}} {{livesWithTotal}}",
        comboLine: "0 point.",
        comboLost: "0 point, Combo était x{{combo}} (perdue).",
        livesChangePlus: "+1 vie",
        livesChangeMinus: "−1 vie",
        livesChangeZero: "±0 vies",
        livesWithTotal: "{{livesChange}} (Total {{lives}}).",
        hardPenaltySuffix: "(Hard : score remis)",
      },
    },
    es: {
      langName: "Español",
      btn: { music: "[M]úsica", sound: "[E]fectos", touch: "[T]áctil", help: "[A]yuda" },
      hotkey: { music: "m", sound: "e", touch: "t", help: "a" },
      toggle: { on: "Activado", off: "Desactivado" },
      aria: { music: "Activar música", sound: "Activar efectos", touch: "Activar botones táctiles", help: "Mostrar ayuda", lang: "Elegir idioma", helpLink: "Mostrar ayuda", difficulty: "Elegir dificultad" },
      start: {
        intro1: "Eres un router. Los paquetes caen con destinos IPv6.",
        intro2: "Enruta con teclas 1-5 o los botones (táctil=on) al objetivo correcto.",
        intro3: "Longest Prefix Match gana, ej. 2001:db8:1::abcd coincide con /64.",
        helpHint: "Ver",
        helpLink: "[A]yuda",
        btn: "¡Jugar!",
      },
      end: { title: "¡Conexión perdida!", score: "Tu puntuación", highscore: "Récord", btn: "Jugar de nuevo" },
      help: {
        title: "Cómo funciona ipv6gg",
        p1: "Juegas un router y debes enviar cada paquete IPv6 al destino correcto antes de que se agote el tiempo.",
        p2: "Objetivo: enrutar correctamente el máximo de paquetes. Controles: 1-5 o arrastrar; táctil activado por defecto.",
        p3: "Regla: Longest Prefix Match. Rutas 1 y 2 = /64, Ruta 3 = 2a10:42:3::/64, Ruta 4 = multicast ff02::1, Ruta 5 = bloquear inválidos.",
        p4: "Casos especiales: desde nivel 3, ff0e::1 puede ir a Ruta 1, 2 o 3. El paquete prioritario se marca ACTIVO.",
        p5: "Puntos: ruta correcta +10, aislamiento correcto +5; combo desde 5: +10. Combos: 5 = COMBO, 10 = MEGA COMBO, 15 = ROUTER GENIAL, 20 = MONSTER ROUTER.",
        p6: "Nivel: cada 200 puntos, +1 vida.",
        p7: "Errores: ruta equivocada o timeout = -1 vida. Game over a 0 vidas.",
        repo: "Código fuente en GitHub",
        hotkeys: "Atajos: Enter iniciar, M Música, E Efectos, T Táctil, A Ayuda, Esc cerrar.",
        close: "Entendido",
      },
      toast: {
        welcome: "Bienvenido a ipv6gg",
        routeActive: "Ruta activa. Pulsa 1-5 para el paquete activo.",
        levelUp: "Nivel {{level}}: ¡más tráfico!",
        levelBonus: "Bonus nivel: +1 vida",
        prefixMatch: "¡Prefijo match! -> {{label}}",
        comboBonus: "Combo +{{n}}",
        combo: "¡COMBO!",
        megaCombo: "¡MEGA COMBO!",
        goodRouter: "¡ROUTER GENIAL!",
        monsterRouter: "¡MONSTER ROUTER!",
        isolate: "Correctamente aislado (+5)",
        unknownTarget: "Objetivo desconocido.",
        specialOnly123: "Paquete especial: solo rutas 1, 2 o 3.",
        wrongCouldRoute: "Mal: el paquete podría haberse enrutado.",
        wrongNetwork: "Red equivocada.",
        timeout: "Timeout: paquete descartado.",
        packetLost: "Paquete perdido.",
        hardPenalty: "Hard: puntuación reiniciada al inicio del nivel.",
      },
      hud: { score: "Puntos", lives: "Vidas", level: "Nivel", highscore: "Récord", correct: "Bien", wrong: "Mal", combo: "COMBO", bonus: "Bonus", difficulty: "Dificultad", nextLevel: "Siguiente nivel en {{points}} puntos ({{progress}}/{{target}})" },
      stats: { routesTitle: "Rutas 1–5 (Bien/Mal)" },
      difficulty: { easy: "Fácil", normal: "Normal", hard: "Difícil" },
      targets: { fail: "Aislar", subtitleBroadcast: "Broadcast: ff0e::1", subtitleMulticast: "Multicast link-local", subtitleBlock: "Bloquear paquetes inválidos" },
      packet: { active: "ACTIVO" },
      soundMode: { person: "Persona", effekt: "Efecto", off: "Desactivado" },
      log: {
        viewLog: "Ver log",
        close: "Cerrar",
        title: "Log de partida",
        entryHit: "✓ {{address}} → {{target}}. Enrutado correctamente. +{{points}} puntos (Total {{score}}), Combo x{{combo}}. {{livesWithTotal}}",
        entryMiss: "✗ {{address}} → elegido: {{chosen}}; correcto era {{correct}}. {{reason}} {{comboLine}} {{livesWithTotal}}",
        entryIsolate: "✓ {{address}} → Aislar. Correctamente aislado. +{{points}} puntos (Total {{score}}), Combo x{{combo}}. {{livesWithTotal}}",
        entryTimeout: "✗ {{address}} → Timeout. Debía ir a {{correct}}. {{comboLine}} {{livesWithTotal}}",
        entryLost: "✗ {{address}} → Paquete perdido. Debía ir a {{correct}}. {{comboLine}} {{livesWithTotal}}",
        comboLine: "0 puntos.",
        comboLost: "0 puntos, Combo era x{{combo}} (perdida).",
        livesChangePlus: "+1 vida",
        livesChangeMinus: "−1 vida",
        livesChangeZero: "±0 vidas",
        livesWithTotal: "{{livesChange}} (Total {{lives}}).",
        hardPenaltySuffix: "(Hard: puntuación reiniciada)",
      },
    },
  };

  function getStoredOrBrowser() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    const browser = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(browser) !== -1 ? browser : "de";
  }

  let currentLang = getStoredOrBrowser();
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = currentLang;
  }

  function t(key, params) {
    const parts = key.split(".");
    let v = strings[currentLang];
    for (let i = 0; i < parts.length && v != null; i++) v = v[parts[i]];
    if (v == null && currentLang !== "de") {
      v = strings.de;
      for (let i = 0; i < parts.length && v != null; i++) v = v[parts[i]];
    }
    const s = (typeof v === "string" ? v : key);
    if (!params) return s;
    let out = s;
    for (const k in params) out = out.replace(new RegExp("{{" + k + "}}", "g"), params[k]);
    return out;
  }

  function setLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    if (document.documentElement) document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent("ipv6gg:lang", { detail: { lang } }));
  }

  function getLanguage() {
    return currentLang;
  }

  const LANGUAGES = SUPPORTED.map((code) => ({ code, name: strings[code].langName }));

  window.i18n = { t, setLanguage, getLanguage, LANGUAGES, SUPPORTED, strings };
})();
