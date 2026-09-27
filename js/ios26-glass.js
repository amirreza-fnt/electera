/**
 * iOS 26 Liquid Glass — component helpers
 *
 *   IOSGlass.button({ icon: "flashlight", label: "Flashlight", toggle: true })
 *   IOSGlass.enhance(root)          // wires toggle + press feedback on existing .ios-glass-btn
 *   IOSGlass.setLoading(btn, bool)
 *   IOSGlass.notification({ app: "Adaptive Power", title, body, time: "now" })
 *   IOSGlass.startClock(rootEl)     // fills .ios-clock__time / .ios-clock__date
 *   IOSGlass.icons                  // SF-style glyph set (24×24)
 */
(function (global) {
  "use strict";

  const ICONS = {
    flashlight:
      '<path data-fill fill-rule="evenodd" d="M8.5 2.5A1.5 1.5 0 0 0 7 4v1.3c0 .5.13.98.38 1.4L9 9.5c.16.28.25.6.25.93V20.5a1.5 1.5 0 0 0 1.5 1.5h2.5a1.5 1.5 0 0 0 1.5-1.5V10.43c0-.33.09-.65.25-.93l1.62-2.8c.25-.42.38-.9.38-1.4V4a1.5 1.5 0 0 0-1.5-1.5h-7ZM12 12.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"/><path d="M7 6.5h10" stroke-width="1.3"/>',
    camera:
      '<path data-fill fill-rule="evenodd" d="M9.3 4a1 1 0 0 0-.83.45L7.4 6.1a1 1 0 0 1-.83.45H4.5A2.5 2.5 0 0 0 2 9.05v8.4A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5v-8.45A2.5 2.5 0 0 0 19.5 6.55h-2.07a1 1 0 0 1-.83-.45l-1.07-1.65A1 1 0 0 0 14.7 4H9.3ZM12 9a4.25 4.25 0 1 0 0 8.5A4.25 4.25 0 0 0 12 9Zm0 1.8a2.45 2.45 0 1 1 0 4.9 2.45 2.45 0 0 1 0-4.9Z"/>',
    moon:
      '<path data-fill d="M20.2 15.1a8.6 8.6 0 0 1-11.3-11.3A9 9 0 1 0 20.2 15.1Z"/>',
    trash:
      '<path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v6M14 11v6"/>',
    refresh:
      '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    message:
      '<path data-fill d="M12 3C6.48 3 2 6.7 2 11.25c0 2.42 1.28 4.6 3.33 6.1L4.5 21l4.53-2.2c.94.23 1.94.35 2.97.35 5.52 0 10-3.7 10-8.25S17.52 3 12 3Z"/>',
    bell:
      '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5H4.5L6 16.5Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    bolt:
      '<path data-fill d="M13.2 2.5 5.5 13.2h5.3l-1 8.3 8.7-11.2h-5.3l1-7.8Z"/>',
    wifi:
      '<path d="M2.5 9.2a14 14 0 0 1 19 0M5.7 12.6a9.5 9.5 0 0 1 12.6 0M9 16a5 5 0 0 1 6 0"/><circle data-fill cx="12" cy="19" r="1.4"/>',
    airplane:
      '<path data-fill d="M21 15.5v-2l-8-5V3a1 1 0 0 0-2 0v5.5l-8 5v2l8-2.5v4.2l-2 1.5V20l3-1 3 1v-1.3l-2-1.5v-4.2l8 2.5Z"/>',
    xmark:
      '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check:
      '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus:
      '<path d="M12 5v14M5 12h14"/>',
    play:
      '<path data-fill d="M8.5 5.9v12.2a1.2 1.2 0 0 0 1.84.99l9.24-6.1a1.2 1.2 0 0 0 0-1.98L10.34 4.9A1.2 1.2 0 0 0 8.5 5.9Z"/>',
    battery:
      '<rect x="2.5" y="7.5" width="17" height="9" rx="2.5"/><path d="M21 10.5v3" stroke-width="2.4"/><rect data-fill x="4.5" y="9.5" width="11" height="5" rx="1.2"/>',
    sun:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  };

  const svg = (name) => {
    const inner = ICONS[name];
    if (!inner) return "";
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
  };

  const spinner = () => {
    const spokes = Array.from({ length: 8 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
    return `<span class="ios-glass-btn__spinner" aria-hidden="true">${spokes}</span>`;
  };

  /* ------------------------------------------------------------------------
     Behaviour
     ------------------------------------------------------------------------ */
  const WIRED = new WeakSet();

  const onToggle = (event) => {
    const btn = event.currentTarget;
    if (btn.disabled || btn.classList.contains("is-loading")) return;
    const pressed = btn.getAttribute("aria-pressed") === "true";
    btn.setAttribute("aria-pressed", String(!pressed));
    btn.dispatchEvent(new CustomEvent("ios:toggle", { bubbles: true, detail: { pressed: !pressed } }));
  };

  // Touch devices don't get :active reliably on quick taps; mirror it with a class.
  const onDown = (event) => {
    const btn = event.currentTarget;
    if (btn.disabled) return;
    btn.classList.add("is-pressed");
  };

  const onUp = (event) => {
    event.currentTarget.classList.remove("is-pressed");
  };

  const enhanceOne = (btn) => {
    if (!(btn instanceof HTMLElement) || WIRED.has(btn)) return btn;
    WIRED.add(btn);

    if (btn.hasAttribute("data-toggle")) {
      if (!btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", onToggle);
    }

    btn.addEventListener("pointerdown", onDown, { passive: true });
    btn.addEventListener("pointerup", onUp, { passive: true });
    btn.addEventListener("pointercancel", onUp, { passive: true });
    btn.addEventListener("pointerleave", onUp, { passive: true });

    return btn;
  };

  const enhance = (root = document) => {
    const scope = root && root.querySelectorAll ? root : document;
    const list = scope.querySelectorAll(".ios-glass-btn");
    list.forEach(enhanceOne);
    if (scope instanceof Element && scope.classList.contains("ios-glass-btn")) enhanceOne(scope);
    return list.length;
  };

  const setLoading = (btn, isLoading) => {
    if (isLoading && !btn.querySelector(".ios-glass-btn__spinner")) {
      btn.insertAdjacentHTML("beforeend", spinner());
    }
    btn.classList.toggle("is-loading", Boolean(isLoading));
    if (isLoading) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
    return btn;
  };

  /* ------------------------------------------------------------------------
     Factories
     ------------------------------------------------------------------------ */
  /**
   * @param {Object} o
   * @param {string}  [o.icon="flashlight"]  icon key or raw <svg> markup
   * @param {string}  [o.label]              visible text (pill) or accessible name (circle)
   * @param {"sm"|"md"|"lg"} [o.size="md"]
   * @param {"circle"|"pill"} [o.shape="circle"]
   * @param {string}  [o.tint]               "R G B" → tinted glass
   * @param {boolean} [o.destructive]
   * @param {boolean} [o.toggle]             aria-pressed toggle
   * @param {boolean} [o.on]                 initial pressed state
   * @param {boolean} [o.disabled]
   * @param {boolean} [o.loading]
   * @param {number|string} [o.badge]
   * @param {string}  [o.className]
   * @param {Function}[o.onClick]
   */
  const button = (o = {}) => {
    const {
      icon = "flashlight",
      label = "",
      size = "md",
      shape = "circle",
      tint,
      destructive = false,
      toggle = false,
      on = false,
      disabled = false,
      loading = false,
      badge,
      className = "",
      onClick,
    } = o;

    const el = document.createElement("button");
    el.type = "button";
    const cls = ["ios-glass-btn"];
    if (size !== "md") cls.push(`ios-glass-btn--${size}`);
    if (shape === "pill") cls.push("ios-glass-btn--pill");
    if (tint || destructive) cls.push("ios-glass-btn--tint");
    if (destructive) cls.push("ios-glass-btn--destructive");
    if (loading) cls.push("is-loading");
    if (className) cls.push(className);
    el.className = cls.join(" ");

    if (tint) el.style.setProperty("--ios-tint", tint);
    if (disabled) el.disabled = true;
    if (loading) el.setAttribute("aria-busy", "true");
    if (toggle) {
      el.setAttribute("data-toggle", "");
      el.setAttribute("aria-pressed", String(Boolean(on)));
    }

    const iconMarkup = ICONS[icon] ? svg(icon) : icon;
    let html = `<span class="ios-glass-btn__glyph">${iconMarkup}</span>`;
    if (shape === "pill" && label) html += `<span class="ios-glass-btn__label"></span>`;
    if (badge !== undefined && badge !== null && badge !== "") {
      html += `<span class="ios-glass-btn__badge"></span>`;
    }
    if (loading) html += spinner();
    el.innerHTML = html;

    if (shape === "pill" && label) {
      el.querySelector(".ios-glass-btn__label").textContent = label;
    } else if (label) {
      el.setAttribute("aria-label", label);
    }
    if (badge !== undefined && badge !== null && badge !== "") {
      const b = el.querySelector(".ios-glass-btn__badge");
      b.textContent = String(badge);
      b.setAttribute("aria-label", `${badge} unread`);
    }

    if (typeof onClick === "function") el.addEventListener("click", (e) => onClick(e, el));
    return enhanceOne(el);
  };

  /**
   * Notification banner element (hidden until you call show()).
   */
  const notification = (o = {}) => {
    const {
      app = "Adaptive Power",
      title = "Adaptive Power",
      body = "iPhone is adjusting performance to help extend your battery life.",
      time = "now",
      icon = "battery",
      iconBackground,
    } = o;

    const el = document.createElement("article");
    el.className = "ios-notif is-hidden";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", `${app} notification`);
    el.innerHTML =
      `<span class="ios-notif__icon" aria-hidden="true">${ICONS[icon] ? svg(icon) : icon}</span>` +
      `<h2 class="ios-notif__title"></h2>` +
      `<span class="ios-notif__time"></span>` +
      `<p class="ios-notif__body"></p>`;
    el.querySelector(".ios-notif__title").textContent = title;
    el.querySelector(".ios-notif__time").textContent = time;
    el.querySelector(".ios-notif__body").textContent = body;
    if (iconBackground) el.querySelector(".ios-notif__icon").style.background = iconBackground;
    return el;
  };

  /* ------------------------------------------------------------------------
     Clock
     ------------------------------------------------------------------------ */
  const startClock = (root = document) => {
    const timeEl = root.querySelector(".ios-clock__time");
    const dateEl = root.querySelector(".ios-clock__date");
    if (!timeEl && !dateEl) return () => {};

    const render = () => {
      const now = new Date();
      if (timeEl) {
        let h = now.getHours() % 12;
        if (h === 0) h = 12;
        timeEl.textContent = `${h}:${String(now.getMinutes()).padStart(2, "0")}`;
        timeEl.setAttribute("datetime", now.toISOString());
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      }
    };

    render();
    const id = window.setInterval(render, 10_000);
    return () => window.clearInterval(id);
  };

  global.IOSGlass = Object.freeze({
    button,
    notification,
    enhance,
    setLoading,
    startClock,
    icons: ICONS,
    svg,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhance(document), { once: true });
  } else {
    enhance(document);
  }
})(window);
