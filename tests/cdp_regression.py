#!/usr/bin/env python3
"""Live narrow-screen regression checks against the first Zhihu Chrome tab."""

import argparse
import base64
import json
import os
import time
import urllib.request
from pathlib import Path

import websocket


PROJECT = Path(__file__).resolve().parents[1]
CASES = json.loads((PROJECT / "tests" / "cases.json").read_text(encoding="utf-8"))
LOCAL_CASES_PATH = PROJECT / ".local" / "test-cases.json"
LOCAL_CASES = (
    json.loads(LOCAL_CASES_PATH.read_text(encoding="utf-8"))
    if LOCAL_CASES_PATH.exists()
    else {}
)
OUTPUT = PROJECT / ".local" / "test-results"
DESKTOP_WIDTH = 1032
NARROW_WIDTH = 403
HEIGHT = 730
WINDOWS_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/150.0.0.0 Safari/537.36"
)
BAD_TEXT_COLORS = ["rgb(25, 27, 31)", "rgb(55, 58, 64)", "rgb(26, 26, 26)"]
BAD_BACKGROUNDS = ["rgb(255, 255, 255)", "rgb(248, 248, 250)"]
BAD_LINK_COLORS = ["rgb(9, 64, 142)", "rgb(23, 114, 246)"]


class CDP:
    def __init__(self, port):
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list") as response:
            targets = json.load(response)
        self.target = next(
            target
            for target in targets
            if target.get("type") == "page"
            and target.get("url", "").startswith(
                ("https://www.zhihu.com", "https://zhuanlan.zhihu.com")
            )
        )
        self.socket = websocket.create_connection(
            self.target["webSocketDebuggerUrl"], timeout=40, suppress_origin=True
        )
        self.message_id = 0
        self.document_start = False

    def close(self):
        self.socket.close()

    def command(self, method, params=None):
        self.message_id += 1
        current = self.message_id
        self.socket.send(
            json.dumps({"id": current, "method": method, "params": params or {}})
        )
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") != current:
                continue
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})

    def evaluate(self, expression):
        result = self.command(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": True,
            },
        )["result"]
        if result.get("subtype") == "error":
            raise RuntimeError(result.get("description", "Runtime.evaluate failed"))
        return result.get("value")

    def screenshot(self, path):
        self.command("Page.bringToFront")
        self.evaluate(
            "document.documentElement.offsetHeight; "
            "new Promise(resolve => setTimeout(resolve, 150))"
        )
        result = self.command(
            "Page.captureScreenshot",
            {"format": "png", "fromSurface": True, "captureBeyondViewport": False},
        )
        path.write_bytes(base64.b64decode(result["data"]))


def wait_until(cdp, expression, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        value = cdp.evaluate(f"Boolean({expression})")
        if value:
            return value
        time.sleep(0.25)
    raise TimeoutError(f"Timed out waiting for: {expression}")


def set_viewport(cdp, width, height=HEIGHT):
    cdp.command(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": False,
        },
    )


def load_desktop_dom(cdp, url, navigation_timeout=35):
    set_viewport(cdp, DESKTOP_WIDTH)
    # Waiting on readyState alone can observe the previous document before the
    # Page.navigate commit. A per-document marker makes the hand-off explicit.
    cdp.evaluate("window.__zmrNavigationPending = true")
    cdp.command("Page.navigate", {"url": url})
    wait_until(cdp, "!window.__zmrNavigationPending", timeout=navigation_timeout)
    wait_until(
        cdp,
        "document.readyState !== 'loading'",
        timeout=navigation_timeout,
    )
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 1000))")


def resolve_case_url(case):
    url = None
    if case.get("url"):
        url = case["url"]
    elif case.get("urlEnv") and os.environ.get(case["urlEnv"]):
        url = os.environ[case["urlEnv"]]
    elif case.get("localKey") and LOCAL_CASES.get(case["localKey"]):
        url = LOCAL_CASES[case["localKey"]]
    if not url:
        return None
    return url.rstrip("/") + case.get("suffix", "")


def script_source(include_night=True):
    names = ["zhihu-mobile-resize.user.js"]
    if include_night:
        names.append("zhihu-night-mode.user.js")
    return "\n".join(
        (PROJECT / name).read_text(encoding="utf-8") for name in names
    )


def inject_scripts(cdp, include_night=True):
    if not cdp.document_start:
        cdp.evaluate(
            "document.getElementById('zhihu-desktop-responsive')?.remove();"
            "document.getElementById('zhihu-desktop-responsive-route')?.remove();"
            "document.getElementById('zhihu-night-mode-fallbacks')?.remove();"
            "document.getElementById('zhihu-night-mode-comments')?.remove();"
        )
        cdp.evaluate(script_source(include_night))
    set_viewport(cdp, NARROW_WIDTH)
    # requestAnimationFrame can be indefinitely throttled when Chrome is in the background.
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 200))")
    wait_until(cdp, "document.getElementById('zhihu-desktop-responsive')", timeout=10)
    if include_night:
        wait_until(
            cdp,
            "document.documentElement.dataset.theme === 'dark' && "
            "document.getElementById('zhihu-night-mode-fallbacks') && "
            "(!document.querySelector('.AppHeader') || "
            "getComputedStyle(document.querySelector('.AppHeader')).backgroundColor !== "
            "'rgb(255, 255, 255)')",
            timeout=10,
        )


