// ==UserScript==
// @name         知乎夜间模式 (Zhihu Night Mode)
// @namespace    https://github.com/bnkrr/zhihu-mobile-resize/night-mode
// @version      1.2.1
// @description  在知乎网页中启用内置的深色主题，可与知乎手机屏幕适配脚本独立使用。
// @author       bnkrr
// @homepageURL  https://github.com/bnkrr/zhihu-mobile-resize
// @supportURL   https://github.com/bnkrr/zhihu-mobile-resize/issues
// @updateURL    https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-night-mode.meta.js
// @downloadURL  https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-night-mode.user.js
// @match        https://*.zhihu.com/*
// @grant        none
// @inject-into  content
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const DARK_THEME = 'dark';
    const STYLE_ID = 'zhihu-night-mode-fallbacks';
    const COMMENT_STYLE_ID = 'zhihu-night-mode-comments';
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
        html[data-theme='dark'] .LeanAppHeaderBar,
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

        html[data-theme='dark'] .LeanAppHeaderBar {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text) !important;
            transition: none !important;
        }

        html[data-theme='dark'] .LeanAppHeaderBar :is(a, button) {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] .LeanAppHeaderBar a[aria-label='知乎'] {
            color: var(--zmr-accent) !important;
        }

        html[data-theme='dark'] .LeanAppHeaderBar :is(
            .SearchBar,
            .SearchBar-input,
            .Input-wrapper
        ) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
        }

        /* The redesigned desktop home navigation keeps light-theme label colors. */
        html[data-theme='dark'] aside:has(nav a[href$='/hot']) {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] aside:has(nav a[href$='/hot']) nav a,
        html[data-theme='dark'] aside:has(nav a[href$='/hot']) nav button {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] aside:has(nav a[href$='/hot']) nav a[aria-current='page'] {
            color: var(--zmr-text) !important;
            background-color: var(--zmr-surface-raised) !important;
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

        html[data-theme='dark'] .Card:has(.PlaceHolder-inner),
        html[data-theme='dark'] :is(
            .Topstory-mainColumn,
            .SearchMain,
            .ProfileMain,
            .TopicFeedList,
            .CollectionsDetailPage-mainColumn
        ) .PlaceHolder {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] .PlaceHolder-inner > :not(svg) {
            background-color: var(--zmr-surface-raised) !important;
        }

        html[data-theme='dark'] .PlaceHolder svg {
            background-color: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] .PlaceHolder svg rect:first-child {
            fill: var(--zmr-surface) !important;
        }

        html[data-theme='dark'] .PlaceHolder svg rect:not(:first-child) {
            fill: var(--zmr-surface-raised) !important;
        }

        /* The redesigned feed/profile loading state no longer uses PlaceHolder. */
        html[data-theme='dark'] .skeleton.skeleton {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] .skeleton__line.skeleton__line {
            background-color: var(--zmr-surface-raised) !important;
        }

        html[data-theme='dark'] .ProfileMain-header button:has(.ZDI--Search24) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            transition: none !important;
        }

        html[data-theme='dark'] .AnswerForm,
        html[data-theme='dark'] .AnswerFormEditorContainer,
        html[data-theme='dark'] .AnswerFormEditorContainer > *,
        html[data-theme='dark'] .AnswerForm :is(
            .Sticky,
            .RichText--editable,
            .Editable,
            .DraftEditor-root,
            .DraftEditor-editorContainer,
            .public-DraftEditor-content,
            .Toolbar,
            .RichText-toolbar
        ) {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .AnswerForm .Sticky > div {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .AnswerForm :is(.ToolbarButton, .Button--plain) {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] .AnswerForm .Button--primary,
        html[data-theme='dark'] .AnswerForm .Button--primary * {
            color: #fff !important;
        }

        html[data-theme='dark'] .AnswerAdd > div,
        html[data-theme='dark'] .AnswerAdd .Sticky,
        html[data-theme='dark'] .AnswerFormEditorContainer > :last-child {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
            transition: none !important;
        }

        html[data-theme='dark'] .SearchMain b {
            transition: none !important;
        }

        /* The redesigned home publisher keeps its prompt in a light-theme text color. */
        html[data-theme='dark'] .WriteArea > div > section > div > :first-child {
            color: var(--zmr-text-muted) !important;
        }

        /* Creator center ships its own light-only CSS-in-JS palette. */
        html[data-theme='dark'] .Creator,
        html[data-theme='dark'] .Creator > :first-child,
        html[data-theme='dark'] .CreatorHome,
        html[data-theme='dark'] .CreatorHome .WriteArea {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .Creator :is(div, span, p, a, button) {
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .Creator :is(h1, h2, h3, h4, strong) {
            color: var(--zmr-text) !important;
        }

        html[data-theme='dark'] .CreatorHome > div > div:first-child
            > div:not(.WriteArea) > div,
        html[data-theme='dark'] .CreatorHome > div > div:first-child
            > div:not(.WriteArea) > div > div,
        html[data-theme='dark'] .CreatorHome > div > div:last-child > div,
        html[data-theme='dark'] .CreatorHome > div > div:last-child > div > div {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .CreatorHome :is(
            .Input-wrapper,
            .Select-button,
            [role='button']
        ) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        /* Creator dashboard tiles have neither semantic classes nor theme variables.
           Keep this hash list scoped to .Creator; the creator regression case detects churn. */
        html[data-theme='dark'] .Creator :is(
            .css-13uu85k,
            .css-qbngl8,
            .css-1ms3yqq,
            .css-tzviga,
            .css-1e31h8y,
            .css-nnul91,
            .css-16t5hun,
            .css-1o20ku1,
            .css-1hmn20z,
            .css-1nrjoni,
            .css-y15jlc,
            .css-y1y8eh,
            .css-1p4cunc
        ) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .Creator .Button--primary,
        html[data-theme='dark'] .Creator .Button--primary * {
            color: #fff !important;
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

        html[data-theme='dark'] .ztext.ztext a[href],
        html[data-theme='dark'] .QuestionRichText.QuestionRichText a[href],
        html[data-theme='dark'] .Post-RichText.Post-RichText a[href],
        html[data-theme='dark'] .CommentContent.CommentContent a[href] {
            color: var(--zmr-accent) !important;
            text-decoration-color: var(--zmr-accent) !important;
        }

        html[data-theme='dark'] #root a.ztext-mention-hook.ztext-mention-hook {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-accent) !important;
            border-color: var(--zmr-border) !important;
            transition: none !important;
        }

        /* Inline annotation comments live in a portal outside the article shell. */
        html[data-theme='dark'] body > div > div
            > div:has(> div > button[aria-label='关闭'] > .Zi--Close)
            > div:has(> button[aria-label='关闭'] > .Zi--Close) {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] body > div > div
            > div:has(> div > button[aria-label='关闭'] > .Zi--Close)
            > div:has(> button[aria-label='关闭'] > .Zi--Close)
            :is(p, span, button) {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] body > div > div
            > div:has(> div > button[aria-label='关闭'] > .Zi--Close)
            > div:has(> button[aria-label='关闭'] > .Zi--Close) a {
            color: var(--zmr-accent) !important;
        }

        /* Quotes may retain copied inline light-theme colors and an invisible border. */
        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) blockquote {
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) blockquote :is(p, span, em, strong, b, i, li, h1, h2, h3, h4, h5, h6):not(a *) {
            color: var(--zmr-text-secondary) !important;
        }

        /* Code blocks keep a light background while broad rich-text rules make their text white. */
        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) :is(.highlight, pre) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) pre code,
        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) pre code span {
            background-color: transparent !important;
            color: inherit !important;
        }

        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) .highlight :is(.k, .kc, .kd, .kn, .kp, .kr, .kt, .nc, .nt) {
            color: var(--zmr-accent) !important;
        }

        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) .highlight :is(.c, .c1, .cm, .cp, .cs) {
            color: var(--zmr-text-muted) !important;
        }

        html[data-theme='dark'] :is(
            .RichText,
            .QuestionRichText,
            .Post-RichText,
            .CommentContent
        ) :not(pre) > code {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        /* Link cards keep light loading and card surfaces after switching themes. */
        html[data-theme='dark'] .LinkCard.LinkCard {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .LinkCard .LinkCard-title {
            color: var(--zmr-text) !important;
        }

        html[data-theme='dark'] .LinkCard .LinkCard-desc {
            color: var(--zmr-text-secondary) !important;
        }

        html[data-theme='dark'] .LinkCard :is(.LinkCard-image--default, .loading) {
            background-color: var(--zmr-border) !important;
        }

        /* Column related-answer cards do not consume Zhihu's dark theme variables. */
        html[data-theme='dark'] .Post-NormalMain .pc-article-answer {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            border-color: var(--zmr-border) !important;
            transition: none !important;
        }

        html[data-theme='dark'] .Post-NormalMain :is(
            .pc-article-answer-card-title,
            .pc-article-answer-card-footer-user-info-name
        ) {
            color: var(--zmr-text) !important;
        }

        html[data-theme='dark'] .Post-NormalMain :is(
            .pc-article-answer-card-desc-text,
            .pc-article-answer-card-footer-close-text
        ) {
            color: var(--zmr-text-secondary) !important;
        }

        /* This recommendation block currently has no semantic class; the narrow
           Post-NormalMain ancestry limits the impact and regression tests cover hash churn. */
        html[data-theme='dark'] #root .Post-NormalMain > div > .css-34mzkj {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            transition: none !important;
        }

        html[data-theme='dark'] #root .Post-NormalMain .css-34mzkj :is(a, div, span) {
            color: var(--zmr-text-secondary) !important;
            transition: none !important;
        }

        html[data-theme='dark'] #root .Post-NormalMain .css-34mzkj .Button--primary,
        html[data-theme='dark'] #root .Post-NormalMain .css-34mzkj .Button--primary * {
            color: #fff !important;
        }

        /* The same unthemed recommendation block is embedded after a single answer. */
        html[data-theme='dark'] #root .AnswerItem .RichContent .css-34mzkj {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text) !important;
            transition: none !important;
        }

        html[data-theme='dark'] #root .AnswerItem .RichContent .css-34mzkj
            :is(a, div, span) {
            color: var(--zmr-text-secondary) !important;
            transition: none !important;
        }

        html[data-theme='dark'] #root .AnswerItem .RichContent .css-34mzkj
            .Button--primary,
        html[data-theme='dark'] #root .AnswerItem .RichContent .css-34mzkj
            .Button--primary * {
            color: #fff !important;
        }

        html[data-theme='dark'] #root .CollectionsDetailPage
            .Pagination .PaginationButton.PaginationButton {
            color: var(--zmr-text-secondary) !important;
            transition: none !important;
        }

        /* Topic feed pins and circle recommendations use literal white surfaces. */
        html[data-theme='dark'] .PinToolbar-actions.PinToolbar-actions {
            background-color: var(--zmr-surface) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .TopicFeedItem a:has(> .ZDI--CircleClubFill24) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .TopicFeedItem div:has(> img.Image-Preview + div)
            > img.Image-Preview + div {
            background-color: rgb(0 0 0 / 55%) !important;
            color: var(--zmr-text) !important;
        }

        /* Poll cards in the topic feed currently expose only generated classes. */
        html[data-theme='dark'] .TopicFeedList :is(.css-124uj0t, .css-1wxpzcq) {
            background-color: var(--zmr-surface-raised) !important;
            color: var(--zmr-text-secondary) !important;
            border-color: var(--zmr-border) !important;
        }

        html[data-theme='dark'] .TopicFeedList .css-1yeyx0 {
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

    `;

    /* Keep relational comment selectors out of the main stylesheet. They are
       expensive on long feeds and are needed only after a comment surface mounts. */
    const commentCss = `
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

    // Insert directly: an asynchronous GM.addStyle implementation can defer
    // visible styles until document_idle even with @run-at document-start.
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return true;
        const parent = document.head || document.documentElement;
        if (!parent) return false;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        parent.appendChild(style);
        return true;
    }

    function hasCommentSurface(root = document) {
        if (root.nodeType === Node.ELEMENT_NODE) {
            const element = root;
            if (element.matches('.Comments-container, .CommentContent')) return true;
        }
        return Boolean(root.querySelector?.(
            '.Comments-container, .Modal-content .CommentContent'
        ));
    }

    function injectCommentStyle() {
        if (document.getElementById(COMMENT_STYLE_ID)) return true;
        if (!hasCommentSurface()) return false;

        const parent = document.head || document.documentElement;
        if (!parent) return false;
        const style = document.createElement('style');
        style.id = COMMENT_STYLE_ID;
        style.textContent = commentCss;
        parent.appendChild(style);
        return true;
    }

    const themeObserver = new MutationObserver(enableDarkTheme);

    function startNightMode() {
        const root = document.documentElement;
        if (!root) return false;
        enableDarkTheme();
        injectStyle();
        themeObserver.observe(root, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return true;
    }

    // document-start may run before <html>, not just before <head>.
    if (!startNightMode()) {
        const rootObserver = new MutationObserver(() => {
            if (startNightMode()) rootObserver.disconnect();
        });
        rootObserver.observe(document, { childList: true });
    }

    if (!injectCommentStyle()) {
        const commentObserver = new MutationObserver((records) => {
            const found = records.some((record) =>
                [...record.addedNodes].some((node) => hasCommentSurface(node))
            );
            if (found && injectCommentStyle()) commentObserver.disconnect();
        });
        commentObserver.observe(document, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', enableDarkTheme, { once: true });
    window.addEventListener('pageshow', enableDarkTheme);
})();
