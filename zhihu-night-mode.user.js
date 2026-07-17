// ==UserScript==
// @name         知乎夜间模式 (Zhihu Night Mode)
// @namespace    https://github.com/bnkrr/zhihu-mobile-resize/night-mode
// @version      1.0.3
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
            --zmr-surface-raised: var(--MapUIFrame08A_dark, #282b30);
            --zmr-text: var(--MapText02A_dark, #fff);
            --zmr-text-secondary: var(--MapText03A_dark, #c2c6cf);
            --zmr-text-muted: var(--MapText05A_dark, #9196a1);
            --zmr-border: var(--MapUIFrame08B_dark, #535861);
            --zmr-accent: var(--MapInfo_dark, #558eff);
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
        html[data-theme='dark'] .AppHeader.AppHeader,
        html[data-theme='dark'] .HotItem,
        html[data-theme='dark'] .Modal-content,
        html[data-theme='dark'] .Popover-content,
        html[data-theme='dark'] .Menu,
        html[data-theme='dark'] .QuestionHeader,
        html[data-theme='dark'] .ProfileHeader,
        html[data-theme='dark'] .Post-NormalMain {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] .AppHeader.AppHeader {
            color: var(--zmr-text) !important;
            transition: none !important;
        }

        html[data-theme='dark'] .AppHeader a,
        html[data-theme='dark'] .AppHeader button {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] .AppHeader a[aria-label='知乎'] {
            color: var(--zmr-accent) !important;
        }

        html[data-theme='dark'] .AppHeader .SearchBar-input.SearchBar-input,
        html[data-theme='dark'] .AppHeader .Input-wrapper.Input-wrapper,
        html[data-theme='dark'] .Select-button.Select-button {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
            transition: none !important;
        }

        html[data-theme='dark'] .AppHeader input {
            color: var(--zmr-text) !important;
        }

        html[data-theme='dark'] .PlaceHolder-inner.PlaceHolder-inner {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] .ProfileMain-header button:has(.ZDI--Search24) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            transition: none !important;
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

        html[data-theme='dark'] .QuestionRichText,
        html[data-theme='dark'] .QuestionRichText * {
            color: var(--zmr-text) !important;
        }

        /* Narrow topic/question pages use an unthemed fixed "open app" header. */
        html[data-theme='dark'] body.Body--Mobile .App-main > div > div:first-child {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] .AnswerItem .ContentItem-meta,
        html[data-theme='dark'] .AnswerItem .ContentItem-meta * {
            color: var(--MapText02A_dark, #fff) !important;
        }

        /* The current comments UI keeps several light-theme literals after data-theme changes. */
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) *:has(> .CommentContent) {
            background-color: var(--zmr-surface) !important;
        }

        /* Expanded reply threads use a separate modal with extra wrappers around comments. */
        html[data-theme='dark'] .Modal-content:has(.CommentContent) *:has(.CommentContent) {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] .Modal-content:has(.CommentContent) > div > :first-child,
        html[data-theme='dark'] .Modal-content:has(.CommentContent) > div > :first-child * {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] .Modal-content:has(.CommentContent) > div > :nth-child(2) > :nth-child(2),
        html[data-theme='dark'] .Modal-content:has(.CommentContent) > div > :nth-child(2) > :nth-child(2) * {
            color: var(--zmr-text-secondary) !important;
        }

        /* Reply-thread loading cards have no semantic class; target their empty avatar + SVG skeleton. */
        html[data-theme='dark'] .Modal-content:has(.CommentContent) div:has(> div:empty + svg[viewBox]) {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .CommentContent,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .CommentContent p,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .CommentContent span {
            color: var(--zmr-text) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .CommentContent a {
            color: var(--zmr-accent) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) *:has(> .CommentContent) > :first-child,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) *:has(> .CommentContent) > :first-child * {
            color: var(--zmr-text-secondary) !important;
        }

        /* Comment count/sort header and the persistent/inline editors. */
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) > div > div:has(> div + div .CommentContent) > div:has(+ div .CommentContent),
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) > div > div:has(> div + div .CommentContent) > div:has(+ div .CommentContent) *,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) > div > div:has(.InputLike),
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) > div > div > div:has(.InputLike) {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) > div > div:has(> div + div .CommentContent),
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) *:has(> .InputLike) {
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .InputLike,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .Editable,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .DraftEditor-root,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .DraftEditor-editorContainer,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .public-DraftEditor-content {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .public-DraftEditorPlaceholder-root,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .public-DraftEditorPlaceholder-inner {
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .Button--plain,
        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .Button--grey {
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] :is(.Comments-container, .Modal-content:has(.CommentContent)) .Button--secondary {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
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
