(function () {
  "use strict";

  var STORAGE_KEY = "bg-blend-variant";
  var VARIANTS = [
    { id: 1, title: "Pure Matte", titleFa: "مات خالص — بدون گوی" },
    { id: 2, title: "iOS Mist", titleFa: "مه iOS — بدون گوی" },
    { id: 3, title: "Logo Glow", titleFa: "درخشش لوگو — ۲ گوی" },
    { id: 4, title: "Harmony Scene", titleFa: "صحنه هماهنگ — همه گوی‌ها" },
    { id: 5, title: "Lock Dim", titleFa: "لاک تیره — گوی‌های کم" },
  ];

  var body = document.body;
  var btn = document.getElementById("bg-blend-cycle");
  var numEl = document.getElementById("bg-blend-num");
  var toast = document.getElementById("bg-blend-toast");
  var toastTimer;

  function clampVariant(n) {
    var v = parseInt(n, 10);
    if (!v || v < 1) return 1;
    if (v > VARIANTS.length) return VARIANTS.length;
    return v;
  }

  function meta(id) {
    return VARIANTS.find(function (x) {
      return x.id === id;
    });
  }

  function apply(id, announce) {
    var v = clampVariant(id);
    body.dataset.variant = String(v);
    if (numEl) numEl.textContent = String(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch (e) {
      /* ignore */
    }
    var m = meta(v);
    if (announce && toast && m) {
      toast.textContent = v + " · " + m.titleFa;
      toast.classList.remove("is-visible");
      void toast.offsetWidth;
      toast.classList.add("is-visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove("is-visible");
      }, 2400);
    }
  }

  function next() {
    var cur = clampVariant(body.dataset.variant || 1);
    apply(cur >= VARIANTS.length ? 1 : cur + 1, true);
  }

  var saved;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e2) {
    saved = null;
  }
  apply(saved ? clampVariant(saved) : 1, false);

  if (btn) {
    btn.addEventListener("click", next);
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === " " || ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
      ev.preventDefault();
      next();
    }
  });
})();