RESPONSIVE_AUDIT = """
(() => {
    const viewportWidth = window.visualViewport?.width || innerWidth;
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const selector = [
        '.AppHeader', '.LeanAppHeaderBar', '.LeanAppHeaderBar .SearchBar',
        '.LeanAppHeaderBar .AppHeader-profileEntry',
        '.LeanAppHeaderBar a[aria-label="知乎"]',
        '.Topstory-container', '.Topstory-mainColumn',
        '.HotList', '.HotItem', '.Search-container', '.SearchMain',
        '.SearchResult-Card', '.TopicMetaCard', '.Topic-bar', '.TopicFeedList',
        '.QuestionHeader', '.Question-mainColumn', '.AnswerCard',
        '.QuestionAnswer-content', '.ProfileHeader',
        '.ProfileHeader-userCover', '.Profile-mainColumn', '.ProfileMain',
        '.Post-content', '.Post-NormalMain',
        '.CollectionsDetailPage', '.CollectionsDetailPage-mainColumn',
        '.CollectionDetailPageHeader', '.CollectionDetailPageItem',
        '.Creator', '.Creator-mainColumn', '.CreatorHome', '.WriteArea',
        '.Comments-container',
        '.Modal-content'
    ].join(',');
    const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
            style.visibility !== 'hidden';
    };
    const summarize = (element) => {
        const rect = element.getBoundingClientRect();
        return {
            tag: element.tagName,
            classes: typeof element.className === 'string' ? element.className : '',
            rect: [rect.left, rect.top, rect.right, rect.bottom],
        };
    };
    const redesignShell = document.querySelector(
        'body *:has(> aside + div + div > div > .App-main)'
    );
    const roots = [...document.querySelectorAll(selector), redesignShell]
        .filter(Boolean).filter(visible);
    const outOfBounds = roots.filter((element) => {
        if (element.closest('.SearchTabs-inner, .Topic-bar, .AppHeader nav, pre, table')) {
            return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
    }).slice(0, 30).map(summarize);
    const unreachableCloseControls = [...document.querySelectorAll(
        'button[aria-label="关闭"], button[aria-label="close" i]'
    )].filter(visible).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right <= 0 || rect.left >= viewportWidth ||
            rect.bottom <= 0 || rect.top >= viewportHeight;
    }).map(summarize);
    const requiredHeaderSelectors = document.querySelector('.LeanAppHeaderBar')
        ? [
            '.LeanAppHeaderBar a[aria-label="知乎"]',
            '.LeanAppHeaderBar .SearchBar',
            '.LeanAppHeaderBar .AppHeader-profileEntry',
        ] : [];
    const unreachableHeaderControls = requiredHeaderSelectors.flatMap((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [{selector, missing: true}];
        const rect = element.getBoundingClientRect();
        return rect.width < 24 || rect.height < 24 || rect.left < -1 ||
            rect.right > viewportWidth + 1 || rect.top < -1 ||
            rect.bottom > viewportHeight + 1
            ? [{selector, ...summarize(element)}] : [];
    });
    const collapsedWriteAreaControls = [...document.querySelectorAll('.WriteArea div')]
        .filter(visible).filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 12 && rect.height > 48;
        }).slice(0, 20).map(summarize);
    const homeNavigation = (() => {
        if (!document.querySelector('.Topstory-container')) return null;
        const nav = [...document.querySelectorAll('aside nav, .AppHeader nav')]
            .find((candidate) => {
                const paths = [...candidate.querySelectorAll('a[href]')].map((link) => {
                    try { return new URL(link.href).pathname; } catch (_) { return ''; }
                });
                return paths.includes('/') && paths.includes('/follow') &&
                    paths.includes('/hot');
            });
        if (!nav) return {missing: true};
        const rect = nav.getBoundingClientRect();
        return {
            visible: visible(nav),
            rect: [rect.left, rect.top, rect.right, rect.bottom],
            usableWidth: rect.width >= Math.min(280, viewportWidth - 40),
            withinViewport: rect.left >= -1 && rect.right <= viewportWidth + 1,
            localScroller: nav.scrollWidth >= nav.clientWidth &&
                getComputedStyle(nav).overflowX === 'auto',
            primaryLinks: ['/', '/follow', '/hot'].map((path) => {
                const link = [...nav.querySelectorAll('a[href]')].find((candidate) => {
                    try { return new URL(candidate.href).pathname === path; }
                    catch (_) { return false; }
                });
                return {
                    path,
                    present: Boolean(link),
                    visible: Boolean(link && visible(link)),
                    labeled: Boolean(link && link.textContent.trim() &&
                        link.getBoundingClientRect().width >= 16),
                };
            }),
        };
    })();
    return {
        viewport: {
            innerWidth,
            clientWidth: document.documentElement.clientWidth,
            visualWidth: viewportWidth,
        },
        documentWidth: {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        },
        outOfBounds,
        unreachableCloseControls,
        unreachableHeaderControls,
        collapsedWriteAreaControls,
        homeNavigation,
    };
})()
"""


