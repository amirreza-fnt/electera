/**
 * iOS 26 buttons page — builds the 10-state library and wires the lock-screen preview.
 */
(() => {
  "use strict";

  const G = window.IOSGlass;
  if (!G) return;

  /* Lock-screen preview -------------------------------------------------- */
  G.startClock(document);

  const screen = document.getElementById("ios-screen");
  const flashlight = document.getElementById("ios-flashlight");
  flashlight.addEventListener("ios:toggle", (e) => {
    // Flashlight on → the wallpaper brightens slightly, like the real thing lighting the room.
    screen.style.filter = e.detail.pressed ? "brightness(1.08)" : "";
  });

  const camera = document.getElementById("ios-camera");
  camera.addEventListener("click", () => {
    G.setLoading(camera, true);
    window.setTimeout(() => G.setLoading(camera, false), 1100);
  });

  /* Library ----------------------------------------------------------------- */
  const grid = document.getElementById("ios-button-grid");

  const cell = (index, name, code, element) => {
    const li = document.createElement("li");
    li.className = "ios-buttons-page__cell";
    const num = document.createElement("span");
    num.className = "ios-buttons-page__cell-num";
    num.textContent = String(index).padStart(2, "0");
    const body = document.createElement("div");
    body.className = "ios-buttons-page__cell-body";
    body.append(element);
    const meta = document.createElement("div");
    meta.className = "ios-buttons-page__cell-meta";
    const n = document.createElement("span");
    n.className = "ios-buttons-page__cell-name";
    n.textContent = name;
    const c = document.createElement("code");
    c.className = "ios-buttons-page__cell-code";
    c.textContent = code;
    meta.append(n, c);
    li.append(num, body, meta);
    return li;
  };

  const items = [
    {
      name: "Default",
      code: ".ios-glass-btn",
      el: G.button({ icon: "flashlight", label: "Flashlight" }),
    },
    {
      name: "Highlighted",
      code: ":hover / .is-highlighted",
      el: G.button({ icon: "camera", label: "Camera", className: "is-highlighted" }),
    },
    {
      name: "Pressed",
      code: ":active / .is-pressed",
      el: G.button({ icon: "flashlight", label: "Flashlight", className: "is-pressed" }),
    },
    {
      name: "On",
      code: '[aria-pressed="true"]',
      el: G.button({ icon: "flashlight", label: "Flashlight", toggle: true, on: true }),
    },
    {
      name: "Disabled",
      code: "[disabled]",
      el: G.button({ icon: "camera", label: "Camera", disabled: true }),
    },
    {
      name: "Tinted",
      code: "--tint  --ios-tint: 10 132 255",
      el: G.button({ icon: "moon", label: "Focus", tint: "10 132 255", toggle: true, on: true }),
    },
    {
      name: "Destructive",
      code: "--tint --destructive",
      el: G.button({ icon: "trash", label: "Delete", destructive: true }),
    },
    {
      name: "Loading",
      code: ".is-loading",
      el: G.button({ icon: "refresh", label: "Refreshing", loading: true }),
    },
    {
      name: "Badge",
      code: ".ios-glass-btn__badge",
      el: G.button({ icon: "message", label: "Messages", badge: 3 }),
    },
    {
      name: "Capsule",
      code: "--pill",
      el: G.button({ icon: "play", label: "Open", shape: "pill" }),
    },
  ];

  items.forEach((item, i) => grid.append(cell(i + 1, item.name, item.code, item.el)));

  /* Appearance switch -------------------------------------------------------- */
  const root = document.body;
  const darkBtn = document.getElementById("ios-appearance-dark");
  const lightBtn = document.getElementById("ios-appearance-light");

  const setAppearance = (mode) => {
    root.setAttribute("data-appearance", mode);
    darkBtn.setAttribute("aria-pressed", String(mode === "dark"));
    lightBtn.setAttribute("aria-pressed", String(mode === "light"));
    try {
      localStorage.setItem("ios26-appearance", mode);
    } catch {
      /* storage unavailable */
    }
  };

  darkBtn.addEventListener("click", () => setAppearance("dark"));
  lightBtn.addEventListener("click", () => setAppearance("light"));

  try {
    const saved = localStorage.getItem("ios26-appearance");
    if (saved === "light" || saved === "dark") setAppearance(saved);
  } catch {
    /* ignore */
  }
})();
