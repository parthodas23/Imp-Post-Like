// ==UserScript==
// @name         Twitter Auto Liker (June 2025 – Enhanced UI + Feed Scroll)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Auto-likes up to 30 tweets safely. Includes floating feed-like UI, scrolls for more, pause/resume/stop controls (Esc, E), and avoids detection with safe clicks and error limits.
// @author       Partho
// @match        https://twitter.com/*
// @match        https://x.com/*
// @match        https://mobile.twitter.com/*
// @match        https://mobile.x.com/*
// @icon         https://abs.twimg.com/favicons.ico
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === Config ===
    const MAX_LIKES = 30;
    const MAX_FAILED_SCROLLS = 5;
    const MAX_ERROR_THRESHOLD = 3;

    let likedCount = 0;
    let errorCount = 0;
    let failedScrolls = 0;
    let isPaused = false;
    let isStopped = false;

    function getRandomDelay() {
        return Math.floor(Math.random() * 3000) + 4000;
    }

    function log(...args) {
        console.log('[🦾 X-AutoLiker]', ...args);
    }

    function createFeedCard() {
        const card = document.createElement('div');
        card.id = 'auto-like-x-card';
        card.innerHTML = `
            <h3 style="margin:0 0 8px;">🔁 Twitter Auto Liker</h3>
            <p><strong>❤️ Liked:</strong> <span id="like-count-x">0</span> / ${MAX_LIKES}</p>
            <p><strong>Status:</strong> <span id="like-status-x">Waiting...</span></p>
            <p><strong>Keys:</strong> Esc = Pause | E = Stop</p>
        `;
        Object.assign(card.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#1da1f2',
            color: 'white',
            padding: '14px',
            borderRadius: '12px',
            fontFamily: 'system-ui',
            fontSize: '14px',
            width: '240px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        });
        document.body.appendChild(card);
    }

    function updateFeedCard() {
        const countEl = document.getElementById('like-count-x');
        const statusEl = document.getElementById('like-status-x');
        if (countEl) countEl.textContent = likedCount;
        if (statusEl) {
            if (isStopped) statusEl.textContent = '🛑 Stopped';
            else if (isPaused) statusEl.textContent = '⏸️ Paused';
            else statusEl.textContent = '▶️ Running';
        }
    }

    function getTweetLikeCount(button) {
    try {
        const tweet = button.closest('article');
        if (!tweet) return 0;

        const likeSpans = Array.from(tweet.querySelectorAll('[data-testid="like"] span'));
        for (let span of likeSpans) {
            const text = span.innerText.replace(',', '').replace('K', '000').trim();
            const num = parseInt(text);
            if (!isNaN(num)) return num;
        }
    } catch (e) {
        log('⚠️ Like count parse error:', e);
    }
    return 0;
}

function findLikeButtons() {
    const MAX_ALLOWED_LIKES = 60;
    const keywords = [
        // DSA / Problem Solving
        "dsa", "leetcode", "codeforces", "coding challenge", "problem solving", "algorithm",
        "data structure", "competitive programming", "cp", "100DaysOfCode", "CodeNewbie",
        "coding interview", "system design",
        // Web Development
        "web development", "frontend", "backend", "full stack", "mern stack", "reactjs",
        "nodejs", "expressjs", "mongodb", "javascript", "html", "css", "tailwindcss",
        "vite", "typescript", "devtools",
        // React Ecosystem
        "react", "reactjs", "react hooks", "useEffect", "useState", "nextjs", "redux",
        "context api", "react router", "component-based", "virtual dom",
        // General Coding
        "programming", "developer", "dev", "coding", "software engineering", "open source",
        "github", "api", "project", "debugging", "tech twitter"
    ];

    const selectors = [
        'div[data-testid="like"]:not(.auto-liked)',
        'article [role="button"][aria-label*="Like"]:not(.auto-liked)',
        '[data-testid="like"] > div > div',
        'div[aria-label*="Like" i][role="button"]:not(.auto-liked)'
    ];

    for (const selector of selectors) {
        const buttons = Array.from(document.querySelectorAll(selector)).filter(btn => {
            const rect = btn.getBoundingClientRect();
            const likeCount = getTweetLikeCount(btn);
            const tweet = btn.closest('article');

            if (!tweet) return false;

            // ❌ Skip already liked
            const alreadyLiked = btn.getAttribute('aria-pressed') === 'true' ||
                btn.querySelector('svg path')?.getAttribute('fill') === 'rgb(249, 24, 128)';

            // ❌ Skip replies
            const isReply = tweet.innerText.includes("Replying to");

            // ❌ Skip promoted tweets (ads)
            const isPromoted = tweet.innerText.toLowerCase().includes("promoted");

            // ✅ Match keywords
            const tweetText = tweet.innerText.toLowerCase();
            const containsKeyword = keywords.some(word => tweetText.includes(word));

            return (
                rect.width > 0 &&
                rect.height > 0 &&
                getComputedStyle(btn).visibility !== 'hidden' &&
                !alreadyLiked &&
                !isReply &&
                !isPromoted &&
                likeCount <= MAX_ALLOWED_LIKES &&
                containsKeyword
            );
        });

        if (buttons.length > 0) return buttons;
    }

    return [];
}



    function safeClick(button) {
        try {
            button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            button.classList.add('auto-liked');
            likedCount++;
            log(`❤️ Liked tweet #${likedCount}`);
            failedScrolls = 0;
            return true;
        } catch (e) {
            log('❌ Click error:', e);
            errorCount++;
            return false;
        }
    }

    function scrollToNextFeed(callback) {
        if (failedScrolls++ >= MAX_FAILED_SCROLLS) {
            log('❌ No more tweets. Stopping.');
            isStopped = true;
            updateFeedCard();
            return;
        }

        log(`🔄 Scrolling to load more (attempt ${failedScrolls})`);
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });

        setTimeout(callback, 3000);
    }

    function autoLike() {
        updateFeedCard();

        if (isPaused || isStopped || likedCount >= MAX_LIKES || errorCount >= MAX_ERROR_THRESHOLD) {
            if (likedCount >= MAX_LIKES) log('✅ Max likes reached.');
            if (errorCount >= MAX_ERROR_THRESHOLD) log('❌ Too many errors.');
            return;
        }

        const buttons = findLikeButtons();

        if (buttons.length === 0) {
            return scrollToNextFeed(() => setTimeout(autoLike, 1500));
        }

        const btn = buttons[0];
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            if (!safeClick(btn)) {
                setTimeout(autoLike, getRandomDelay());
                return;
            }

            updateFeedCard();
            if (likedCount < MAX_LIKES) {
                setTimeout(autoLike, getRandomDelay());
            }
        }, 2000);
    }

    function init() {
        if (document.getElementById('auto-like-x-card')) return;

        log('🚀 Starting Twitter Auto Liker...');
        createFeedCard();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                isPaused = !isPaused;
                log(isPaused ? '⏸️ Paused' : '▶️ Resumed');
                updateFeedCard();
                if (!isPaused) setTimeout(autoLike, 1000);
            } else if (e.key.toLowerCase() === 'e') {
                isStopped = true;
                log('🛑 Manually stopped.');
                updateFeedCard();
            }
        });

        const checkContent = () => {
            if (document.querySelector('article')) {
                setTimeout(autoLike, 3000);
            } else {
                log('⏳ Waiting for tweets to load...');
                const observer = new MutationObserver(() => {
                    if (document.querySelector('article')) {
                        observer.disconnect();
                        setTimeout(autoLike, 3000);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        };

        if (document.readyState === 'complete') {
            checkContent();
        } else {
            window.addEventListener('load', checkContent);
        }
    }

    init();
})();