PAGE_AUDIT = f"""
(() => {{
    const badTextColors = {json.dumps(BAD_TEXT_COLORS)};
    const badBackgrounds = {json.dumps(BAD_BACKGROUNDS)};
    const badLinkColors = {json.dumps(BAD_LINK_COLORS)};
    const scopes = [...document.querySelectorAll(
        '.AppHeader, .Card, .HotItem, .QuestionHeader, .ProfileHeader, ' +
        '.Search-container, .TopicMetaCard, .TopicFeedList, .Post-content, .Post-NormalMain, ' +
        '.Comments-container, .Modal-content, .Creator, .CreatorHome, ' +
        'aside:has(nav a[href$="/hot"])'
    )];
    const elements = [...new Set(scopes.flatMap((scope) => [scope, ...scope.querySelectorAll('*')]))]
        .filter((element) => {{
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 &&
                style.display !== 'none' && style.visibility !== 'hidden';
        }});
    const summarize = (element, property) => ({{
        tag: element.tagName,
        classes: typeof element.className === 'string' ? element.className : '',
        value: getComputedStyle(element)[property],
    }});
    const linkProbe = document.createElement('div');
    linkProbe.style.cssText = 'position:fixed;left:-10000px;top:0';
    linkProbe.innerHTML =
        '<div class="ztext"><a href="https://example.invalid/">probe</a></div>' +
        '<div class="CommentContent"><a href="https://example.invalid/">probe</a></div>' +
        '<div class="RichText ztext"><blockquote><p><span style="color:rgb(55,58,64)">' +
        'probe</span></p></blockquote></div>' +
        '<div class="QuestionRichText RichText ztext">' +
        '<div class="highlight" style="background-color:rgb(255,255,255)">' +
        '<pre style="background-color:rgb(255,255,255);color:rgb(255,255,255)"><code>' +
        '<span class="k" style="color:rgb(255,255,255)">probe</span>' +
        '<span class="c1" style="color:rgb(255,255,255)">probe</span>' +
        '</code></pre></div>' +
        '<p><code style="background-color:rgb(255,255,255);color:rgb(255,255,255)">' +
        'probe</code></p></div>';
    document.body.appendChild(linkProbe);
    const linkProbeColors = [...linkProbe.querySelectorAll('a')]
        .map((element) => getComputedStyle(element).color);
    const quoteProbe = linkProbe.querySelector('blockquote');
    const quoteTextProbe = quoteProbe.querySelector('span');
    const quoteProbeColors = {{
        color: getComputedStyle(quoteTextProbe).color,
        border: getComputedStyle(quoteProbe).borderLeftColor,
    }};
    const codeProbeColors = {{
        wrapperBackground: getComputedStyle(linkProbe.querySelector('.highlight')).backgroundColor,
        preBackground: getComputedStyle(linkProbe.querySelector('pre')).backgroundColor,
        codeColor: getComputedStyle(linkProbe.querySelector('pre code')).color,
        keywordColor: getComputedStyle(linkProbe.querySelector('.highlight .k')).color,
        commentColor: getComputedStyle(linkProbe.querySelector('.highlight .c1')).color,
        inlineBackground: getComputedStyle(linkProbe.querySelector('p > code')).backgroundColor,
        inlineColor: getComputedStyle(linkProbe.querySelector('p > code')).color,
    }};
    linkProbe.remove();
    return {{
        theme: document.documentElement.dataset.theme,
        viewport: {{innerWidth, clientWidth: document.documentElement.clientWidth}},
        documentWidth: {{
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        }},
        body: {{
            background: getComputedStyle(document.body).backgroundColor,
            color: getComputedStyle(document.body).color,
        }},
        linkProbeColors,
        quoteProbeColors,
        codeProbeColors,
        badText: elements
            .filter((element) => element.tagName !== 'IMG' &&
                element.childElementCount === 0 && element.textContent.trim() &&
                !element.matches('.HotItem-label') &&
                badTextColors.includes(getComputedStyle(element).color))
            .slice(0, 30).map((element) => summarize(element, 'color')),
        lightBackgrounds: elements
            .filter((element) => !['IMG', 'VIDEO', 'CANVAS'].includes(element.tagName) &&
                badBackgrounds.includes(getComputedStyle(element).backgroundColor))
            .slice(0, 30).map((element) => summarize(element, 'backgroundColor')),
        lightSkeletonFills: elements
            .filter((element) => element.tagName === 'rect' &&
                element.closest('svg:has(rect:nth-of-type(3))') &&
                badBackgrounds.includes(getComputedStyle(element).fill))
            .slice(0, 30).map((element) => summarize(element, 'fill')),
        badLinks: [...document.querySelectorAll(
            '.ztext a[href], .QuestionRichText a[href], ' +
            '.Post-RichText a[href], .CommentContent a[href]'
        )].filter((element) => {{
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 &&
                element.textContent.replace(/\u200b/g, '').trim() &&
                badLinkColors.includes(getComputedStyle(element).color);
        }}).slice(0, 30).map((element) => summarize(element, 'color')),
    }};
}})()
"""


