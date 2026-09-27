/**
 * Liquid Glass Button — component helper
 *
 * Usage:
 *   const btn = LiquidGlassButton.create({
 *     label: "Home", icon: "home", variant: "frosted", size: "xl",
 *     shape: "circle", toggle: true, onClick: (e, btn) => {}
 *   });
 *   container.append(btn);
 *
 *   // Enhance buttons already in the DOM (specular tracking, toggle, loading demo):
 *   LiquidGlassButton.enhance(document);
 *
 * Markup produced:
 *   <button class="lg-btn lg-btn--frosted lg-btn--xl" type="button">
 *     <span class="lg-btn__icon"><svg viewBox="0 0 24 24">…</svg></span>
 *     <span class="lg-btn__label">Home</span>
 *   </button>
 */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------------
     Icon set (24×24). Paths marked data-fill are solid; others are stroked.
     ------------------------------------------------------------------------ */
  const ICONS = {
    home:
      '<path data-fill fill-rule="evenodd" d="M11.1 2.9a1.4 1.4 0 0 1 1.8 0l7.6 6.5c.32.27.5.66.5 1.07V19a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 19v-8.53c0-.41.18-.8.5-1.07l7.6-6.5Z M12 13.5a2.25 2.25 0 0 0-2.25 2.25V21.5h4.5v-5.75A2.25 2.25 0 0 0 12 13.5Z"/>',
    search:
      '<circle cx="10.5" cy="10.5" r="6.75"/><path d="m20.5 20.5-5.2-5.2"/>',
    heart:
      '<path data-fill d="M12 21s-7.5-4.6-9.3-9.6C1.5 8 3.6 4.5 7.2 4.5c2 0 3.5 1.1 4.8 2.7 1.3-1.6 2.8-2.7 4.8-2.7 3.6 0 5.7 3.5 4.5 6.9C19.5 16.4 12 21 12 21Z"/>',
    settings:
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    play:
      '<path data-fill d="M8.5 5.9v12.2a1.2 1.2 0 0 0 1.84.99l9.24-6.1a1.2 1.2 0 0 0 0-1.98L10.34 4.9A1.2 1.2 0 0 0 8.5 5.9Z"/>',
    bell:
      '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5H4.5L6 16.5Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    plus:
      '<path d="M12 5v14M5 12h14"/>',
    user:
      '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    camera:
      '<path data-fill fill-rule="evenodd" d="M9.5 4a1 1 0 0 0-.8.4L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-1.7-2.6a1 1 0 0 0-.8-.4h-5Z M12 9.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 11.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z"/>',
    check:
      '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };

  const VARIANTS = new Set(["clear", "frosted", "tinted"]);
  const SIZES = new Set(["sm", "md", "lg", "xl"]);
  const SHAPES = new Set(["circle", "pill", "icon"]);

  const ENHANCED = new WeakSet();
  const finePointer = global.matchMedia
    ? global.matchMedia("(hover: hover) and (pointer: fine)")
    : { matches: false };
  const reduceMotion = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const iconSvg = (name) => {
    const inner = ICONS[name];
    if (!inner) return "";
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
  };

  /* ------------------------------------------------------------------------
     Specular highlight follows the pointer (subtle, clamped to the top half)
     ------------------------------------------------------------------------ */
  const onMove = (event) => {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    btn.style.setProperty("--lg-hx", `${(clamp(nx, 0, 1) * 40 + 12).toFixed(1)}%`);
    btn.style.setProperty("--lg-hy", `${(clamp(ny, 0, 1) * 26 + 12).toFixed(1)}%`);
  };

  const onLeave = (event) => {
    const btn = event.currentTarget;
    btn.style.removeProperty("--lg-hx");
    btn.style.removeProperty("--lg-hy");
  };

  const onToggleClick = (event) => {
    const btn = event.currentTarget;
    if (btn.disabled || btn.classList.contains("is-loading")) return;
    const pressed = btn.getAttribute("aria-pressed") === "true";
    btn.setAttribute("aria-pressed", String(!pressed));
    btn.dispatchEvent(new CustomEvent("lg:toggle", { bubbles: true, detail: { pressed: !pressed } }));
  };

  /**
   * Wire interactions onto an existing .lg-btn element.
   */
  const enhanceOne = (btn) => {
    if (!(btn instanceof HTMLElement) || ENHANCED.has(btn)) return btn;
    ENHANCED.add(btn);

    if (finePointer.matches && !reduceMotion.matches) {
      btn.addEventListener("pointermove", onMove, { passive: true });
      btn.addEventListener("pointerleave", onLeave);
    }

    if (btn.hasAttribute("data-toggle") || btn.hasAttribute("aria-pressed")) {
      if (!btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", onToggleClick);
    }

    return btn;
  };

  /**
   * Enhance every .lg-btn inside `root` (defaults to the whole document).
   */
  const enhance = (root = document) => {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    const list = scope.querySelectorAll ? scope.querySelectorAll(".lg-btn") : [];
    list.forEach(enhanceOne);
    if (scope instanceof Element && scope.classList.contains("lg-btn")) enhanceOne(scope);
    return list.length;
  };

  /**
   * Create a button element.
   * @param {Object} options
   * @param {string}  [options.label="Home"]    Visible label (also the accessible name)
   * @param {string}  [options.icon="home"]     Key from LiquidGlassButton.icons, or raw SVG markup
   * @param {"clear"|"frosted"|"tinted"} [options.variant="clear"]
   * @param {"sm"|"md"|"lg"|"xl"} [options.size="md"]
   * @param {"circle"|"pill"|"icon"} [options.shape="circle"]
   * @param {string}  [options.tint]            "R G B" used by the tinted variant
   * @param {boolean} [options.toggle=false]    Toggle button (aria-pressed)
   * @param {boolean} [options.pressed=false]   Initial pressed state (toggle only)
   * @param {boolean} [options.disabled=false]
   * @param {boolean} [options.loading=false]
   * @param {string}  [options.href]            Render as <a> instead of <button>
   * @param {string}  [options.className]       Extra classes
   * @param {Function}[options.onClick]         (event, button) => void
   */
  const create = (options = {}) => {
    const {
      label = "Home",
      icon = "home",
      variant = "clear",
      size = "md",
      shape = "circle",
      tint,
      toggle = false,
      pressed = false,
      disabled = false,
      loading = false,
      href,
      className = "",
      onClick,
    } = options;

    const el = document.createElement(href ? "a" : "button");
    if (href) {
      el.href = href;
    } else {
      el.type = "button";
    }

    const classes = ["lg-btn"];
    if (VARIANTS.has(variant) && variant !== "clear") classes.push(`lg-btn--${variant}`);
    if (SIZES.has(size) && size !== "md") classes.push(`lg-btn--${size}`);
    if (SHAPES.has(shape) && shape !== "circle") classes.push(`lg-btn--${shape}`);
    if (loading) classes.push("is-loading");
    if (className) classes.push(className);
    el.className = classes.join(" ");

    if (tint) el.style.setProperty("--lg-tint", tint);
    if (disabled) {
      if (href) el.setAttribute("aria-disabled", "true");
      else el.disabled = true;
    }
    if (loading) el.setAttribute("aria-busy", "true");
    if (toggle) {
      el.setAttribute("data-toggle", "");
      el.setAttribute("aria-pressed", String(Boolean(pressed)));
    }

    const iconMarkup = ICONS[icon] ? iconSvg(icon) : icon;
    el.innerHTML =
      `<span class="lg-btn__icon">${iconMarkup}</span>` +
      `<span class="lg-btn__label"></span>`;
    el.querySelector(".lg-btn__label").textContent = label;

    if (typeof onClick === "function") {
      el.addEventListener("click", (event) => onClick(event, el));
    }

    return enhanceOne(el);
  };

  /**
   * Toggle the loading state on an existing button.
   */
  const setLoading = (btn, isLoading) => {
    btn.classList.toggle("is-loading", Boolean(isLoading));
    if (isLoading) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
    return btn;
  };

  /**
   * Register an additional icon: LiquidGlassButton.registerIcon("star", "<path …/>")
   */
  const registerIcon = (name, innerSvg) => {
    ICONS[name] = innerSvg;
  };

  global.LiquidGlassButton = Object.freeze({
    create,
    enhance,
    setLoading,
    registerIcon,
    icons: ICONS,
  });

  // Auto-enhance anything already on the page.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhance(document), { once: true });
  } else {
    enhance(document);
  }
})(window);
