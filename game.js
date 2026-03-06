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
  const bgm = document.getElementById("bgm");

  const GAME_W = 800;
  const GAME_H = 600;
  const TARGET_Y = 500;
  const STORAGE_KEY = "ipv6gg_highscore";

  const neon = "#28d7ff";
  const okColor = "#59ff9a";
  const badColor = "#ff4c8a";

  let packets = [];
  let particles = [];
  let toasts = [];
  let level = 1;
  let score = 0;
  let lives = 3;
  let highscore = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let spawnTimer = 0;
  let lastTime = 0;
  let packetId = 1;
  let running = false;
  let draggingPacket = null;
  let pointer = { x: 0, y: 0 };
  let musicEnabled = true;
  let soundEnabled = true;
  let audioCtx = null;

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
    musicBtn.textContent = `Music: ${musicEnabled ? "On" : "Off"}`;
  }

  function syncSoundButton() {
    soundBtn.textContent = `Effekte: ${soundEnabled ? "On" : "Off"}`;
  }

  const targets = [
    { key: "1", label: "2001:db8:1::/64", prefix: "2001:db8:1::/64", rect: { x: 30, y: TARGET_Y, w: 170, h: 78 } },
    { key: "2", label: "2001:db8:2::/64", prefix: "2001:db8:2::/64", rect: { x: 220, y: TARGET_Y, w: 170, h: 78 } },
    { key: "3", label: "ff02::1", prefix: "ff02::1/128", rect: { x: 410, y: TARGET_Y, w: 170, h: 78 } },
    { key: "4", label: "Fehlversuch", prefix: null, rect: { x: 600, y: TARGET_Y, w: 170, h: 78 } }
  ];

  function initAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
      }
    }
  }

  function beep(freq, duration, type, volume = 0.045) {
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

  function addToast(text, color = neon, life = 1.2) {
    toasts.push({ text, color, life, maxLife: life });
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

    if (roll < 0.42) return randomIPv6FromPrefix("2001:db8:1::/64");
    if (roll < 0.84) return randomIPv6FromPrefix("2001:db8:2::/64");
    if (roll < 0.93) return "ff02::1";

    let addr = "";
    do {
      addr = ["2001", "0db8", "9", randomHex(0x0fff), randomHex(), randomHex(), randomHex(), randomHex()]
        .map((g) => g.padStart(4, "0"))
        .join(":")
        .replace(/(^|:)0{1,3}/g, "$1");
    } while (findBestTargetIndex(addr) !== -1);

    return addr;
  }

  function spawnPacket() {
    const address = generatePacketAddress();
    const correctTarget = findBestTargetIndex(address);
    const ttl = Math.max(2.3, 6.6 - level * 0.35);

    const packetW = 280;
    packets.push({
      id: packetId,
      x: 20 + Math.random() * (GAME_W - 40 - packetW),
      y: -40,
      w: packetW,
      h: 44,
      address,
      timeLeft: ttl,
      maxTime: ttl,
      speed: 26 + level * 7 + Math.random() * 8,
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
    spawnTimer = 0;
    draggingPacket = null;
    packetId = 1;
  }

  function startGame() {
    resetGame();
    running = true;
    startOverlay.classList.add("hidden");
    endOverlay.classList.add("hidden");
    addToast("Route aktiv. Nutze Drag oder 1-4.", neon, 1.8);
  }

  function endGame() {
    running = false;
    if (score > highscore) {
      highscore = score;
      localStorage.setItem(STORAGE_KEY, String(highscore));
    }
    endScoreText.textContent = `Score: ${score}`;
    endHighscoreText.textContent = `Highscore: ${highscore}`;
    endOverlay.classList.remove("hidden");
  }

  function levelCheck() {
    const targetLevel = Math.floor(score / 50) + 1;
    if (targetLevel > level) {
      level = targetLevel;
      addToast(`Level ${level}: Mehr Traffic im Netz!`, "#ffd166", 1.4);
      beep(620, 0.13, "square", 0.03);
    }
  }

  function scoreHit(packet, target) {
    score += 10;
    createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, okColor);
    addToast(`Praefix match! -> ${target.label}`, okColor, 1.15);
    beep(720, 0.08, "triangle", 0.038);
    beep(960, 0.07, "triangle", 0.03);
    levelCheck();
  }

  function scoreMiss(packet, reason) {
    lives -= 1;
    createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, badColor);
    addToast(reason, badColor, 1.2);
    beep(190, 0.16, "sawtooth", 0.048);
    if (lives <= 0) {
      endGame();
    }
  }

  function resolvePacketToTarget(packet, targetIndex) {
    const target = targets[targetIndex];

    if (!target) {
      scoreMiss(packet, "Unbekanntes Ziel.");
      return;
    }

    if (targetIndex === 3) {
      if (packet.correctTarget === -1) {
        score += 5;
        addToast("Fehlversuch korrekt isoliert (+5)", "#7dffc1", 1.0);
        createParticles(packet.x + packet.w / 2, packet.y + packet.h / 2, "#7dffc1");
        beep(560, 0.08, "triangle", 0.03);
        levelCheck();
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
    if (index < 0 || index > 3) return;
    if (packets.length === 0) return;

    // Route the oldest visible packet when keyboard is used.
    let chosen = packets[0];
    for (let i = 1; i < packets.length; i += 1) {
      if (packets[i].spawnedAt < chosen.spawnedAt) chosen = packets[i];
    }

    resolvePacketToTarget(chosen, index);
    removePacket(chosen.id);
  }

  function drawBackground(t) {
    ctx.fillStyle = "#0a0a1a";
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

    for (let i = 0; i < 8; i += 1) {
      const nx = 55 + i * 100;
      const ny = 85 + Math.sin(t * 0.0016 + i) * 18;
      const pulse = 3 + Math.sin(t * 0.003 + i) * 1.2;
      ctx.beginPath();
      ctx.fillStyle = "rgba(40, 215, 255, 0.22)";
      ctx.arc(nx, ny, pulse + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "rgba(40, 215, 255, 0.9)";
      ctx.arc(nx, ny, pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTargets() {
    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i];
      const r = t.rect;
      const hover = pointer.x >= r.x && pointer.x <= r.x + r.w && pointer.y >= r.y && pointer.y <= r.y + r.h;
      const isFail = i === 3;

      ctx.save();
      ctx.fillStyle = isFail ? "rgba(255, 76, 138, 0.14)" : "rgba(40, 215, 255, 0.12)";
      ctx.strokeStyle = hover ? "rgba(255, 255, 255, 0.95)" : isFail ? "rgba(255, 76, 138, 0.8)" : "rgba(40, 215, 255, 0.8)";
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.shadowColor = isFail ? "rgba(255, 76, 138, 0.5)" : "rgba(40, 215, 255, 0.55)";
      ctx.shadowBlur = 12;
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
      ctx.fillText(isFail ? "Unsichere Pakete" : "Route hierhin", r.x + 10, r.y + 52);
      ctx.restore();
    }
  }

  function drawPackets() {
    for (let i = 0; i < packets.length; i += 1) {
      const p = packets[i];
      const timerRatio = Math.max(0, p.timeLeft / p.maxTime);
      const timerColor = timerRatio > 0.45 ? okColor : timerRatio > 0.2 ? "#ffd166" : badColor;

      ctx.save();
      ctx.fillStyle = "rgba(15, 25, 48, 0.92)";
      ctx.strokeStyle = "rgba(40, 215, 255, 0.9)";
      ctx.lineWidth = 1.4;
      ctx.shadowColor = "rgba(40, 215, 255, 0.55)";
      ctx.shadowBlur = draggingPacket && draggingPacket.id === p.id ? 22 : 12;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e7f7ff";
      ctx.font = "12px Consolas, monospace";
      const text = p.address.length > 42 ? `${p.address.slice(0, 42)}…` : p.address;
      ctx.fillText(text, p.x + 8, p.y + 19);

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
    ctx.save();
    ctx.fillStyle = "rgba(6, 12, 24, 0.65)";
    ctx.fillRect(0, 0, GAME_W, 42);

    ctx.fillStyle = "#e7f7ff";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText(`Score: ${score}`, 14, 27);
    ctx.fillText(`Leben: ${lives}`, 180, 27);
    ctx.fillText(`Level: ${level}`, 310, 27);
    ctx.fillText(`Highscore: ${highscore}`, 430, 27);

    ctx.font = "12px Trebuchet MS";
    ctx.fillStyle = "rgba(231, 247, 255, 0.75)";
    ctx.fillText("Tasten 1-4: schnell routen", 645, 27);
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
    if (soundEnabled) beep(520, 0.08, "triangle", 0.03);
  });

  // Mobile route buttons
  const mobileButtons = document.querySelectorAll(".mobile-btn");
  mobileButtons.forEach((btn) => {
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
    tryStartMusic();
    if (["1", "2", "3", "4"].includes(ev.key)) {
      handleKeyRoute(Number(ev.key) - 1);
    }
    if (ev.key.toLowerCase() === "m") {
      soundBtn.click();
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
  window.addEventListener("pointerdown", tryStartMusic, { passive: true });
  window.addEventListener("touchstart", tryStartMusic, { passive: true });
  syncMusicButton();
  syncSoundButton();
  requestAnimationFrame((ts) => {
    lastTime = ts;
    gameLoop(ts);
  });
})();
