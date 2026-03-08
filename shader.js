import React from "https://esm.sh/react@19.2.0";
import { createRoot } from "https://esm.sh/react-dom@19.2.0/client";
import { DitherPulseRing } from "https://esm.sh/@toriistudio/shader-ui@0.0.9?deps=react@19.2.0,react-dom@19.2.0,three@0.169.0";

const DEFAULT_SHADER_CONFIG = {
  width: "100%",
  height: "100%",
  combineMode: "alphaOver",
  ringColor: "#4599ff",
  borderColor: "#4599ff",
  glyphDitherEnabled: true,
  noiseWarpRadius: 0.7,
  diffuseRadius: 0.2,
  ringSpeed: 0.2,
  ringAlpha: 1.0,
  ringPosition: [0.5, 0.5],
  borderThickness: 0.07,
  borderIntensity: 1.0,
  borderAlpha: 1.0,
  borderTonemap: true,
};

const PACKET_SHADER_EFFECTS = {
  hit: {
    kick: 0.2,
    tint: "#59ff9a",
  },
  isolate: {
    kick: 0.18,
    tint: "#7dffc1",
  },
  miss: {
    kick: 0.2,
    tint: "#ff4c8a",
  },
};

const COMBO_TONES = {
  combo: "#6fd6ff",
  isolate: "#6fd6ff",
  mega: "#ffd166",
  router: "#ffb86c",
  levelup: "#a7ff8a"
};

let comboMessageTimeout = null;
let comboBannerTimeout = null;
let root = null;
const shaderRootEl = document.getElementById("shaderRoot");
const shaderPulseLayerEl = document.getElementById("shaderPulseLayer");
const packetLayerState = {
  strength: 0,
  targetStrength: 0,
  tint: "#59ff9a",
};
let packetLayerRaf = 0;
const shaderRuntimeConfig = { ...DEFAULT_SHADER_CONFIG };

function App() {
  const color = shaderRuntimeConfig.ringColor || "#4599ff";
  const borderColor = shaderRuntimeConfig.borderColor || color;

  const shaderConfig = {
    ...shaderRuntimeConfig,
    ringColor: color,
    borderColor,
    noiseWarpEnabled: true,
    noiseWarpStrength: 0.1,
    diffuseEnabled: true,
    blurEnabled: true,
    blurRadius: 0.5,
  };

  return React.createElement(
    "div",
    { style: { width: "100%", height: "100%" } },
    React.createElement(DitherPulseRing, shaderConfig)
  );
}

const statusEl = document.getElementById("shaderStatus");
const modeEl = document.getElementById("shaderEffectMode");
const comboBannerEl = document.getElementById("shaderComboBanner");
const setStatus = (text, isError = false) => {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.display = text ? "block" : "none";
  statusEl.style.color = isError ? "#ff7f7f" : "#9fb7d9";
};

const renderShader = () => {
  if (!root) return;
  root.render(React.createElement(App));
};

const applyPacketLayerStyles = () => {
  if (!shaderRootEl) return;
  const t = packetLayerState.strength * packetLayerState.strength;
  if (t <= 0.0005) {
    shaderRootEl.style.opacity = "1";
    shaderRootEl.style.filter = "none";
    return;
  }

  const brightness = 1 + t * 0.08;
  const saturate = 1 + t * 0.2;
  const glow = 2 + t * 10;
  shaderRootEl.style.opacity = `${1 + t * 0.015}`;
  shaderRootEl.style.filter = `brightness(${brightness}) saturate(${saturate}) drop-shadow(0 0 ${glow}px ${packetLayerState.tint})`;
};

const animatePacketLayerEffect = () => {
  if (packetLayerRaf) return;

  const tick = () => {
    packetLayerState.targetStrength *= 0.93;
    if (packetLayerState.targetStrength < 0.004) {
      packetLayerState.targetStrength = 0;
    }

    packetLayerState.strength +=
      (packetLayerState.targetStrength - packetLayerState.strength) * 0.22;
    if (packetLayerState.strength < 0.002) {
      packetLayerState.strength = 0;
    }

    applyPacketLayerStyles();

    if (packetLayerState.strength <= 0 && packetLayerState.targetStrength <= 0) {
      packetLayerRaf = 0;
      return;
    }

    packetLayerRaf = window.requestAnimationFrame(tick);
  };

  packetLayerRaf = window.requestAnimationFrame(tick);
};

const applyPacketShaderEffect = (outcome) => {
  const effect = PACKET_SHADER_EFFECTS[outcome];
  if (!effect) return;

  packetLayerState.tint = effect.tint;

  const kick = effect.kick;
  const nextTarget = Math.max(packetLayerState.targetStrength, packetLayerState.strength) + kick;
  packetLayerState.targetStrength = Math.min(0.45, nextTarget);

  applyPacketLayerStyles();
  animatePacketLayerEffect();
};

