(function () {
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
    }
  ];

  let pass = 0;
  let fail = 0;
  const lines = [];

  for (let i = 0; i < tests.length; i += 1) {
    const name = tests[i].name || "test_" + i;
    try {
      tests[i]();
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
