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


def load_desktop_dom(cdp, url):
    set_viewport(cdp, DESKTOP_WIDTH)
    cdp.command("Page.navigate", {"url": url})
    wait_until(cdp, "document.readyState !== 'loading'", timeout=35)
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 1000))")


def resolve_case_url(case):
    if case.get("url"):
        return case["url"]
    if case.get("urlEnv") and os.environ.get(case["urlEnv"]):
        return os.environ[case["urlEnv"]]
    if case.get("localKey") and LOCAL_CASES.get(case["localKey"]):
        return LOCAL_CASES[case["localKey"]]
    return None


def inject_scripts(cdp, include_night=True):
    cdp.evaluate(
        "document.getElementById('zhihu-desktop-responsive')?.remove();"
        "document.getElementById('zhihu-night-mode-fallbacks')?.remove();"
    )
    names = ["zhihu-mobile-resize.user.js"]
    if include_night:
        names.append("zhihu-night-mode.user.js")
    source = "\n".join(
        (PROJECT / name).read_text(encoding="utf-8") for name in names
    )
    cdp.evaluate(source)
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
        '.AppHeader', '.Topstory-container', '.Topstory-mainColumn',
        '.HotList', '.HotItem', '.Search-container', '.SearchMain',
        '.SearchResult-Card', '.TopicMetaCard', '.Topic-bar', '.TopicFeedList',
        '.QuestionHeader', '.Question-mainColumn', '.ProfileHeader',
        '.Profile-mainColumn', '.Post-NormalMain', '.Comments-container',
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
    const roots = [...document.querySelectorAll(selector)].filter(visible);
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
        '.Search-container, .TopicMetaCard, .TopicFeedList, .Post-NormalMain, ' +
        '.Comments-container, .Modal-content'
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
        'probe</span></p></blockquote></div>';
    document.body.appendChild(linkProbe);
    const linkProbeColors = [...linkProbe.querySelectorAll('a')]
        .map((element) => getComputedStyle(element).color);
    const quoteProbe = linkProbe.querySelector('blockquote');
    const quoteTextProbe = quoteProbe.querySelector('span');
    const quoteProbeColors = {{
        color: getComputedStyle(quoteTextProbe).color,
        border: getComputedStyle(quoteProbe).borderLeftColor,
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
    load_desktop_dom(cdp, case["url"])
    inject_scripts(cdp, include_night=include_night)
    required = json.dumps(case["requiredAny"], ensure_ascii=False)
    found = wait_until(
        cdp,
        f"{required}.some((selector) => document.querySelector(selector))",
        timeout=15,
    )
    if not found:
        raise AssertionError(f"{case['name']}: no required semantic root")
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
            };
        })()
        """
    )
    failures = []
    if include_night:
        if audit["theme"] != "dark":
            failures.append("data-theme is not dark")
        if audit["body"]["background"] in BAD_BACKGROUNDS:
            failures.append("body background is light")
        if audit["lightBackgrounds"]:
            failures.append(f"{len(audit['lightBackgrounds'])} light surfaces")
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
    if responsive["documentWidth"]["scrollWidth"] > responsive["documentWidth"]["clientWidth"] + 1:
        failures.append("document overflows horizontally")
    if responsive["outOfBounds"]:
        failures.append(f"{len(responsive['outOfBounds'])} semantic roots exceed viewport")
    if responsive["unreachableCloseControls"]:
        failures.append("a visible close control is outside the viewport")
    if desktop_guard["narrowMediaMatches"] or desktop_guard["responsiveHeaderGrid"]:
        failures.append("narrow responsive shell leaked into desktop width")
    return {
        "case": case["name"],
        "audit": audit,
        "responsive": responsive,
        "desktopGuard": desktop_guard,
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
            };
        })()
        """
    )


def run_annotation(cdp, case, screenshots=False):
    load_desktop_dom(cdp, case["url"])
    inject_scripts(cdp, include_night=False)
    wait_until(cdp, "document.querySelector('.highlight-wrap.has-comments')", 20)
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
    return {"case": case["name"], "audits": audits, "failures": failures}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9222)
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
    state_cases = (CASES["comments"], CASES["annotation"])
    known = {case["name"] for case in CASES["pages"]} | {
        case["name"] for case in state_cases
    }
    unknown = selected - known
    if unknown:
        parser.error(f"unknown cases: {', '.join(sorted(unknown))}")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    cdp = CDP(args.port)
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
                run_annotation(cdp, annotation_case, args.screenshots)
            )
    finally:
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