const pushRingBurst = (tone = "combo", durationMs = 900) => {
  if (!shaderPulseLayerEl) return;
  const color = COMBO_TONES[tone] || COMBO_TONES.combo;
  const effectiveDuration = durationMs;
  const rotation = `${Math.round(Math.random() * 34 - 17)}deg`;

  const pulse = document.createElement("div");
  pulse.className = "shader-ring-pulse";
  pulse.style.setProperty("--pulse-color", color);
  pulse.style.setProperty("--pulse-rotation", rotation);
  pulse.style.animationDuration = `${effectiveDuration}ms`;

  const echo = document.createElement("div");
  echo.className = "shader-ring-pulse echo";
  echo.style.setProperty("--pulse-color", color);
  echo.style.setProperty("--pulse-rotation", `${Math.round(Math.random() * 28 - 14)}deg`);
  echo.style.animationDuration = `${Math.round(effectiveDuration * 1.12)}ms`;
  echo.style.animationDelay = `${Math.round(Math.min(120, effectiveDuration * 0.12))}ms`;

  const spark = document.createElement("div");
  spark.className = "shader-ring-spark";
  spark.style.setProperty("--pulse-color", color);
  spark.style.setProperty("--spark-rotation", `${Math.round(Math.random() * 46 - 23)}deg`);
  spark.style.animationDuration = `${Math.max(260, Math.round(effectiveDuration * 0.56))}ms`;

  shaderPulseLayerEl.appendChild(pulse);
  shaderPulseLayerEl.appendChild(echo);
  shaderPulseLayerEl.appendChild(spark);

  const cleanup = () => {
    pulse.removeEventListener("animationend", cleanup);
    if (pulse.parentNode) pulse.parentNode.removeChild(pulse);
    if (echo.parentNode) echo.parentNode.removeChild(echo);
    if (spark.parentNode) spark.parentNode.removeChild(spark);
  };
  pulse.addEventListener("animationend", cleanup);
};

const showComboBadge = (text, tone = "combo") => {
  if (!modeEl) return;
  modeEl.classList.remove("combo-popup");
  void modeEl.offsetWidth;
  modeEl.classList.add("combo-popup");
  modeEl.textContent = text;
  modeEl.style.display = "block";
  modeEl.style.color = COMBO_TONES[tone] || COMBO_TONES.combo;

  if (comboMessageTimeout) {
    clearTimeout(comboMessageTimeout);
  }
  comboMessageTimeout = setTimeout(() => {
    modeEl.classList.remove("combo-popup");
    modeEl.style.color = "#c9dcff";
    modeEl.textContent = "";
    modeEl.style.display = "none";
  }, 1200);
};

const showComboBanner = (text, tone = "combo") => {
  if (!comboBannerEl) return;
  comboBannerEl.classList.remove("show", "tone-mega", "tone-router", "tone-levelup");
  comboBannerEl.textContent = text;
  if (tone === "mega") comboBannerEl.classList.add("tone-mega");
  if (tone === "router") comboBannerEl.classList.add("tone-router");
  if (tone === "levelup") comboBannerEl.classList.add("tone-levelup");
  void comboBannerEl.offsetWidth;
  comboBannerEl.classList.add("show");

  if (comboBannerTimeout) {
    clearTimeout(comboBannerTimeout);
  }
  comboBannerTimeout = setTimeout(() => {
    comboBannerEl.classList.remove("show", "tone-mega", "tone-router", "tone-levelup");
    comboBannerEl.textContent = "";
  }, 900);
};

window.addEventListener("ipv6gg:combo", (event) => {
  const label = event?.detail?.label;
  const tone = event?.detail?.tone || "combo";
  if (typeof label !== "string" || !label) return;

  showComboBadge(label, tone);
  showComboBanner(label, tone);
  pushRingBurst(tone, 900);
});

window.addEventListener("ipv6gg:levelup", (event) => {
  const nextLevel = Number(event?.detail?.level);
  if (!Number.isFinite(nextLevel)) return;

  showComboBadge(`LEVEL ${nextLevel} UP`, "levelup");
  showComboBanner(`LEVEL ${nextLevel} UP`, "levelup");
  pushRingBurst("levelup", 980);
});

window.addEventListener("ipv6gg:packet", (event) => {
  const outcome = event?.detail?.outcome;
  if (typeof outcome !== "string" || !outcome) return;
  applyPacketShaderEffect(outcome);
});

window.ipv6ggShader = {
  getConfig() {
    return { ...shaderRuntimeConfig };
  },
  setConfig(patch) {
    if (!patch || typeof patch !== "object") return;
    Object.assign(shaderRuntimeConfig, patch);
    renderShader();
  },
  resetConfig() {
    Object.assign(shaderRuntimeConfig, DEFAULT_SHADER_CONFIG);
    renderShader();
  },
  triggerPacketEffect(outcome) {
    applyPacketShaderEffect(outcome);
  },
};

window.addEventListener("error", (event) => {
  setStatus(`Error: ${event.message}`, true);
});

window.addEventListener("unhandledrejection", (event) => {
  const message =
    event?.reason?.message ||
    (typeof event?.reason === "string" ? event.reason : "Unbekannter Promise-Fehler");
  setStatus(`Promise error: ${message}`, true);
});

try {
  if (!shaderRootEl) {
    throw new Error("Shader container nicht gefunden");
  }

  root = createRoot(shaderRootEl);
  root.render(React.createElement(App));
  applyPacketLayerStyles();
  setStatus("");
} catch (error) {
  setStatus(`Render error: ${error?.message ?? String(error)}`, true);
  console.error(error);
}
