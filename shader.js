import React from "https://esm.sh/react@19.2.0";
import { createRoot } from "https://esm.sh/react-dom@19.2.0/client";
import { DitherPulseRing } from "https://esm.sh/@toriistudio/shader-ui@0.0.9?deps=react@19.2.0,react-dom@19.2.0";

const DEFAULT_SHADER_CONFIG = {
  width: "100%",
  height: "100%",
  combineMode: "alphaOver",
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

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = reduceMotionQuery.matches;
const lowCpuCores = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
const lowDeviceMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
const autoReducedEffects = prefersReducedMotion || lowCpuCores || lowDeviceMemory;

const urlParams = new URLSearchParams(window.location.search);
const effectsParam = (urlParams.get("effects") || "").toLowerCase();
const useReducedEffects =
  effectsParam === "full"
    ? false
    : effectsParam === "reduced"
      ? true
      : autoReducedEffects;

function App() {
  const color = "#4599ff";
  const shaderConfig = {
    ...DEFAULT_SHADER_CONFIG,
    ringColor: color,
    borderColor: color,
    noiseWarpEnabled: !useReducedEffects,
    noiseWarpStrength: useReducedEffects ? 0 : 0.1,
    diffuseEnabled: !useReducedEffects,
    blurEnabled: !useReducedEffects,
    blurRadius: useReducedEffects ? 0 : 0.5,
  };

  return React.createElement(
    "div",
    { style: { width: "100%", height: "100%" } },
    React.createElement(DitherPulseRing, shaderConfig)
  );
}

const statusEl = document.getElementById("shaderStatus");
const modeEl = document.getElementById("shaderEffectMode");
const setStatus = (text, isError = false) => {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.display = text ? "block" : "none";
  statusEl.style.color = isError ? "#ff7f7f" : "#9fb7d9";
};

const setModeBadge = () => {
  if (!modeEl) return;
  if (useReducedEffects) {
    modeEl.textContent = "Performance: Reduced";
    modeEl.style.display = "block";
  } else {
    modeEl.textContent = "";
    modeEl.style.display = "none";
  }
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
  const rootElement = document.getElementById("shaderRoot");
  if (!rootElement) {
    throw new Error("Shader container nicht gefunden");
  }

  const root = createRoot(rootElement);
  root.render(React.createElement(App));
  setModeBadge();
  setStatus("");
} catch (error) {
  setStatus(`Render error: ${error?.message ?? String(error)}`, true);
  console.error(error);
}
