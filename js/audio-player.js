/**
 * Audio Player page — interaction layer (scoped to audio-player.html)
 *
 * - Play / pause, previous / next, seek, volume & mute
 * - Waveform progress bar generated per track
 * - Real <audio> playback when a track has a `src`; otherwise a simulated
 *   clock drives the UI so the player behaves like a product without assets
 * - Media Session metadata, keyboard shortcuts, pointer tilt on the glass card
 */
(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     Placeholder catalogue — set `src` to connect real audio files.
     ------------------------------------------------------------------------ */
  const TRACKS = [
    { title: "Snooze", artist: "SZA", duration: 281, src: null },
    { title: "Kill Bill", artist: "SZA", duration: 153, src: null },
    { title: "Good Days", artist: "SZA", duration: 279, src: null },
  ];

  const START_INDEX = 0;
  const START_TIME = 80; // 01:20, as in the reference
  const WAVE_BARS = 68;

  /* ------------------------------------------------------------------------
     DOM
     ------------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);

  const card = $("audio-player-card");
  const stage = card.closest(".audio-player-stage");
  const audio = $("audio-player-audio");

  const titleEl = $("audio-player-title");
  const artistEl = $("audio-player-artist");
  const currentEl = $("audio-player-current");
  const durationEl = $("audio-player-duration");

  const waveTrack = $("audio-player-wave");
  const barsBase = waveTrack.querySelector(".audio-player-progress__bars--base");
  const barsFill = waveTrack.querySelector(".audio-player-progress__bars--fill");
  const seekInput = $("audio-player-seek");

  const playBtn = $("audio-player-play");
  const prevBtn = $("audio-player-prev");
  const nextBtn = $("audio-player-next");

  const volumeWrap = document.querySelector(".audio-player-volume");
  const volumeInput = $("audio-player-volume");
  const volumeFill = $("audio-player-volume-fill");
  const muteBtn = $("audio-player-mute");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */
  const state = {
    index: START_INDEX,
    time: START_TIME,
    duration: TRACKS[START_INDEX].duration,
    playing: false,
    scrubbing: false,
    usingAudio: false, // true when the <audio> element can actually play
    volume: 0.75,
    muted: false,
    lastVolume: 0.75,
  };

  let frame = 0;
  let lastTick = 0;

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const formatTime = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const speakTime = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    const parts = [];
    if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
    parts.push(`${s} second${s === 1 ? "" : "s"}`);
    return parts.join(" ");
  };

  // Deterministic PRNG so each track gets a stable waveform.
  const seededRandom = (seedText) => {
    let h = 2166136261;
    for (let i = 0; i < seedText.length; i += 1) {
      h ^= seedText.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ------------------------------------------------------------------------
     Waveform
     ------------------------------------------------------------------------ */
  const buildWaveform = (track) => {
    const rand = seededRandom(`${track.title}::${track.artist}`);
    const heights = [];

    for (let i = 0; i < WAVE_BARS; i += 1) {
      const t = i / (WAVE_BARS - 1);
      // Gentle musical envelope: quieter intro/outro, lively middle sections.
      const envelope = 0.55 + 0.45 * Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(t * 19));
      const jitter = 0.35 + rand() * 0.65;
      heights.push(clamp(envelope * jitter, 0.14, 1));
    }

    const render = (container) => {
      container.replaceChildren(
        ...heights.map((h) => {
          const bar = document.createElement("span");
          bar.className = "audio-player-progress__bar";
          bar.style.setProperty("--ap-bar-h", `${Math.round(h * 100)}%`);
          return bar;
        })
      );
    };

    render(barsBase);
    render(barsFill);
  };

  /* ------------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------------ */
  const renderTime = () => {
    const progress = state.duration ? (state.time / state.duration) * 100 : 0;
    barsFill.style.setProperty("--ap-progress", `${clamp(progress, 0, 100).toFixed(3)}%`);
    currentEl.textContent = formatTime(state.time);

    if (!state.scrubbing) {
      seekInput.value = String(Math.floor(state.time));
    }
    seekInput.setAttribute(
      "aria-valuetext",
      `${speakTime(state.time)} of ${speakTime(state.duration)}`
    );
  };

  const renderDuration = () => {
    durationEl.textContent = formatTime(state.duration);
    seekInput.max = String(Math.max(1, Math.floor(state.duration)));
  };

  const renderTrack = () => {
    const track = TRACKS[state.index];
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    document.title = `${track.title} — ${track.artist} · Audio Player`;
    renderDuration();
    buildWaveform(track);
    renderTime();
    updateMediaSession();
  };

  const renderPlaying = () => {
    card.classList.toggle("is-playing", state.playing);
    playBtn.setAttribute("aria-pressed", String(state.playing));
    playBtn.setAttribute("aria-label", state.playing ? "Pause" : "Play");
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
    }
  };

  const renderVolume = () => {
    const effective = state.muted ? 0 : state.volume;
    volumeFill.style.setProperty("--ap-volume", `${Math.round(effective * 100)}%`);
    volumeInput.value = String(effective);
    volumeWrap.classList.toggle("is-muted", effective === 0);
    volumeWrap.classList.toggle("is-low", effective > 0 && effective < 0.5);
    muteBtn.setAttribute("aria-pressed", String(state.muted || effective === 0));
    muteBtn.setAttribute("aria-label", state.muted || effective === 0 ? "Unmute" : "Mute");
    audio.volume = state.volume;
    audio.muted = state.muted;
  };

  /* ------------------------------------------------------------------------
     Playback clock
     ------------------------------------------------------------------------ */
  const tick = (now) => {
    if (!state.playing) {
      frame = 0;
      return;
    }

    if (state.usingAudio) {
      state.time = audio.currentTime;
    } else if (!state.scrubbing) {
      const dt = lastTick ? (now - lastTick) / 1000 : 0;
      state.time = Math.min(state.duration, state.time + dt);
    }
    lastTick = now;

    renderTime();

    if (!state.usingAudio && state.time >= state.duration) {
      onTrackEnded();
      return;
    }

    frame = requestAnimationFrame(tick);
  };

  const startClock = () => {
    lastTick = 0;
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const stopClock = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTick = 0;
  };

  /* ------------------------------------------------------------------------
     Transport
     ------------------------------------------------------------------------ */
  const play = async () => {
    if (state.playing) return;
    state.playing = true;
    renderPlaying();

    if (state.usingAudio) {
      try {
        await audio.play();
      } catch {
        // Autoplay restrictions or a missing file: fall back to the simulated clock.
        state.usingAudio = false;
      }
    }
    startClock();
  };

  const pause = () => {
    if (!state.playing) return;
    state.playing = false;
    renderPlaying();
    if (state.usingAudio) audio.pause();
    stopClock();
  };

  const togglePlay = () => (state.playing ? pause() : play());

  const seekTo = (seconds) => {
    state.time = clamp(seconds, 0, state.duration);
    if (state.usingAudio && Number.isFinite(audio.duration)) {
      audio.currentTime = state.time;
    }
    renderTime();
  };

  const loadTrack = (index, { autoplay = state.playing, startAt = 0 } = {}) => {
    const wasPlaying = state.playing;
    pause();

    state.index = (index + TRACKS.length) % TRACKS.length;
    const track = TRACKS[state.index];
    state.duration = track.duration;
    state.time = clamp(startAt, 0, state.duration);
    state.usingAudio = false;

    audio.removeAttribute("src");
    audio.load();

    if (track.src) {
      audio.src = track.src;
      audio.load();
    }

    renderTrack();

    if (autoplay || wasPlaying) play();
  };

  const onTrackEnded = () => {
    loadTrack(state.index + 1, { autoplay: true });
  };

  const previous = () => {
    // Standard behaviour: restart the current track if we're past a few seconds.
    if (state.time > 3) {
      seekTo(0);
      return;
    }
    loadTrack(state.index - 1);
  };

  const next = () => loadTrack(state.index + 1);

  /* ------------------------------------------------------------------------
     <audio> events (only meaningful when a track has a real src)
     ------------------------------------------------------------------------ */
  audio.addEventListener("loadedmetadata", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    state.usingAudio = true;
    state.duration = audio.duration;
    renderDuration();
    audio.currentTime = clamp(state.time, 0, state.duration);
    renderTime();
  });

  audio.addEventListener("ended", onTrackEnded);

  audio.addEventListener("error", () => {
    state.usingAudio = false;
  });

  /* ------------------------------------------------------------------------
     Media Session (lock-screen / hardware key integration)
     ------------------------------------------------------------------------ */
  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const track = TRACKS[state.index];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "Audio Player",
      });
      navigator.mediaSession.setActionHandler("play", play);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("previoustrack", previous);
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (typeof details.seekTime === "number") seekTo(details.seekTime);
      });
    } catch {
      /* Media Session unsupported in this context */
    }
  }

  /* ------------------------------------------------------------------------
     Controls wiring
     ------------------------------------------------------------------------ */
  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", previous);
  nextBtn.addEventListener("click", next);

  // Seek: `input` fires continuously while dragging, `change` when released.
  seekInput.addEventListener("pointerdown", () => {
    state.scrubbing = true;
    waveTrack.classList.add("is-scrubbing");
  });

  seekInput.addEventListener("input", () => {
    state.scrubbing = true;
    seekTo(Number(seekInput.value));
  });

  const endScrub = () => {
    if (!state.scrubbing) return;
    state.scrubbing = false;
    waveTrack.classList.remove("is-scrubbing");
    seekTo(Number(seekInput.value));
    lastTick = 0;
  };

  seekInput.addEventListener("change", endScrub);
  seekInput.addEventListener("pointerup", endScrub);
  seekInput.addEventListener("pointercancel", endScrub);
  seekInput.addEventListener("blur", endScrub);

  // Volume
  volumeInput.addEventListener("input", () => {
    const value = Number(volumeInput.value);
    state.volume = value;
    state.muted = false;
    if (value > 0) state.lastVolume = value;
    renderVolume();
  });

  muteBtn.addEventListener("click", () => {
    if (state.muted || state.volume === 0) {
      state.muted = false;
      state.volume = state.lastVolume > 0 ? state.lastVolume : 0.5;
    } else {
      state.lastVolume = state.volume;
      state.muted = true;
    }
    renderVolume();
  });

  // Keyboard shortcuts when focus isn't inside a form control.
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const inControl =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);
    if (inControl) return;

    switch (event.key) {
      case " ":
      case "k":
        if (target instanceof HTMLButtonElement && target !== playBtn) return;
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        event.preventDefault();
        seekTo(state.time + 5);
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekTo(state.time - 5);
        break;
      case "ArrowUp":
        event.preventDefault();
        state.volume = clamp(state.volume + 0.05, 0, 1);
        state.muted = false;
        state.lastVolume = state.volume;
        renderVolume();
        break;
      case "ArrowDown":
        event.preventDefault();
        state.volume = clamp(state.volume - 0.05, 0, 1);
        if (state.volume > 0) state.lastVolume = state.volume;
        renderVolume();
        break;
      case "m":
        muteBtn.click();
        break;
      case "n":
        next();
        break;
      case "p":
        previous();
        break;
      default:
        break;
    }
  });

  /* ------------------------------------------------------------------------
     Pointer tilt — subtle 3D response on fine-pointer devices
     ------------------------------------------------------------------------ */
  const MAX_TILT = 3.5;
  let tiltFrame = 0;
  const tiltTarget = { rx: 0, ry: 0 };
  const tiltCurrent = { rx: 0, ry: 0 };

  const tiltTick = () => {
    tiltCurrent.rx += (tiltTarget.rx - tiltCurrent.rx) * 0.12;
    tiltCurrent.ry += (tiltTarget.ry - tiltCurrent.ry) * 0.12;
    card.style.setProperty("--ap-rx", `${tiltCurrent.rx.toFixed(3)}deg`);
    card.style.setProperty("--ap-ry", `${tiltCurrent.ry.toFixed(3)}deg`);

    const settled =
      Math.abs(tiltTarget.rx - tiltCurrent.rx) < 0.005 &&
      Math.abs(tiltTarget.ry - tiltCurrent.ry) < 0.005;
    tiltFrame = settled ? 0 : requestAnimationFrame(tiltTick);
  };

  const onStageMove = (event) => {
    const rect = stage.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    tiltTarget.ry = clamp(nx * 2, -1, 1) * MAX_TILT;
    tiltTarget.rx = clamp(-ny * 2, -1, 1) * MAX_TILT;
    if (!tiltFrame) tiltFrame = requestAnimationFrame(tiltTick);
  };

  const onStageLeave = () => {
    tiltTarget.rx = 0;
    tiltTarget.ry = 0;
    if (!tiltFrame) tiltFrame = requestAnimationFrame(tiltTick);
  };

  const syncTilt = () => {
    stage.removeEventListener("pointermove", onStageMove);
    stage.removeEventListener("pointerleave", onStageLeave);
    if (finePointer.matches && !reduceMotion.matches) {
      stage.addEventListener("pointermove", onStageMove, { passive: true });
      stage.addEventListener("pointerleave", onStageLeave);
    } else {
      onStageLeave();
    }
  };

  syncTilt();
  finePointer.addEventListener?.("change", syncTilt);
  reduceMotion.addEventListener?.("change", syncTilt);

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  loadTrack(START_INDEX, { autoplay: false, startAt: START_TIME });
  renderPlaying();
  renderVolume();

  // Public hook so audio can be wired in later without touching the internals.
  window.audioPlayerPage = Object.freeze({
    play,
    pause,
    next,
    previous,
    seekTo,
    loadTrack: (index) => loadTrack(index, { autoplay: false }),
    tracks: TRACKS,
  });
})();
