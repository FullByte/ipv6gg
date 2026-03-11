(() => {
  const t = (key, params) => window.i18n.t(key, params);
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startOverlay = document.getElementById("startOverlay");
  const endOverlay = document.getElementById("endOverlay");
  const startBtn = document.getElementById("startBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const endScoreText = document.getElementById("endScoreText");
  const endHighscoreText = document.getElementById("endHighscoreText");
  const endTitle = document.getElementById("endTitle");
  const endPanel = document.getElementById("endPanel");
  const viewLogBtn = document.getElementById("viewLogBtn");
  const gameLogPanel = document.getElementById("gameLogPanel");
  const gameLogList = document.getElementById("gameLogList");
  const closeLogBtn = document.getElementById("closeLogBtn");
  const gameLogTitle = document.getElementById("gameLogTitle");
  const musicBtn = document.getElementById("musicBtn");
  const soundBtn = document.getElementById("soundBtn");
  const touchBtn = document.getElementById("touchBtn");
  const helpBtn = document.getElementById("helpBtn");
  const startHelpLink = document.getElementById("startHelpLink");
  const langSelect = document.getElementById("langSelect");
  const difficultySelect = document.getElementById("difficultySelect");
  const LANG_FLAGS = { de: "🇩🇪", en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸" };
  const bgm = document.getElementById("bgm");
  const impactFlash = document.getElementById("impactFlash");
  const mobileButtons = document.getElementById("mobileButtons");
  const helpOverlay = document.getElementById("helpOverlay");
  const closeHelpBtn = document.getElementById("closeHelpBtn");

  const GAME_W = 800;
  const GAME_H = 600;
  const TARGET_Y = 520;
  const TARGET_MARGIN_X = 18;
  const TARGET_GAP = 10;
  const STORAGE_KEY = "ipv6gg_highscore";
  const mobileMode = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;

  const neon = "#28d7ff";
  const okColor = "#59ff9a";
  const badColor = "#ff4c8a";

  let packets = [];
  let particles = [];
  let toasts = [];
  let gameLog = [];
  let level = 1;
  let score = 0;
  let lives = 3;
  let comboStreak = 0;
  let correctHits = 0;
  let wrongHits = 0;
  let highscore = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let spawnTimer = 0;
  let lastTime = 0;
  let packetId = 1;
  let running = false;
  let draggingPacket = null;
  let pointer = { x: 0, y: 0 };
  let touchEnabled = true;
  let musicEnabled = true;
  const SOUND_MODES = ["person", "effekt", "off"];
  let soundMode = "person";
  const DIFFICULTIES = ["easy", "normal", "hard"];
  /** Aktive Schwierigkeit (wird beim Start aus dem Dropdown übernommen; während des Laufs nicht änderbar). */
  let difficulty = "normal";

  const DIFFICULTY_CONFIG = {
    easy:   { spawnFactor: 1.85, speedFactor: 0.58, ttlFactor: 1.55, route3Enabled: false, suggestHighlight: true },
    normal: { spawnFactor: 1,    speedFactor: 1,    ttlFactor: 1,    route3Enabled: true,  suggestHighlight: false },
    hard:   { spawnFactor: 0.82, speedFactor: 1.12, ttlFactor: 0.88, route3Enabled: true,  suggestHighlight: false },
  };

  const routeStats = [
    { key: "1", hits: 0, misses: 0 },
    { key: "2", hits: 0, misses: 0 },
    { key: "3", hits: 0, misses: 0 },
    { key: "4", hits: 0, misses: 0 },
    { key: "5", hits: 0, misses: 0 }
  ];
  let routeStatsChart = null;

  let audioCtx = null;
  let targetPressFx = [0, 0, 0, 0, 0];

  const COMBO_BONUS = 10;
  /** Level-Up MP3 variant IDs 0–9 pro Sprache (levelup-{lang}-0.mp3 … levelup-{lang}-9.mp3). Pro Sprache jede Variante höchstens einmal pro Runde, dann neu mischen. */
  const LEVELUP_VARIANT_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  /** Pro Sprache: Set der in dieser Runde bereits gespielten Varianten. */
  let levelupPlayedThisRound = {};

  function emitShaderCombo(label, streak, tone = "combo") {
    window.dispatchEvent(
      new CustomEvent("ipv6gg:combo", {
        detail: { label, streak, tone }
      })
    );
  }

  function emitShaderLevelUp(nextLevel) {
    window.dispatchEvent(
      new CustomEvent("ipv6gg:levelup", {
        detail: { level: nextLevel }
      })
    );
  }

  function emitShaderPacketFeedback(outcome, detail = {}) {
    window.dispatchEvent(
      new CustomEvent("ipv6gg:packet", {
        detail: { outcome, ...detail }
      })
    );
  }

  const POINTS_PER_LEVEL = 200;

  function logScoreProgress(context = "update") {
    const levelBaseScore = (level - 1) * POINTS_PER_LEVEL;
    const progressInLevel = Math.max(0, score - levelBaseScore);
    const pointsToNextLevel = Math.max(0, level * POINTS_PER_LEVEL - score);
    console.log(
      `[Score][${context}] score=${score} level=${level} progress=${progressInLevel}/${POINTS_PER_LEVEL} toNext=${pointsToNextLevel} lives=${lives} combo=${comboStreak}`
    );
  }

  function awardComboBonus(packet, tone = "combo") {
    if (comboStreak < 5) return;
    score += COMBO_BONUS;
    if (comboStreak === 5) {
      playEffectMp3("combo");
      if (soundMode === "effekt") playComboSignatureSound(5, "combo");
    } else if (comboStreak === 10) {
      playEffectMp3("mega");
      if (soundMode === "effekt") playComboSignatureSound(10, "mega");
    } else if (comboStreak === 15) {
      playEffectMp3("router");
      if (soundMode === "effekt") playComboSignatureSound(15, "router");
    } else if (comboStreak === 20) {
      playEffectMp3("monster");
      if (soundMode === "effekt") playComboSignatureSound(20, "monster");
    } else if (soundMode === "effekt") {
      playGenericComboTick();
    }
    const centerX = packet.x + packet.w / 2;
    const centerY = packet.y + packet.h / 2;
    createParticles(centerX, centerY, "#6fd6ff");
    addToast(t("toast.comboBonus", { n: COMBO_BONUS }), "#9de8ff", 1.8, true);

    const comboLabel = (key) => t(key).replace(/!$/, "");
    if (comboStreak === 5) {
      emitShaderCombo(comboLabel("toast.combo"), comboStreak, tone);
      addToast(t("toast.combo"), "#7fdfff", 2.2, true);
    } else if (comboStreak === 10) {
      emitShaderCombo(comboLabel("toast.megaCombo"), comboStreak, "mega");
      addToast(t("toast.megaCombo"), "#ffd166", 2.4, true);
    } else if (comboStreak === 15) {
      emitShaderCombo(comboLabel("toast.goodRouter"), comboStreak, "router");
      addToast(t("toast.goodRouter"), "#ffb86c", 2.6, true);
    } else if (comboStreak === 20) {
      emitShaderCombo(comboLabel("toast.monsterRouter"), comboStreak, "monster");
      addToast(t("toast.monsterRouter"), "#e879f9", 2.8, true);
    } else {
      emitShaderCombo(`${comboLabel("toast.combo")} x${comboStreak}`, comboStreak, tone);
    }
  }

  bgm.volume = 0.35;

  function tryStartMusic() {
    if (!musicEnabled) return;
    const p = bgm.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Browser can block autoplay until the next user gesture.
      });
    }
  }

  function syncMusicButton() {
    musicBtn.textContent = `${t("btn.music")}: ${musicEnabled ? t("toggle.on") : t("toggle.off")}`;
    musicBtn.setAttribute("aria-label", t("aria.music"));
  }

  function syncSoundButton() {
    soundBtn.textContent = `${t("btn.sound")}: ${t("soundMode." + soundMode)}`;
    soundBtn.setAttribute("aria-label", t("aria.sound"));
  }

  function syncTouchButton() {
    touchBtn.textContent = `${t("btn.touch")}: ${touchEnabled ? t("toggle.on") : t("toggle.off")}`;
    touchBtn.setAttribute("aria-label", t("aria.touch"));
    if (mobileButtons) {
      if (touchEnabled) {
        mobileButtons.classList.add("touch-enabled");
      } else {
        mobileButtons.classList.remove("touch-enabled");
      }
    }
  }

  function syncDifficultySelect() {
    if (!difficultySelect) return;
    difficultySelect.disabled = running;
    difficultySelect.setAttribute("aria-label", t("aria.difficulty"));
    const opts = difficultySelect.options;
    if (opts.length >= 3) {
      opts[0].textContent = t("difficulty.easy");
      opts[1].textContent = t("difficulty.normal");
      opts[2].textContent = t("difficulty.hard");
    }
  }

  function syncLangSelectOptions() {
    if (!langSelect || !window.i18n || !window.i18n.LANGUAGES) return;
    const langs = window.i18n.LANGUAGES;
    for (let i = 0; i < langSelect.options.length; i += 1) {
      const opt = langSelect.options[i];
      const name = langs.find((l) => l.code === opt.value)?.name || opt.value.toUpperCase();
      opt.textContent = (LANG_FLAGS[opt.value] || "🌐") + " " + name;
    }
  }

  function applyUITranslations() {
    if (langSelect) {
      langSelect.value = window.i18n.getLanguage();
      langSelect.setAttribute("aria-label", t("aria.lang"));
      syncLangSelectOptions();
    }
    const startIntro1El = document.getElementById("startIntro1");
    const startIntro2El = document.getElementById("startIntro2");
    const startIntro3El = document.getElementById("startIntro3");
    const startHelpHintEl = document.getElementById("startHelpHint");
    if (startIntro1El) startIntro1El.textContent = t("start.intro1");
    if (startIntro2El) startIntro2El.textContent = t("start.intro2");
    if (startIntro3El) startIntro3El.textContent = t("start.intro3");
    if (startHelpHintEl && startHelpHintEl.firstChild) {
      startHelpHintEl.firstChild.nodeValue = t("start.helpHint") + " ";
      if (startHelpLink) {
        startHelpLink.textContent = t("start.helpLink");
        startHelpLink.setAttribute("aria-label", t("aria.helpLink"));
      }
    }
    if (startBtn) startBtn.textContent = t("start.btn");
    if (endTitle) endTitle.textContent = t("end.title");
    if (playAgainBtn) playAgainBtn.textContent = t("end.btn");
    if (viewLogBtn) viewLogBtn.textContent = t("log.viewLog");
    if (gameLogTitle) gameLogTitle.textContent = t("log.title");
    if (closeLogBtn) closeLogBtn.textContent = t("log.close");
    const helpTitleEl = document.getElementById("helpTitle");
    if (helpTitleEl) helpTitleEl.textContent = t("help.title");
    ["helpP1", "helpP2", "helpP3", "helpP4", "helpP5", "helpP6", "helpP7", "helpHotkeys"].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(i < 7 ? "help.p" + (i + 1) : "help.hotkeys");
    });
    if (closeHelpBtn) closeHelpBtn.textContent = t("help.close");
    syncMusicButton();
    syncSoundButton();
    syncTouchButton();
    if (helpBtn) {
      helpBtn.textContent = t("btn.help");
      helpBtn.setAttribute("aria-label", t("aria.help"));
    }
    syncDifficultySelect();
  }

  const targets = [
    { key: "1", label: "2001:db8:1::/64", prefix: "2001:db8:1::/64", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "2", label: "2001:db8:2::/64", prefix: "2001:db8:2::/64", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "3", label: "2a10:42:3::/64", prefix: "2a10:42:3::/64", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "4", label: "ff02::1", prefix: "ff02::1/128", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "5", label: "Fehlversuch", prefix: null, rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } }
  ];

  function getDifficultyConfig() {
    return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  }

  function layoutTargets() {
    const config = getDifficultyConfig();
    const availableWidth = GAME_W - TARGET_MARGIN_X * 2;
    const activeIndices = config.route3Enabled ? [0, 1, 2, 3, 4] : [0, 1, 3, 4];
    const n = activeIndices.length;
    const slotWidth = (availableWidth - TARGET_GAP * (n - 1)) / n;
    let slotIndex = 0;
    for (let i = 0; i < targets.length; i += 1) {
      if (i === 2 && !config.route3Enabled) {
        targets[i].rect.x = -1000;
        targets[i].rect.y = TARGET_Y;
        targets[i].rect.w = 0;
        targets[i].rect.h = 64;
      } else {
        targets[i].rect.x = TARGET_MARGIN_X + slotIndex * (slotWidth + TARGET_GAP);
        targets[i].rect.y = TARGET_Y;
        targets[i].rect.w = slotWidth;
        targets[i].rect.h = 64;
        slotIndex += 1;
      }
    }
  }

  function flashTargetPress(index) {
    if (index < 0 || index >= targets.length) return;
    targetPressFx[index] = performance.now() + 220;
  }

  function initAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
      }
    }
  }

  function beep(freq, duration, type, volume = 0.102) {
    if (soundMode === "off" || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playChiptune(notes, tempo = 0.08) {
    if (soundMode !== "effekt" || !audioCtx) return;
    notes.forEach((note, i) => {
      setTimeout(() => {
        beep(note.freq, note.dur || tempo, note.type || "square", note.vol || 0.11);
      }, i * tempo * 1000);
    });
  }

  function playLevelUpSound() {
    playChiptune([
      { freq: 392, dur: 0.07, vol: 0.11, type: "square" },
      { freq: 494, dur: 0.07, vol: 0.115, type: "square" },
      { freq: 659, dur: 0.08, vol: 0.12, type: "square" },
      { freq: 784, dur: 0.08, vol: 0.125, type: "square" },
      { freq: 988, dur: 0.11, vol: 0.13, type: "square" }
    ], 0.058);
  }

  function playGameOverSound() {
    playChiptune([
      { freq: 330, dur: 0.15, type: "sawtooth", vol: 0.12 },
      { freq: 294, dur: 0.15, type: "sawtooth", vol: 0.13 },
      { freq: 247, dur: 0.15, type: "sawtooth", vol: 0.14 },
      { freq: 196, dur: 0.25, type: "sawtooth", vol: 0.15 },
      { freq: 98, dur: 0.35, type: "square", vol: 0.11 }
    ], 0.12);
  }

  function playComboSignatureSound(streak, tone = "combo") {
    if (soundMode !== "effekt") return;
    if (tone === "monster" || streak >= 20) {
      playChiptune([
        { freq: 392, dur: 0.06, vol: 0.12 },
        { freq: 523, dur: 0.06, vol: 0.12 },
        { freq: 659, dur: 0.07, vol: 0.13 },
        { freq: 784, dur: 0.07, vol: 0.13 },
        { freq: 988, dur: 0.1, vol: 0.14 }
      ], 0.055);
      return;
    }
    if (tone === "router" || streak >= 10) {
      playChiptune([
        { freq: 659, dur: 0.07, vol: 0.12 },
        { freq: 784, dur: 0.07, vol: 0.12 },
        { freq: 988, dur: 0.08, vol: 0.13 },
        { freq: 1175, dur: 0.11, vol: 0.14 }
      ], 0.06);
      return;
    }
    if (tone === "mega" || streak >= 5) {
      playChiptune([
        { freq: 587, dur: 0.07, vol: 0.11 },
        { freq: 740, dur: 0.08, vol: 0.12 },
        { freq: 932, dur: 0.1, vol: 0.13 }
      ], 0.06);
      return;
    }
    playChiptune([
      { freq: 523, dur: 0.06, vol: 0.1 },
      { freq: 659, dur: 0.08, vol: 0.11 }
    ], 0.055);
  }

  function playGenericComboTick() {
    if (soundMode !== "effekt" || !audioCtx) return;
    beep(660, 0.06, "square", 0.08);
    setTimeout(() => { if (soundMode === "effekt" && audioCtx) beep(880, 0.05, "square", 0.07); }, 55);
  }

  const effectQueue = [];
  let effectPlaying = false;

  function playEffectUrl(url) {
    if (soundMode !== "person") return;
    effectQueue.push(url);
    processEffectQueue();
  }

  function processEffectQueue() {
    if (effectPlaying || effectQueue.length === 0) return;
    effectPlaying = true;
    const url = effectQueue.shift();
    const el = new Audio(url);
    el.volume = 0.5;
    const next = () => {
      effectPlaying = false;
      processEffectQueue();
    };
    el.onended = next;
    el.onerror = next;
    el.play().catch(next);
  }

  function playEffectMp3(effectKey) {
    if (soundMode !== "person") return;
    playEffectUrl(`sound/${effectKey}.mp3`);
  }

  function getNextLevelUpVariant(lang) {
    if (!levelupPlayedThisRound[lang]) levelupPlayedThisRound[lang] = new Set();
    const played = levelupPlayedThisRound[lang];
    const available = LEVELUP_VARIANT_IDS.filter((id) => !played.has(id));
    if (available.length === 0) {
      played.clear();
      available.push(...LEVELUP_VARIANT_IDS);
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    played.add(chosen);
    return chosen;
  }

  function playLevelUpMp3() {
    if (soundMode !== "person") return;
    const lang = window.i18n ? window.i18n.getLanguage() : "de";
    const variant = getNextLevelUpVariant(lang);
    playEffectUrl(`sound/levelup-${lang}-${variant}.mp3`);
  }

  function addToast(text, color = neon, life = 1.2, foreground = false) {
    const doubledLife = life * 2;
    toasts.push({ text, color, life: doubledLife, maxLife: doubledLife, foreground });
  }

  function triggerImpact(type) {
    if (!impactFlash) return;
    impactFlash.classList.remove("flash-ok", "flash-bad", "flash-levelup", "flash-gameover");
    void impactFlash.offsetWidth;
    const className = {
      ok: "flash-ok",
      bad: "flash-bad",
      levelup: "flash-levelup",
      gameover: "flash-gameover"
    }[type];
    if (className) impactFlash.classList.add(className);
  }

  function createParticles(x, y, color) {
    for (let i = 0; i < 18; i += 1) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.65) * 220,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.2,
        size: 2 + Math.random() * 3,
        color
      });
    }
  }

  function parsePrefix(prefixStr) {
    const [address, len] = prefixStr.split("/");
    return { address, length: Number(len) };
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
      groups = [...left, ...Array(missing).fill("0"), ...right];
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

  function findBestTargetIndex(address) {
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

  function randomHex(max = 0xffff) {
    return Math.floor(Math.random() * (max + 1)).toString(16);
  }

  function randomIPv6FromPrefix(prefixCidr) {
    const parsed = parsePrefix(prefixCidr);
    const groups = expandIPv6(parsed.address);
    if (!groups) return "2001:db8::1";

    const fixedGroupCount = Math.floor(parsed.length / 16);
    const partialBits = parsed.length % 16;

    for (let i = fixedGroupCount; i < 8; i += 1) {
      groups[i] = randomHex().padStart(4, "0");
    }

    if (partialBits > 0 && fixedGroupCount < 8) {
      const fixedValue = parseInt(groups[fixedGroupCount], 16);
      const mask = 0xffff << (16 - partialBits);
      const randomPart = Math.floor(Math.random() * (1 << (16 - partialBits)));
      const merged = (fixedValue & mask) | randomPart;
      groups[fixedGroupCount] = merged.toString(16).padStart(4, "0");
    }

    return groups.join(":").replace(/(^|:)0{1,3}/g, "$1");
  }

  function route3OrAlternate() {
    if (getDifficultyConfig().route3Enabled) return { address: randomIPv6FromPrefix("2a10:42:3::/64") };
    return Math.random() < 0.5
      ? { address: randomIPv6FromPrefix("2001:db8:1::/64") }
      : { address: randomIPv6FromPrefix("2001:db8:2::/64") };
  }

  function generatePacketAddress() {
    const roll = Math.random();
    const isHard = difficulty === "hard";

    // Level 5+: increase route-4 and route-5 pressure. Hard: noch mehr Spezial/Invalid.
    if (level >= 5) {
      const a = isHard ? 0.18 : 0.22;
      const b = isHard ? 0.36 : 0.44;
      const c = isHard ? 0.52 : 0.62;
      const d = isHard ? 0.64 : 0.7;
      const e = isHard ? 0.82 : 0.84;
      if (roll < a) return { address: randomIPv6FromPrefix("2001:db8:1::/64") };
      if (roll < b) return { address: randomIPv6FromPrefix("2001:db8:2::/64") };
      if (roll < c) return route3OrAlternate();
      if (roll < d) return { address: "ff0e::1", acceptedTargets: getDifficultyConfig().route3Enabled ? [0, 1, 2] : [0, 1] };
      if (roll < e) return { address: "ff02::1" };
      let invalidAddr = "";
      do {
        invalidAddr = ["2001", "0db8", "9", randomHex(0x0fff), randomHex(), randomHex(), randomHex(), randomHex()]
          .map((g) => g.padStart(4, "0"))
          .join(":")
          .replace(/(^|:)0{1,3}/g, "$1");
      } while (findBestTargetIndex(invalidAddr) !== -1);
      return { address: invalidAddr };
    }

    // Level 3+: add ff0e::1. Hard: Level-5-Verteilung nutzen (mehr Vielfalt).
    if (level >= 3 || isHard) {
      const a = isHard ? 0.22 : 0.3;
      const b = isHard ? 0.44 : 0.58;
      const c = isHard ? 0.62 : 0.78;
      const d = isHard ? 0.7 : 0.86;
      const e = isHard ? 0.84 : 0.93;
      if (roll < a) return { address: randomIPv6FromPrefix("2001:db8:1::/64") };
      if (roll < b) return { address: randomIPv6FromPrefix("2001:db8:2::/64") };
      if (roll < c) return route3OrAlternate();
      if (roll < d) return { address: "ff0e::1", acceptedTargets: getDifficultyConfig().route3Enabled ? [0, 1, 2] : [0, 1] };
      if (roll < e) return { address: "ff02::1" };
      let invalidAddr = "";
      do {
        invalidAddr = ["2001", "0db8", "9", randomHex(0x0fff), randomHex(), randomHex(), randomHex(), randomHex()]
          .map((g) => g.padStart(4, "0"))
          .join(":")
          .replace(/(^|:)0{1,3}/g, "$1");
      } while (findBestTargetIndex(invalidAddr) !== -1);
      return { address: invalidAddr };
    }

    if (roll < 0.3) return { address: randomIPv6FromPrefix("2001:db8:1::/64") };
    if (roll < 0.6) return { address: randomIPv6FromPrefix("2001:db8:2::/64") };
    if (roll < 0.82) return route3OrAlternate();
    if (roll < 0.92) return { address: "ff02::1" };

    let addr = "";
    do {
      addr = ["2001", "0db8", "9", randomHex(0x0fff), randomHex(), randomHex(), randomHex(), randomHex()]
        .map((g) => g.padStart(4, "0"))
        .join(":")
        .replace(/(^|:)0{1,3}/g, "$1");
    } while (findBestTargetIndex(addr) !== -1);

    return { address: addr };
  }

  function spawnPacket() {
    const config = getDifficultyConfig();
    const packetData = generatePacketAddress();
    const address = packetData.address;
    const correctTarget = findBestTargetIndex(address);
    let ttl = Math.max(3.9, 12.1 - level * 0.32);
    ttl *= config.ttlFactor;
    let speed = 31 + level * 7.8;
    speed *= config.speedFactor;

    const packetW = 260;
    packets.push({
      id: packetId,
      x: 20 + Math.random() * (GAME_W - 40 - packetW),
      y: -40,
      w: packetW,
      h: 44,
      address,
      acceptedTargets: packetData.acceptedTargets || null,
      timeLeft: ttl,
      maxTime: ttl,
      speed,
      correctTarget,
      spawnedAt: packetId++
    });
  }

  function pushGameLog(entry) {
    gameLog.push(entry);
  }

  function resetGame() {
    packets = [];
    particles = [];
    toasts = [];
    gameLog = [];
    effectQueue.length = 0;
    effectPlaying = false;
    levelupPlayedThisRound = {};
    level = 1;
    score = 0;
    lives = 3;
    comboStreak = 0;
    correctHits = 0;
    wrongHits = 0;
    spawnTimer = 0;
    draggingPacket = null;
    packetId = 1;
    for (let i = 0; i < routeStats.length; i += 1) {
      routeStats[i].hits = 0;
      routeStats[i].misses = 0;
    }
  }

  function startGame() {
    if (difficultySelect) difficulty = difficultySelect.value;
    if (!DIFFICULTIES.includes(difficulty)) difficulty = "normal";
    resetGame();
    running = true;
    syncDifficultySelect();
    startOverlay.classList.add("hidden");
    endOverlay.classList.add("hidden");
    helpOverlay.classList.add("hidden");
    addToast(t("toast.routeActive"), neon, 1.8);
  }

  function openHelp() {
    helpOverlay.classList.remove("hidden");
  }

  function closeHelp() {
    helpOverlay.classList.add("hidden");
  }

  function endGame() {
    running = false;
    syncDifficultySelect();
    syncMobileDifficultyState();
    playGameOverSound();
    triggerImpact("gameover");
    if (score > highscore) {
      highscore = score;
      localStorage.setItem(STORAGE_KEY, String(highscore));
    }
    endScoreText.textContent = `${t("end.score")}: ${score}`;
    endHighscoreText.textContent = `${t("end.highscore")}: ${highscore}`;
    renderStatsCharts();
    if (endPanel) endPanel.classList.remove("hidden");
    if (gameLogPanel) gameLogPanel.classList.add("hidden");
    endOverlay.classList.remove("hidden");
  }

  function renderGameLog() {
    if (!gameLogList) return;
    gameLogList.innerHTML = "";
    const comboLine = (combo) => (combo > 0 ? t("log.comboLost", { combo }) : t("log.comboLine"));
    const livesChangeStr = (delta) => (delta === -1 ? t("log.livesChangeMinus") : delta === 1 ? t("log.livesChangePlus") : t("log.livesChangeZero"));
    gameLog.forEach((entry) => {
      const li = document.createElement("li");
      let text = "";
      const points = entry.points != null ? entry.points : 0;
      const combo = entry.combo != null ? entry.combo : 0;
      const score = entry.score != null ? entry.score : 0;
      const lives = entry.lives != null ? entry.lives : 0;
      const livesDelta = entry.livesDelta != null ? entry.livesDelta : 0;
      const livesWithTotal = t("log.livesWithTotal", { livesChange: livesChangeStr(livesDelta), lives });
      if (entry.type === "hit") {
        text = t("log.entryHit", { address: entry.address, target: entry.targetLabel || entry.targetKey, points, score, combo, livesWithTotal });
      } else if (entry.type === "miss") {
        const chosen = entry.chosenLabel != null ? entry.chosenLabel : (entry.chosenTargetIndex === 4 ? t("targets.fail") : "-");
        const correct = entry.correctLabel != null ? entry.correctLabel : "-";
        const reason = entry.reasonKey ? t(entry.reasonKey) : "";
        text = t("log.entryMiss", { address: entry.address, chosen, correct, reason, comboLine: comboLine(entry.combo != null ? entry.combo : 0), livesWithTotal });
        if (entry.hardPenalty) text += " " + t("log.hardPenaltySuffix");
      } else if (entry.type === "isolate") {
        text = t("log.entryIsolate", { address: entry.address, points, score, combo, livesWithTotal });
      } else if (entry.type === "timeout") {
        const correct = entry.correctLabel != null ? entry.correctLabel : "-";
        text = t("log.entryTimeout", { address: entry.address, correct, comboLine: comboLine(entry.combo != null ? entry.combo : 0), livesWithTotal });
      } else if (entry.type === "lost") {
        const correct = entry.correctLabel != null ? entry.correctLabel : "-";
        text = t("log.entryLost", { address: entry.address, correct, comboLine: comboLine(entry.combo != null ? entry.combo : 0), livesWithTotal });
      } else {
        text = entry.address || "";
      }
      li.textContent = text;
      li.className = "game-log-entry game-log-" + (entry.type || "");
      gameLogList.appendChild(li);
    });
  }

  function openGameLog() {
    if (gameLogTitle) gameLogTitle.textContent = t("log.title");
    if (closeLogBtn) closeLogBtn.textContent = t("log.close");
    renderGameLog();
    if (endPanel) endPanel.classList.add("hidden");
    if (gameLogPanel) gameLogPanel.classList.remove("hidden");
  }

  function renderStatsCharts() {
    const routeCanvas = document.getElementById("routeStatsChart");
    if (!routeCanvas || typeof Chart === "undefined") return;

    const routeLabels = routeStats.map((r) => r.key);
    const routeHits = routeStats.map((r) => r.hits);
    const routeMisses = routeStats.map((r) => r.misses);

    if (routeStatsChart) routeStatsChart.destroy();
    const chartOpts = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 4, bottom: 4 } },
      plugins: {
        title: { display: true, text: t("stats.routesTitle"), color: "#e7f7ff", font: { size: 11, weight: "600" } },
        legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 }, color: "#e7f7ff" } }
      },
      scales: {
        x: {
          stacked: false,
          ticks: { font: { size: 10 }, color: "#b0d4e8" },
          grid: { color: "rgba(40, 215, 255, 0.15)" }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 9 }, color: "#b0d4e8" },
          grid: { color: "rgba(40, 215, 255, 0.15)" }
        }
      }
    };
    routeStatsChart = new Chart(routeCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: routeLabels,
        datasets: [
          { label: t("hud.correct"), data: routeHits, backgroundColor: "rgba(89, 255, 154, 0.7)" },
          { label: t("hud.wrong"), data: routeMisses, backgroundColor: "rgba(255, 76, 138, 0.75)" }
        ]
      },
      options: chartOpts
    });

  }

  function recordPacketStats(packet, targetIndex, wasHit) {
    if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex < routeStats.length) {
      if (wasHit) routeStats[targetIndex].hits += 1;
      else routeStats[targetIndex].misses += 1;
    }
  }

  function closeGameLog() {
    if (gameLogPanel) gameLogPanel.classList.add("hidden");
    if (endPanel) endPanel.classList.remove("hidden");
  }

  function levelCheck() {
    const targetLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
    while (targetLevel > level) {
      level += 1;
      lives += 1;
      addToast(t("toast.levelUp", { level }), "#ffd166", 1.4, true);
    addToast(t("toast.levelBonus"), "#a7ff8a", 1.2, true);
      if (soundMode === "person") playLevelUpMp3();
      if (soundMode === "effekt") playLevelUpSound();
      triggerImpact("levelup");
      emitShaderLevelUp(level);
    }
  }

  function scoreHit(packet, target) {
    score += 10;
    correctHits += 1;
    comboStreak += 1;
    const hitPoints = 10 + (comboStreak >= 5 ? COMBO_BONUS : 0);
    emitShaderPacketFeedback("hit", { target: target.label, combo: comboStreak });
    createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, okColor);
    addToast(t("toast.prefixMatch", { label: target.label }), okColor, 3.5);
    triggerImpact("ok");
    beep(740, 0.09, "square", 0.108);
    beep(1080, 0.08, "square", 0.09);
    awardComboBonus(packet);
    recordPacketStats(packet, Number(target.key) - 1, true);
    const livesBeforeLevel = lives;
    levelCheck();
    const hitLivesDelta = lives - livesBeforeLevel;
    pushGameLog({ type: "hit", address: packet.address, targetKey: target.key, targetLabel: target.label, combo: comboStreak, points: hitPoints, livesDelta: hitLivesDelta, lives, score });
    logScoreProgress(`hit:${target.key}`);
  }

  function scoreMiss(packet, reason, chosenTargetIndex) {
    const comboBeforeReset = comboStreak;
    const hardPenalty = difficulty === "hard";
    if (hardPenalty) {
      score = Math.max(0, (level - 1) * POINTS_PER_LEVEL);
    }
    comboStreak = 0;
    lives -= 1;
    wrongHits += 1;
    recordPacketStats(packet, chosenTargetIndex >= 0 && chosenTargetIndex < routeStats.length ? chosenTargetIndex : -1, false);
    const chosenLabel = chosenTargetIndex >= 0 && targets[chosenTargetIndex] ? (chosenTargetIndex === 4 ? t("targets.fail") : targets[chosenTargetIndex].label) : null;
    const correctLabel = packet.correctTarget >= 0 && targets[packet.correctTarget] ? targets[packet.correctTarget].label : null;
    pushGameLog({ type: "miss", address: packet.address, reasonKey: reason, chosenTargetIndex, chosenLabel, correctTarget: packet.correctTarget, correctLabel, combo: comboBeforeReset, points: 0, livesDelta: -1, lives, score, hardPenalty });
    emitShaderPacketFeedback("miss", { reason });
    createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, badColor);
    addToast(typeof reason === "string" && reason.startsWith("toast.") ? t(reason) : reason, badColor, 3.8);
    if (hardPenalty) addToast(t("toast.hardPenalty"), "#ff9f43", 2.8);
    triggerImpact("bad");
    beep(210, 0.18, "sawtooth", 0.114);
    beep(105, 0.25, "square", 0.095);
    beep(75, 0.28, "triangle", 0.09);
    logScoreProgress("miss");
    if (lives <= 0) {
      endGame();
    }
  }

  function resolvePacketToTarget(packet, targetIndex) {
    const target = targets[targetIndex];
    flashTargetPress(targetIndex);

    if (!target) {
      scoreMiss(packet, "toast.unknownTarget", -1);
      return;
    }

    if (Array.isArray(packet.acceptedTargets)) {
      if (packet.acceptedTargets.includes(targetIndex)) {
        scoreHit(packet, target);
      } else {
        scoreMiss(packet, "toast.specialOnly123", targetIndex);
      }
      return;
    }

    if (targetIndex === 4) {
      if (packet.correctTarget === -1) {
        score += 5;
        correctHits += 1;
        comboStreak += 1;
        const isolatePoints = 5 + (comboStreak >= 5 ? COMBO_BONUS : 0);
        emitShaderPacketFeedback("isolate", { combo: comboStreak });
        addToast(t("toast.isolate"), "#7dffc1", 3.2);
        createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, "#7dffc1");
        triggerImpact("ok");
        beep(560, 0.08, "square", 0.09);
        awardComboBonus(packet, "isolate");
        recordPacketStats(packet, 4, true);
        const livesBeforeLevel = lives;
        levelCheck();
        const isolateLivesDelta = lives - livesBeforeLevel;
        pushGameLog({ type: "isolate", address: packet.address, combo: comboStreak, points: isolatePoints, livesDelta: isolateLivesDelta, lives, score });
        logScoreProgress("isolate");
      } else {
        scoreMiss(packet, "toast.wrongCouldRoute", 4);
      }
      return;
    }

    if (packet.correctTarget === targetIndex) {
      scoreHit(packet, target);
    } else {
      scoreMiss(packet, "toast.wrongNetwork", targetIndex);
    }
  }

  function removePacket(id) {
    packets = packets.filter((p) => p.id !== id);
  }

  function hitPacketFromPos(x, y) {
    for (let i = packets.length - 1; i >= 0; i -= 1) {
      const p = packets[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p;
    }
    return null;
  }

  function hitTargetFromPos(x, y) {
    for (let i = 0; i < targets.length; i += 1) {
      const r = targets[i].rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  function toWorldCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = GAME_W / rect.width;
    const sy = GAME_H / rect.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  }

  function onPointerDown(ev) {
    if (!running) return;
    const pos = toWorldCoords(ev.clientX, ev.clientY);
    pointer = pos;
    const p = hitPacketFromPos(pos.x, pos.y);
    if (p) {
      draggingPacket = p;
      draggingPacket.dragDx = pos.x - p.x;
      draggingPacket.dragDy = pos.y - p.y;
      canvas.setPointerCapture(ev.pointerId);
    }
  }

  function onPointerMove(ev) {
    const pos = toWorldCoords(ev.clientX, ev.clientY);
    pointer = pos;
    if (!running || !draggingPacket) return;
    draggingPacket.x = Math.max(4, Math.min(GAME_W - draggingPacket.w - 4, pos.x - draggingPacket.dragDx));
    draggingPacket.y = Math.max(4, Math.min(GAME_H - draggingPacket.h - 4, pos.y - draggingPacket.dragDy));
  }

  function onPointerUp(ev) {
    if (!running || !draggingPacket) return;
    const centerX = draggingPacket.x + draggingPacket.w / 2;
    const centerY = draggingPacket.y + draggingPacket.h / 2;
    const targetIndex = hitTargetFromPos(centerX, centerY);
    const id = draggingPacket.id;
    const packetRef = draggingPacket;
    draggingPacket = null;
    if (targetIndex !== -1) {
      resolvePacketToTarget(packetRef, targetIndex);
      removePacket(id);
    }
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch (err) {
      // Ignore release errors when capture state changed.
    }
  }

  function handleKeyRoute(index) {
    if (!running) return;
    if (index < 0 || index > 4) return;
    if (!getDifficultyConfig().route3Enabled && index === 2) return;
    if (packets.length === 0) return;

    const chosen = getPriorityPacket();
    if (!chosen) return;

    resolvePacketToTarget(chosen, index);
    removePacket(chosen.id);
  }

  function getPriorityPacket() {
    if (packets.length === 0) return null;
    let chosen = packets[0];
    for (let i = 1; i < packets.length; i += 1) {
      if (packets[i].spawnedAt < chosen.spawnedAt) chosen = packets[i];
    }
    return chosen;
  }

  /** Gibt die Ziel-Indizes zurück, die für das Paket korrekt sind (für Vorschlags-Highlight). */
  function getSuggestedTargetIndices(packet) {
    if (!packet) return [];
    const config = getDifficultyConfig();
    let indices = packet.acceptedTargets && packet.acceptedTargets.length
      ? packet.acceptedTargets.slice()
      : (packet.correctTarget >= 0 ? [packet.correctTarget] : []);
    if (!config.route3Enabled) indices = indices.filter((i) => i !== 2);
    return indices;
  }

  function syncMobileDifficultyState() {
    const config = getDifficultyConfig();
    const suggestedSet = running ? new Set(getSuggestedTargetIndices(getPriorityPacket())) : new Set();
    const btns = document.querySelectorAll(".mobile-btn");
    btns.forEach((btn) => {
      const routeIndex = Number(btn.getAttribute("data-route"));
      const hideRoute3 = running && routeIndex === 2 && !config.route3Enabled;
      if (hideRoute3) {
        btn.classList.add("hidden");
        btn.classList.remove("suggested");
      } else {
        btn.classList.remove("hidden");
        if (running && config.suggestHighlight && suggestedSet.has(routeIndex)) btn.classList.add("suggested");
        else btn.classList.remove("suggested");
      }
    });
  }

  function drawBackground(t) {
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = "rgba(10, 10, 26, 0.55)";
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    ctx.save();
    ctx.strokeStyle = "rgba(40, 215, 255, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 30; x < GAME_W; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_H);
      ctx.stroke();
    }
    for (let y = 20; y < GAME_H; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_W, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTargets() {
    layoutTargets();
    const config = getDifficultyConfig();
    const suggestedSet = config.suggestHighlight ? new Set(getSuggestedTargetIndices(getPriorityPacket())) : new Set();
    const now = performance.now();
    for (let i = 0; i < targets.length; i += 1) {
      const tr = targets[i];
      const r = tr.rect;
      if (r.w <= 0) continue;
      const hover = pointer.x >= r.x && pointer.x <= r.x + r.w && pointer.y >= r.y && pointer.y <= r.y + r.h;
      const isFail = i === 4;
      const isMulticast = i === 3;
      const isPressed = targetPressFx[i] > now;
      const isSuggested = suggestedSet.has(i);

      ctx.save();
      ctx.fillStyle = isFail ? "rgba(255, 76, 138, 0.14)" : isMulticast ? "rgba(255, 166, 77, 0.16)" : "rgba(40, 215, 255, 0.12)";
      if (isPressed) {
        ctx.fillStyle = isFail ? "rgba(255, 76, 138, 0.3)" : isMulticast ? "rgba(255, 166, 77, 0.34)" : "rgba(89, 255, 154, 0.28)";
      }
      ctx.strokeStyle = hover || isPressed ? "rgba(255, 255, 255, 0.95)" : isFail ? "rgba(255, 76, 138, 0.8)" : isMulticast ? "rgba(255, 166, 77, 0.9)" : "rgba(40, 215, 255, 0.8)";
      ctx.lineWidth = hover || isPressed ? 2.5 : 1.5;
      ctx.shadowColor = isFail ? "rgba(255, 76, 138, 0.5)" : isMulticast ? "rgba(255, 166, 77, 0.6)" : "rgba(40, 215, 255, 0.55)";
      ctx.shadowBlur = isPressed ? 22 : isSuggested ? 20 : 12;
      if (isSuggested) ctx.shadowColor = "rgba(89, 255, 154, 0.85)";
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.stroke();
      if (isSuggested) {
        ctx.strokeStyle = "rgba(89, 255, 154, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e7f7ff";
      ctx.font = "bold 14px Trebuchet MS";
      const displayLabel = i === 4 ? t("targets.fail") : tr.label;
      ctx.fillText(`[${tr.key}] ${displayLabel}`, r.x + 10, r.y + 30);
      ctx.font = "12px Trebuchet MS";
      ctx.fillStyle = "rgba(231, 247, 255, 0.78)";
      const subtitle = i <= 2 ? t("targets.subtitleBroadcast") : i === 3 ? t("targets.subtitleMulticast") : t("targets.subtitleBlock");
      ctx.fillText(subtitle, r.x + 10, r.y + 52);
      ctx.restore();
    }
  }

  function drawPackets() {
    const priorityPacket = getPriorityPacket();
    const priorityId = priorityPacket ? priorityPacket.id : -1;

    for (let i = 0; i < packets.length; i += 1) {
      const p = packets[i];
      const timerRatio = Math.max(0, p.timeLeft / p.maxTime);
      const timerColor = timerRatio > 0.45 ? okColor : timerRatio > 0.2 ? "#ffd166" : badColor;
      const isPriority = p.id === priorityId;

      ctx.save();
      ctx.fillStyle = "rgba(15, 25, 48, 0.92)";
      ctx.strokeStyle = isPriority ? "rgba(255, 209, 102, 0.95)" : "rgba(40, 215, 255, 0.9)";
      ctx.lineWidth = isPriority ? 2.2 : 1.4;
      ctx.shadowColor = "rgba(40, 215, 255, 0.55)";
      ctx.shadowBlur = draggingPacket && draggingPacket.id === p.id ? 22 : isPriority ? 18 : 12;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();
      ctx.stroke();

      if (isPriority) {
        ctx.fillStyle = "rgba(255, 209, 102, 0.2)";
        ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, 10);
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e7f7ff";
      ctx.font = "12px Consolas, monospace";
      const label = p.address;
      const text = label.length > 42 ? `${label.slice(0, 42)}…` : label;
      ctx.fillText(text, p.x + 8, p.y + 19);

      if (isPriority) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 10px Trebuchet MS";
        ctx.fillText(t("packet.active"), p.x + p.w - 38, p.y + 10);
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(p.x + 8, p.y + 28, p.w - 16, 9);
      ctx.fillStyle = timerColor;
      ctx.fillRect(p.x + 8, p.y + 28, (p.w - 16) * timerRatio, 9);
      ctx.restore();
    }
  }

  function drawParticles(dt) {
    const next = [];
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      next.push(p);
    }
    particles = next;
  }

  function updateToasts(dt) {
    const next = [];
    for (let i = 0; i < toasts.length; i += 1) {
      const t = toasts[i];
      t.life -= dt;
      if (t.life > 0) next.push(t);
    }
    toasts = next;
  }

  function drawToastLayer(foreground) {
    let yOffset = 0;
    for (let i = 0; i < toasts.length; i += 1) {
      const t = toasts[i];
      if (t.foreground !== foreground) continue;
      const alpha = Math.max(0, t.life / t.maxLife);
      const y = 70 + yOffset * 24;
      yOffset += 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 16px Trebuchet MS";
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 24, y);
      ctx.restore();
    }
  }

  function drawHUD() {
    const levelBaseScore = (level - 1) * POINTS_PER_LEVEL;
    const nextLevelScore = level * POINTS_PER_LEVEL;
    const levelProgress = Math.max(0, score - levelBaseScore);
    const levelTarget = POINTS_PER_LEVEL;
    const levelProgressRatio = Math.max(0, Math.min(1, levelProgress / levelTarget));
    const pointsToNextLevel = Math.max(0, nextLevelScore - score);
    const comboMultiplier = comboStreak >= 20 ? 2.0 : comboStreak >= 15 ? 1.5 : comboStreak >= 10 ? 1.25 : comboStreak >= 5 ? 1.0 : 1.0;

    ctx.save();
    ctx.fillStyle = "rgba(6, 12, 24, 0.65)";
    ctx.fillRect(0, 0, GAME_W, 58);

    ctx.fillStyle = "#e7f7ff";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText(`${t("hud.score")}: ${score}`, 14, 27);
    ctx.fillText(`${t("hud.lives")}: ${lives}`, 180, 27);
    ctx.fillText(`${t("hud.level")}: ${level}`, 310, 27);
    ctx.fillText(`${t("hud.highscore")}: ${highscore}`, 430, 27);
    ctx.font = "bold 14px Trebuchet MS";
    ctx.fillStyle = "#9bffcb";
    ctx.fillText(`${t("hud.correct")}: ${correctHits}`, 610, 27);
    ctx.fillStyle = "#ff93b7";
    ctx.fillText(`${t("hud.wrong")}: ${wrongHits}`, 700, 27);
    if (comboStreak >= 5) {
      ctx.fillStyle = "#9de8ff";
      ctx.font = "bold 13px Trebuchet MS";
      ctx.fillText(`${t("hud.combo")} x${comboStreak}`, 610, 47);
    }
    ctx.fillStyle = comboMultiplier > 1 ? "#ffd166" : "rgba(231, 247, 255, 0.72)";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText(`${t("hud.bonus")} x${comboMultiplier.toFixed(1)}`, 700, 47);

    const barX = 14;
    const barY = 38;
    const barW = GAME_W - 28;
    const barH = 12;

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "rgba(255, 209, 102, 0.9)";
    ctx.fillRect(barX, barY, barW * levelProgressRatio, barH);

    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillStyle = "#fff7d6";
    ctx.fillText(
      t("hud.nextLevel", { points: pointsToNextLevel, progress: levelProgress, target: levelTarget }),
      barX + 8,
      barY + 10
    );
    ctx.restore();
  }

  function update(dt) {
    if (!running) return;

    spawnTimer += dt;
    const baseSpawnInterval = Math.max(0.48, 1.45 - level * 0.12);
    const spawnInterval = baseSpawnInterval * getDifficultyConfig().spawnFactor;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnPacket();
    }

    const keep = [];
    for (let i = 0; i < packets.length; i += 1) {
      const p = packets[i];
      p.timeLeft -= dt;

      if (!(draggingPacket && draggingPacket.id === p.id)) {
        p.y += p.speed * dt;
      }

      if (p.timeLeft <= 0) {
        pushGameLog({ type: "timeout", address: p.address, correctTarget: p.correctTarget, correctLabel: p.correctTarget >= 0 && targets[p.correctTarget] ? targets[p.correctTarget].label : null, combo: comboStreak, points: 0, livesDelta: -1, lives: lives - 1, score });
        scoreMiss(p, "toast.timeout", -1);
        continue;
      }

      if (p.y > GAME_H + 20) {
        pushGameLog({ type: "lost", address: p.address, correctTarget: p.correctTarget, correctLabel: p.correctTarget >= 0 && targets[p.correctTarget] ? targets[p.correctTarget].label : null, combo: comboStreak, points: 0, livesDelta: -1, lives: lives - 1, score });
        scoreMiss(p, "toast.packetLost", -1);
        continue;
      }

      keep.push(p);
    }
    packets = keep;
  }

  function gameLoop(ts) {
    const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0);
    lastTime = ts;

    update(dt);
    updateToasts(dt);
    drawBackground(ts);
    drawTargets();
    drawToastLayer(false);
    drawPackets();
    drawParticles(dt);
    drawToastLayer(true);
    drawHUD();
    if (running) syncMobileDifficultyState();

    requestAnimationFrame(gameLoop);
  }

  startBtn.addEventListener("click", () => {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    tryStartMusic();
    startGame();
  });

  playAgainBtn.addEventListener("click", () => {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    tryStartMusic();
    startGame();
  });

  if (viewLogBtn) {
    viewLogBtn.addEventListener("click", () => openGameLog());
  }
  if (closeLogBtn) {
    closeLogBtn.addEventListener("click", () => closeGameLog());
  }

  musicBtn.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
      tryStartMusic();
    } else {
      bgm.pause();
    }
    syncMusicButton();
  });

  soundBtn.addEventListener("click", () => {
    initAudio();
    const idx = SOUND_MODES.indexOf(soundMode);
    soundMode = SOUND_MODES[(idx + 1) % SOUND_MODES.length];
    syncSoundButton();
    if (soundMode !== "off" && audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    if (soundMode === "effekt") beep(520, 0.08, "square", 0.09);
  });

  touchBtn.addEventListener("click", () => {
    touchEnabled = !touchEnabled;
    syncTouchButton();
  });

  helpBtn.addEventListener("click", () => {
    openHelp();
  });

  if (startHelpLink) {
    startHelpLink.addEventListener("click", (ev) => {
      ev.preventDefault();
      openHelp();
    });
  }

  closeHelpBtn.addEventListener("click", () => {
    closeHelp();
  });

  helpOverlay.addEventListener("click", (ev) => {
    if (ev.target === helpOverlay) closeHelp();
  });

  // Mobile route buttons
  const mobileRouteButtons = document.querySelectorAll(".mobile-btn");
  mobileRouteButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const routeIndex = Number(btn.getAttribute("data-route"));
      tryStartMusic();
      handleKeyRoute(routeIndex);
    });
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !helpOverlay.classList.contains("hidden")) {
      ev.preventDefault();
      closeHelp();
      return;
    }

    if (ev.key === "Enter") {
      if (!startOverlay.classList.contains("hidden")) {
        ev.preventDefault();
        startBtn.click();
        return;
      }
      if (!endOverlay.classList.contains("hidden")) {
        ev.preventDefault();
        if (gameLogPanel && !gameLogPanel.classList.contains("hidden")) {
          closeGameLog();
        } else {
          playAgainBtn.click();
        }
        return;
      }
    }
    if (ev.key === "Escape" && endOverlay && !endOverlay.classList.contains("hidden") && gameLogPanel && !gameLogPanel.classList.contains("hidden")) {
      ev.preventDefault();
      closeGameLog();
      return;
    }

    tryStartMusic();
    if (["1", "2", "3", "4", "5"].includes(ev.key)) {
      handleKeyRoute(Number(ev.key) - 1);
    }
    const key = ev.key.toLowerCase();
    const code = ev.code;
    const musicKey = (t("hotkey.music") || "m").toLowerCase();
    const soundKey = (t("hotkey.sound") || "e").toLowerCase();
    const touchKey = (t("hotkey.touch") || "t").toLowerCase();
    const helpKey = (t("hotkey.help") || "h").toLowerCase();
    if (key === musicKey || code === "Key" + musicKey.toUpperCase()) {
      ev.preventDefault();
      musicBtn.click();
    }
    if (key === soundKey || code === "Key" + soundKey.toUpperCase()) {
      ev.preventDefault();
      soundBtn.click();
    }
    if (key === touchKey || code === "Key" + touchKey.toUpperCase()) {
      ev.preventDefault();
      touchBtn.click();
    }
    if (key === helpKey || code === "Key" + helpKey.toUpperCase()) {
      ev.preventDefault();
      if (helpOverlay.classList.contains("hidden")) {
        openHelp();
      } else {
        closeHelp();
      }
    }
  });

  // Polyfill-like guard for older browsers without roundRect.
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
      return this;
    };
  }

  addToast(t("toast.welcome"), neon, 2.0);
  layoutTargets();
  if (langSelect) {
    langSelect.value = window.i18n.getLanguage();
    langSelect.addEventListener("change", () => {
      window.i18n.setLanguage(langSelect.value);
      applyUITranslations();
    });
  }
  window.addEventListener("ipv6gg:lang", applyUITranslations);
  window.addEventListener("pointerdown", tryStartMusic, { passive: true });
  window.addEventListener("touchstart", tryStartMusic, { passive: true });
  applyUITranslations();
  requestAnimationFrame((ts) => {
    lastTime = ts;
    gameLoop(ts);
  });
})();
