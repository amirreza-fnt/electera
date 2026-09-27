/**
 * Glass Nav — interaction layer
 *
 * - Hash-based navigation with a sliding glass indicator
 * - Arrow-key navigation inside the nav bar
 * - Capture button with shutter flash + toast feedback
 * - Pointer parallax for ambient blobs (disabled for touch / reduced motion)
 */
(() => {
  "use strict";

  const BASE_TITLE = "Glass Nav";

  const nav = document.getElementById("primary-nav");
  const indicator = document.getElementById("nav-indicator");
  const captureBtn = document.getElementById("capture-btn");
  const flash = document.getElementById("flash");
  const toast = document.getElementById("toast");
  const blobs = Array.from(document.querySelectorAll(".blob"));
  const links = Array.from(nav.querySelectorAll(".nav-link"));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ------------------------------------------------------------------------
     Navigation
     ------------------------------------------------------------------------ */
  const routes = links.map((link) => link.getAttribute("href").slice(1));

  const routeFromHash = () => {
    const hash = window.location.hash.replace(/^#/, "");
    return routes.includes(hash) ? hash : routes[0];
  };

  const labelFor = (link) => link.querySelector(".nav-link__label").textContent.trim();

  const positionIndicator = () => {
    const active = nav.querySelector('[aria-current="page"]');
    if (!active) return;

    const navRect = nav.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    const padX = Math.round(Math.min(12, rect.width * 0.1));
    const padY = Math.round(Math.min(4, rect.height * 0.06));

    const x = rect.left - navRect.left - nav.clientLeft - padX;
    const y = rect.top - navRect.top - nav.clientTop - padY;

    indicator.style.width = `${rect.width + padX * 2}px`;
    indicator.style.height = `${rect.height + padY * 2}px`;
    indicator.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  };

  const setActive = (route) => {
    let activeLink = null;

    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${route}`;
      if (isActive) {
        link.setAttribute("aria-current", "page");
        activeLink = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (activeLink) {
      document.title = `${BASE_TITLE} — ${labelFor(activeLink)}`;
    }

    positionIndicator();
  };

  // Keyboard: arrow keys / Home / End move between destinations.
  nav.addEventListener("keydown", (event) => {
    const currentIndex = links.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % links.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + links.length) % links.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = links.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = links[nextIndex];
    next.focus();
    window.location.hash = next.getAttribute("href");
  });

  window.addEventListener("hashchange", () => setActive(routeFromHash()));

  // Keep the indicator glued to the active item as layout changes.
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => positionIndicator()).observe(nav);
  } else {
    window.addEventListener("resize", positionIndicator);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionIndicator);
  }

  // Initial state: place the indicator before enabling its transitions.
  setActive(routeFromHash());
  requestAnimationFrame(() => {
    positionIndicator();
    requestAnimationFrame(() => indicator.classList.add("is-ready"));
  });

  /* ------------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------------ */
  let toastTimer = 0;

  const showToast = (message, duration = 2200) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, duration);
  };

  /* ------------------------------------------------------------------------
     Capture button
     ------------------------------------------------------------------------ */
  captureBtn.addEventListener("click", () => {
    if (captureBtn.classList.contains("is-capturing")) return;

    captureBtn.classList.add("is-capturing");

    if (!reduceMotion.matches) {
      flash.classList.remove("is-active");
      // Restart the animation even on rapid presses.
      void flash.offsetWidth;
      flash.classList.add("is-active");
    }

    showToast("Photo captured");

    window.setTimeout(() => captureBtn.classList.remove("is-capturing"), 560);
  });

  /* ------------------------------------------------------------------------
     Ambient parallax
     ------------------------------------------------------------------------ */
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let frame = 0;

  const tick = () => {
    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;

    blobs.forEach((blob) => {
      const depth = Number(blob.dataset.depth) || 8;
      const dx = (-current.x * depth).toFixed(2);
      const dy = (-current.y * depth).toFixed(2);
      blob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    const settled =
      Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
    frame = settled ? 0 : requestAnimationFrame(tick);
  };

  const onPointerMove = (event) => {
    target.x = (event.clientX / window.innerWidth - 0.5) * 2;
    target.y = (event.clientY / window.innerHeight - 0.5) * 2;
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const onPointerLeave = () => {
    target.x = 0;
    target.y = 0;
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const enableParallax = () => {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
  };

  const disableParallax = () => {
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    onPointerLeave();
  };

  const syncParallax = () => {
    if (finePointer.matches && !reduceMotion.matches) {
      enableParallax();
    } else {
      disableParallax();
    }
  };

  syncParallax();
  reduceMotion.addEventListener?.("change", syncParallax);
  finePointer.addEventListener?.("change", syncParallax);
})();
