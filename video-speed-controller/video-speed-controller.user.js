// ==UserScript==
// @name         Video Speed Controller (Control speed on videos in any website)
// @namespace    https://github.com/lcs-dev1/userscripts
// @version      1.2.0
// @description  Adds speed control to all videos on a website. Supports site-specific customization.
// @author       lcs-dev1
// @match        *://*/*
// @run-at       document-end
// @license      Apache License 2.0
// @grant        GM_log
// ==/UserScript==

/**
 * @typedef {Object} VideoControllerData
 * @property {HTMLElement} controller - The controller element
 * @property {number|null} hideTimer - Timer ID for hiding the controller
 * @property {boolean} isSticky - Whether the controller should stay visible
 * @property {HTMLSelectElement} speedSelector - Speed selector dropdown
 * @property {HTMLInputElement} customSpeedInput - Custom speed input field
 * @property {function(): void} positionController - Function to recalculate controller position
 */

/**
 * @typedef {Object} SiteRule
 * @property {function(HTMLVideoElement): boolean} shouldAddController - Function to determine if a controller should be added to a video
 */

/**
 * @typedef {Object.<string, SiteRule>} SiteRules
 */

(function () {
  "use strict";

  const uniquePrefix = "tm_vid_speed_ver__1-2-0";

  /**
   * Log debug messages
   * @param {any[]} messages - Message to log
   * @returns {void}
   */
  function debugLog(...messages) {
    GM_log("[Video Speed Controller]", ...messages);
  }

  // ====================================
  // SITE-SPECIFIC RULES CONFIGURATION
  // ====================================

  /**
   * Add new site rules here for easy configuration
   * @type {SiteRules}
   */
  const siteRules = {
    "primevideo.com": {
      /**
       * Only add controller to videos with blob: source
       * @param {HTMLVideoElement} video - The video element to check
       * @returns {boolean} - Whether a controller should be added
       */
      shouldAddController: function (video) {
        const src = video.src || "";
        return src.startsWith("blob:");
      },
    },
  };

  /**
   * Helper function to determine if we're on a specific site
   * @returns {string|null} - Site name if matched, null otherwise
   */
  function getCurrentSite() {
    const fullHostname = window.location.hostname;
    const domainMatch = fullHostname.match(/([^.]+\.[^.]+)$/);
    const baseDomain = domainMatch ? domainMatch[1] : fullHostname;
    return siteRules[baseDomain] ? baseDomain : null;
  }

  const currentSite = getCurrentSite();

  /**
   * Function to check if a video should have a controller
   * @param {HTMLVideoElement} video - The video element to check
   * @returns {boolean} - Whether a controller should be added
   */
  function shouldAddController(video) {
    if (currentSite && siteRules[currentSite].shouldAddController) {
      return siteRules[currentSite].shouldAddController(video);
    }
    return true;
  }
  // ====================================
  // END SITE-SPECIFIC RULES
  // ====================================

  /** Speed options available in the dropdown */
  const speeds = [0.1, 0.5, 1, 1.5, 2, 2.5, 3, 4];

  // 100% bulletproof CSS with fixed heights and margin resets
  const styles = `
         .${uniquePrefix}controller {
             position: absolute;
             top: 10px;
             left: 10px;
             background-color: rgba(0, 0, 0, 0.7) !important;
             color: white !important;
             padding: 5px !important;
             border-radius: 4px !important;
             z-index: 999999 !important;
             font-family: Arial, sans-serif !important;
             font-size: 14px !important;
             opacity: 0;
             pointer-events: none;
             transition: opacity 0.3s ease;
             display: flex !important;
             align-items: center !important;
             flex-wrap: wrap !important;
             box-sizing: border-box !important;
         }
         .${uniquePrefix}controller.${uniquePrefix}visible {
             opacity: 1 !important;
             pointer-events: auto !important;
         }
        .${uniquePrefix}controller label.${uniquePrefix}label {
            margin: 0 5px 0 0 !important; /* Resets leaked top/bottom margins from the site */
            padding: 0 !important;
            color: white !important;
            font-weight: normal !important;
            cursor: pointer !important;
            height: 26px !important; /* Fixed height */
            display: flex !important;
            align-items: center !important; /* Centers text vertically in the label */
            line-height: 1 !important;
         }
         .${uniquePrefix}controller select {
             background-color: rgba(0, 0, 0, 0.7) !important;
             appearance: auto !important;
             color: white !important;
             width: fit-content !important;
             border: 1px solid white !important;
             border-radius: 3px !important;
             padding: 0 4px !important;
             margin: 0 8px 0 0 !important; /* Resets top/bottom margins */
             font-size: 14px !important;
             font-weight: normal !important;
             height: 26px !important; /* Fixed height to match the label */
             box-sizing: border-box !important;
             outline: none !important;
         }
         .${uniquePrefix}controller input {
             background-color: rgba(0, 0, 0, 0.7) !important;
             color: white !important;
             border: 1px solid white !important;
             border-radius: 3px !important;
             padding: 0 4px !important;
             width: 50px !important;
             margin: 0 5px 0 0 !important; /* Resets top/bottom margins */
             font-size: 14px !important;
             font-weight: normal !important;
             height: 26px !important; /* Fixed height */
             box-sizing: border-box !important;
             outline: none !important;
         }
         .${uniquePrefix}controller button {
             background-color: rgba(0, 0, 0, 0.7) !important;
             color: white !important;
             border: 1px solid white !important;
             border-radius: 3px !important;
             padding: 0 8px !important;
             margin: 0 !important; /* Resets margins */
             font-size: 14px !important;
             font-weight: normal !important;
             cursor: pointer !important;
             height: 26px !important; /* Fixed height */
             box-sizing: border-box !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             line-height: 1 !important;
         }
         .${uniquePrefix}controller button:hover {
             background-color: rgba(255, 255, 255, 0.2) !important;
         }
         video.${uniquePrefix}enhanced {
             z-index: auto !important;
         }
     `;

  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  /**
   * Global tracking of active videos and controllers
   * @type {Map<HTMLVideoElement, VideoControllerData>}
   */
  const activeVideos = new Map();

  // Track mouse position globally
  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    updateControllerVisibility();
  });

  /**
   * Function to update controller visibility based on mouse position
   * @returns {void}
   */
  function updateControllerVisibility() {
    activeVideos.forEach((data, video) => {
      if (!video.isConnected) return;

      const rect = video.getBoundingClientRect();
      const isMouseOver =
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom;
      const isVisible = data.controller.classList.contains(
        uniquePrefix + "visible",
      );

      // Handle showing controller when mouse is over video
      if (isMouseOver) {
        if (!isVisible) {
          data.controller.classList.add(uniquePrefix + "visible");
        }

        // Reset hide timer
        clearTimeout(data.hideTimer);
        data.hideTimer = setTimeout(() => {
          if (!data.isSticky) {
            data.controller.classList.remove(uniquePrefix + "visible");
          }
        }, 2000);
        return;
      }

      // When mouse is not over video and controller isn't sticky, hide it
      if (isVisible && !data.isSticky) {
        data.controller.classList.remove(uniquePrefix + "visible");
      }
    });
  }

  /**
   * Function to apply playback rate to a video
   * @param {HTMLVideoElement} video - The video element to modify
   * @param {number} rate - The playback rate to apply
   * @returns {void}
   */
  function applyPlaybackRate(video, rate) {
    if (!video || isNaN(rate) || rate <= 0) return;

    video.playbackRate = rate;
    video.dataset.preferredRate = rate.toString();

    const data = activeVideos.get(video);
    if (!data) return;

    if (data.speedSelector) updateSpeedSelector(data.speedSelector, rate);
    if (data.customSpeedInput) data.customSpeedInput.value = rate.toString();
  }

  /**
   * Helper function to update speed selector dropdown
   * @param {HTMLSelectElement} selector - The speed selector element
   * @param {number} rate - The playback rate
   */
  function updateSpeedSelector(selector, rate) {
    const options = selector.options;
    for (let i = 0; i < options.length; i++) {
      if (parseFloat(options[i].value) === rate) {
        selector.selectedIndex = i;
        return;
      }
    }
    const customOption = selector.querySelector('option[value="custom"]');
    if (customOption) selector.value = "custom";
  }

  /**
   * Recursively searches for videos, traversing open Shadow DOMs
   * @param {Document|Element|ShadowRoot} root - The root element to start searching from
   * @returns {HTMLVideoElement[]} - Array of found video elements
   */
  function findVideosDeep(root) {
    let videos = Array.from(root.querySelectorAll("video"));

    const allElements = root.querySelectorAll("*");
    for (let el of allElements) {
      if (el.shadowRoot) {
        videos = videos.concat(findVideosDeep(el.shadowRoot));
      }
    }
    return videos;
  }

  /**
   * Check for videos and add speed controller
   * @returns {void}
   */
  function initVideoSpeedControl() {
    const videos = findVideosDeep(document);

    videos.forEach((video, index) => {
      // Skip videos that shouldn't have controllers
      if (!shouldAddController(video)) return;

      const isEnhanced = video.classList.contains(uniquePrefix + "enhanced");
      const data = activeVideos.get(video);

      if (isEnhanced) {
        if (data && !document.body.contains(data.controller)) {
          video.classList.remove(uniquePrefix + "enhanced");
          activeVideos.delete(video);
        } else {
          if (data && data.positionController) data.positionController();
          return;
        }
      }

      // Mark video as enhanced
      video.classList.add(uniquePrefix + "enhanced");

      const uniqueIdBase = uniquePrefix + "-vid-" + Date.now() + "-" + index;
      const selectId = uniqueIdBase + "-select";
      const inputId = uniqueIdBase + "-input";

      // Create controller element
      const controller = document.createElement("div");
      controller.className = uniquePrefix + "controller";
      controller.setAttribute(
        "id",
        uniquePrefix + "controller-" + Date.now() + "-" + index,
      );

      const presetLabel = document.createElement("label");
      presetLabel.className = uniquePrefix + "label";
      presetLabel.textContent = "Preset:";
      presetLabel.htmlFor = selectId;

      const speedSelector = document.createElement("select");
      speedSelector.id = selectId;
      speedSelector.name = selectId;

      speeds.forEach((speed) => {
        const option = document.createElement("option");
        option.value = speed.toString();
        option.textContent = speed + "x";
        if (speed === 1) option.selected = true;
        speedSelector.appendChild(option);
      });

      const customOption = document.createElement("option");
      customOption.value = "custom";
      customOption.textContent = "Custom";
      speedSelector.appendChild(customOption);

      const customLabel = document.createElement("label");
      customLabel.className = uniquePrefix + "label";
      customLabel.textContent = "Custom:";
      customLabel.htmlFor = inputId;

      const customSpeedInput = document.createElement("input");
      customSpeedInput.id = inputId;
      customSpeedInput.name = inputId;
      customSpeedInput.type = "number";
      customSpeedInput.min = "0.1";
      customSpeedInput.max = "16";
      customSpeedInput.step = "0.1";
      customSpeedInput.value = "1.0";
      customSpeedInput.placeholder = "Speed";

      const applyButton = document.createElement("button");
      applyButton.textContent = "Apply";
      applyButton.type = "button";

      // Listen for speed selector changes
      speedSelector.addEventListener("change", function () {
        if (this.value === "custom") return;
        applyPlaybackRate(video, parseFloat(this.value));
      });

      // Listen for custom speed input changes
      customSpeedInput.addEventListener("keyup", function (e) {
        if (e.key !== "Enter") return;
        const rate = parseFloat(this.value);
        if (rate > 0) applyPlaybackRate(video, rate);
      });

      // Listen for apply button click
      applyButton.addEventListener("click", function () {
        const rate = parseFloat(customSpeedInput.value);
        if (rate > 0) applyPlaybackRate(video, rate);
      });

      // Ensure playback rate is maintained when video plays
      video.addEventListener("play", function () {
        const savedRateStr = this.dataset.preferredRate;
        if (!savedRateStr) return;
        const savedRate = parseFloat(savedRateStr);
        if (this.playbackRate !== savedRate) this.playbackRate = savedRate;
      });

      // Also check playback rate periodically to ensure it sticks
      setInterval(() => {
        const savedRateStr = video.dataset.preferredRate;
        if (!savedRateStr || video.paused) return;
        const savedRate = parseFloat(savedRateStr);
        if (video.playbackRate !== savedRate) video.playbackRate = savedRate;
      }, 1000);

      // Prevent controller mouse events from bubbling
      controller.addEventListener("mouseenter", function (e) {
        e.stopPropagation();
        const vData = activeVideos.get(video);
        if (vData) vData.isSticky = true;
      });

      controller.addEventListener("keydown", function (e) {
        e.stopPropagation();
      });

      controller.addEventListener("mouseleave", function (e) {
        e.stopPropagation();
        const vData = activeVideos.get(video);
        if (vData) vData.isSticky = false;
        updateControllerVisibility();
      });

      // Add elements to controller
      controller.appendChild(presetLabel);
      controller.appendChild(speedSelector);
      controller.appendChild(customLabel);
      controller.appendChild(customSpeedInput);
      controller.appendChild(applyButton);

      // Add controller directly to document body
      document.body.appendChild(controller);

      /**
       * Position the controller based on video position
       * @returns {void}
       */
      function positionController() {
        if (!video.isConnected) return;
        const rect = video.getBoundingClientRect();
        controller.style.position = "fixed";
        controller.style.top = rect.top + 10 + "px";
        controller.style.left = rect.left + 10 + "px";
      }

      // Store data for this video
      activeVideos.set(video, {
        controller: controller,
        hideTimer: null,
        isSticky: false,
        speedSelector: speedSelector,
        customSpeedInput: customSpeedInput,
        positionController: positionController,
      });

      // Position controller initially
      positionController();
      // Update position on window resize and scroll
      window.addEventListener("resize", positionController);

      // Initialize playback rate from video if it already has one set
      if (video.playbackRate !== 1) {
        applyPlaybackRate(video, video.playbackRate);
      }

      // Flash controller briefly
      controller.classList.add(uniquePrefix + "visible");
      setTimeout(() => {
        const vData = activeVideos.get(video);
        if (vData && !vData.isSticky) {
          controller.classList.remove(uniquePrefix + "visible");
        }
      }, 1000);
    });
  }

  // 1. Run initialization immediately as soon as the script is injected, without waiting for images to load
  initVideoSpeedControl();

  // 2. Intercept native media events
  // Added 'canplay' to catch videos that buffer extremely fast
  const mediaEvents = [
    "loadeddata",
    "loadedmetadata",
    "play",
    "playing",
    "canplay",
  ];

  mediaEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      function (event) {
        const path = event.composedPath && event.composedPath();
        const realTarget = path ? path[0] : event.target;

        if (realTarget && realTarget.nodeName === "VIDEO") {
          initVideoSpeedControl();
        }
      },
      true,
    );
  });

  // 3. Scroll Fallback
  let scrollTimeout;
  window.addEventListener(
    "scroll",
    function () {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        initVideoSpeedControl();
      }, 300);
    },
    { passive: true },
  );
})();
