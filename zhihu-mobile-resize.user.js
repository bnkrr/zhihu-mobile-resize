// ==UserScript==
// @name         知乎手机屏幕适配 (Zhihu Mobile Resize)
// @namespace    https://github.com/bnkrr/zhihu-mobile-resize
// @version      1.9.1
// @description  修复知乎网页在手机浏览器中的超宽、遮挡和操作不便问题，同时保留桌面版内容。
// @author       bnkrr
// @homepageURL  https://github.com/bnkrr/zhihu-mobile-resize
// @supportURL   https://github.com/bnkrr/zhihu-mobile-resize/issues
// @updateURL    https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-mobile-resize.meta.js
// @downloadURL  https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-mobile-resize.user.js
// @match        https://*.zhihu.com/*
// @grant        none
// @inject-into  content
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, viewport-fit=cover';
    let viewportObserver;

    function ensureViewport() {
        if (!document.head) return false;

        const viewports = [...document.querySelectorAll('meta[name="viewport"]')];
        if (!viewports.length) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
            viewports.push(viewport);
        }

        for (const viewport of viewports) {
            if (viewport.content !== VIEWPORT_CONTENT) {
                viewport.content = VIEWPORT_CONTENT;
            }
        }
        return true;
    }

    function startViewport() {
        if (!ensureViewport()) return false;
        if (document.readyState === 'loading') {
            // The parser may add Zhihu's own viewport after ours. Watch only
            // the head during parsing, not the whole page for its lifetime.
            viewportObserver = new MutationObserver((records) => {
                if (records.some((record) =>
                    record.target.matches?.('meta[name="viewport"]') ||
                    [...record.addedNodes].some((node) =>
                        node.matches?.('meta[name="viewport"]'))
                )) ensureViewport();
            });
            viewportObserver.observe(document.head, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ['content', 'name'],
            });
        }
        return true;
    }

    if (!startViewport()) {
        const headObserver = new MutationObserver(() => {
            if (startViewport()) headObserver.disconnect();
        });
        headObserver.observe(document, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        viewportObserver?.disconnect();
        ensureViewport();
    }, { once: true });
    window.addEventListener('load', ensureViewport, { once: true });

    const responsiveModules = [
        {
            name: 'foundation',
            rules: `
            :root {
                --zh-responsive-gutter: 10px;
                --app-width: 100%;
                --zhc-padding-horizontal: var(--zh-responsive-gutter);
                --zmr-surface: #fff;
            }

            html,
            body,
            #root,
            .App,
            .App-main {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
            }

            .App-main {
                padding-top: 34px !important;
                box-sizing: border-box !important;
            }

            html,
            body {
                overflow-x: clip !important;
            }
            `,
        },
        {
            name: 'shell',
            rules: `

            /* Desktop header: keep its identity, but allow the center section to shrink. */
            .AppHeader {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
            }

            .AppHeader > div,
            .AppHeader-inner {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                padding-right: var(--zh-responsive-gutter) !important;
                padding-left: var(--zh-responsive-gutter) !important;
                gap: 8px !important;
                box-sizing: border-box !important;
            }

            /* Current desktop header becomes a two-row responsive grid. */
            .AppHeader > div {
                display: grid !important;
                grid-template-columns: 64px minmax(0, 1fr) 42px 34px !important;
                grid-template-rows: 52px 44px !important;
                align-items: center !important;
                height: 96px !important;
                min-height: 96px !important;
                column-gap: 8px !important;
                row-gap: 0 !important;
            }

            .AppHeader > div > a:first-child {
                grid-column: 1 !important;
                grid-row: 1 !important;
            }

            .AppHeader > div > div:first-of-type,
            .AppHeader > div > div:first-of-type > div {
                display: contents !important;
            }

            .AppHeader > div > div:first-of-type > div > :not(nav):not(.SearchBar-input):not(.SearchBar-searchButton) {
                display: none !important;
            }

            .AppHeader > div > div:first-of-type :has(.SearchBar-input) {
                display: contents !important;
            }

            .AppHeader.AppHeader > div > div:first-of-type > div > div:has(.SearchBar-input) {
                display: contents !important;
            }

            .AppHeader nav,
            .AppHeader-nav {
                grid-column: 1 / -1 !important;
                grid-row: 2 !important;
                display: flex !important;
                width: 100% !important;
                height: 44px !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none;
            }

            .AppHeader nav > * {
                height: 44px !important;
                flex-shrink: 0 !important;
            }

            .AppHeader-nav::-webkit-scrollbar,
            .ContentItem-actions::-webkit-scrollbar {
                display: none;
            }

            .SearchBar,
            .SearchBar-toolWrapper,
            .SearchBar-input {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                flex: 1 1 auto !important;
            }

            .AppHeader .SearchBar-input {
                grid-column: 2 !important;
                grid-row: 1 !important;
                display: flex !important;
            }

            .AppHeader .SearchBar-input .Input {
                width: 100% !important;
                min-width: 0 !important;
            }

            .AppHeader .SearchBar-searchButton {
                grid-column: 3 !important;
                grid-row: 1 !important;
                display: block !important;
                position: static !important;
                width: 42px !important;
                min-width: 42px !important;
                margin: 0 !important;
            }

            .AppHeader > div > div:last-child {
                grid-column: 4 !important;
                grid-row: 1 !important;
                display: block !important;
                position: relative !important;
            }

            /* The 2026 shell uses a lean header with a fixed 1242px inner row. */
            .LeanAppHeaderBar,
            .LeanAppHeaderBar > div {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .LeanAppHeaderBar > div {
                padding-right: 52px !important;
                padding-left: 82px !important;
            }

            .LeanAppHeaderBar > div > a[aria-label='知乎'] {
                left: var(--zh-responsive-gutter) !important;
            }

            .LeanAppHeaderBar > div > div:has(.SearchBar),
            .LeanAppHeaderBar > div > div:has(.SearchBar) > div,
            .LeanAppHeaderBar div:has(> .SearchBar),
            .LeanAppHeaderBar .SearchBar {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .LeanAppHeaderBar > div > div:has(.SearchBar) {
                position: static !important;
                margin: 0 !important;
                overflow: visible !important;
            }

            /* Search injects a duplicate sticky SearchTabs row into the lean
               header and translates the real search/profile row out of view. */
            .LeanAppHeaderBar:has(.SearchTabs)
                > div > div:has(.SearchBar) > div {
                transform: none !important;
            }

            .LeanAppHeaderBar:has(.SearchTabs) .PageHeader:has(.SearchTabs) {
                display: none !important;
            }

            .LeanAppHeaderBar > div > div:has(.SearchBar) > div > :first-child {
                display: none !important;
            }

            .LeanAppHeaderBar > div > div:has(.SearchBar) > div > div:has(.SearchBar) {
                width: auto !important;
                min-width: 0 !important;
                flex: 1 1 auto !important;
            }

            .LeanAppHeaderBar > div > div:has(.SearchBar) > div > :last-child {
                width: 34px !important;
                min-width: 34px !important;
                flex: 0 0 34px !important;
            }

            .LeanAppHeaderBar > div > div:has(.SearchBar) > div > :last-child
                > :not(:has(.AppHeader-profileEntry)) {
                display: none !important;
            }

            .LeanAppHeaderBar > div > div:last-child:not(:has(.SearchBar)):not(:has(.AppHeader-profileEntry)) {
                display: none !important;
            }

            .LeanAppHeaderBar .AppHeader-profileMenu {
                position: absolute !important;
                top: 12px !important;
                right: var(--zh-responsive-gutter) !important;
            }

            .LeanAppHeaderBar div:has(> .AppHeader-profileMenu) {
                position: static !important;
                width: 34px !important;
                min-width: 34px !important;
            }

            .LeanAppHeaderBar .AppHeader-profileMenu,
            .LeanAppHeaderBar .AppHeader-profileEntry {
                width: 34px !important;
                min-width: 34px !important;
                height: 34px !important;
            }
            `,
        },
        {
            name: 'discovery-pages',
            rules: `

            /* Home/follow feed: remove the fixed 1032/694px desktop grid. */
            body *:has(> aside + div + div > div > .App-main) {
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            body *:has(> aside + div + div > div > .App-main)
                > :not(:has(> div > .App-main)):not(aside:has(nav a[href$='/hot'])) {
                display: none !important;
            }

            /* Keep the redesigned primary channels after collapsing its left rail. */
            #root aside:has(nav a[href$='/hot']) {
                display: block !important;
                position: sticky !important;
                z-index: 10 !important;
                top: 58px !important;
                right: 0 !important;
                left: 0 !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: none !important;
                height: 46px !important;
                background: var(--zmr-surface) !important;
                box-sizing: border-box !important;
            }

            #root aside:has(nav a[href$='/hot']) > div:has(> nav) {
                position: static !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: none !important;
                height: 46px !important;
            }

            #root aside:has(nav a[href$='/hot']) nav {
                display: flex !important;
                flex-flow: row nowrap !important;
                align-items: center !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: none !important;
                height: 46px !important;
                padding: 0 var(--zh-responsive-gutter) !important;
                gap: 4px !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none;
                box-sizing: border-box !important;
            }

            #root aside:has(nav a[href$='/hot']) nav::-webkit-scrollbar {
                display: none;
            }

            #root aside:has(nav a[href$='/hot']) nav > * {
                flex: 0 0 auto !important;
            }

            #root aside:has(nav a[href$='/hot']) nav > a,
            #root aside:has(nav a[href$='/hot']) nav > button,
            #root aside:has(nav a[href$='/hot']) nav > .Popover {
                width: auto !important;
                min-width: max-content !important;
                height: 42px !important;
            }

            #root aside:has(nav a[href$='/hot']) nav > a,
            #root aside:has(nav a[href$='/hot']) nav > button {
                display: flex !important;
                align-items: center !important;
                padding-right: 8px !important;
                padding-left: 8px !important;
            }

            #root aside:has(nav a[href$='/hot']) nav > a > span:last-child,
            #root aside:has(nav a[href$='/hot']) nav > button > span:last-child {
                display: block !important;
                width: auto !important;
                min-width: max-content !important;
                max-width: none !important;
                margin-left: 6px !important;
                overflow: visible !important;
                opacity: 1 !important;
            }

            #root aside:has(nav a[href$='/hot']) nav > div:empty {
                width: 1px !important;
                min-width: 1px !important;
                max-width: 1px !important;
                height: 20px !important;
                margin: 0 4px !important;
            }

            body *:has(> aside + div + div > div > .App-main) > div:has(> div > .App-main),
            body *:has(> aside + div + div > div > .App-main) > div:has(> div > .App-main) > div {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            body *:has(> aside + div + div > div > .App-main)
                > div:has(> div > .App-main) > :not(:has(> .App-main)) {
                display: none !important;
            }

            .Topstory-container {
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 8px var(--zh-responsive-gutter) !important;
                box-sizing: border-box !important;
            }

            .Topstory-mainColumn {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding-right: 0 !important;
                padding-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Topstory-container > :not(.Topstory-mainColumn) {
                display: none !important;
            }

            .Topstory-mainColumn > *,
            .Topstory-content,
            .Topstory-mainColumn .Card,
            .ListShortcut {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            /* Hot list: prioritize text instead of a fixed 190px thumbnail. */
            .HotList,
            .HotList-list {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .HotItem {
                display: flex !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                align-items: flex-start !important;
                padding: 14px 8px !important;
                gap: 12px !important;
                box-sizing: border-box !important;
            }

            .HotItem-index {
                width: 24px !important;
                min-width: 24px !important;
                height: auto !important;
                flex: 0 0 24px !important;
                margin: 0 !important;
            }

            .HotItem-content {
                width: auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                flex: 1 1 auto !important;
                margin: 0 !important;
            }

            .HotItem-title,
            .HotItem-excerpt,
            .HotItem-metrics {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                position: static !important;
                inset: auto !important;
                box-sizing: border-box !important;
            }

            .HotItem-title {
                display: block !important;
                max-height: none !important;
                margin: 0 0 6px !important;
                overflow: visible !important;
                -webkit-line-clamp: unset !important;
            }

            .HotItem-excerpt {
                display: -webkit-box !important;
                overflow: hidden !important;
                margin: 0 0 8px !important;
                -webkit-box-orient: vertical !important;
                -webkit-line-clamp: 3 !important;
            }

            .HotItem-metrics {
                display: flex !important;
                width: auto !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                margin: 0 !important;
            }

            .HotItem-img {
                display: none !important;
            }

            /* Search: collapse the 1032/1000/980px desktop result chain. */
            .Search-container,
            .Search-container > :has(.SearchMain),
            .SearchMain,
            .SearchMain .ListShortcut,
            .SearchMain .List,
            .SearchMain .List-item,
            .SearchResult-Card,
            .SearchMain .HotLanding,
            .SearchMain .HotLanding-content,
            .SearchMain .HotLanding-contentItem {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Search-container {
                display: block !important;
                padding: 10px !important;
            }

            .Search-container > :not(:has(.SearchMain)) {
                display: none !important;
            }

            .Search-container > :has(.SearchMain) {
                display: block !important;
            }

            .SearchMain {
                padding: 0 !important;
            }

            .SearchTabs,
            .SearchTabs-inner {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .SearchTabs-inner {
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none;
            }

            .SearchTabs-inner::-webkit-scrollbar {
                display: none;
            }

            .SearchTabs-actions,
            .SearchTabs .Tabs {
                width: max-content !important;
                min-width: 100% !important;
                max-width: none !important;
                white-space: nowrap !important;
            }

            .SearchTabs .Tabs {
                display: flex !important;
            }

            /* Collections: collapse the 100vw main/sidebar layout to the content viewport. */
            .CollectionsDetailPage {
                display: block !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 10px var(--zh-responsive-gutter) !important;
                box-sizing: border-box !important;
            }

            .CollectionsDetailPage-mainColumn,
            .CollectionDetailPageHeader,
            .CollectionsDetailPage-list,
            .CollectionsDetailPage-list .List,
            .CollectionsDetailPage-list .List-item,
            .CollectionDetailPageItem,
            .CollectionDetailPageItem-innerContainer,
            .CollectionDetailPageItem .ContentItem {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .CollectionsDetailPage > :not(.CollectionsDetailPage-mainColumn) {
                display: none !important;
            }

            .CollectionsDetailPage .Pagination {
                display: flex !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none;
            }

            .CollectionsDetailPage .Pagination::-webkit-scrollbar {
                display: none;
            }

            .CollectionsDetailPage .Pagination > * {
                flex: 0 0 auto !important;
            }

            /* Topic: the desktop topic feed is a fixed 600px column. */
            .App-main > div:has(> div > .Card > div > .TopicMetaCard),
            .App-main > div:has(> div > .Card > div > .TopicMetaCard)
                > div:has(> .Card > div > .TopicMetaCard),
            .App-main > div:has(> div > .Card > div > .TopicMetaCard)
                > div:has(> .Card > div > .TopicMetaCard) > .Card,
            .App-main > div:has(> div > .Card > div > .TopicMetaCard)
                > div:has(> .Card > div > .TopicMetaCard) > .Card > div,
            .App-main > div:has(> .Card > div > .TopicMetaCard),
            .App-main > div:has(> .Card > div > .TopicMetaCard) > *,
            .App-main > div:has(> .Card > div > .TopicMetaCard)
                > .Card > div:has(> .TopicMetaCard) {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .App-main > div:has(> div > .Card > div > .TopicMetaCard),
            .App-main > div:has(> .Card > div > .TopicMetaCard) {
                padding-right: var(--zh-responsive-gutter) !important;
                padding-left: var(--zh-responsive-gutter) !important;
            }

            .App-main > div:has(> div > .Card > div > .TopicMetaCard)
                > :not(:has(> .Card > div > .TopicMetaCard)) {
                display: none !important;
            }

            .TopicMetaCard,
            .Topic-bar,
            .TopicFeedList,
            .TopicFeedList .List,
            .TopicFeedItem,
            .TopicHotIntroItem-item,
            .TopicHot-introItem {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .TopicMetaCard,
            .TopicMetaCard > *,
            .TopicFeedItem {
                height: auto !important;
            }

            .TopicMetaCard * {
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .Topic-bar {
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none;
            }

            .Topic-bar .Topic-tabs {
                display: flex !important;
                width: max-content !important;
                min-width: 320px !important;
                max-width: none !important;
                flex: 0 0 auto !important;
                white-space: nowrap !important;
            }

            .Topic-bar .Topic-tabs .Tabs-item {
                flex-shrink: 0 !important;
            }

            .Topic-bar > :not(.Topic-tabs) {
                width: auto !important;
                min-width: max-content !important;
                flex: 0 0 auto !important;
                white-space: nowrap !important;
            }

            .TopicHotIntroItem-item,
            .TopicHot-introItem {
                width: 100% !important;
                max-width: 100% !important;
            }

            .Topic-bar::-webkit-scrollbar {
                display: none;
            }
            `,
        },
        {
            name: 'question-and-profile',
            rules: `

            /* Question, search, profile and article pages use a single readable column. */
            .QuestionHeader,
            .QuestionHeader-content,
            .QuestionHeader-footer,
            .QuestionHeader-footer-inner,
            .Question-main,
            .SearchMain,
            .Profile-main,
            .Post-NormalMain {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                padding-right: var(--zh-responsive-gutter) !important;
                padding-left: var(--zh-responsive-gutter) !important;
                box-sizing: border-box !important;
            }

            .Question-main,
            .SearchMain,
            .Profile-main,
            .Post-NormalMain {
                display: block !important;
            }

            /* Profile header: cover, avatar and user details form a compact card. */
            .ProfileHeader,
            .ProfileHeader > .Card,
            .ProfileHeader-userCover,
            .ProfileHeader .UserCover,
            .ProfileHeader-wrapper,
            .ProfileHeader-main,
            .ProfileHeader-content {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            /* The redesigned profile removed the outer ProfileHeader/Profile-main classes. */
            .App-main *:has(> .ProfileHeader-userCover),
            .App-main *:has(> * > .ProfileHeader-userCover),
            .App-main *:has(> .ProfileMain),
            .App-main *:has(> * > .ProfileMain),
            .ProfileMain,
            .ProfileMain-header,
            .ProfileMain .ListShortcut,
            .ProfileMain .List,
            .ProfileMain .List-item {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .App-main *:has(> .ProfileMain) {
                padding-right: var(--zh-responsive-gutter) !important;
                padding-left: var(--zh-responsive-gutter) !important;
            }

            .ProfileMain-tabs {
                display: flex !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                flex-wrap: nowrap !important;
                scrollbar-width: none;
            }

            .ProfileMain-tabs > * {
                flex-shrink: 0 !important;
            }

            .ProfileHeader {
                height: auto !important;
                padding: 0 var(--zh-responsive-gutter) !important;
            }

            .ProfileHeader > .Card {
                margin: 0 !important;
                height: auto !important;
            }

            .ProfileHeader-userCover,
            .ProfileHeader .UserCover {
                height: 140px !important;
                min-height: 140px !important;
                max-height: 140px !important;
                overflow: hidden !important;
            }

            .ProfileHeader .UserCover-image {
                width: 100% !important;
                height: 140px !important;
                object-fit: cover !important;
            }

            .ProfileHeader-wrapper {
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .ProfileHeader-main {
                display: block !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 12px 16px !important;
            }

            .ProfileHeader-avatar {
                position: relative !important;
                top: auto !important;
                left: auto !important;
                width: 80px !important;
                height: 80px !important;
                margin-top: -40px !important;
                margin-right: 0 !important;
                margin-bottom: 0 !important;
                margin-left: 0 !important;
            }

            .ProfileHeader-avatar .Avatar,
            .ProfileHeader-avatar .UserAvatar-inner {
                width: 72px !important;
                height: 72px !important;
            }

            .ProfileHeader-content {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                flex: none !important;
                margin: 0 !important;
                padding: 12px 0 0 !important;
            }

            .ProfileHeader .ProfileHeader-content > * {
                position: static !important;
                inset: auto !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding-right: 0 !important;
                padding-left: 0 !important;
                box-sizing: border-box !important;
            }

            #root .ProfileHeader .ProfileHeader-content > .ProfileHeader-contentHead,
            #root .ProfileHeader .ProfileHeader-content > .ProfileHeader-contentBody,
            #root .ProfileHeader .ProfileHeader-content > .ProfileHeader-contentFooter {
                position: static !important;
                width: calc(100vw - 44px) !important;
                min-width: calc(100vw - 44px) !important;
                max-width: calc(100vw - 44px) !important;
                margin-inline: 0 !important;
                inset-inline: auto !important;
                transform: translateX(-164px) !important;
            }

            .ProfileHeader-contentHead,
            .ProfileHeader-contentBody,
            .ProfileHeader-contentFooter {
                width: calc(100vw - 44px) !important;
                min-width: calc(100vw - 44px) !important;
                max-width: calc(100vw - 44px) !important;
                transform: translateX(-164px) !important;
            }

            .ProfileHeader-title,
            .ProfileHeader-info {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                padding-right: 0 !important;
                padding-left: 0 !important;
                box-sizing: border-box !important;
            }

            .ProfileHeader-contentHead,
            .ProfileHeader-title {
                display: block !important;
            }

            .ProfileHeader-name,
            .ProfileHeader-headline {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                overflow-wrap: anywhere !important;
            }

            .ProfileHeader-name {
                font-size: 22px !important;
                line-height: 1.35 !important;
            }

            .ProfileHeader-contentBody,
            .ProfileHeader-info,
            .ProfileHeader-infoItem {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
            }

            .ProfileHeader-contentFooter {
                position: static !important;
                display: flex !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 8px !important;
                margin-top: 10px !important;
            }

            .ProfileHeader-buttons {
                position: static !important;
                display: flex !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
            }

            .QuestionHeader-main,
            .QuestionHeader-mainColumn,
            .Question-mainColumn,
            .SearchMain-main,
            .Profile-mainColumn,
            .Post-Main {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            /* The current question header already has outer gutter padding.
               Reset its inherited desktop inner offsets instead of stacking them. */
            .QuestionHeader-content,
            .QuestionHeader-main {
                padding-right: 0 !important;
                padding-left: 0 !important;
            }

            .QuestionHeader-side,
            .QuestionHeader-sideColumn,
            .Question-sideColumn,
            .GlobalSideBar,
            .SearchSideBar,
            .Profile-sideColumn,
            .Post-SideBar {
                display: none !important;
            }

            /* Cards and rich content may shrink; only inherently wide content scrolls. */
            .Card,
            .ContentItem,
            .AuthorInfo,
            .AuthorInfo-content,
            .RichContent,
            .RichContent-inner,
            .RichText {
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .RichText,
            .QuestionHeader-title,
            .ContentItem-title {
                overflow-wrap: anywhere !important;
            }

            .QuestionHeader-title {
                font-size: 21px !important;
                line-height: 1.45 !important;
            }

            .QuestionHeader-footer-inner,
            .QuestionHeader-footer-main,
            .QuestionHeaderActions {
                height: auto !important;
                min-height: 0 !important;
            }

            .QuestionHeader-footer-inner {
                display: block !important;
                padding-top: 10px !important;
                padding-bottom: 10px !important;
            }

            .QuestionHeader-footer-main,
            .QuestionHeaderActions {
                display: flex !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .QuestionHeaderActions > *,
            .QuestionHeaderActions .Button {
                width: auto !important;
                min-width: 0 !important;
                height: 36px !important;
                flex: 0 0 auto !important;
                white-space: nowrap !important;
            }

            /* Question layouts must size against their padded parent, not the viewport. */
            .Question-mainColumn {
                width: 100% !important;
                max-width: 100% !important;
            }

            .QuestionPage > :has(.Question-mainColumn),
            .QuestionPage > :has(.Question-mainColumn) > *,
            .QuestionPage .ListShortcut:has(> .Question-mainColumn),
            .QuestionPage .Question-mainColumn {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .QuestionPage > :has(.Question-mainColumn),
            .QuestionPage > div:has(> .QuestionAuthor) {
                padding-right: var(--zh-responsive-gutter) !important;
                padding-left: var(--zh-responsive-gutter) !important;
            }

            .QuestionPage > :has(.Question-mainColumn) > *,
            .QuestionPage .ListShortcut:has(> .Question-mainColumn) {
                padding-right: 0 !important;
                padding-left: 0 !important;
            }

            .QuestionPage > div:has(> .QuestionAuthor)
                > div:has(> .QuestionButtonGroup) {
                display: flex !important;
                width: 100% !important;
                height: auto !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 10px !important;
            }

            .QuestionButtonGroup {
                display: flex !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .QuestionButtonGroup .Button,
            .QuestionButtonGroup + * > * {
                width: auto !important;
                height: auto !important;
                min-height: 34px !important;
                white-space: nowrap !important;
            }

            .QuestionButtonGroup + * {
                display: flex !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 8px 14px !important;
            }
            `,
        },
        {
            name: 'creator-center',
            rules: `

            /* Creator center is a fixed 1000px sidebar/main dashboard on desktop. */
            .Creator,
            .Creator > :first-child,
            .Creator-mainColumn,
            .CreatorHome,
            .CreatorHome > div,
            .CreatorHome > div > div {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Creator {
                display: block !important;
                padding: 10px !important;
            }

            /* Keep creator navigation reachable in a compact local scroller. */
            .Creator > :first-child {
                height: 180px !important;
                margin-bottom: 10px !important;
                overflow: hidden !important;
            }

            .Creator > :first-child .Sticky,
            .Creator > :first-child .Sticky > div,
            .Creator > :first-child .Sticky > div > div,
            .Creator > :first-child .Sticky > div > div > div {
                position: static !important;
                top: auto !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: 180px !important;
                max-height: 180px !important;
                box-sizing: border-box !important;
            }

            .Creator > :first-child .Sticky > div > div {
                overflow-x: hidden !important;
                overflow-y: auto !important;
            }

            .Creator-mainColumn {
                padding: 0 !important;
                overflow: visible !important;
            }

            .CreatorHome > div {
                display: block !important;
            }

            .CreatorHome > div > div,
            .CreatorHome > div > div:first-child > div,
            .CreatorHome > div > div:first-child > div > div,
            .CreatorHome > div > div:first-child > div > div > div,
            .CreatorHome > div > div:last-child > div,
            .WriteArea {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .CreatorHome > div > div:first-child > div:not(.WriteArea) {
                display: block !important;
            }

            .CreatorHome > div > div:first-child > div:not(.WriteArea) > div,
            .CreatorHome > div > div:last-child > div {
                margin-bottom: 10px !important;
            }

            .CreatorHome > div > div:last-child {
                margin-top: 10px !important;
            }

            .Creator .Banner-swiper-wrapper {
                max-width: 100% !important;
                overflow: hidden !important;
            }

            .Creator :is(img, video, canvas, svg) {
                max-width: 100% !important;
            }

            .CreatorIndex-BottomBox {
                display: none !important;
            }
            `,
        },
        {
            name: 'column-article',
            rules: `

            /* Column articles also sit inside fixed-width desktop ancestors. */
            body *:has(> .Post-NormalMain),
            body *:has(> * > .Post-NormalMain) {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Post-content,
            .Post-content :has(.Post-NormalMain) {
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                padding-right: 0 !important;
                padding-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Post-content {
                padding-right: var(--zh-responsive-gutter) !important;
                padding-left: var(--zh-responsive-gutter) !important;
            }

            .Post-content > * > :not(:has(.Post-NormalMain)) {
                display: none !important;
            }

            .Post-NormalMain {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 20px 16px !important;
                box-sizing: border-box !important;
            }

            .Post-Header,
            .Post-Title,
            .Post-Author,
            .Post-RichTextContainer,
            .Post-NormalMain .RichText,
            .Post-NormalMain .ContentItem-actions {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Post-Title {
                font-size: 26px !important;
                line-height: 1.35 !important;
                overflow-wrap: anywhere !important;
            }

            .Post-NormalMain img,
            .Post-NormalMain video,
            .Post-NormalMain iframe,
            .Post-NormalMain figure {
                max-width: 100% !important;
                height: auto !important;
            }
            `,
        },
        {
            name: 'shared-content',
            rules: `

            /* The home and creator publishers need two rows at narrow widths. */
            .WriteArea > div > section > div > div:last-child {
                height: auto !important;
                flex-wrap: wrap !important;
                row-gap: 10px !important;
            }

            .WriteArea > div > section > div > div:last-child > div:last-child {
                width: 100% !important;
                min-width: 0 !important;
                flex: 1 0 100% !important;
                justify-content: flex-end !important;
            }

            .Question-mainColumn > *,
            .QuestionAnswers-answers,
            .AnswersNavWrapper,
            .AnswerFormPortalContainer,
            .Question-mainColumn .List,
            .Question-mainColumn .List-item {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .RichText img,
            .RichText video,
            .RichText iframe,
            .RichText figure,
            .ContentItem img,
            .ContentItem video {
                max-width: 100% !important;
                height: auto !important;
            }

            .RichText pre,
            .RichText table {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: auto !important;
            }

            .ContentItem-actions {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                flex-wrap: wrap !important;
                gap: 8px 10px !important;
                box-sizing: border-box !important;
                scrollbar-width: none;
            }

            .Sticky--holder {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
            }

            .ContentItem-actions > * {
                flex: 0 1 auto !important;
            }

            .ContentItem-actions.is-fixed {
                position: static !important;
                right: 0 !important;
                left: 0 !important;
                transform: none !important;
            }

            .RichContent-actions.is-fixed {
                position: static !important;
                inset: auto !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                transform: none !important;
            }
            `,
        },
        {
            name: 'overlays-and-editors',
            rules: `

            /* Comments modal and inline reply editor. */
            .Modal-wrapper,
            .Modal,
            .Modal-inner,
            .Modal-content {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .Modal-wrapper,
            .Modal,
            .Modal-inner {
                overflow-x: hidden !important;
            }

            .Modal-content {
                height: auto !important;
                max-height: calc(100dvh - 24px) !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                background: var(--zmr-surface) !important;
            }

            .Modal-content:has(.CommentContent) {
                height: calc(100dvh - 44px) !important;
                max-height: calc(100dvh - 44px) !important;
                overflow: hidden !important;
            }

            .Modal-closeButton {
                top: 8px !important;
                right: 8px !important;
                left: auto !important;
                z-index: 3 !important;
                border-radius: 50% !important;
                background: rgb(0 0 0 / 55%) !important;
            }

            .Modal-content *:has(.CommentContent),
            .Modal-content *:has(.InputLike) {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .Modal-content .CommentContent {
                width: auto !important;
                min-width: 0 !important;
                max-width: calc(100% - 74px) !important;
                overflow-wrap: anywhere !important;
            }

            .Modal-content .InputLike,
            .Modal-content .Editable {
                width: auto !important;
                min-width: 0 !important;
                max-width: calc(100% - 100px) !important;
                box-sizing: border-box !important;
                overflow-wrap: anywhere !important;
            }

            /* The reply editor toolbar needs two rows once avatar indentation is applied. */
            .Modal-content *:has(> * > .InputLike) + * {
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 8px !important;
                height: auto !important;
            }

            .Modal-content *:has(> * > .InputLike) + * > :last-child {
                flex: 1 0 100% !important;
                width: 100% !important;
                min-width: 0 !important;
                height: auto !important;
                justify-content: flex-end !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .Modal-content *:has(> * > .InputLike) + * > :last-child > * {
                width: auto !important;
                height: auto !important;
                white-space: nowrap !important;
            }

            /* The answer composer is mounted only after interaction and retains 784px. */
            .AnswerForm,
            .AnswerForm > *,
            .AnswerFormEditorContainer,
            .AnswerFormEditorContainer > *,
            .AnswerFormEditorContainer > * > *,
            .AnswerForm .AnswerForm-editor,
            .AnswerForm .AnswerForm-container,
            .AnswerForm .RichText--editable,
            .AnswerForm .Editable,
            .AnswerForm .DraftEditor-root,
            .AnswerForm .DraftEditor-editorContainer,
            .AnswerForm .public-DraftEditor-content {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            .AnswerFormEditorContainer {
                padding-right: 0 !important;
                padding-left: 0 !important;
            }

            .AnswerForm :is(.Toolbar, .RichText-toolbar) {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none;
            }

            .AnswerForm :is(.Toolbar, .RichText-toolbar)::-webkit-scrollbar {
                display: none;
            }

            .AnswerForm .AIAssistantPanelV2-container {
                display: none !important;
            }

            /* Inline annotation comments use a separate portal from .Modal-content.
               Its close button normally sits outside the panel, which makes it
               unreachable when the panel fills a narrow viewport. */
            body > div > div > div:has(> div > button[aria-label="关闭"] > .Zi--Close)
                > div:has(> button[aria-label="关闭"] > .Zi--Close) {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            body > div > div > div:has(> div > button[aria-label="关闭"] > .Zi--Close)
                > div > button[aria-label="关闭"]:has(> .Zi--Close) {
                right: 8px !important;
                left: auto !important;
                z-index: 2 !important;
                border-radius: 50% !important;
                background: rgb(0 0 0 / 55%) !important;
            }
            `,
        },
    ];

    const COMMON_MODULES = new Set([
        'foundation',
        'shell',
        'shared-content',
        'overlays-and-editors',
    ]);
    const ROUTE_STYLE_ID = 'zhihu-desktop-responsive-route';

    function routeModuleNames() {
        const path = location.pathname;
        if (location.hostname === 'zhuanlan.zhihu.com' && /^\/p\//.test(path)) {
            return new Set(['column-article']);
        }
        if (/^\/creator(?:\/|$)/.test(path)) return new Set(['creator-center']);
        if (/^\/(?:question|people)\//.test(path)) {
            return new Set(['question-and-profile']);
        }
        if (
            path === '/' ||
            /^\/(?:follow|hot|search|topic|collection)(?:\/|$)/.test(path)
        ) {
            return new Set(['discovery-pages']);
        }
        return new Set();
    }

    function wrapModules(modules) {
        return modules.map(({ name, rules }) => `
            /* zhihu-mobile-resize: ${name} */
            @media screen and (max-width: 768px) {
                ${rules}
            }
        `)
        .join('\n');
    }

    const css = wrapModules(
        responsiveModules.filter(({ name }) => COMMON_MODULES.has(name))
    );

    function routeCss() {
        const names = routeModuleNames();
        return wrapModules(
            responsiveModules.filter(({ name }) => names.has(name))
        );
    }

    // Keep CSS on the document-start path. Some managers implement GM.addStyle
    // through an asynchronous extension API that waits until document_idle.
    function injectStyle() {
        if (document.getElementById('zhihu-desktop-responsive')) return true;
        const parent = document.head || document.documentElement;
        if (!parent) return false;
        const style = document.createElement('style');
        style.id = 'zhihu-desktop-responsive';
        style.textContent = css;
        parent.appendChild(style);
        return true;
    }

    function injectStyleWhenReady() {
        if (injectStyle()) return;

        const styleObserver = new MutationObserver(() => {
            if (injectStyle()) styleObserver.disconnect();
        });
        styleObserver.observe(document, { childList: true });
    }

    function syncRouteStyle() {
        const parent = document.head || document.documentElement;
        if (!parent) return false;
        let style = document.getElementById(ROUTE_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = ROUTE_STYLE_ID;
            parent.appendChild(style);
        }
        const nextCss = routeCss();
        if (style.textContent !== nextCss) style.textContent = nextCss;
        return true;
    }

    function syncRouteStyleWhenReady() {
        if (syncRouteStyle()) return;
        const routeStyleObserver = new MutationObserver(() => {
            if (syncRouteStyle()) routeStyleObserver.disconnect();
        });
        routeStyleObserver.observe(document, { childList: true });
    }

    injectStyleWhenReady();
    syncRouteStyleWhenReady();
    window.addEventListener('popstate', syncRouteStyle);
    window.addEventListener('pageshow', syncRouteStyle);
    window.navigation?.addEventListener('currententrychange', syncRouteStyle);

})();
