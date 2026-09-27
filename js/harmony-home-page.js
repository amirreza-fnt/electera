/**
 * Harmony home — deferred wallpaper, bottom dock nav, settings sheet, iOS theme toggle.
 */
(() => {
  "use strict";

  const WALL_SRC = "assets/images/background.png";
  const STORAGE_APPEARANCE = "harmony-appearance";
  const CHROME_LIGHT = "#ebe3d9";
  const CHROME_DARK = "#1a1816";
  const BASE_TITLE = "هارمونی";

  const body = document.body;
  if (/Firefox/i.test(navigator.userAgent)) {
    body.classList.add("harmony-page--firefox");
  }
  const wallEl = document.getElementById("harmony-wall");
  const nav = document.getElementById("primary-nav");
  const indicator = document.getElementById("nav-indicator");
  const themeMount = document.getElementById("harmony-theme-mount");
  const settingsBtn = document.getElementById("settings-btn");
  const sheet = document.getElementById("harmony-sheet");
  const sheetBackdrop = document.getElementById("harmony-sheet-backdrop");
  const photosWidgetEl = document.getElementById("harmony-photos-widget");
  const academyWidgetEl = document.getElementById("harmony-academy-widget");

  const hashLinks = nav ? Array.from(nav.querySelectorAll(".harmony-nav-link")) : [];
  const navItems = nav ? Array.from(nav.querySelectorAll(".harmony-nav-item")) : [];
  const routes = hashLinks.map((link) => link.getAttribute("href").slice(1));

  let sheetOpen = false;
  let activeNav = "home";
  let themeBtn = null;

  const revealWall = () => {
    if (!wallEl) return;
    wallEl.style.backgroundImage = 'url("' + WALL_SRC + '")';
    body.classList.remove("is-wall-pending");
    body.classList.add("is-wall-ready");
  };

  const loadWall = () => {
    const img = new Image();
    img.decoding = "async";
    img.src = WALL_SRC;
    if (img.complete) revealWall();
    else {
      img.onload = revealWall;
      img.onerror = () => body.classList.add("is-wall-failed");
    }
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(loadWall, { timeout: 1800 });
  } else {
    window.setTimeout(loadWall, 16);
  }

  const clockEl = document.getElementById("harmony-status-clock");
  const pad2 = (n) => String(n).padStart(2, "0");
  const tickClock = () => {
    if (!clockEl) return;
    const now = new Date();
    const h = pad2(now.getHours());
    const m = pad2(now.getMinutes());
    clockEl.textContent = `${h}:${m}`;
    clockEl.setAttribute("datetime", now.toISOString());
  };
  tickClock();
  window.setInterval(tickClock, 1000);

  const widgetRow = document.querySelector(".harmony-page__widget-row");
  const syncHarmonyStripWidth = () => {
    if (!widgetRow) return;
    const w = Math.round(widgetRow.getBoundingClientRect().width);
    if (w > 0) {
      document.documentElement.style.setProperty("--harmony-strip-px", `${w}px`);
    }
  };
  syncHarmonyStripWidth();
  const dockPanel = document.querySelector(".harmony-dock .harmony-glass-panel");
  const syncHarmonySheetAnchor = () => {
    if (!dockPanel) return;
    const rect = dockPanel.getBoundingClientRect();
    if (!rect.height) return;
    const gap = 10;
    const bottom = Math.round(window.innerHeight - rect.top + gap);
    if (bottom > 0) {
      document.documentElement.style.setProperty("--harmony-sheet-bottom", `${bottom}px`);
    }
  };
  const syncHarmonyLayout = () => {
    syncHarmonyStripWidth();
    syncHarmonySheetAnchor();
  };
  syncHarmonyLayout();
  window.addEventListener("resize", syncHarmonyLayout, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncHarmonyLayout, { passive: true });
  }

  const syncThemeButton = (mode) => {
    if (!themeBtn) return;
    const isDark = mode === "dark";
    themeBtn.setAttribute("aria-pressed", String(isDark));
    const label = themeBtn.querySelector(".ios-glass-btn__label");
    if (label) label.textContent = isDark ? "حالت شب" : "حالت روز";
    themeBtn.setAttribute("aria-label", isDark ? "فعال‌سازی حالت روز" : "فعال‌سازی حالت شب");
  };

  const setAppearance = (mode) => {
    const next = mode === "dark" ? "dark" : "light";
    const chrome = next === "dark" ? CHROME_DARK : CHROME_LIGHT;
    body.setAttribute("data-appearance", next);
    document.documentElement.setAttribute("data-appearance", next);
    const meta = document.getElementById("harmony-theme-color");
    if (meta) meta.setAttribute("content", chrome);
    const colorScheme = document.getElementById("harmony-color-scheme");
    if (colorScheme) colorScheme.setAttribute("content", next);
    syncThemeButton(next);
    if (photosWidgetEl) {
      photosWidgetEl.setAttribute("data-appearance", next);
      if (photosWidgetEl.harmonyPhotosWidget) {
        photosWidgetEl.harmonyPhotosWidget.setAppearance(next);
      }
    }
    if (academyWidgetEl) {
      academyWidgetEl.setAttribute("data-appearance", next);
    }
    try {
      localStorage.setItem(STORAGE_APPEARANCE, next);
    } catch {
      /* ignore */
    }
  };

  const mountThemeButton = () => {
    const G = window.IOSGlass;
    if (!themeMount || !G) return;
    themeMount.innerHTML = "";
    themeBtn = G.button({
      icon: "moon",
      label: "حالت روز",
      shape: "pill",
      size: "sm",
      toggle: true,
      on: false,
      className: "harmony-theme-ios-btn",
    });
    themeBtn.addEventListener("ios:toggle", (e) => {
      setAppearance(e.detail.pressed ? "dark" : "light");
    });
    themeMount.appendChild(themeBtn);
  };

  mountThemeButton();

  try {
    const saved = localStorage.getItem(STORAGE_APPEARANCE);
    if (saved === "light" || saved === "dark") setAppearance(saved);
    else setAppearance("light");
  } catch {
    setAppearance("light");
  }

  let scheduleIndicatorStable = () => {};

  const setSheetOpen = (open) => {
    sheetOpen = open;
    if (!sheet) return;
    syncHarmonyLayout();
    sheet.classList.toggle("is-open", open);
    sheet.setAttribute("aria-hidden", String(!open));
    body.classList.toggle("harmony-sheet-open", open);
    if (settingsBtn) {
      settingsBtn.setAttribute("aria-expanded", String(open));
      settingsBtn.classList.toggle("is-active", open);
    }
    if (open) {
      activeNav = "settings";
      hashLinks.forEach((l) => l.removeAttribute("aria-current"));
      scheduleIndicatorStable();
      requestAnimationFrame(syncHarmonySheetAnchor);
    } else if (activeNav === "settings") {
      activeNav = routeFromHash();
      applyNavState(activeNav);
    } else {
      scheduleIndicatorStable();
    }
  };

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => setSheetOpen(!sheetOpen));
  }
  if (sheetBackdrop) {
    sheetBackdrop.addEventListener("click", () => setSheetOpen(false));
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && sheetOpen) {
      ev.preventDefault();
      setSheetOpen(false);
    }
  });

  const routeFromHash = () => {
    const hash = window.location.hash.replace(/^#/, "");
    return routes.includes(hash) ? hash : routes[0];
  };

  let applyNavState = (route) => {
    activeNav = route;
    document.title = `${BASE_TITLE} — ${route}`;
  };

  if (!nav || !indicator) return;

  const labelForRoute = (route) => {
    const link = hashLinks.find((l) => l.getAttribute("data-nav") === route);
    return link ? link.querySelector(".harmony-nav-link__label").textContent.trim() : "خانه";
  };

  const getIndicatorTarget = () => {
    if (sheetOpen && settingsBtn) return settingsBtn;
    if (activeNav === "settings" && settingsBtn) return settingsBtn;
    const link = hashLinks.find((l) => l.getAttribute("data-nav") === activeNav);
    return link || hashLinks[0];
  };

  const DESIGN_W = 640;
  const INDICATOR_DESIGN = 85;
  let indicatorRaf = 0;

  const indicatorSize = () => {
    const panel = nav.closest(".harmony-glass-panel");
    const panelW = panel ? panel.getBoundingClientRect().width : DESIGN_W;
    const u = Math.min(1, panelW / DESIGN_W);
    const navH = nav.getBoundingClientRect().height;
    if (!navH || navH < 40) return Math.round(INDICATOR_DESIGN * u);
    const size = navH * (0.54 + 0.36 * u);
    return Math.round(Math.min(INDICATOR_DESIGN, Math.max(navH * 0.48, size)));
  };

  const positionIndicator = () => {
    const target = getIndicatorTarget();
    if (!target) return;
    nav.classList.add("harmony-nav-is-animating");
    const navRect = nav.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (!navRect.width || !navRect.height) return;

    const size = indicatorSize();
    const x = rect.left - navRect.left - nav.clientLeft + (rect.width - size) / 2;
    const y = rect.top - navRect.top - nav.clientTop + (rect.height - size) / 2;
    const radius = Math.max(12, Math.min(18, Math.round(size * 0.32)));

    indicator.style.width = `${size}px`;
    indicator.style.height = `${size}px`;
    indicator.style.borderRadius = `${radius}px`;
    indicator.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    window.clearTimeout(nav._hpAnimTimer);
    nav._hpAnimTimer = window.setTimeout(() => {
      nav.classList.remove("harmony-nav-is-animating");
    }, 480);
  };

  const scheduleIndicator = () => {
    if (indicatorRaf) return;
    indicatorRaf = requestAnimationFrame(() => {
      indicatorRaf = 0;
      positionIndicator();
    });
  };

  scheduleIndicatorStable = () => {
    scheduleIndicator();
    requestAnimationFrame(scheduleIndicator);
    window.setTimeout(scheduleIndicator, 120);
    window.setTimeout(scheduleIndicator, 520);
  };

  applyNavState = (route) => {
    activeNav = route;
    hashLinks.forEach((link) => {
      if (link.getAttribute("data-nav") === route) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (settingsBtn && route !== "settings") {
      settingsBtn.classList.remove("is-active");
      if (!sheetOpen) settingsBtn.setAttribute("aria-expanded", "false");
    }
    document.title = `${BASE_TITLE} — ${labelForRoute(route)}`;
    scheduleIndicatorStable();
  };

  window.addEventListener("hashchange", () => {
    if (sheetOpen) setSheetOpen(false);
    applyNavState(routeFromHash());
  });

  hashLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (sheetOpen) setSheetOpen(false);
    });
  });

  nav.addEventListener("keydown", (event) => {
    const currentIndex = navItems.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    let nextIndex = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % navItems.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + navItems.length) % navItems.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = navItems.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = navItems[nextIndex];
    next.focus();
    if (next.classList.contains("harmony-nav-link")) {
      window.location.hash = next.getAttribute("href");
    }
  });

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => {
      syncHarmonyLayout();
      scheduleIndicatorStable();
    });
    ro.observe(nav);
    const panel = nav.closest(".harmony-glass-panel");
    if (panel) ro.observe(panel);
  } else {
    window.addEventListener("resize", scheduleIndicator);
  }

  applyNavState(routeFromHash());
  syncHarmonyLayout();
  requestAnimationFrame(() => {
    scheduleIndicatorStable();
    requestAnimationFrame(() => indicator.classList.add("is-ready"));
  });
})();
