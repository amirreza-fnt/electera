/**
 * iOS 26 notification page
 *
 * On every load: the screen wakes, the alert sound (notif.mp3) plays, and the
 * banner rises into the lock-screen stack at the exact moment audio starts.
 * If the browser blocks autoplay, a glass "Tap to enable sound" capsule appears
 * and the whole sequence runs on the first tap — still perfectly in sync.
 *
 * Controls: drag the banner sideways to dismiss · R = replay · Esc = dismiss
 */
(() => {
  "use strict";

  const G = window.IOSGlass;
  if (!G) return;

  const NOTIFICATION = {
    app: "Adaptive Power",
    title: "Adaptive Power",
    body: "iPhone is adjusting performance to help extend your battery life.",
    time: "now",
    icon: "battery",
  };

  const screen = document.getElementById("ios-screen");
  const stack = document.getElementById("ios-notif-stack");
  const audio = document.getElementById("ios-notif-audio");
  const unlockBtn = document.getElementById("ios-sound-unlock");
  const replayBtn = document.getElementById("ios-replay");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let current = null; // the visible banner
  let running = false;

  G.startClock(document);

  /* ------------------------------------------------------------------------
     Sound
     ------------------------------------------------------------------------ */
  const soundDuration = () =>
    Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 2400;

  /**
   * Try to start the sound. Resolves when audio is actually audible (the
   * `playing` event), rejects if autoplay is blocked or the file failed.
   */
  const startSound = () =>
    new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, v) => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("playing", onPlaying);
        fn(v);
      };
      const onPlaying = () => done(resolve, true);

      audio.addEventListener("playing", onPlaying, { once: true });
      audio.currentTime = 0;

      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          // Safety net: some engines resolve play() a beat before `playing`.
          window.setTimeout(() => done(resolve, true), 250);
        }).catch((err) => done(reject, err));
      } else {
        window.setTimeout(() => done(resolve, true), 60);
      }
    });

  /* ------------------------------------------------------------------------
     Banner lifecycle
     ------------------------------------------------------------------------ */
  const wakeScreen = () => {
    screen.classList.remove("is-asleep");
  };

  const sleepScreen = () => {
    screen.classList.add("is-asleep");
  };

  const dismiss = (banner = current, direction = 0) =>
    new Promise((resolve) => {
      if (!banner || banner.classList.contains("is-leaving")) return resolve();
      const x = parseFloat(banner.style.getPropertyValue("--ios-notif-x")) || 0;
      const out = direction === 0 ? 0 : direction * (banner.offsetWidth + 60);
      banner.style.setProperty("--ios-notif-x", `${x}px`);
      banner.style.setProperty("--ios-notif-x-out", `${out}px`);
      banner.classList.remove("is-entering", "is-sounding", "is-dragging");
      banner.classList.add("is-leaving");
      const finish = () => {
        banner.remove();
        if (current === banner) current = null;
        resolve();
      };
      banner.addEventListener("animationend", finish, { once: true });
      window.setTimeout(finish, 420); // guard if animationend never fires
    });

  const present = (withSound) => {
    const banner = G.notification(NOTIFICATION);
    banner.style.setProperty("--ios-sound-duration", `${Math.round(soundDuration())}ms`);
    stack.append(banner);
    attachDrag(banner);

    // Commit the hidden state, then animate in on the next frame.
    void banner.offsetWidth;
    banner.classList.remove("is-hidden");
    banner.classList.add("is-entering");
    if (withSound) banner.classList.add("is-sounding");

    banner.addEventListener(
      "animationend",
      (e) => {
        if (e.target === banner && e.animationName === "ios-notif-rise") {
          banner.classList.remove("is-entering");
        }
      },
      { once: true }
    );

    current = banner;
    return banner;
  };

  /**
   * Full sequence: sleep → (sound starts) → wake + rise. The banner and the
   * screen wake are triggered from the audio `playing` event so they stay locked
   * to the sound even if decoding takes a moment.
   */
  const run = async () => {
    if (running) return;
    running = true;
    unlockBtn.hidden = true;

    if (current) await dismiss(current);

    try {
      await startSound();
      wakeScreen();
      present(true);
    } catch (err) {
      const blocked = err && (err.name === "NotAllowedError" || err.name === "AbortError");
      if (blocked) {
        // Autoplay blocked: wake silently and wait for the first gesture.
        wakeScreen();
        unlockBtn.hidden = false;
        armGestureUnlock();
      } else {
        // Missing/broken file: still show the notification, just without sound.
        wakeScreen();
        present(false);
      }
    } finally {
      running = false;
    }
  };

  const replay = async () => {
    if (running) return;
    if (current) await dismiss(current);
    sleepScreen();
    await new Promise((r) => window.setTimeout(r, reduceMotion.matches ? 60 : 320));
    run();
  };

  /* ------------------------------------------------------------------------
     Autoplay unlock (first user gesture anywhere)
     ------------------------------------------------------------------------ */
  let gestureArmed = false;

  const onFirstGesture = (event) => {
    if (!gestureArmed) return;
    // Ignore gestures on the lock-screen buttons so they behave normally.
    if (event.target.closest && event.target.closest(".ios-lock-actions, #ios-replay")) return;
    gestureArmed = false;
    window.removeEventListener("pointerdown", onFirstGesture, true);
    window.removeEventListener("keydown", onFirstGesture, true);
    run();
  };

  const armGestureUnlock = () => {
    if (gestureArmed) return;
    gestureArmed = true;
    window.addEventListener("pointerdown", onFirstGesture, true);
    window.addEventListener("keydown", onFirstGesture, true);
  };

  unlockBtn.addEventListener("click", () => {
    gestureArmed = false;
    run();
  });

  /* ------------------------------------------------------------------------
     Drag to dismiss (horizontal, like swiping a lock-screen notification)
     ------------------------------------------------------------------------ */
  function attachDrag(banner) {
    let startX = 0;
    let dx = 0;
    let dragging = false;
    let pointerId = null;

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      dx = 0;
      banner.classList.add("is-dragging");
      banner.setPointerCapture?.(pointerId);
    };

    const onMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dx = e.clientX - startX;
      const damp = Math.sign(dx) * Math.min(Math.abs(dx), 40 + Math.abs(dx) * 0.7);
      banner.style.setProperty("--ios-notif-x", `${damp}px`);
      banner.style.transform = `translate3d(${damp}px, 0, 0)`;
      banner.style.opacity = String(Math.max(0.35, 1 - Math.abs(damp) / 260));
    };

    const onUp = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      banner.classList.remove("is-dragging");
      banner.releasePointerCapture?.(pointerId);

      if (Math.abs(dx) > 90) {
        dismiss(banner, Math.sign(dx));
        return;
      }

      // Snap back with a spring.
      banner.style.transition = "transform 480ms cubic-bezier(0.34, 1.45, 0.64, 1), opacity 240ms ease";
      banner.style.transform = "";
      banner.style.opacity = "";
      banner.style.setProperty("--ios-notif-x", "0px");
      banner.addEventListener(
        "transitionend",
        () => {
          banner.style.transition = "";
        },
        { once: true }
      );
    };

    banner.addEventListener("pointerdown", onDown);
    banner.addEventListener("pointermove", onMove);
    banner.addEventListener("pointerup", onUp);
    banner.addEventListener("pointercancel", onUp);
  }

  /* ------------------------------------------------------------------------
     Controls
     ------------------------------------------------------------------------ */
  replayBtn.addEventListener("click", replay);

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      replay();
    } else if (e.key === "Escape" && current) {
      dismiss(current);
    }
  });

  /* ------------------------------------------------------------------------
     Boot — runs on every page load / refresh
     ------------------------------------------------------------------------ */
  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    // Give the wallpaper & fonts a moment, then fire (screen is asleep until then).
    window.setTimeout(run, 350);
  };

  if (audio.readyState >= 1) boot();
  else {
    audio.addEventListener("loadedmetadata", boot, { once: true });
    // If metadata never arrives (e.g. file missing), don't hang the demo.
    audio.addEventListener("error", boot, { once: true });
    window.setTimeout(boot, 1500);
  }

  window.iosNotificationDemo = Object.freeze({ replay, dismiss: () => dismiss(current) });
})();