COMMENT_AUDIT = f"""
(() => {{
    const root = document.querySelector('.Modal-content:has(.CommentContent)') ||
        document.querySelector('.Comments-container');
    if (!root) return null;
    const badTextColors = {json.dumps(BAD_TEXT_COLORS)};
    const badBackgrounds = {json.dumps(BAD_BACKGROUNDS)};
    const visible = [root, ...root.querySelectorAll('*')].filter((element) => {{
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 &&
            style.display !== 'none' && style.visibility !== 'hidden';
    }});
    const sample = (element, property) => ({{
        tag: element.tagName,
        classes: typeof element.className === 'string' ? element.className : '',
        value: getComputedStyle(element)[property],
    }});
    return {{
        root: root.matches('.Modal-content') ? 'expanded-replies' : 'comments',
        commentCount: root.querySelectorAll('.CommentContent').length,
        inputCount: root.querySelectorAll('.InputLike').length,
        badText: visible
            .filter((element) => element.tagName !== 'IMG' && element.textContent.trim() &&
                badTextColors.includes(getComputedStyle(element).color))
            .map((element) => sample(element, 'color')).slice(0, 30),
        lightBackgrounds: visible
            .filter((element) => !['IMG', 'VIDEO', 'CANVAS'].includes(element.tagName) &&
                badBackgrounds.includes(getComputedStyle(element).backgroundColor))
            .map((element) => sample(element, 'backgroundColor')).slice(0, 30),
    }};
}})()
"""


def run_page(cdp, case, screenshots=False, include_night=True):
    load_desktop_dom(
        cdp,
        case["url"],
        navigation_timeout=case.get("navigationTimeout", 35),
    )
    inject_scripts(cdp, include_night=include_night)
    required = json.dumps(case["requiredAny"], ensure_ascii=False)
    found = wait_until(
        cdp,
        f"{required}.some((selector) => document.querySelector(selector))",
        timeout=25,
    )
    if not found:
        raise AssertionError(f"{case['name']}: no required semantic root")
    content_ready = True
    if case.get("readyAny"):
        ready = json.dumps(case["readyAny"], ensure_ascii=False)
        try:
            wait_until(
                cdp,
                f"{ready}.some((selector) => [...document.querySelectorAll(selector)]"
                ".some((element) => { const rect = element.getBoundingClientRect(); "
                "return rect.width > 0 && rect.height > 0 && "
                "getComputedStyle(element).display !== 'none'; }))",
                timeout=case.get("readyTimeout", 30),
            )
        except TimeoutError:
            content_ready = False
        cdp.evaluate("new Promise(resolve => setTimeout(resolve, 300))")
    cdp.evaluate("scrollTo(0, 0)")
    audit = cdp.evaluate(PAGE_AUDIT) if include_night else None
    responsive = cdp.evaluate(RESPONSIVE_AUDIT)
    if screenshots:
        cdp.screenshot(OUTPUT / f"{case['name']}-top.png")
    cdp.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 300))")
    if screenshots:
        cdp.screenshot(OUTPUT / f"{case['name']}-bottom.png")
    set_viewport(cdp, DESKTOP_WIDTH)
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 200))")
    desktop_guard = cdp.evaluate(
        """
        (() => {
            const header = document.querySelector('.AppHeader > div');
            const style = header ? getComputedStyle(header) : null;
            return {
                narrowMediaMatches: matchMedia('(max-width: 768px)').matches,
                responsiveHeaderGrid: Boolean(style && style.display === 'grid' &&
                    style.gridTemplateRows === '52px 44px'),
                leanResponsivePadding: (() => {
                    const inner = document.querySelector('.LeanAppHeaderBar > div');
                    const innerStyle = inner ? getComputedStyle(inner) : null;
                    return Boolean(innerStyle && innerStyle.paddingLeft === '82px' &&
                        innerStyle.paddingRight === '52px');
                })(),
            };
        })()
        """
    )
    failures = []
    if not content_ready and case.get("contentRequired", True):
        failures.append("live content did not become ready")
    if include_night:
        if audit["theme"] != "dark":
            failures.append("data-theme is not dark")
        if audit["body"]["background"] in BAD_BACKGROUNDS:
            failures.append("body background is light")
        if audit["lightBackgrounds"]:
            failures.append(f"{len(audit['lightBackgrounds'])} light surfaces")
        if audit["lightSkeletonFills"]:
            failures.append(f"{len(audit['lightSkeletonFills'])} light skeleton fills")
        if audit["badText"]:
            failures.append(f"{len(audit['badText'])} dark text nodes")
        if audit["badLinks"]:
            failures.append(f"{len(audit['badLinks'])} low-contrast content links")
        if audit["linkProbeColors"] != ["rgb(85, 142, 255)", "rgb(85, 142, 255)"]:
            failures.append("night link color probe failed")
        if audit["quoteProbeColors"] != {
            "color": "rgb(194, 198, 207)",
            "border": "rgb(83, 88, 97)",
        }:
            failures.append("night quote color probe failed")
        if audit["codeProbeColors"] != {
            "wrapperBackground": "rgb(40, 43, 48)",
            "preBackground": "rgb(40, 43, 48)",
            "codeColor": "rgb(194, 198, 207)",
            "keywordColor": "rgb(85, 142, 255)",
            "commentColor": "rgb(145, 150, 161)",
            "inlineBackground": "rgb(40, 43, 48)",
            "inlineColor": "rgb(194, 198, 207)",
        }:
            failures.append("night code color probe failed")
    if responsive["documentWidth"]["scrollWidth"] > responsive["documentWidth"]["clientWidth"] + 1:
        failures.append("document overflows horizontally")
    if responsive["outOfBounds"]:
        failures.append(f"{len(responsive['outOfBounds'])} semantic roots exceed viewport")
    if responsive["unreachableCloseControls"]:
        failures.append("a visible close control is outside the viewport")
    if responsive["unreachableHeaderControls"]:
        failures.append("a required lean header control is unreachable")
    if responsive["collapsedWriteAreaControls"]:
        failures.append("a redesigned publisher control collapsed into a narrow column")
    home_navigation = responsive["homeNavigation"]
    if home_navigation and (
        home_navigation.get("missing")
        or not home_navigation.get("visible")
        or not home_navigation.get("usableWidth")
        or not home_navigation.get("withinViewport")
        or not home_navigation.get("localScroller")
        or not all(
            link["present"] and link["visible"] and link["labeled"]
            for link in home_navigation.get("primaryLinks", [])
        )
    ):
        failures.append("redesigned home primary navigation is unreachable")
    if desktop_guard["narrowMediaMatches"] or desktop_guard["responsiveHeaderGrid"] or desktop_guard["leanResponsivePadding"]:
        failures.append("narrow responsive shell leaked into desktop width")
    return {
        "case": case["name"],
        "audit": audit,
        "responsive": responsive,
        "desktopGuard": desktop_guard,
        "contentReady": content_ready,
        "failures": failures,
    }


