/* Build Logic Save Editor - Loading Screen Fix */
(function (global) {
  "use strict";

  const started = Date.now();
  const MAX_WAIT = 20000;
  let finished = false;
  let fallbackTimer = null;
  let observer = null;

  const SELECTORS = [
    "[data-loading-screen]",
    "#loading-screen",
    "#loader",
    "#global-loader",
    ".loading-screen",
    ".loader-screen",
    ".loading-overlay"
  ];

  function findScreens() {
    const result = [];
    for (const selector of SELECTORS) {
      document.querySelectorAll(selector).forEach(el => {
        if (!result.includes(el)) result.push(el);
      });
    }
    return result;
  }

  function hideElement(el) {
    el.classList.add("loaded", "hidden", "is-hidden");
    el.setAttribute("aria-hidden", "true");
    el.style.pointerEvents = "none";
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    el.style.display = "none";
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (observer) observer.disconnect();

    findScreens().forEach(hideElement);

    document.documentElement.classList.add("blse-loaded");
    document.body && document.body.classList.add("blse-loaded");

    global.__BLSE_LOADING_COMPLETE__ = true;

    global.dispatchEvent(new CustomEvent("blse:loading-complete", {
      detail: { reason, elapsed: Date.now() - started }
    }));
  }

  function appLooksReady() {
    const state = global.EditorState;
    if (state && state.ready === true) return true;
    if (global.BLSE && global.BLSE.ready === true) return true;
    return false;
  }

  function waitForApp() {
    if (appLooksReady()) {
      finish("application-ready");
      return;
    }

    /* main.js emits these when its startup lifecycle completes. */
    global.addEventListener("blse:main-ready", () => finish("main-ready"), { once: true });
    global.addEventListener("blse:items-ready", () => {
      if (appLooksReady()) finish("items-and-application-ready");
    });

    document.addEventListener("blse:main-ready", () => finish("main-ready"), { once: true });

    fallbackTimer = setTimeout(() => {
      /* Never leave the user trapped behind the loading screen. */
      finish(appLooksReady() ? "timeout-after-ready" : "timeout-fallback");
    }, MAX_WAIT);
  }

  function start() {
    if (global.__BLSE_LOADING_COMPLETE__) {
      finish("already-complete");
      return;
    }

    /* Catch loaders that are dynamically inserted/re-rendered. */
    observer = new MutationObserver(() => {
      if (finished) return;
      if (appLooksReady()) finish("application-ready-observer");
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    global.addEventListener("app:ready", () => finish("app-ready"), { once: true });
    global.addEventListener("main:ready", () => finish("main-ready-event"), { once: true });
    global.addEventListener("load", () => {
      if (appLooksReady()) finish("window-load-ready");
    }, { once: true });

    waitForApp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);
