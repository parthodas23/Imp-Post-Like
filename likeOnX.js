// ==UserScript==
// @name         Twitter Auto Liker (Safe & Reliable - June 2025)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Safely likes up to 30 tweets with improved reliability, error handling, and anti-detection measures
// @author       Partho
// @match        https://twitter.com/*
// @match        https://x.com/*
// @match        https://mobile.twitter.com/*
// @match        https://mobile.x.com/*
// @icon         https://abs.twimg.com/favicons.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ======= CONFIGURATION =======
    const MAX_LIKES = 30;
    const MAX_FAILED_SCROLLS = 5;
    const MAX_ERROR_THRESHOLD = 3;
    // =============================

    let likedCount = 0;
    let errorCount = 0;
    let failedScrolls = 0;
    let isPaused = false;

    function getRandomDelay() {
        return Math.floor(Math.random() * 3000) + 4000; // 4-7s
    }

    function log(...args) {
        console.log('[SAFE-AutoLiker]', ...args);
    }

    function createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.style = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1da1f2;
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-family: system-ui;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        indicator.id = 'autoLiker-status';
        indicator.textContent = `❤️ ${likedCount}/${MAX_LIKES} - Running`;
        document.body.appendChild(indicator);
        return indicator;
    }

    function updateStatus() {
        const indicator = document.getElementById('autoLiker-status') || createStatusIndicator();
        indicator.textContent = `❤️ ${likedCount}/${MAX_LIKES} - ${isPaused ? 'PAUSED (Esc)' : 'Running'}`;
        indicator.style.background = isPaused ? '#657786' : '#1da1f2';
    }

    function findLikeButtons() {
        try {
            // Multi-source selector strategy
            const selectors = [
                'div[data-testid="like"]:not(.auto-liked)', // Desktop
                'article [role="button"][aria-label*="Like"]:not(.auto-liked)', // Mobile
                '[data-testid="like"] > div > div', // Nested element
                'div[aria-label*="Like" i][role="button"]:not(.auto-liked)' // Case-insensitive
            ];

            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                const visibleButtons = buttons.filter(btn => {
                    const rect = btn.getBoundingClientRect();
                    return (
                        rect.width > 0 &&
                        rect.height > 0 &&
                        getComputedStyle(btn).visibility !== 'hidden' &&
                        rect.top >= 0 &&
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
                    );
                });

                if (visibleButtons.length > 0) return visibleButtons;
            }
            return [];
        } catch (e) {
            log('Selector error:', e);
            return [];
        }
    }

    function safeClick(button) {
        try {
            // Create synthetic mouse events
            const mouseDown = new MouseEvent('mousedown', { bubbles: true });
            const mouseUp = new MouseEvent('mouseup', { bubbles: true });
            const clickEvent = new MouseEvent('click', { bubbles: true });

            button.dispatchEvent(mouseDown);
            button.dispatchEvent(mouseUp);
            button.dispatchEvent(clickEvent);

            button.classList.add('auto-liked');
            likedCount++;
            log(`Liked tweet #${likedCount}`);
            failedScrolls = 0; // Reset scroll fail counter
            return true;
        } catch (e) {
            log('Click error:', e);
            errorCount++;
            return false;
        }
    }

    function scrollAndRetry() {
        if (failedScrolls++ >= MAX_FAILED_SCROLLS) {
            log(`❌ Stopped: No content after ${MAX_FAILED_SCROLLS} scrolls`);
            return;
        }

        log(`Scrolling... (attempt ${failedScrolls})`);
        window.scrollBy({
            top: window.innerHeight * 0.7,
            behavior: 'smooth'
        });

        setTimeout(autoLike, getRandomDelay());
    }

    function autoLike() {
        if (isPaused || likedCount >= MAX_LIKES || errorCount >= MAX_ERROR_THRESHOLD) {
            if (errorCount >= MAX_ERROR_THRESHOLD) {
                log('❌ Stopped: Too many errors');
            }
            return;
        }

        const buttons = findLikeButtons();
        if (buttons.length === 0) return scrollAndRetry();

        const targetButton = buttons[0];
        targetButton.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });

        setTimeout(() => {
            if (!safeClick(targetButton)) {
                setTimeout(autoLike, getRandomDelay());
                return;
            }
            updateStatus();

            if (likedCount < MAX_LIKES) {
                setTimeout(autoLike, getRandomDelay());
            } else {
                log(`✅ Finished: ${likedCount} tweets liked`);
            }
        }, 2000);
    }

    function init() {
        if (document.getElementById('autoLiker-status')) return;

        log('Initializing...');
        createStatusIndicator();

        // Add keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                isPaused = !isPaused;
                updateStatus();
                log(isPaused ? '⏸ Paused' : '▶ Resumed');
                if (!isPaused) setTimeout(autoLike, 2000);
            }
        });

        // Start with content check
        if (document.querySelector('article')) {
            setTimeout(autoLike, 3000);
        } else {
            log('Waiting for content...');
            const observer = new MutationObserver(() => {
                if (document.querySelector('article')) {
                    observer.disconnect();
                    setTimeout(autoLike, 3000);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Start initialization
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();