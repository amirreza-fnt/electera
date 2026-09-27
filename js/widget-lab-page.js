/**
 * Widget lab — deferred image load, harmony filters, theme on widget only.
 */
(() => {
  "use strict";

  const WIDGETS_DIR = "assets/widgets/";
  const MANIFEST = WIDGETS_DIR + "manifest.json";
  const INTERVAL_MS = 5000;
  const CROSSFADE_MS = 720;

  const widget = document.getElementById("photos-widget");
  const photos = () => Array.from(document.querySelectorAll(".ios-photos-widget__photo"));
  const statusEl = document.getElementById("widget-status");
  const dateEl = document.getElementById("widget-date");
  const modeBtns = Array.from(document.querySelectorAll(".widget-lab__mode"));

  let urls = [];
  let index = 0;
  let timer = 0;
  let transitioning = false;
  const loaded = new Map();

  if (/Firefox/i.test(navigator.userAgent) && widget) {
    widget.classList.add("ios-photos-widget--firefox");
  }

  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

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
    const next = mode === "dark" ? "dark" : "light";
    if (widget) widget.setAttribute("data-appearance", next);
    modeBtns.forEach((btn) => {
      const on = btn.getAttribute("data-mode") === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setWidgetAppearance(btn.getAttribute("data-mode")));
  });
  setWidgetAppearance("light");

  const sortUrls = (list) =>
    list.slice().sort((a, b) => {
      const na = (a.match(/(\d+)/) || [0, 0])[1];
      const nb = (b.match(/(\d+)/) || [0, 0])[1];
      return Number(na) - Number(nb) || a.localeCompare(b);
    });

  const listFromManifest = async () => {
    try {
      const res = await fetch(MANIFEST, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data.images) || !data.images.length) return null;
      return sortUrls(data.images.map((name) => WIDGETS_DIR + String(name).replace(/^\//, "")));
    } catch {
      return null;
    }
  };

  const probeImage = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

  const discoverByScan = async () => {
    const found = [];
    const prefixes = ["widget", "widjet"];
    for (const prefix of prefixes) {
      for (let i = 1; i <= 24; i += 1) {
        const url = `${WIDGETS_DIR}${prefix}-${i}.png`;
        // eslint-disable-next-line no-await-in-loop
        if (await probeImage(url)) found.push(url);
      }
    }
    return sortUrls([...new Set(found)]);
  };

  const resolveUrlList = async () => {
    const fromManifest = await listFromManifest();
    if (fromManifest && fromManifest.length) return fromManifest;
    return discoverByScan();
  };

  const preloadOne = (url) =>
    new Promise((resolve) => {
      if (loaded.get(url) === "ready") {
        resolve(true);
        return;
      }
      loaded.set(url, "loading");
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        loaded.set(url, "ready");
        resolve(true);
      };
      img.onerror = () => {
        loaded.set(url, "error");
        resolve(false);
      };
      img.src = url;
    });

  const preloadSequential = async (list, startIndex = 0) => {
    for (let i = startIndex; i < list.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await preloadOne(list[i]);
    }
  };

  const scheduleIdlePreload = (list) => {
    const run = () => preloadSequential(list, 1);
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      window.setTimeout(run, 32);
    }
  };

  const revealFirst = (url) => {
    const [a] = photos();
    if (!a || !widget) return;
    a.src = url;
    a.className = "ios-photos-widget__photo is-active is-visible";
    widget.classList.remove("is-pending");
    setStatus(urls.length > 1 ? `۱ / ${urls.length}` : "یک تصویر");
  };

  const crossfadeTo = (nextUrl) => {
    if (transitioning || loaded.get(nextUrl) !== "ready") return false;
    const [a, b] = photos();
    if (!a || !b || !nextUrl) return false;

    transitioning = true;
    const active = a.classList.contains("is-active") ? a : b;
    const idle = active === a ? b : a;

    idle.src = nextUrl;
    idle.className = "ios-photos-widget__photo is-entering is-visible";
    active.className = "ios-photos-widget__photo is-leaving is-visible";

    window.setTimeout(() => {
      active.className = "ios-photos-widget__photo";
      active.removeAttribute("src");
      idle.className = "ios-photos-widget__photo is-active is-visible";
      transitioning = false;
    }, CROSSFADE_MS + 40);
    return true;
  };

  const tick = () => {
    if (urls.length < 2) return;
    let tries = 0;
    while (tries < urls.length) {
      index = (index + 1) % urls.length;
      const next = urls[index];
      if (loaded.get(next) === "ready" && crossfadeTo(next)) {
        setStatus(`${index + 1} / ${urls.length}`);
        return;
      }
      tries += 1;
    }
  };

  const startCarousel = () => {
    window.clearInterval(timer);
    if (urls.length < 2) return;
    setStatus(`۱ / ${urls.length} — هر ${INTERVAL_MS / 1000} ثانیه`);
    timer = window.setInterval(tick, INTERVAL_MS);
  };

  const init = async () => {
    setStatus("در حال آماده‌سازی…");
    urls = await resolveUrlList();
    if (!urls.length) {
      setStatus("در assets/widgets/ فایلی مثل widget-1.png بگذارید.");
      return;
    }

    index = 0;
    const firstOk = await preloadOne(urls[0]);
    if (firstOk) {
      revealFirst(urls[0]);
      startCarousel();
    } else {
      setStatus("بارگذاری تصویر اول ناموفق بود.");
      return;
    }

    scheduleIdlePreload(urls);
  };

  init();
})();
