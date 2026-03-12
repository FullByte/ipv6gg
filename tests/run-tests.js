(async function () {
  const logEl = document.getElementById("log");
  const summaryEl = document.getElementById("summary");

  const targets = [
    { key: "1", prefix: "2001:db8:1::/64" },
    { key: "2", prefix: "2001:db8:2::/64" },
    { key: "3", prefix: "2a10:42:3::/64" },
    { key: "4", prefix: "ff02::1/128" },
    { key: "5", prefix: null }
  ];

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  function makeRng(values) {
    let i = 0;
    return function () {
      const v = values[i % values.length];
      i += 1;
      return v;
    };
  }

  function flatten(obj, prefix, out) {
    const target = out || {};
    const p = prefix || "";
    const keys = Object.keys(obj || {});
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const v = obj[k];
      const next = p ? p + "." + k : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        flatten(v, next, target);
      } else {
        target[next] = v;
      }
    }
    return target;
  }

  async function assetExists(path) {
    const url = "../" + path;
    try {
      const headRes = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (headRes.ok) return true;
      if (headRes.status !== 405) return false;
    } catch (err) {
      // Some static servers do not support HEAD. Fall back to GET.
    }

    try {
      const getRes = await fetch(url, { method: "GET", cache: "no-store" });
      return getRes.ok;
    } catch (err) {
      return false;
    }
  }

  async function fetchText(path) {
    const url = "../" + path;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("failed to fetch " + path + " (" + res.status + ")");
    return res.text();
  }

  function extractPlaceholders(text) {
    const src = String(text == null ? "" : text);
    const out = [];
    const rx = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let m;
    while ((m = rx.exec(src)) !== null) out.push(m[1]);
    out.sort();
    return out;
  }

  const tests = [
    function testLongestPrefixMatch() {
      const idx = window.ipv6ggCore.findBestTargetIndex("2001:db8:1::abcd", targets);
      assert(idx === 0, "findBestTargetIndex should pick route 1 for 2001:db8:1::/64");
    },
    function testMulticastMatch() {
      const idx = window.ipv6ggCore.findBestTargetIndex("ff02::1", targets);
      assert(idx === 3, "ff02::1 should map to route 4");
    },
    function testDifficultyConfigEasy() {
      const c = window.ipv6ggCore.getDifficultyConfig("easy");
      assert(c.route3Enabled === false, "easy should disable route3");
      assert(c.suggestHighlight === true, "easy should enable suggestions");
    },
    function testPacketGeneratorEasyNoRoute3Accepted() {
      const rng = makeRng([0.7, 0.1, 0.1, 0.1, 0.1]);
      const pkt = window.ipv6ggCore.generatePacketAddress(1, "easy", targets, rng);
      if (pkt.address === "ff0e::1") {
        assert(pkt.acceptedTargets.indexOf(2) === -1, "easy ff0e::1 should not allow route3");
      }
    },
    function testPacketGeneratorHardCanRoute3() {
      const rng = makeRng([0.55, 0.2, 0.3, 0.4, 0.5]);
      const pkt = window.ipv6ggCore.generatePacketAddress(5, "hard", targets, rng);
      assert(typeof pkt.address === "string" && pkt.address.length > 0, "hard packet generator should return address");
    },
    function testHardPenalty() {
      const score = window.ipv6ggCore.applyHardPenalty(550, 3, 200, true);
      assert(score === 400, "hard penalty must reset score to level start");
      const keep = window.ipv6ggCore.applyHardPenalty(550, 3, 200, false);
      assert(keep === 550, "non-hard must keep score");
    },
    function testDuelNotOverWhenBothAlive() {
      const over = window.ipv6ggDuelCore.isDuelOver({ lives: 2, score: 10 }, { lives: 1, score: 20 });
      assert(over === false, "duel must continue while both players are alive");
    },
    function testDuelEndsWhenOneDown() {
      const over = window.ipv6ggDuelCore.isDuelOver({ lives: 0, score: 10 }, { lives: 2, score: 20 });
      assert(over === true, "duel must end immediately when one player reaches 0 lives");
    },
    function testDuelWinnerByRemainingLives() {
      const winner = window.ipv6ggDuelCore.resolveDuelWinner({ lives: 0, score: 200 }, { lives: 1, score: 100 }).winner;
      assert(winner === "p2", "player with remaining lives must win duel");
    },
    function testDuelTieBreakByScore() {
      const winner = window.ipv6ggDuelCore.resolveDuelWinner({ lives: 0, score: 320 }, { lives: 0, score: 300 }).winner;
      assert(winner === "p1", "when both are down, higher score must win");
    },
    function testDuelDrawWhenScoresEqual() {
      const winner = window.ipv6ggDuelCore.resolveDuelWinner({ lives: 0, score: 250 }, { lives: 0, score: 250 }).winner;
      assert(winner === "tie", "when both are down and scores equal, duel must be draw");
    },
    function testI18nKeysConsistency() {
      assert(window.i18n && window.i18n.strings, "i18n strings must be loaded");
      const strings = window.i18n.strings;
      const langs = Object.keys(strings);
      const base = flatten(strings.de || {});
      const baseKeys = Object.keys(base);

      for (let li = 0; li < langs.length; li += 1) {
        const lang = langs[li];
        const map = flatten(strings[lang] || {});

        for (let i = 0; i < baseKeys.length; i += 1) {
          const key = baseKeys[i];
          assert(key in map, lang + " missing i18n key: " + key);
        }

        const langKeys = Object.keys(map);
        for (let i = 0; i < langKeys.length; i += 1) {
          const key = langKeys[i];
          assert(key in base, lang + " has extra i18n key: " + key);
        }
      }
    },
    function testI18nPlaceholderConsistency() {
      assert(window.i18n && window.i18n.strings, "i18n strings must be loaded");
      const strings = window.i18n.strings;
      const langs = Object.keys(strings);
      const base = flatten(strings.de || {});
      const baseKeys = Object.keys(base);

      for (let li = 0; li < langs.length; li += 1) {
        const lang = langs[li];
        const map = flatten(strings[lang] || {});
        for (let i = 0; i < baseKeys.length; i += 1) {
          const key = baseKeys[i];
          const baseVal = base[key];
          const langVal = map[key];
          if (typeof baseVal !== "string" || typeof langVal !== "string") continue;

          const expected = extractPlaceholders(baseVal).join("|");
          const actual = extractPlaceholders(langVal).join("|");
          assert(
            expected === actual,
            lang + " placeholder mismatch for i18n key: " + key + " (expected " + expected + ", got " + actual + ")"
          );
        }
      }
    },
    async function testDuelLogWiringInGameJs() {
      const src = await fetchText("game.js");
      assert(/function\s+duelScoreHit\s*\(/.test(src), "duelScoreHit must exist");
      assert(/function\s+duelScoreMiss\s*\(/.test(src), "duelScoreMiss must exist");
      assert(/pushGameLog\s*\(\s*\{\s*\n\s*playerId:\s*state\.playerId/m.test(src), "duel logs must include playerId");
      assert(/\[\$\{t\("duel\.p1"\)\}\]/.test(src), "rendered log should prefix player 1 label");
      assert(/\[\$\{t\("duel\.p2"\)\}\]/.test(src), "rendered log should prefix player 2 label");
    },
    async function testDuelChartsWiringInGameJs() {
      const src = await fetchText("game.js");
      assert(/routeStatsChartP2/.test(src), "duel should render a second chart canvas");
      assert(/renderRouteChart\(routeCanvas,\s*duelPlayers\[0\]\.routeStats/.test(src), "duel chart should use player 1 stats");
      assert(/renderRouteChart\(p2Canvas,\s*duelPlayers\[1\]\.routeStats/.test(src), "duel chart should use player 2 stats");
    },
    async function testRuntimeDomIdsInIndexHtml() {
      const html = await fetchText("index.html");
      const doc = new DOMParser().parseFromString(html, "text/html");
      const requiredIds = [
        "game",
        "endOverlay",
        "endPanel",
        "endMetricsText",
        "routeStatsChart",
        "viewLogBtn",
        "gameLogPanel",
        "gameLogList",
        "closeLogBtn",
        "tutorialOverlay",
        "tutorialText",
        "tutorialSkipBtn"
      ];

      const missing = [];
      for (let i = 0; i < requiredIds.length; i += 1) {
        const id = requiredIds[i];
        if (!doc.getElementById(id)) missing.push(id);
      }

      assert(missing.length === 0, "index.html missing required runtime ids: " + missing.join(", "));
    },
    async function testSoundAssetsAvailable() {
      const langs = ["de", "en", "fr", "es"];
      const required = [
        "sound/ipv6-track1.mp3",
        "sound/ipv6-track2.mp3",
        "sound/combo.mp3",
        "sound/mega.mp3",
        "sound/router.mp3",
        "sound/monster.mp3"
      ];

      for (let i = 0; i < langs.length; i += 1) {
        const lang = langs[i];
        required.push("sound/tutorial-achievement-" + lang + ".mp3");
        for (let v = 0; v <= 9; v += 1) {
          required.push("sound/levelup-" + lang + "-" + v + ".mp3");
        }
      }

      const unique = Array.from(new Set(required));
      assert(unique.length === required.length, "sound asset test list has duplicate entries");

      const missing = [];
      for (let i = 0; i < unique.length; i += 1) {
        const file = unique[i];
        const ok = await assetExists(file);
        if (!ok) missing.push(file);
      }

      missing.sort();

      assert(missing.length === 0, "missing sound files: " + missing.join(", "));
    }
  ];

  let pass = 0;
  let fail = 0;
  const lines = [];

  for (let i = 0; i < tests.length; i += 1) {
    const name = tests[i].name || "test_" + i;
    try {
      const result = tests[i]();
      if (result && typeof result.then === "function") {
        await result;
      }
      pass += 1;
      lines.push("PASS " + name);
    } catch (err) {
      fail += 1;
      lines.push("FAIL " + name + " -> " + err.message);
    }
  }

  summaryEl.className = fail ? "bad" : "ok";
  summaryEl.textContent = "passed: " + pass + " / failed: " + fail;
  logEl.textContent = lines.join("\n");
})();
