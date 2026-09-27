/**
 * Showcase page — builds the component library rows with LiquidGlassButton.create().
 * Page-specific; not needed to use the component elsewhere.
 */
(() => {
  "use strict";

  const LGB = window.LiquidGlassButton;
  if (!LGB) return;

  const row = (id) => document.getElementById(id);
  const mount = (container, ...nodes) => container.append(...nodes);

  const labeled = (button, text) => {
    const wrap = document.createElement("div");
    wrap.className = "lg-showcase__item";
    const label = document.createElement("span");
    label.className = "lg-showcase__item-label";
    label.textContent = text;
    wrap.append(button, label);
    return wrap;
  };

  /* Sizes */
  mount(
    row("lg-row-sizes"),
    LGB.create({ label: "Home", icon: "home", variant: "frosted", size: "sm" }),
    LGB.create({ label: "Home", icon: "home", variant: "frosted", size: "md" }),
    LGB.create({ label: "Home", icon: "home", variant: "frosted", size: "lg" }),
    LGB.create({ label: "Home", icon: "home", variant: "frosted", size: "xl" })
  );

  /* Variants */
  mount(
    row("lg-row-variants"),
    LGB.create({ label: "Clear", icon: "home", variant: "clear", size: "lg" }),
    LGB.create({ label: "Frosted", icon: "home", variant: "frosted", size: "lg" }),
    LGB.create({ label: "Meadow", icon: "heart", variant: "tinted", size: "lg", tint: "120 200 110" }),
    LGB.create({ label: "Sky", icon: "bell", variant: "tinted", size: "lg", tint: "120 180 255" }),
    LGB.create({ label: "Blossom", icon: "camera", variant: "tinted", size: "lg", tint: "255 160 200" })
  );

  /* Shapes */
  mount(
    row("lg-row-shapes"),
    LGB.create({ label: "Home", icon: "home", variant: "frosted", size: "lg", shape: "circle" }),
    LGB.create({ label: "Search", icon: "search", variant: "frosted", size: "lg", shape: "pill" }),
    LGB.create({ label: "Play", icon: "play", variant: "clear", size: "lg", shape: "pill" }),
    LGB.create({ label: "Settings", icon: "settings", variant: "frosted", size: "lg", shape: "icon" }),
    LGB.create({ label: "Add", icon: "plus", variant: "clear", size: "lg", shape: "icon" })
  );

  /* States (static demonstrations use the .is-* mirror classes) */
  mount(
    row("lg-row-states"),
    labeled(LGB.create({ label: "Home", variant: "frosted" }), "default"),
    labeled(LGB.create({ label: "Home", variant: "frosted", className: "is-hover" }), ":hover"),
    labeled(LGB.create({ label: "Home", variant: "frosted", className: "is-active" }), ":active"),
    labeled(LGB.create({ label: "Home", variant: "frosted", className: "is-focus" }), ":focus-visible"),
    labeled(LGB.create({ label: "Home", variant: "frosted", toggle: true, pressed: true }), "aria-pressed"),
    labeled(LGB.create({ label: "Home", variant: "frosted", disabled: true }), "disabled"),
    labeled(LGB.create({ label: "Home", variant: "frosted", loading: true }), ".is-loading")
  );

  /* Interactive */
  const saveBtn = LGB.create({
    label: "Save",
    icon: "check",
    variant: "frosted",
    size: "lg",
    onClick: (event, el) => {
      if (el.classList.contains("is-loading")) return;
      LGB.setLoading(el, true);
      window.setTimeout(() => {
        LGB.setLoading(el, false);
        el.setAttribute("aria-pressed", "true");
        el.querySelector(".lg-btn__label").textContent = "Saved";
        window.setTimeout(() => {
          el.removeAttribute("aria-pressed");
          el.querySelector(".lg-btn__label").textContent = "Save";
        }, 1400);
      }, 1500);
    },
  });

  mount(
    row("lg-row-live"),
    saveBtn,
    LGB.create({ label: "Like", icon: "heart", variant: "clear", size: "lg", toggle: true }),
    LGB.create({ label: "Alerts", icon: "bell", variant: "frosted", size: "lg", toggle: true, pressed: true }),
    LGB.create({ label: "Profile", icon: "user", variant: "frosted", size: "lg", shape: "pill", href: "#profile" })
  );
})();