def click_comment_button(cdp):
    return cdp.evaluate(
        """
        (() => {
            if (document.querySelector('.AnswerItem .Comments-container')) return 'already open';
            const button = [...document.querySelectorAll('.AnswerItem .ContentItem-actions button')]
                .find((element) => {
                    const rect = element.getBoundingClientRect();
                    return element.textContent.includes('评论') && rect.width > 0 && rect.height > 0;
                });
            if (!button) return null;
            button.scrollIntoView({block: 'center'});
            button.click();
            return button.textContent.trim();
        })()
        """
    )


def run_comments(cdp, case, screenshots=False, include_night=True):
    load_desktop_dom(cdp, case["url"])
    inject_scripts(cdp, include_night=include_night)
    if not click_comment_button(cdp):
        raise AssertionError("comments: no visible answer comment button")
    wait_until(cdp, "document.querySelector('.Comments-container .CommentContent')", 20)
    if include_night:
        wait_until(cdp, "document.getElementById('zhihu-night-mode-comments')", 10)
    normal = cdp.evaluate(COMMENT_AUDIT)
    normal_responsive = cdp.evaluate(RESPONSIVE_AUDIT)
    if screenshots:
        cdp.screenshot(OUTPUT / "comments-list.png")

    expanded = cdp.evaluate(
        """
        (() => {
            const root = document.querySelector('.Comments-container');
            const button = [...root.querySelectorAll('button, [role="button"]')]
                .find((element) => element.textContent.replace(/\u200b/g, '').trim().startsWith('查看全部'));
            if (!button) return null;
            button.scrollIntoView({block: 'center'});
            button.click();
            return button.textContent.trim();
        })()
        """
    )
    if not expanded:
        raise AssertionError("comments: no expandable reply thread in fixture page")
    wait_until(cdp, "document.querySelector('.Modal-content:has(.CommentContent)')", 20)
    loading = cdp.evaluate(COMMENT_AUDIT)
    if screenshots:
        cdp.screenshot(OUTPUT / "comments-expanded-loading.png")
    wait_until(
        cdp,
        "document.querySelectorAll('.Modal-content:has(.CommentContent) .CommentContent').length > 1",
        20,
    )
    deep = cdp.evaluate(COMMENT_AUDIT)
    deep_responsive = cdp.evaluate(RESPONSIVE_AUDIT)
    if screenshots:
        cdp.screenshot(OUTPUT / "comments-expanded-replies.png")

    failures = []
    for name, audit in (
        ("comments", normal),
        ("expanded loading", loading),
        ("expanded replies", deep),
    ):
        if not audit["commentCount"]:
            failures.append(f"{name}: no comments rendered")
        if include_night:
            if audit["badText"]:
                failures.append(f"{name}: {len(audit['badText'])} dark text nodes")
            if audit["lightBackgrounds"]:
                failures.append(f"{name}: {len(audit['lightBackgrounds'])} light surfaces")
    if deep["inputCount"] < 1:
        failures.append("expanded replies: reply editor missing")
    if deep["root"] != "expanded-replies":
        failures.append("expanded replies: modal audit root missing")
    if normal_responsive["documentWidth"]["scrollWidth"] > normal_responsive["documentWidth"]["clientWidth"] + 1:
        failures.append("comments: document overflows horizontally")
    for name, audit in (
        ("comments", normal_responsive),
        ("expanded replies", deep_responsive),
    ):
        if audit["outOfBounds"]:
            failures.append(f"{name}: semantic root exceeds viewport")
        if audit["unreachableCloseControls"]:
            failures.append(f"{name}: close control is outside the viewport")
    def reported_comment_audit(audit):
        if include_night:
            return audit
        return {
            key: audit[key]
            for key in ("root", "commentCount", "inputCount")
        }

    return {
        "case": case["name"],
        "normal": reported_comment_audit(normal),
        "loading": reported_comment_audit(loading),
        "expanded": reported_comment_audit(deep),
        "responsive": {
            "normal": normal_responsive,
            "expanded": deep_responsive,
        },
        "failures": failures,
    }


