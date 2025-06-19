// ==UserScript==
// @name         LinkedIn Auto Liker (June 2025 – Safe with Pause/Stop)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Auto-likes up to 30 LinkedIn feed posts with keyboard pause/resume (P) and stop (E). Avoids comment likes.
// @author       Partho
// @match        https://www.linkedin.com/feed/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let likedCount = 0;
    const maxLikes = 30;
    let paused = false;
    let stopped = false;

    function getRandomDelay() {
        return Math.floor(Math.random() * 3000) + 4000; // 4–7s
    }

    function isInCommentSection(btn) {
        return btn.closest('[data-testid="comment"]') || btn.closest('.comments-comments-list');
    }

    function isInMainFeed(btn) {
        // We assume main feed posts are inside `div.feed-shared-update` or similar high-level containers
        return btn.closest('div.feed-shared-update-v2') || btn.closest('.scaffold-finite-scroll');
    }

    function findLikeButtons() {
        return [...document.querySelectorAll('button')].filter(btn => {
            const label = btn.innerText.toLowerCase();
            const isLikeBtn = label.includes('like') || label.includes('react');

            return isLikeBtn &&
                !btn.classList.contains('react-button--active') &&
                btn.offsetParent !== null &&
                isInMainFeed(btn) &&
                !isInCommentSection(btn);
        });
    }

    function autoLike() {
        if (paused) {
            console.log("⏸️ Paused...");
            setTimeout(autoLike, 1000);
            return;
        }

        if (stopped || likedCount >= maxLikes) {
            console.log("🛑 Script stopped or max likes reached. Total liked:", likedCount);
            return;
        }

        const unlikedButtons = findLikeButtons();

        if (unlikedButtons.length === 0) {
            console.log("✅ No more unliked feed post buttons found.");
            return;
        }

        const btn = unlikedButtons[0];
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            if (!paused && !stopped) {
                btn.click();
                likedCount++;
                console.log(`👍 Liked post #${likedCount}`);
            }
            setTimeout(autoLike, getRandomDelay());
        }, 2000);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p') {
            paused = !paused;
            console.log(paused ? "⏸️ Paused by user (P)" : "▶️ Resumed by user (P)");
        }
        if (e.key.toLowerCase() === 'e') {
            stopped = true;
            console.log("🛑 Script manually stopped by user (E)");
        }
    });

    const waitForFeed = setInterval(() => {
        if (document.querySelector('main')) {
            clearInterval(waitForFeed);
            console.log("🚀 Feed detected. Starting auto-like in 3s...");
            setTimeout(autoLike, 3000);
        }
    }, 1000);
})();
