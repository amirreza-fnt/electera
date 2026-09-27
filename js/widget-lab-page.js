/**
 * Widget lab page — uses HarmonyPhotosWidget.
 */
(() => {
  "use strict";

  const widget = document.getElementById("photos-widget");
  const statusEl = document.getElementById("widget-status");
  const dateEl = document.getElementById("widget-date");
  const modeBtns = Array.from(document.querySelectorAll(".widget-lab__mode"));

  let ctrl = null;

  const formatDate = () => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "June 7, 2025";
    }
  };

  if (dateEl) dateEl.textContent = formatDate();

  const setWidgetAppearance = (mode) => {
    if (ctrl) ctrl.setAppearance(mode);
    modeBtns.forEach((btn) => {
      const on = btn.getAttribute("data-mode") === (mode === "dark" ? "dark" : "light");
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setWidgetAppearance(btn.getAttribute("data-mode")));
  });

  if (widget && window.HarmonyPhotosWidget) {
    ctrl = HarmonyPhotosWidget.init(widget, {
      appearance: "light",
      onStatus: (msg) => {
        if (statusEl) statusEl.textContent = msg;
      },
    });
    setWidgetAppearance("light");
  }
})();
