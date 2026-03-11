(function () {
  const DIFFICULTY_CONFIG = {
    easy: { spawnFactor: 2.05, speedFactor: 0.52, ttlFactor: 1.75, route3Enabled: false, suggestHighlight: true },
    normal: { spawnFactor: 1, speedFactor: 1, ttlFactor: 1, route3Enabled: true, suggestHighlight: false },
    hard: { spawnFactor: 0.8, speedFactor: 1.15, ttlFactor: 0.85, route3Enabled: true, suggestHighlight: false }
  };

  function getDifficultyConfig(difficulty) {
    return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  }

  function parsePrefix(prefixStr) {
    const parts = String(prefixStr || "").split("/");
    return { address: parts[0] || "", length: Number(parts[1]) };
  }

  function isValidIPv6(addr) {
    if (typeof addr !== "string" || addr.length < 2 || addr.length > 39) return false;
    if ((addr.match(/::/g) || []).length > 1) return false;
    return /^[0-9a-fA-F:]+$/.test(addr);
  }

  function expandIPv6(address) {
    if (!isValidIPv6(address)) return null;
    const lower = address.toLowerCase();
    const hasCompression = lower.includes("::");
    let groups = [];

    if (hasCompression) {
      const sides = lower.split("::");
      const left = sides[0] ? sides[0].split(":") : [];
      const right = sides[1] ? sides[1].split(":") : [];
      const missing = 8 - (left.length + right.length);
      if (missing < 0) return null;
      groups = left.concat(Array(missing).fill("0"), right);
    } else {
      groups = lower.split(":");
      if (groups.length !== 8) return null;
    }

    if (groups.length !== 8) return null;
    for (let i = 0; i < groups.length; i += 1) {
      if (!/^[0-9a-f]{0,4}$/.test(groups[i])) return null;
      groups[i] = groups[i].padStart(4, "0");
    }
    return groups;
  }

  function hexGroupToBin(group) {
    return parseInt(group, 16).toString(2).padStart(16, "0");
  }

  function ipv6ToBin(address) {
    const groups = expandIPv6(address);
    if (!groups) return null;
    return groups.map(hexGroupToBin).join("");
  }

  function prefixMatch(address, prefixCidr) {
    if (!prefixCidr) return false;
    const parsed = parsePrefix(prefixCidr);
    if (!Number.isInteger(parsed.length) || parsed.length < 0 || parsed.length > 128) return false;
    const addrBin = ipv6ToBin(address);
    const preBin = ipv6ToBin(parsed.address);
    if (!addrBin || !preBin) return false;
    return addrBin.slice(0, parsed.length) === preBin.slice(0, parsed.length);
  }

  function findBestTargetIndex(address, targets) {
    let bestIndex = -1;
    let bestLen = -1;

    for (let i = 0; i < targets.length; i += 1) {
      if (!targets[i].prefix) continue;
      if (!prefixMatch(address, targets[i].prefix)) continue;
      const len = parsePrefix(targets[i].prefix).length;
      if (len > bestLen) {
        bestLen = len;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  function randomHex(rng, max) {
    const m = typeof max === "number" ? max : 0xffff;
    return Math.floor(rng() * (m + 1)).toString(16);
  }

  function randomIPv6FromPrefix(prefixCidr, rng) {
    const parsed = parsePrefix(prefixCidr);
    const groups = expandIPv6(parsed.address);
    if (!groups) return "2001:db8::1";

    const fixedGroupCount = Math.floor(parsed.length / 16);
    const partialBits = parsed.length % 16;

    for (let i = fixedGroupCount; i < 8; i += 1) {
      groups[i] = randomHex(rng).padStart(4, "0");
    }

    if (partialBits > 0 && fixedGroupCount < 8) {
      const fixedValue = parseInt(groups[fixedGroupCount], 16);
      const mask = 0xffff << (16 - partialBits);
      const randomPart = Math.floor(rng() * (1 << (16 - partialBits)));
      const merged = (fixedValue & mask) | randomPart;
      groups[fixedGroupCount] = merged.toString(16).padStart(4, "0");
    }

    return groups.join(":").replace(/(^|:)0{1,3}/g, "$1");
  }

  function applyHardPenalty(score, level, pointsPerLevel, isHard) {
    if (!isHard) return score;
    return Math.max(0, (level - 1) * pointsPerLevel);
  }

  function makeInvalidAddress(rng, targets) {
    let addr = "";
    do {
      addr = ["2001", "0db8", "9", randomHex(rng, 0x0fff), randomHex(rng), randomHex(rng), randomHex(rng), randomHex(rng)]
        .map((g) => g.padStart(4, "0"))
        .join(":")
        .replace(/(^|:)0{1,3}/g, "$1");
    } while (findBestTargetIndex(addr, targets) !== -1);
    return addr;
  }

  function route3OrAlternate(rng, config) {
    if (config.route3Enabled) return { address: randomIPv6FromPrefix("2a10:42:3::/64", rng) };
    return rng() < 0.5
      ? { address: randomIPv6FromPrefix("2001:db8:1::/64", rng) }
      : { address: randomIPv6FromPrefix("2001:db8:2::/64", rng) };
  }

  function generatePacketAddress(level, difficulty, targets, rng) {
    const random = typeof rng === "function" ? rng : Math.random;
    const config = getDifficultyConfig(difficulty);
    const roll = random();
    const isHard = difficulty === "hard";

    if (level >= 5) {
      const a = isHard ? 0.18 : 0.22;
      const b = isHard ? 0.36 : 0.44;
      const c = isHard ? 0.53 : 0.62;
      const d = isHard ? 0.64 : 0.7;
      const e = isHard ? 0.86 : 0.84;
      if (roll < a) return { address: randomIPv6FromPrefix("2001:db8:1::/64", random) };
      if (roll < b) return { address: randomIPv6FromPrefix("2001:db8:2::/64", random) };
      if (roll < c) return route3OrAlternate(random, config);
      if (roll < d) return { address: "ff0e::1", acceptedTargets: config.route3Enabled ? [0, 1, 2] : [0, 1] };
      if (roll < e) return { address: "ff02::1" };
      return { address: makeInvalidAddress(random, targets) };
    }

    if (level >= 3 || isHard) {
      const a = isHard ? 0.22 : 0.3;
      const b = isHard ? 0.44 : 0.58;
      const c = isHard ? 0.62 : 0.78;
      const d = isHard ? 0.72 : 0.86;
      const e = isHard ? 0.88 : 0.93;
      if (roll < a) return { address: randomIPv6FromPrefix("2001:db8:1::/64", random) };
      if (roll < b) return { address: randomIPv6FromPrefix("2001:db8:2::/64", random) };
      if (roll < c) return route3OrAlternate(random, config);
      if (roll < d) return { address: "ff0e::1", acceptedTargets: config.route3Enabled ? [0, 1, 2] : [0, 1] };
      if (roll < e) return { address: "ff02::1" };
      return { address: makeInvalidAddress(random, targets) };
    }

    if (roll < 0.3) return { address: randomIPv6FromPrefix("2001:db8:1::/64", random) };
    if (roll < 0.6) return { address: randomIPv6FromPrefix("2001:db8:2::/64", random) };
    if (roll < 0.82) return route3OrAlternate(random, config);
    if (roll < 0.92) return { address: "ff02::1" };
    return { address: makeInvalidAddress(random, targets) };
  }

  window.ipv6ggCore = {
    DIFFICULTY_CONFIG,
    getDifficultyConfig,
    parsePrefix,
    isValidIPv6,
    expandIPv6,
    ipv6ToBin,
    prefixMatch,
    findBestTargetIndex,
    randomIPv6FromPrefix,
    generatePacketAddress,
    applyHardPenalty
  };
})();
