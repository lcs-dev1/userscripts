// ==UserScript==
// @name         Video Speed Controller (Control speed on videos in any website)
// @namespace    lcs-dev-speed-controller
// @version      1.0
// @description  Adds speed control to all videos on a website
// @author       lcs-dev
// @match        *://*/*
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    const uniquePrefix = 'tm_vid_speed_ver__1';

    function debugLog(message) {
        GM_log(`[Video Speed Controller] ${message}`);
    }

    // Add speed options
    const speeds = [0.1, 0.5, 1, 1.5, 2, 2.5, 3, 4];

    // CSS styles with unique class names
    const styles = `
        .${uniquePrefix}controller {
            position: absolute;
            top: 10px;
            left: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px;
            border-radius: 4px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
        }
        .${uniquePrefix}controller.${uniquePrefix}visible {
            opacity: 1;
            pointer-events: auto;
        }
        .${uniquePrefix}controller .${uniquePrefix}label {
            margin-right: 5px;
        }
        .${uniquePrefix}controller select {
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            width: fit-content;
            border: 1px solid white;
            border-radius: 3px;
            padding: 2px;
            margin-right: 8px;
            font-size: 14px;
        }
        .${uniquePrefix}controller input {
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            border: 1px solid white;
            border-radius: 3px;
            padding: 2px;
            width: 50px;
            margin-right: 5px;
            font-size: 14px;
        }
        .${uniquePrefix}controller button {
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            border: 1px solid white;
            border-radius: 3px;
            padding: 2px 5px;
            margin-right: 5px;
            font-size: 14px;
            cursor: pointer;
        }
        .${uniquePrefix}controller button:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        video.${uniquePrefix}enhanced {
            z-index: auto !important;
        }
    `;

    // Add styles to document
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Global tracking of active videos and controllers
    const activeVideos = new Map();

    // Track mouse position globally
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        updateControllerVisibility();
    });

    // Function to update controller visibility based on mouse position
    function updateControllerVisibility() {
        activeVideos.forEach((data, video) => {
            const rect = video.getBoundingClientRect();
            const isMouseOver = (
                mouseX >= rect.left &&
                mouseX <= rect.right &&
                mouseY >= rect.top &&
                mouseY <= rect.bottom
            );

            if (isMouseOver) {
                if (!data.controller.classList.contains(uniquePrefix + 'visible')) {
                    data.controller.classList.add(uniquePrefix + 'visible');
                    debugLog(`Showing controller for video (mouse is over it)`);
                }
                clearTimeout(data.hideTimer);
                data.hideTimer = setTimeout(() => {
                    if (!data.isSticky) {
                        data.controller.classList.remove(uniquePrefix + 'visible');
                        debugLog(`Hiding controller after timeout`);
                    }
                }, 2000);
            } else {
                if (!data.isSticky && data.controller.classList.contains(uniquePrefix + 'visible')) {
                    data.controller.classList.remove(uniquePrefix + 'visible');
                    debugLog(`Hiding controller (mouse left video)`);
                }
            }
        });
    }

    // Function to apply playback rate to a video
    function applyPlaybackRate(video, rate) {
        if (video && !isNaN(rate) && rate > 0) {
            video.playbackRate = rate;
            // Store the rate in the video element's dataset for persistence
            video.dataset.preferredRate = rate;
            debugLog(`Applied playback rate ${rate}x to video`);

            // Update both select and custom input if they exist for this video
            const data = activeVideos.get(video);
            if (data) {
                // Update select if the rate matches a preset option
                if (data.speedSelector) {
                    const options = data.speedSelector.options;
                    let optionExists = false;

                    for (let i = 0; i < options.length; i++) {
                        if (parseFloat(options[i].value) === rate) {
                            data.speedSelector.selectedIndex = i;
                            optionExists = true;
                            break;
                        }
                    }

                    // If custom rate, show as "Custom" in dropdown
                    if (!optionExists && data.speedSelector.querySelector('option[value="custom"]')) {
                        data.speedSelector.value = "custom";
                    }
                }

                // Update custom input field
                if (data.customSpeedInput) {
                    data.customSpeedInput.value = rate;
                }
            }
        }
    }

    // Check for videos and add speed controller
    function initVideoSpeedControl() {
        const videos = document.querySelectorAll('video:not(.' + uniquePrefix + 'enhanced)');
        debugLog(`Found ${videos.length} videos to initialize`);

        videos.forEach((video, index) => {
            // Mark video as enhanced
            video.classList.add(uniquePrefix + 'enhanced');
            debugLog(`Initializing video #${index}`);

            // Create controller element
            const controller = document.createElement('div');
            controller.className = uniquePrefix + 'controller';
            controller.setAttribute('id', uniquePrefix + 'controller-' + index);

            // Create preset selector label
            const presetLabel = document.createElement('span');
            presetLabel.className = uniquePrefix + 'label';
            presetLabel.textContent = 'Preset:';

            // Create speed selector
            const speedSelector = document.createElement('select');

            speeds.forEach(speed => {
                const option = document.createElement('option');
                option.value = speed;
                option.textContent = speed + 'x';
                if (speed === 1) {
                    option.selected = true;
                }
                speedSelector.appendChild(option);
            });

            // Add custom option
            const customOption = document.createElement('option');
            customOption.value = "custom";
            customOption.textContent = "Custom";
            speedSelector.appendChild(customOption);

            // Create custom speed label
            const customLabel = document.createElement('span');
            customLabel.className = uniquePrefix + 'label';
            customLabel.textContent = 'Custom:';

            // Create custom speed input
            const customSpeedInput = document.createElement('input');
            customSpeedInput.type = "number";
            customSpeedInput.min = "0.1";
            customSpeedInput.max = "16";
            customSpeedInput.step = "0.1";
            customSpeedInput.value = "1.0";
            customSpeedInput.placeholder = "Speed";

            // Create apply button
            const applyButton = document.createElement('button');
            applyButton.textContent = "Apply";

            // Listen for speed selector changes
            speedSelector.addEventListener('change', function() {
                if (this.value !== "custom") {
                    const rate = parseFloat(this.value);
                    applyPlaybackRate(video, rate);
                }
            });

            // Listen for custom speed input changes
            customSpeedInput.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    const rate = parseFloat(this.value);
                    if (!isNaN(rate) && rate > 0) {
                        applyPlaybackRate(video, rate);
                    }
                }
            });

            // Listen for apply button click
            applyButton.addEventListener('click', function() {
                const rate = parseFloat(customSpeedInput.value);
                if (!isNaN(rate) && rate > 0) {
                    applyPlaybackRate(video, rate);
                }
            });

            // Ensure playback rate is maintained when video plays
            video.addEventListener('play', function() {
                if (this.dataset.preferredRate) {
                    const savedRate = parseFloat(this.dataset.preferredRate);
                    if (!isNaN(savedRate) && this.playbackRate !== savedRate) {
                        this.playbackRate = savedRate;
                        debugLog(`Restored playback rate ${savedRate}x on play`);
                    }
                }
            });

            // Also check playback rate periodically to ensure it sticks
            setInterval(() => {
                if (video.dataset.preferredRate) {
                    const savedRate = parseFloat(video.dataset.preferredRate);
                    if (!isNaN(savedRate) && video.playbackRate !== savedRate && !video.paused) {
                        video.playbackRate = savedRate;
                        debugLog(`Fixed playback rate back to ${savedRate}x`);
                    }
                }
            }, 1000);

            // Prevent controller mouse events from bubbling
            controller.addEventListener('mouseenter', function(e) {
                e.stopPropagation();
                activeVideos.get(video).isSticky = true;
                debugLog('Mouse entered controller, making it sticky');
            });

            controller.addEventListener('mouseleave', function(e) {
                e.stopPropagation();
                activeVideos.get(video).isSticky = false;
                debugLog('Mouse left controller, removing sticky');
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

            // Store data for this video
            activeVideos.set(video, {
                controller: controller,
                hideTimer: null,
                isSticky: false,
                speedSelector: speedSelector,
                customSpeedInput: customSpeedInput
            });

            // Position the controller initially and on video size/position changes
            function positionController() {
                const rect = video.getBoundingClientRect();
                controller.style.position = 'fixed';
                controller.style.top = (rect.top + 10) + 'px';
                controller.style.left = (rect.left + 10) + 'px';
            }

            // Position controller initially
            positionController();

            // Update position on window resize and scroll
            window.addEventListener('resize', positionController);
            window.addEventListener('scroll', positionController);

            // Initialize playback rate from video if it already has one set
            if (video.playbackRate !== 1) {
                applyPlaybackRate(video, video.playbackRate);
                debugLog(`Initialized with existing playback rate ${video.playbackRate}x`);
            }

            // Flash controller briefly
            controller.classList.add(uniquePrefix + 'visible');
            debugLog(`Showing controller initially to verify it works`);
            setTimeout(() => {
                if (!activeVideos.get(video).isSticky) {
                    controller.classList.remove(uniquePrefix + 'visible');
                    debugLog(`Hiding initial controller display`);
                }
            }, 1000);
        });
    }

    // Run after page and resources are loaded
    window.addEventListener('load', function() {
        debugLog('Page fully loaded, initializing controllers');
        initVideoSpeedControl();

        // Set up observer to detect new videos
        const observer = new MutationObserver(function(mutations) {
            let videoAdded = false;

            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];

                        if (node.nodeName === 'VIDEO') {
                            videoAdded = true;
                            break;
                        } else if (node.nodeType === 1) {
                            if (node.querySelector('video:not(.' + uniquePrefix + 'enhanced)')) {
                                videoAdded = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (videoAdded) {
                debugLog('New videos detected, initializing them');
                initVideoSpeedControl();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
})();