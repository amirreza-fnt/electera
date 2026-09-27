/**
 * Harmony Photos widget — deferred load + iOS crossfade carousel.
 */
window.HarmonyPhotosWidget = {
  init(root, options = {}) {
    "use strict";

    const WIDGETS_DIR = "assets/widgets/";
    const MANIFEST = WIDGETS_DIR + "manifest.json";
    const INTERVAL_MS = 5000;
    const CROSSFADE_MS = 720;
    const INLINE_MANIFEST_ID = "harmony-widget-manifest";

    const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
    const photos = () => Array.from(root.querySelectorAll(".ios-photos-widget__photo"));

    let urls = [];
    let index = 0;
    let timer = 0;
    let transitioning = false;
    const loaded = new Map();

    const assetPath = (fileName) => WIDGETS_DIR + String(fileName).replace(/^\//, "");

    if (/Firefox/i.test(navigator.userAgent)) {
      root.classList.add("ios-photos-widget--firefox");
    }

    const setAppearance = (mode) => {
      root.setAttribute("data-appearance", mode === "dark" ? "dark" : "light");
    };

    if (options.appearance) setAppearance(options.appearance);

    const sortUrls = (list) =>
      list.slice().sort((a, b) => {
        const na = (a.match(/(\d+)/) || [0, 0])[1];
        const nb = (b.match(/(\d+)/) || [0, 0])[1];
        return Number(na) - Number(nb) || a.localeCompare(b);
      });

    const pathsFromNames = (names) =>
      sortUrls(names.filter(Boolean).map((name) => assetPath(name)));

    const listFromOptions = () => {
      if (Array.isArray(options.images) && options.images.length) {
        return pathsFromNames(options.images);
      }
      return null;
    };

    const listFromDataAttr = () => {
      const raw = root.getAttribute("data-widget-images");
      if (!raw) return null;
      return pathsFromNames(raw.split(",").map((s) => s.trim()));
    };

    const listFromInline = () => {
      const el = document.getElementById(INLINE_MANIFEST_ID);
      if (!el || !el.textContent.trim()) return null;
      try {
        const data = JSON.parse(el.textContent);
        if (!Array.isArray(data.images) || !data.images.length) return null;
        return pathsFromNames(data.images);
      } catch {
        return null;
      }
    };

    const listFromManifestFetch = async () => {
      if (window.location.protocol === "file:") return null;
      try {
        const res = await fetch(MANIFEST, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data.images) || !data.images.length) return null;
        return pathsFromNames(data.images);
      } catch {
        return null;
      }
    };

    const probeImage = (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url;
      });

    const discoverByScan = async () => {
      const candidates = [];
      const prefixes = ["widget", "widjet"];
      for (const prefix of prefixes) {
        for (let i = 1; i <= 24; i += 1) {
          candidates.push(`${WIDGETS_DIR}${prefix}-${i}.png`);
        }
      }
      const checks = await Promise.all(candidates.map((url) => probeImage(url)));
      return sortUrls([...new Set(checks.filter(Boolean))]);
    };

    const resolveUrlList = async () => {
      const direct = listFromOptions() || listFromDataAttr() || listFromInline();
      if (direct && direct.length) return direct;

      const scanned = await discoverByScan();
      if (scanned.length) return scanned;
      const fetched = await listFromManifestFetch();
      return fetched || [];
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
      if (!a) return;
      a.src = url;
      a.className = "ios-photos-widget__photo is-active is-visible";
      root.classList.remove("is-pending");
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
        if (loaded.get(next) === "ready" && crossfadeTo(next)) return;
        tries += 1;
      }
    };

    const startCarousel = () => {
      window.clearInterval(timer);
      if (urls.length < 2) return;
      timer = window.setInterval(tick, INTERVAL_MS);
    };

    const boot = async () => {
      urls = await resolveUrlList();
      if (!urls.length) {
        onStatus("");
        return;
      }

      const firstImg = photos()[0];
      const htmlReady = root.dataset.firstReady === "1" || root.classList.contains("is-ready");
      const inlineReady =
        firstImg &&
        firstImg.src &&
        firstImg.classList.contains("is-visible") &&
        !root.classList.contains("is-pending");

      index = 0;
      if (inlineReady && firstImg.src) {
        const match = urls.findIndex((u) => firstImg.src.includes(u) || firstImg.getAttribute("src") === u);
        if (match >= 0) index = match;
        loaded.set(urls[index], "ready");
        root.classList.add("is-ready");
        startCarousel();
        scheduleIdlePreload(urls);
        return;
      }

      let firstUrl = urls[0];
      let firstOk = await preloadOne(firstUrl);
      if (!firstOk) {
        for (let i = 1; i < urls.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          if (await preloadOne(urls[i])) {
            firstUrl = urls[i];
            index = i;
            firstOk = true;
            break;
          }
        }
      }
      if (!firstOk) return;

      revealFirst(firstUrl);
      root.classList.add("is-ready");
      startCarousel();
      scheduleIdlePreload(urls);
    };

    const startWhenReady = () => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
      } else {
        boot();
      }
    };

    startWhenReady();

    return { setAppearance, destroy: () => window.clearInterval(timer) };
  },
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ios-photos-widget[data-auto-init]").forEach((root) => {
    if (root.dataset.hpwInited === "1") return;
    root.dataset.hpwInited = "1";
    const appearance =
      root.getAttribute("data-appearance") ||
      document.body.getAttribute("data-appearance") ||
      "light";
    const raw = root.getAttribute("data-widget-images");
    const images = raw
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    root.harmonyPhotosWidget = window.HarmonyPhotosWidget.init(root, { appearance, images });
  });
});
