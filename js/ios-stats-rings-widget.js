/**
 * Stats rings dashboard — liquid glass (Progress Rings) + ring fill from data-percent.
 */
(() => {
  "use strict";

  const DEFS_HOST_ID = "ios-stats-rings-defs";
  const RING_C = 251.33;

  function roundedRectSDF(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  }

  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function fragment(uv) {
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;
    const distanceToEdge = roundedRectSDF(ix, iy, 0.24, 0.24, 0.45);
    const displacement = smoothStep(0.72, 0, distanceToEdge - 0.1);
    const scaled = smoothStep(0, 1, displacement);
    return { x: ix * scaled + 0.5, y: iy * scaled + 0.5 };
  }

  function buildMap(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(w, h);
    const raw = new Float32Array(w * h * 2);
    let maxScale = 0;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const pos = fragment({ x: x / w, y: y / h });
        const dx = pos.x * w - x;
        const dy = pos.y * h - y;
        const idx = (y * w + x) * 2;
        raw[idx] = dx;
        raw[idx + 1] = dy;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      }
    }
    maxScale = maxScale || 1;
    for (let i = 0, p = 0; i < raw.length; i += 2, p += 4) {
      imgData.data[p] = (raw[i] / maxScale) * 127.5 + 127.5;
      imgData.data[p + 1] = (raw[i + 1] / maxScale) * 127.5 + 127.5;
      imgData.data[p + 2] = 127;
      imgData.data[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return { url: canvas.toDataURL(), scale: maxScale * 1.9 };
  }

  function getDefs() {
    let host = document.getElementById(DEFS_HOST_ID);
    if (!host) {
      host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      host.setAttribute("width", "0");
      host.setAttribute("height", "0");
      host.setAttribute("aria-hidden", "true");
      host.style.position = "absolute";
      host.id = DEFS_HOST_ID;
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      host.appendChild(defs);
      document.body.appendChild(host);
    }
    return host.querySelector("defs");
  }

  function applyGlass(el) {
    const refract = el.querySelector(".ios-stats-dashboard__refract");
    if (!refract) return;

    const w = Math.max(1, Math.round(el.offsetWidth));
    const h = Math.max(1, Math.round(el.offsetHeight));
    const map = buildMap(Math.min(w, 260), Math.min(h, 260));
    const id = el.dataset.statsFilterId || `stats-liquid-glass-${Math.random().toString(36).slice(2, 9)}`;
    el.dataset.statsFilterId = id;

    const defs = getDefs();
    let filter = document.getElementById(id);
    if (!filter) {
      filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "-20%");
      filter.setAttribute("y", "-20%");
      filter.setAttribute("width", "140%");
      filter.setAttribute("height", "140%");
      filter.setAttribute("color-interpolation-filters", "sRGB");

      const feImage = document.createElementNS("http://www.w3.org/2000/svg", "feImage");
      feImage.setAttribute("result", "map");
      feImage.setAttribute("preserveAspectRatio", "none");

      const feDisp = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
      feDisp.setAttribute("in", "SourceGraphic");
      feDisp.setAttribute("in2", "map");
      feDisp.setAttribute("xChannelSelector", "R");
      feDisp.setAttribute("yChannelSelector", "G");

      filter.appendChild(feImage);
      filter.appendChild(feDisp);
      defs.appendChild(filter);
    }

    filter.querySelector("feImage").setAttributeNS("http://www.w3.org/1999/xlink", "href", map.url);
    filter.querySelector("feDisplacementMap").setAttribute("scale", map.scale.toFixed(1));

    refract.style.backdropFilter = `url(#${id}) blur(2px) contrast(1.05) brightness(1.02) saturate(1.1)`;
    refract.style.webkitBackdropFilter = "blur(9px) saturate(1.15)";
  }

  function setRingProgress(circle, percent) {
    if (!circle) return;
    let p = Number(percent);
    if (Number.isNaN(p)) p = 0;
    p = Math.max(0, Math.min(100, p));
    circle.style.strokeDashoffset = String(RING_C - (p / 100) * RING_C);
  }

  function initDashboard(root) {
    root.querySelectorAll("[data-ring-percent]").forEach((circle) => {
      setRingProgress(circle, circle.getAttribute("data-ring-percent"));
    });
    applyGlass(root);
  }

  function refreshAll() {
    document.querySelectorAll(".ios-stats-dashboard").forEach((el) => initDashboard(el));
  }

  window.IosStatsRingsWidget = { refreshAll, initDashboard };

  const boot = () => {
    refreshAll();
    let t = 0;
    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(t);
        t = window.setTimeout(refreshAll, 150);
      },
      { passive: true }
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
