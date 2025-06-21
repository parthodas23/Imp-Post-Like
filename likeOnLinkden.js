// ==UserScript==
// @name         LinkedIn Auto Liker (Silent with UI, Fixed Reaction Popup)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Auto-likes LinkedIn feed posts with simple UI, avoiding reaction popups.
// @author       Partho
// @match        https://www.linkedin.com/feed/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const MAX_LIKES = 30;
    const LIKE_THRESHOLD = 60;
    const keywords = [
        "dsa", "leetcode", "codeforces", "coding challenge", "problem solving",
        "algorithm", "data structure", "competitive programming", "cp", "100DaysOfCode",
        "CodeNewbie", "coding interview", "system design", "web development", "frontend",
        "backend", "full stack", "mern stack", "reactjs", "nodejs", "expressjs", "mongodb",
        "javascript", "html", "css", "tailwindcss", "vite", "typescript", "devtools",
        "react", "react hooks", "useEffect", "useState", "nextjs", "redux", "context api",
        "react router", "component-based", "virtual dom", "programming", "developer", "dev",
        "coding", "software engineering", "open source", "github", "api", "project", "debugging",
        "tech twitter"
    ];

    let likedCount = 0;
    let paused = false;
    let stopped = false;

    function getRandomDelay() {
        return Math.floor(Math.random() * 3000) + 4000;
    }

    function getLikeCountFromPost(btn) {
        try {
            const post = btn.closest('div.feed-shared-update-v2');
            if (!post) return 0;

            const spans = Array.from(post.querySelectorAll('span'));
            for (const span of spans) {
                const txt = span.innerText.toLowerCase();
                const match = txt.match(/^([\d.,kK]+)\s*(like|likes|reaction|reactions)?$/);
                if (match) {
                    let raw = match[1].replace(/,/g, '').toLowerCase();
                    if (raw.includes('k')) return parseFloat(raw.replace('k', '')) * 1000;
                    return parseInt(raw);
                }
            }
        } catch {
            // ignore silently
        }
        return 0;
    }

    function isPromoted(post) {
        const text = post.innerText.toLowerCase();
        return text.includes('promoted') || text.includes('sponsored');
    }

    function containsKeyword(post) {
        const text = post.innerText.toLowerCase();
        return keywords.some(word => text.includes(word));
    }

    function isInCommentSection(btn) {
        return btn.closest('[data-testid="comment"]') || btn.closest('.comments-comments-list');
    }

    function isInMainFeed(btn) {
        return btn.closest('div.feed-shared-update-v2') || btn.closest('.scaffold-finite-scroll');
    }

    function findLikeButtons() {
        return [...document.querySelectorAll('button')].filter(btn => {
            const post = btn.closest('div.feed-shared-update-v2');
            if (!post || post.classList.contains('auto-liked-post')) return false;

            const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
            const alreadyLiked = btn.getAttribute('aria-pressed') === 'true';
            const likeCount = getLikeCountFromPost(btn);
            const dataControlName = btn.getAttribute('data-control-name') || '';

            if (
                dataControlName === 'view_reactors' ||
                btn.classList.contains('reaction-toggle-button') ||
                label.includes('reactions') ||
                label.includes('show more reactions')
            ) return false;

            if (!label.includes('like')) return false;

            if (alreadyLiked) return false;
            if (btn.offsetParent === null) return false;
            if (!isInMainFeed(btn)) return false;
            if (isInCommentSection(btn)) return false;
            if (isPromoted(post)) return false;
            if (!containsKeyword(post)) return false;
            if (likeCount > LIKE_THRESHOLD) return false;

            return true;
        });
    }

    function createFeedCard() {
        const card = document.createElement('div');
        card.id = 'auto-like-card';
        card.innerHTML = `
            <h3 style="margin:0 0 8px;">🔄 LinkedIn Auto Liker</h3>
            <p style="margin:4px 0;"><strong>Liked:</strong> <span id="like-count">0</span> / ${MAX_LIKES}</p>
            <p style="margin:4px 0;"><strong>Status:</strong> <span id="like-status">Waiting...</span></p>
            <p style="margin:4px 0; font-size:12px; opacity:0.8;">Keys: P = Pause/Resume | E = End</p>
        `;
        Object.assign(card.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '220px',
            background: '#0073b1',
            color: '#fff',
            padding: '14px 16px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            userSelect: 'none',
        });
        document.body.appendChild(card);
    }

    function updateFeedCard() {
        const countEl = document.getElementById('like-count');
        const statusEl = document.getElementById('like-status');
        if (countEl) countEl.textContent = likedCount;
        if (statusEl) {
            if (stopped) statusEl.textContent = '🛑 Stopped';
            else if (paused) statusEl.textContent = '⏸️ Paused';
            else statusEl.textContent = '▶️ Running';
        }
    }

    function scrollToBottom(callback) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        setTimeout(callback, 3000);
    }

    function autoLike() {
        updateFeedCard();

        if (paused) return setTimeout(autoLike, 1000);
        if (stopped || likedCount >= MAX_LIKES) {
            updateFeedCard();
            return;
        }

        const unlikedButtons = findLikeButtons();
        if (unlikedButtons.length === 0) {
            scrollToBottom(() => setTimeout(autoLike, 2000));
            return;
        }

        const btn = unlikedButtons[0];
        const post = btn.closest('div.feed-shared-update-v2');
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            if (!paused && !stopped) {
                btn.click();
                likedCount++;
                if (post) post.classList.add('auto-liked-post');
                updateFeedCard();
            }
            setTimeout(autoLike, getRandomDelay());
        }, 2000);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p') {
            paused = !paused;
            updateFeedCard();
        }
        if (e.key.toLowerCase() === 'e') {
            stopped = true;
            updateFeedCard();
        }
    });

    const waitForFeed = setInterval(() => {
        if (document.querySelector('main')) {
            clearInterval(waitForFeed);
            createFeedCard();
            setTimeout(autoLike, 3000);
        }
    }, 1000);

})();
