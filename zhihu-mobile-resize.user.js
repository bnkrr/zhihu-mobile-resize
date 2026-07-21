// ==UserScript==
// @name         知乎手机屏幕适配 (Zhihu Mobile Resize)
// @namespace    https://github.com/bnkrr/zhihu-mobile-resize
// @version      1.6.0
// @description  修复知乎网页在手机浏览器中的超宽、遮挡和操作不便问题，同时保留桌面版内容。
// @author       bnkrr
// @homepageURL  https://github.com/bnkrr/zhihu-mobile-resize
// @supportURL   https://github.com/bnkrr/zhihu-mobile-resize/issues
// @updateURL    https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-mobile-resize.meta.js
// @downloadURL  https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-mobile-resize.user.js
// @match        https://*.zhihu.com/*
// @grant        GM.addStyle
// @inject-into  content
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, viewport-fit=cover';

    function ensureViewport() {
        if (!document.head) return false;

        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }

        if (viewport.content !== VIEWPORT_CONTENT) {
            viewport.content = VIEWPORT_CONTENT;
        }
        return true;
    }

    if (!ensureViewport()) {
        const headObserver = new MutationObserver(() => {
            if (ensureViewport()) headObserver.disconnect();
        });
        headObserver.observe(document, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', ensureViewport, { once: true });
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
            `,
        },
        {
            name: 'discovery-pages',
            rules: `

            /* Home/follow feed: remove the fixed 1032/694px desktop grid. */
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

            .Search-container > :not(.SearchMain) {
                display: none !important;
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

            /* Topic: the desktop topic feed is a fixed 600px column. */
            .TopicMetaCard,
            .Topic-bar,
            .TopicFeedList,
            .TopicFeedList .List,
            .TopicFeedItem,
            .TopicHotIntroItem-item,
            .TopicHot-introItem {
                width: calc(100vw - 15px) !important;
                min-width: 0 !important;
                max-width: calc(100vw - 15px) !important;
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
                width: calc(100vw - 35px) !important;
                max-width: calc(100vw - 35px) !important;
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

            /* New question pages keep a hashed 1032px parent around this stable column. */
            .Question-mainColumn {
                width: calc(100vw - 32px) !important;
                max-width: calc(100vw - 32px) !important;
            }

            .QuestionPage *:has(> .Question-mainColumn),
            .QuestionPage *:has(> * > .Question-mainColumn) {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
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
            body *:has(> .Modal-content),
            body *:has(> * > .Modal-content),
            .Modal-content {
                width: 100vw !important;
                min-width: 0 !important;
                max-width: 100vw !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
                box-sizing: border-box !important;
            }

            body *:has(> .Modal-content),
            body *:has(> * > .Modal-content) {
                overflow-x: hidden !important;
            }

            .Modal-content {
                height: calc(100dvh - 44px) !important;
                max-height: calc(100dvh - 44px) !important;
                overflow: hidden !important;
                background: var(--zmr-surface) !important;
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
                max-width: calc(100vw - 74px) !important;
                overflow-wrap: anywhere !important;
            }

            .Modal-content .InputLike,
            .Modal-content .Editable {
                width: auto !important;
                min-width: 0 !important;
                max-width: calc(100vw - 100px) !important;
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

            /* Inline annotation comments use a separate portal from .Modal-content.
               Its close button normally sits outside the panel, which makes it
               unreachable when the panel fills a narrow viewport. */
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

    const css = responsiveModules
        .map(({ name, rules }) => `
            /* zhihu-mobile-resize: ${name} */
            @media screen and (max-width: 768px) {
                ${rules}
            }
        `)
        .join('\n');

    function injectFallbackStyle() {
        if (!document.head || document.getElementById('zhihu-desktop-responsive')) return false;
        const style = document.createElement('style');
        style.id = 'zhihu-desktop-responsive';
        style.textContent = css;
        document.head.appendChild(style);
        return true;
    }

    function injectFallbackStyleWhenReady() {
        if (injectFallbackStyle()) return;

        const styleObserver = new MutationObserver(() => {
            if (injectFallbackStyle()) styleObserver.disconnect();
        });
        styleObserver.observe(document, { childList: true, subtree: true });
    }

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
})();
