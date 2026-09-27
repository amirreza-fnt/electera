/**
 * Widget lab — discover widget-*.png / widjet-*.png, iOS-style crossfade carousel.
 */
(() => {
  "use strict";

  const WIDGETS_DIR = "assets/widgets/";
  const MANIFEST = WIDGETS_DIR + "manifest.json";
  const INTERVAL_MS = 5000;
  const CROSSFADE_MS = 720;

  const body = document.body;
  const photos = () => Array.from(document.querySelectorAll(".ios-photos-widget__photo"));
  const statusEl = document.getElementById("widget-status");
  const dateEl = document.getElementById("widget-date");
  const modeBtns = Array.from(document.querySelectorAll(".widget-lab__mode"));

  let urls = [];
  let index = 0;
  let timer = 0;
  let transitioning = false;

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

  const setAppearance = (mode) => {
    const next = mode === "light" ? "light" : "dark";
    body.setAttribute("data-appearance", next);
    document.documentElement.setAttribute("data-appearance", next);
    const tc = document.getElementById("widget-theme-color");
    const cs = document.getElementById("widget-color-scheme");
    if (tc) tc.setAttribute("content", next === "light" ? "#e8e8ed" : "#000000");
    if (cs) cs.setAttribute("content", next);
    modeBtns.forEach((btn) => {
      const on = btn.getAttribute("data-mode") === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setAppearance(btn.getAttribute("data-mode")));
  });
  setAppearance("dark");

  const probeImage = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url + (url.includes("?") ? "&" : "?") + "probe=" + Date.now();
    });

  const sortUrls = (list) =>
    list.slice().sort((a, b) => {
      const na = (a.match(/(\d+)/) || [0, 0])[1];
      const nb = (b.match(/(\d+)/) || [0, 0])[1];
      return Number(na) - Number(nb) || a.localeCompare(b);
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

  const discoverImages = async () => {
    try {
      const res = await fetch(MANIFEST, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.images) && data.images.length) {
          const fromManifest = [];
          for (const name of data.images) {
            const url = WIDGETS_DIR + name.replace(/^\//, "");
            if (await probeImage(url)) fromManifest.push(url);
          }
          if (fromManifest.length) return sortUrls(fromManifest);
        }
      }
    } catch {
      /* manifest optional */
    }
    return discoverByScan();
  };

  const applyStill = (url) => {
    const [a, b] = photos();
    if (!a) return;
    a.src = url;
    a.className = "ios-photos-widget__photo is-active";
    if (b) {
      b.removeAttribute("src");
      b.className = "ios-photos-widget__photo";
    }
  };

  const crossfadeTo = (nextUrl) => {
    if (transitioning) return;
    const [a, b] = photos();
    if (!a || !b || !nextUrl) return;

    transitioning = true;
    const active = a.classList.contains("is-active") ? a : b;
    const idle = active === a ? b : a;

    idle.src = nextUrl;
    idle.className = "ios-photos-widget__photo is-entering";
    active.className = "ios-photos-widget__photo is-leaving";

    window.setTimeout(() => {
      active.className = "ios-photos-widget__photo";
      active.removeAttribute("src");
      idle.className = "ios-photos-widget__photo is-active";
      transitioning = false;
    }, CROSSFADE_MS + 40);
  };

  const tick = () => {
    if (urls.length < 2) return;
    index = (index + 1) % urls.length;
    crossfadeTo(urls[index]);
    setStatus(`${index + 1} / ${urls.length}`);
  };

  const startCarousel = () => {
    window.clearInterval(timer);
    if (urls.length < 2) {
      setStatus(urls.length === 1 ? "یک تصویر — برای چرخش، widget-2.png اضافه کنید." : "تصویری پیدا نشد.");
      return;
    }
    setStatus(`۱ / ${urls.length} — هر ${INTERVAL_MS / 1000} ثانیه`);
    timer = window.setInterval(tick, INTERVAL_MS);
  };

  const init = async () => {
    urls = await discoverImages();
    if (!urls.length) {
      setStatus("در assets/widgets/ فایلی مثل widget-1.png بگذارید.");
      return;
    }
    index = 0;
    applyStill(urls[0]);
    startCarousel();
  };

  init();
})();
