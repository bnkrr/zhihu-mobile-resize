// ==UserScript==
// @name         知乎夜间模式 (Zhihu Night Mode)
// @namespace    https://github.com/bnkrr/zhihu-mobile-resize/night-mode
// @version      1.0.0
// @description  在知乎网页中启用内置的深色主题，可与知乎手机屏幕适配脚本独立使用。
// @author       bnkrr
// @homepageURL  https://github.com/bnkrr/zhihu-mobile-resize
// @supportURL   https://github.com/bnkrr/zhihu-mobile-resize/issues
// @updateURL    https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-night-mode.meta.js
// @downloadURL  https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-night-mode.user.js
// @match        https://*.zhihu.com/*
// @grant        GM.addStyle
// @inject-into  content
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const DARK_THEME = 'dark';
    const STYLE_ID = 'zhihu-night-mode-fallbacks';
    const css = `
        :root[data-theme='dark'] {
            --zmr-surface: var(--MapUIFrame10A_dark, #212429);
            color-scheme: dark;
        }

        html[data-theme='dark'],
        html[data-theme='dark'] body,
        html[data-theme='dark'] #root,
        html[data-theme='dark'] .App,
        html[data-theme='dark'] .App-main {
            background-color: var(--MapUIFrame08A_dark, #282b30) !important;
        }

        html[data-theme='dark'] .Card,
        html[data-theme='dark'] .HotItem,
        html[data-theme='dark'] .Modal-content,
        html[data-theme='dark'] .Popover-content,
        html[data-theme='dark'] .Menu,
        html[data-theme='dark'] .QuestionHeader,
        html[data-theme='dark'] .ProfileHeader,
        html[data-theme='dark'] .Post-NormalMain {
            background-color: var(--zmr-surface) !important;
        }

        /* Zhihu's narrow hot-list DOM currently keeps white card backgrounds in dark mode. */
        html[data-theme='dark'] body.Body--Mobile .App-main > div,
        html[data-theme='dark'] body.Body--Mobile .App-main > div > a {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] body.Body--Mobile .App-main > div > a h1 {
            color: var(--MapText02A_dark, #fff) !important;
        }

        html[data-theme='dark'] body.Body--Mobile .App-main > div > a h1 + div {
            color: var(--MapText04A_dark, #c2c6cf) !important;
        }

        html[data-theme='dark'] body.Body--Mobile .Question-mainEntity > div > div:first-child {
            background-color: var(--zmr-surface) !important;
        }

        /* Narrow topic/question pages use an unthemed fixed "open app" header. */
        html[data-theme='dark'] body.Body--Mobile .App-main > div > div:first-child {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] .AnswerItem .ContentItem-meta,
        html[data-theme='dark'] .AnswerItem .ContentItem-meta * {
            color: var(--MapText02A_dark, #fff) !important;
        }
    `;

    function enableDarkTheme() {
        const root = document.documentElement;
        if (!root) return;

        if (root.dataset.theme !== DARK_THEME) {
            root.dataset.theme = DARK_THEME;
        }
        root.style.colorScheme = DARK_THEME;
    }

    function injectFallbackStyle() {
        if (document.getElementById(STYLE_ID)) return true;
        const parent = document.head || document.documentElement;
        if (!parent) return false;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        parent.appendChild(style);
        return true;
    }

    function injectFallbackStyleWhenReady() {
        if (injectFallbackStyle()) return;

        const styleObserver = new MutationObserver(() => {
            if (injectFallbackStyle()) styleObserver.disconnect();
        });
        styleObserver.observe(document, { childList: true, subtree: true });
    }

    enableDarkTheme();

    if (typeof GM !== 'undefined' && typeof GM.addStyle === 'function') {
        try {
            const result = GM.addStyle(css);
            if (result && typeof result.catch === 'function') {
                result.catch(injectFallbackStyleWhenReady);
            }
        } catch {
            injectFallbackStyleWhenReady();
        }
    } else {
        injectFallbackStyleWhenReady();
    }

    const themeObserver = new MutationObserver(enableDarkTheme);
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    document.addEventListener('DOMContentLoaded', enableDarkTheme, { once: true });
    window.addEventListener('pageshow', enableDarkTheme);
})();