def open_annotation_comments(cdp):
    return cdp.evaluate(
        """
        (() => {
            const highlight = document.querySelector('.highlight-wrap.has-comments');
            if (!highlight) return null;
            highlight.scrollIntoView({block: 'center'});
            const range = document.createRange();
            range.selectNodeContents(highlight);
            const selection = getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange', {bubbles: true}));
            const rect = highlight.getBoundingClientRect();
            highlight.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                clientX: rect.left + Math.min(30, rect.width / 2),
                clientY: rect.top + rect.height / 2,
            }));
            highlight.click();
            return true;
        })()
        """
    )


def audit_annotation_close(cdp):
    return cdp.evaluate(
        """
        (() => {
            const button = document.querySelector(
                'button[aria-label="关闭"]:has(.Zi--Close)'
            );
            const rect = button.getBoundingClientRect();
            const panel = document.querySelector(
                'body > div > div > div:has(> div > button[aria-label="关闭"] > .Zi--Close) ' +
                '> div:has(> button[aria-label="关闭"] > .Zi--Close)'
            );
            const panelStyle = panel ? getComputedStyle(panel) : null;
            const visibleText = panel ? [...panel.querySelectorAll('p, span, button')]
                .filter((element) => {
                    const itemRect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return itemRect.width > 0 && itemRect.height > 0 &&
                        style.display !== 'none' && element.textContent.trim();
                }) : [];
            const viewportWidth = window.visualViewport?.width || innerWidth;
            const viewportHeight = window.visualViewport?.height || innerHeight;
            return {
                viewport: [viewportWidth, viewportHeight],
                rect: [rect.left, rect.top, rect.right, rect.bottom],
                fullyVisible: rect.left >= 0 && rect.right <= viewportWidth &&
                    rect.top >= 0 && rect.bottom <= viewportHeight,
                hitTarget: document.elementFromPoint(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2
                )?.closest('button') === button,
                background: getComputedStyle(button).backgroundColor,
                panelBackground: panelStyle?.backgroundColor || null,
                badTextCount: visibleText.filter((element) =>
                    ['rgb(25, 27, 31)', 'rgb(55, 58, 64)', 'rgb(26, 26, 26)']
                        .includes(getComputedStyle(element).color)
                ).length,
            };
        })()
        """
    )


def run_annotation(cdp, case, screenshots=False, include_night=True):
    load_desktop_dom(cdp, case["url"])
    inject_scripts(cdp, include_night=include_night)
    try:
        wait_until(cdp, "document.querySelector('.highlight-wrap.has-comments')", 20)
    except TimeoutError:
        return {
            "case": case["name"],
            "skipped": "live sample has no annotated-comment marker",
            "failures": [],
        }
    if not open_annotation_comments(cdp):
        raise AssertionError("annotation: no highlighted text with comments")
    wait_until(cdp, "document.querySelector('svg.ZDI--ChatBubble24')", 20)
    opened = cdp.evaluate(
        """
        (() => {
            const icon = document.querySelector('svg.ZDI--ChatBubble24');
            const action = icon?.parentElement;
            if (!action) return false;
            action.click();
            return true;
        })()
        """
    )
    if not opened:
        raise AssertionError("annotation: comment action is missing")
    wait_until(
        cdp,
        "document.querySelector('button[aria-label=\"关闭\"]:has(.Zi--Close)')",
        20,
    )
    audits = {str(NARROW_WIDTH): audit_annotation_close(cdp)}
    set_viewport(cdp, 390, 844)
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 200))")
    audits["390"] = audit_annotation_close(cdp)
    if screenshots:
        cdp.screenshot(OUTPUT / "annotation-comments.png")
    failures = []
    for width, audit in audits.items():
        if not audit["fullyVisible"]:
            failures.append(f"{width}px: close control is outside the viewport")
        if not audit["hitTarget"]:
            failures.append(f"{width}px: close control is covered by another element")
        if audit["background"] == "rgba(0, 0, 0, 0)":
            failures.append(f"{width}px: close control has no contrasting background")
        if include_night and audit["panelBackground"] in BAD_BACKGROUNDS:
            failures.append(f"{width}px: annotation panel remains light")
        if include_night and audit["badTextCount"]:
            failures.append(f"{width}px: annotation panel has dark text")
    return {"case": case["name"], "audits": audits, "failures": failures}


