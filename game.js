(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startOverlay = document.getElementById("startOverlay");
  const endOverlay = document.getElementById("endOverlay");
  const startBtn = document.getElementById("startBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const endScoreText = document.getElementById("endScoreText");
  const endHighscoreText = document.getElementById("endHighscoreText");
  const musicBtn = document.getElementById("musicBtn");
  const soundBtn = document.getElementById("soundBtn");
  const touchBtn = document.getElementById("touchBtn");
  const helpBtn = document.getElementById("helpBtn");
  const startHelpLink = document.getElementById("startHelpLink");
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
  let soundEnabled = true;
  let audioCtx = null;
  let targetPressFx = [0, 0, 0, 0, 0];

  const COMBO_BONUS = 10;

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

  function logScoreProgress(context = "update") {
    const levelBaseScore = (level - 1) * 100;
    const progressInLevel = Math.max(0, score - levelBaseScore);
    const pointsToNextLevel = Math.max(0, level * 100 - score);
    console.log(
      `[Score][${context}] score=${score} level=${level} progress=${progressInLevel}/100 toNext=${pointsToNextLevel} lives=${lives} combo=${comboStreak}`
    );
  }

  function awardComboBonus(packet, tone = "combo") {
    if (comboStreak < 3) return;
    score += COMBO_BONUS;
    playComboSignatureSound(comboStreak, tone);
    const centerX = packet.x + packet.w / 2;
    const centerY = packet.y + packet.h / 2;
    createParticles(centerX, centerY, "#6fd6ff");
    addToast(`Kombo +${COMBO_BONUS}`, "#9de8ff", 1.8);

    if (comboStreak === 3) {
      emitShaderCombo("KOMBO", comboStreak, tone);
      addToast("KOMBO!", "#7fdfff", 2.2);
    } else if (comboStreak === 5) {
      emitShaderCombo("MEGA KOMBO", comboStreak, "mega");
      addToast("MEGA KOMBO!", "#ffd166", 2.4);
    } else if (comboStreak === 10) {
      emitShaderCombo("GUTER ROUTER", comboStreak, "router");
      addToast("GUTER ROUTER!", "#ffb86c", 2.6);
    } else {
      emitShaderCombo(`KOMBO x${comboStreak}`, comboStreak, tone);
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
    musicBtn.textContent = `[M]usic: ${musicEnabled ? "On" : "Off"}`;
  }

  function syncSoundButton() {
    soundBtn.textContent = `[E]ffekte: ${soundEnabled ? "On" : "Off"}`;
  }

  function syncTouchButton() {
    touchBtn.textContent = `[T]ouch: ${touchEnabled ? "On" : "Off"}`;
    if (mobileButtons) {
      if (touchEnabled) {
        mobileButtons.classList.add("touch-enabled");
      } else {
        mobileButtons.classList.remove("touch-enabled");
      }
    }
  }

  const targets = [
    { key: "1", label: "2001:db8:1::/64", prefix: "2001:db8:1::/64", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "2", label: "2001:db8:2::/64", prefix: "2001:db8:2::/64", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "3", label: "2a10:42:3::/64", prefix: "2a10:42:3::/64", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "4", label: "ff02::1", prefix: "ff02::1/128", rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } },
    { key: "5", label: "Fehlversuch", prefix: null, rect: { x: 0, y: TARGET_Y, w: 0, h: 64 } }
  ];

  function layoutTargets() {
    const availableWidth = GAME_W - TARGET_MARGIN_X * 2;
    const slotWidth = (availableWidth - TARGET_GAP * (targets.length - 1)) / targets.length;
    for (let i = 0; i < targets.length; i += 1) {
      targets[i].rect.x = TARGET_MARGIN_X + i * (slotWidth + TARGET_GAP);
      targets[i].rect.y = TARGET_Y;
      targets[i].rect.w = slotWidth;
      targets[i].rect.h = 64;
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
    if (!soundEnabled || !audioCtx) return;
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
    if (!soundEnabled || !audioCtx) return;
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
    if (!soundEnabled) return;
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

  function addToast(text, color = neon, life = 1.2) {
    const doubledLife = life * 2;
    toasts.push({ text, color, life: doubledLife, maxLife: doubledLife });
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

  function generatePacketAddress() {
    const roll = Math.random();

    // Level 5+: increase route-4 and route-5 pressure.
    if (level >= 5) {
      if (roll < 0.22) return { address: randomIPv6FromPrefix("2001:db8:1::/64") };
      if (roll < 0.44) return { address: randomIPv6FromPrefix("2001:db8:2::/64") };
      if (roll < 0.62) return { address: randomIPv6FromPrefix("2a10:42:3::/64") };
      if (roll < 0.7) return { address: "ff0e::1", acceptedTargets: [0, 1, 2] };
      if (roll < 0.84) return { address: "ff02::1" };
      let invalidAddr = "";
      do {
        invalidAddr = ["2001", "0db8", "9", randomHex(0x0fff), randomHex(), randomHex(), randomHex(), randomHex()]
          .map((g) => g.padStart(4, "0"))
          .join(":")
          .replace(/(^|:)0{1,3}/g, "$1");
      } while (findBestTargetIndex(invalidAddr) !== -1);
      return { address: invalidAddr };
    }

    // Level 3+: add ff0e::1 packets that can be routed to 1 or 2.
    if (level >= 3) {
      if (roll < 0.3) return { address: randomIPv6FromPrefix("2001:db8:1::/64") };
      if (roll < 0.58) return { address: randomIPv6FromPrefix("2001:db8:2::/64") };
      if (roll < 0.78) return { address: randomIPv6FromPrefix("2a10:42:3::/64") };
      if (roll < 0.86) return { address: "ff0e::1", acceptedTargets: [0, 1, 2] };
      if (roll < 0.93) return { address: "ff02::1" };
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
    if (roll < 0.82) return { address: randomIPv6FromPrefix("2a10:42:3::/64") };
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
    const packetData = generatePacketAddress();
    const address = packetData.address;
    const correctTarget = findBestTargetIndex(address);
    const ttl = Math.max(3.9, 12.1 - level * 0.32);

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
      speed: 31 + level * 7.8,
      correctTarget,
      spawnedAt: packetId++
    });
  }

  function resetGame() {
    packets = [];
    particles = [];
    toasts = [];
    level = 1;
    score = 0;
    lives = 3;
    comboStreak = 0;
    correctHits = 0;
    wrongHits = 0;
    spawnTimer = 0;
    draggingPacket = null;
    packetId = 1;
  }

  function startGame() {
    resetGame();
    running = true;
    startOverlay.classList.add("hidden");
    endOverlay.classList.add("hidden");
    helpOverlay.classList.add("hidden");
    addToast("Route aktiv. Drücke 1-5 für das aktive Paket.", neon, 1.8);
  }

  function openHelp() {
    helpOverlay.classList.remove("hidden");
  }

  function closeHelp() {
    helpOverlay.classList.add("hidden");
  }

  function endGame() {
    running = false;
    playGameOverSound();
    triggerImpact("gameover");
    if (score > highscore) {
      highscore = score;
      localStorage.setItem(STORAGE_KEY, String(highscore));
    }
    endScoreText.textContent = `Score: ${score}`;
    endHighscoreText.textContent = `Highscore: ${highscore}`;
    endOverlay.classList.remove("hidden");
  }

  function levelCheck() {
    const targetLevel = Math.floor(score / 100) + 1;
    while (targetLevel > level) {
      level += 1;
      lives += 1;
      addToast(`Level ${level}: Mehr Traffic im Netz!`, "#ffd166", 1.4);
      addToast("Level Up Bonus: +1 Leben", "#a7ff8a", 1.2);
      playLevelUpSound();
      triggerImpact("levelup");
      emitShaderLevelUp(level);
    }
  }

  function scoreHit(packet, target) {
    score += 10;
    correctHits += 1;
    comboStreak += 1;
    emitShaderPacketFeedback("hit", { target: target.label, combo: comboStreak });
    createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, okColor);
    addToast(`Praefix match! -> ${target.label}`, okColor, 3.5);
    triggerImpact("ok");
    beep(740, 0.09, "square", 0.108);
    beep(1080, 0.08, "square", 0.09);
    awardComboBonus(packet);
    levelCheck();
    logScoreProgress(`hit:${target.key}`);
  }

  function scoreMiss(packet, reason) {
    lives -= 1;
    comboStreak = 0;
    wrongHits += 1;
    emitShaderPacketFeedback("miss", { reason });
    createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, badColor);
    addToast(reason, badColor, 3.8);
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
      scoreMiss(packet, "Unbekanntes Ziel.");
      return;
    }

    if (Array.isArray(packet.acceptedTargets)) {
      if (packet.acceptedTargets.includes(targetIndex)) {
        scoreHit(packet, target);
      } else {
        scoreMiss(packet, "Sonderpaket: Hier sind nur Route 1, 2 oder 3 gueltig.");
      }
      return;
    }

    if (targetIndex === 4) {
      if (packet.correctTarget === -1) {
        score += 5;
        correctHits += 1;
        comboStreak += 1;
        emitShaderPacketFeedback("isolate", { combo: comboStreak });
        addToast("Fehlversuch korrekt isoliert (+5)", "#7dffc1", 3.2);
        createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, "#7dffc1");
        triggerImpact("ok");
        beep(560, 0.08, "square", 0.09);
        awardComboBonus(packet, "isolate");
        levelCheck();
        logScoreProgress("isolate");
      } else {
        scoreMiss(packet, "Falsch: Paket haette geroutet werden koennen.");
      }
      return;
    }

    if (packet.correctTarget === targetIndex) {
      scoreHit(packet, target);
    } else {
      scoreMiss(packet, "Falsches Netz gewaehlt.");
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
    const now = performance.now();
    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i];
      const r = t.rect;
      const hover = pointer.x >= r.x && pointer.x <= r.x + r.w && pointer.y >= r.y && pointer.y <= r.y + r.h;
      const isFail = i === 4;
      const isMulticast = i === 3;
      const isPressed = targetPressFx[i] > now;

      ctx.save();
      ctx.fillStyle = isFail ? "rgba(255, 76, 138, 0.14)" : isMulticast ? "rgba(255, 166, 77, 0.16)" : "rgba(40, 215, 255, 0.12)";
      if (isPressed) {
        ctx.fillStyle = isFail ? "rgba(255, 76, 138, 0.3)" : isMulticast ? "rgba(255, 166, 77, 0.34)" : "rgba(89, 255, 154, 0.28)";
      }
      ctx.strokeStyle = hover || isPressed ? "rgba(255, 255, 255, 0.95)" : isFail ? "rgba(255, 76, 138, 0.8)" : isMulticast ? "rgba(255, 166, 77, 0.9)" : "rgba(40, 215, 255, 0.8)";
      ctx.lineWidth = hover || isPressed ? 2.5 : 1.5;
      ctx.shadowColor = isFail ? "rgba(255, 76, 138, 0.5)" : isMulticast ? "rgba(255, 166, 77, 0.6)" : "rgba(40, 215, 255, 0.55)";
      ctx.shadowBlur = isPressed ? 22 : 12;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e7f7ff";
      ctx.font = "bold 14px Trebuchet MS";
      ctx.fillText(`[${t.key}] ${t.label}`, r.x + 10, r.y + 30);
      ctx.font = "12px Trebuchet MS";
      ctx.fillStyle = "rgba(231, 247, 255, 0.78)";
      const subtitle = i <= 2 ? "Broadcast: ff0e::1" : i === 3 ? "Link-Local Multicast" : "Block ungültige Pakete";
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
        ctx.fillText("AKTIV", p.x + p.w - 38, p.y + 10);
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

  function drawToasts(dt) {
    const next = [];
    for (let i = 0; i < toasts.length; i += 1) {
      const t = toasts[i];
      t.life -= dt;
      if (t.life <= 0) continue;
      const alpha = Math.max(0, t.life / t.maxLife);
      const y = 70 + i * 24;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 16px Trebuchet MS";
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 24, y);
      ctx.restore();
      next.push(t);
    }
    toasts = next;
  }

  function drawHUD() {
    const levelBaseScore = (level - 1) * 100;
    const nextLevelScore = level * 100;
    const levelProgress = Math.max(0, score - levelBaseScore);
    const levelTarget = 100;
    const levelProgressRatio = Math.max(0, Math.min(1, levelProgress / levelTarget));
    const pointsToNextLevel = Math.max(0, nextLevelScore - score);
    const comboMultiplier = comboStreak >= 5 ? 2.0 : comboStreak >= 3 ? 1.5 : 1.0;

    ctx.save();
    ctx.fillStyle = "rgba(6, 12, 24, 0.65)";
    ctx.fillRect(0, 0, GAME_W, 58);

    ctx.fillStyle = "#e7f7ff";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText(`Score: ${score}`, 14, 27);
    ctx.fillText(`Leben: ${lives}`, 180, 27);
    ctx.fillText(`Level: ${level}`, 310, 27);
    ctx.fillText(`Highscore: ${highscore}`, 430, 27);
    ctx.font = "bold 14px Trebuchet MS";
    ctx.fillStyle = "#9bffcb";
    ctx.fillText(`Richtig: ${correctHits}`, 610, 27);
    ctx.fillStyle = "#ff93b7";
    ctx.fillText(`Falsch: ${wrongHits}`, 700, 27);
    if (comboStreak >= 3) {
      ctx.fillStyle = "#9de8ff";
      ctx.font = "bold 13px Trebuchet MS";
      ctx.fillText(`KOMBO x${comboStreak}`, 610, 47);
    }
    ctx.fillStyle = comboMultiplier > 1 ? "#ffd166" : "rgba(231, 247, 255, 0.72)";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText(`Bonus x${comboMultiplier.toFixed(1)}`, 700, 47);

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
      `Nächstes Level in ${pointsToNextLevel} Punkten (${levelProgress}/${levelTarget})`,
      barX + 8,
      barY + 10
    );
    ctx.restore();
  }

  function update(dt) {
    if (!running) return;

    spawnTimer += dt;
    const spawnInterval = Math.max(0.48, 1.45 - level * 0.12);
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
        scoreMiss(p, "Timeout: Paket verworfen.");
        continue;
      }

      if (p.y > GAME_H + 20) {
        scoreMiss(p, "Paket verloren.");
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
    drawBackground(ts);
    drawTargets();
    drawPackets();
    drawParticles(dt);
    drawToasts(dt);
    drawHUD();

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
    soundEnabled = !soundEnabled;
    syncSoundButton();
    if (soundEnabled && audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    if (soundEnabled) beep(520, 0.08, "square", 0.09);
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
        playAgainBtn.click();
        return;
      }
    }

    tryStartMusic();
    if (["1", "2", "3", "4", "5"].includes(ev.key)) {
      handleKeyRoute(Number(ev.key) - 1);
    }
    const key = ev.key.toLowerCase();
    const code = ev.code;
    if (key === "m" || code === "KeyM") {
      ev.preventDefault();
      musicBtn.click();
    }
    if (key === "e" || code === "KeyE") {
      ev.preventDefault();
      soundBtn.click();
    }
    if (key === "t" || code === "KeyT") {
      ev.preventDefault();
      touchBtn.click();
    }
    if (key === "h" || code === "KeyH") {
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

  addToast("Willkommen bei ipv6gg", neon, 2.0);
  layoutTargets();
  window.addEventListener("pointerdown", tryStartMusic, { passive: true });
  window.addEventListener("touchstart", tryStartMusic, { passive: true });
  syncMusicButton();
  syncSoundButton();
  syncTouchButton();
  helpBtn.textContent = "[H]ilfe";
  requestAnimationFrame((ts) => {
    lastTime = ts;
    gameLoop(ts);
  });
})();