def load_question_interaction(cdp, url, include_night=True):
    load_desktop_dom(cdp, url)
    inject_scripts(cdp, include_night=include_night)
    wait_until(cdp, "document.querySelector('.AnswerItem')", 30)


def run_interactions(cdp, case, screenshots=False, include_night=True):
    load_question_interaction(cdp, case["url"], include_night)
    editor_clicked = cdp.evaluate(
        """
        (() => {
            const button = [...document.querySelectorAll('button')].find((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 &&
                    element.textContent.replace(/\\s+/g, '').includes('写回答');
            });
            if (!button) return false;
            button.click();
            return true;
        })()
        """
    )
    if editor_clicked:
        wait_until(cdp, "document.querySelector('.AnswerForm .RichText--editable')", 15)
    editor = cdp.evaluate(
        """
        (() => {
            const form = document.querySelector('.AnswerForm');
            if (!form) return null;
            form.scrollIntoView({block: 'start'});
            const editable = form.querySelector('.RichText--editable');
            const toolbar = form.querySelector('.Toolbar, .RichText-toolbar');
            const sticky = [...form.querySelectorAll('.Sticky')]
                .find((element) => !element.matches('.AIAssistantPanelV2-container'));
            const summarize = (element) => {
                if (!element) return null;
                const rect = element.getBoundingClientRect();
                return [rect.left, rect.top, rect.right, rect.bottom];
            };
            return {
                form: summarize(form),
                editable: summarize(editable),
                toolbar: summarize(toolbar),
                sticky: summarize(sticky),
                viewportWidth: document.documentElement.clientWidth,
                background: getComputedStyle(form).backgroundColor,
                badToolbarControls: [...form.querySelectorAll(
                    '.ToolbarButton, .RichText-toolbar button'
                )].filter((element) => {
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 &&
                        __BAD_TEXT_COLORS__.includes(
                            getComputedStyle(element).color
                        );
                }).length,
                lightSurfaces: [...document.body.querySelectorAll('*')].filter((element) => {
                    const rect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return rect.width > 20 && rect.height > 8 && rect.left < innerWidth &&
                        rect.right > 0 && rect.top < innerHeight && rect.bottom > 0 &&
                        (form.contains(element) ||
                            (rect.top >= form.getBoundingClientRect().top - 120 &&
                             rect.bottom <= form.getBoundingClientRect().bottom)) &&
                        !['IMG', 'VIDEO', 'CANVAS'].includes(element.tagName) &&
                        ['rgb(255, 255, 255)', 'rgb(248, 248, 250)']
                            .includes(style.backgroundColor);
                }).slice(0, 20).map((element) => ({
                    tag: element.tagName,
                    classes: typeof element.className === 'string' ? element.className : '',
                    value: getComputedStyle(element).backgroundColor,
                    rect: summarize(element),
                    parentClasses: typeof element.parentElement?.className === 'string'
                        ? element.parentElement.className : '',
                })),
            };
        })()
        """.replace("__BAD_TEXT_COLORS__", json.dumps(BAD_TEXT_COLORS))
    )
    if screenshots:
        cdp.screenshot(OUTPUT / "interaction-answer-editor.png")

    load_question_interaction(cdp, case["url"], include_night)
    share_clicked = cdp.evaluate(
        """
        (() => {
            const button = document.querySelector('.ShareMenu-toggler button');
            if (!button) return false;
            button.scrollIntoView({block: 'center'});
            button.click();
            return true;
        })()
        """
    )
    if share_clicked:
        wait_until(cdp, "document.querySelector('.Popover-content .Menu')", 15)
    share = cdp.evaluate(
        """
        (() => {
            const popover = [...document.querySelectorAll('.Popover-content')]
                .find((element) => {
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && element.querySelector('.Menu');
                });
            if (!popover) return null;
            const rect = popover.getBoundingClientRect();
            const style = getComputedStyle(popover);
            return {
                rect: [rect.left, rect.top, rect.right, rect.bottom],
                viewport: [document.documentElement.clientWidth, innerHeight],
                background: style.backgroundColor,
                color: style.color,
            };
        })()
        """
    )
    if screenshots:
        cdp.screenshot(OUTPUT / "interaction-share-menu.png")

    failures = []
    if not editor_clicked or not editor:
        failures.append("answer editor did not open")
    else:
        editable_rect = editor.get("editable")
        if (
            not editable_rect
            or editable_rect[2] - editable_rect[0] < 20
            or editable_rect[3] - editable_rect[1] < 20
        ):
            failures.append("answer editor editable is not visible")
        elif editable_rect[2] - editable_rect[0] < editor["viewportWidth"] - 2:
            failures.append("answer editor editable is narrower than viewport")
        for name in ("form", "editable", "toolbar", "sticky"):
            rect = editor.get(name)
            if rect and (rect[0] < -1 or rect[2] > editor["viewportWidth"] + 1):
                failures.append(f"answer editor {name} exceeds viewport")
        if include_night and editor["background"] in BAD_BACKGROUNDS:
            failures.append("answer editor remains light")
        if include_night and editor["badToolbarControls"]:
            failures.append("answer editor toolbar has dark text")
        if include_night and editor["lightSurfaces"]:
            failures.append(
                f"answer editor has {len(editor['lightSurfaces'])} light surfaces"
            )
    if not share_clicked or not share:
        failures.append("share menu did not open")
    else:
        rect = share["rect"]
        viewport = share["viewport"]
        if rect[0] < -1 or rect[2] > viewport[0] + 1 or rect[1] < -1 or rect[3] > viewport[1] + 1:
            failures.append("share menu exceeds viewport")
        if include_night and share["background"] in BAD_BACKGROUNDS:
            failures.append("share menu remains light")
    return {
        "case": case["name"],
        "editor": editor,
        "share": share,
        "failures": failures,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9222)
    parser.add_argument(
        "--document-start", action="store_true",
        help="Inject before page scripts on each navigation, not after the DOM loads.",
    )
    parser.add_argument(
        "--screenshots",
        action="store_true",
        help="Save local screenshots; disabled by default.",
    )
    parser.add_argument(
        "--case",
        action="append",
        help="Run one named case; repeat for multiple cases. Defaults to all.",
    )
    parser.add_argument(
        "--resize-only",
        action="store_true",
        help="Inject only the responsive script and skip night-mode color assertions.",
    )
    args = parser.parse_args()
    selected = set(args.case or [])
    state_cases = (CASES["comments"], CASES["annotation"], CASES["interactions"])
    known = {case["name"] for case in CASES["pages"]} | {
        case["name"] for case in state_cases
    }
    unknown = selected - known
    if unknown:
        parser.error(f"unknown cases: {', '.join(sorted(unknown))}")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    cdp = CDP(args.port)
    registration = None
    results = {
        "target": {"id": cdp.target["id"]},
        "results": [],
    }
    try:
        cdp.command("Page.enable")
        cdp.command("Network.enable")
        cdp.command("Network.setCacheDisabled", {"cacheDisabled": True})
        cdp.command(
            "Emulation.setUserAgentOverride",
            {"userAgent": WINDOWS_UA, "platform": "Win32"},
        )
        cdp.command("Emulation.setTouchEmulationEnabled", {"enabled": False})
        if args.document_start:
            cdp.document_start = True
            registration = cdp.command("Page.addScriptToEvaluateOnNewDocument", {
                "worldName": "zhihu-userscripts-regression",
                "source": "if (window.top === window && /(^|\\.)zhihu\\.com$/.test(location.hostname)) {\n"
                    + script_source(not args.resize_only) + "\n}",
            })["identifier"]
        for case in CASES["pages"]:
            if not selected or case["name"] in selected:
                url = resolve_case_url(case)
                if not url:
                    results["results"].append(
                        {
                            "case": case["name"],
                            "skipped": f"set {case.get('urlEnv')} or {case.get('localKey')}",
                            "failures": [],
                        }
                    )
                    continue
                results["results"].append(
                    run_page(
                        cdp,
                        {**case, "url": url},
                        args.screenshots,
                        include_night=not args.resize_only,
                    )
                )
        comment_case = CASES["comments"]
        if not selected or comment_case["name"] in selected:
            results["results"].append(
                run_comments(
                    cdp,
                    comment_case,
                    args.screenshots,
                    include_night=not args.resize_only,
                )
            )
        annotation_case = CASES["annotation"]
        if not selected or annotation_case["name"] in selected:
            results["results"].append(
                run_annotation(
                    cdp,
                    annotation_case,
                    args.screenshots,
                    include_night=not args.resize_only,
                )
            )
        interaction_case = CASES["interactions"]
        if not selected or interaction_case["name"] in selected:
            results["results"].append(
                run_interactions(
                    cdp,
                    interaction_case,
                    args.screenshots,
                    include_night=not args.resize_only,
                )
            )
    finally:
        if registration:
            cdp.command("Page.removeScriptToEvaluateOnNewDocument", {"identifier": registration})
        cdp.command("Network.setCacheDisabled", {"cacheDisabled": False})
        cdp.close()

    report = OUTPUT / "report.json"
    report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    failures = [
        f"{result['case']}: {failure}"
        for result in results["results"]
        for failure in result["failures"]
    ]
    if failures:
        raise SystemExit("\n".join(failures))


if __name__ == "__main__":
    main()
