#!/usr/bin/env python3
"""Live narrow-screen regression checks against the first Zhihu Chrome tab."""

import argparse
import base64
import json
import time
import urllib.request
from pathlib import Path

import websocket


PROJECT = Path(__file__).resolve().parents[1]
CASES = json.loads((PROJECT / "tests" / "cases.json").read_text(encoding="utf-8"))
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


def set_viewport(cdp, width):
    cdp.command(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": width,
            "height": HEIGHT,
            "deviceScaleFactor": 1,
            "mobile": False,
        },
    )


def load_desktop_dom(cdp, url):
    set_viewport(cdp, DESKTOP_WIDTH)
    cdp.command("Page.navigate", {"url": url})
    wait_until(cdp, "document.readyState !== 'loading'", timeout=35)
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 1000))")


def inject_scripts(cdp):
    cdp.evaluate(
        "document.getElementById('zhihu-desktop-responsive')?.remove();"
        "document.getElementById('zhihu-night-mode-fallbacks')?.remove();"
    )
    source = "\n".join(
        (PROJECT / name).read_text(encoding="utf-8")
        for name in ("zhihu-mobile-resize.user.js", "zhihu-night-mode.user.js")
    )
    cdp.evaluate(source)
    set_viewport(cdp, NARROW_WIDTH)
    # requestAnimationFrame can be indefinitely throttled when Chrome is in the background.
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 200))")
    wait_until(
        cdp,
        "document.documentElement.dataset.theme === 'dark' && "
        "document.getElementById('zhihu-night-mode-fallbacks') && "
        "(!document.querySelector('.AppHeader') || "
        "getComputedStyle(document.querySelector('.AppHeader')).backgroundColor !== "
        "'rgb(255, 255, 255)')",
        timeout=10,
    )


PAGE_AUDIT = f"""
(() => {{
    const badTextColors = {json.dumps(BAD_TEXT_COLORS)};
    const badBackgrounds = {json.dumps(BAD_BACKGROUNDS)};
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
        text: element.childElementCount ? '' : element.textContent.trim().slice(0, 60),
        value: getComputedStyle(element)[property],
    }});
    return {{
        url: location.href,
        title: document.title,
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
        text: element.childElementCount ? '' : element.textContent.trim().slice(0, 60),
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


def run_page(cdp, case):
    load_desktop_dom(cdp, case["url"])
    inject_scripts(cdp)
    required = json.dumps(case["requiredAny"], ensure_ascii=False)
    found = wait_until(
        cdp,
        f"{required}.some((selector) => document.querySelector(selector))",
        timeout=15,
    )
    if not found:
        raise AssertionError(f"{case['name']}: no required semantic root")
    cdp.evaluate("scrollTo(0, 0)")
    audit = cdp.evaluate(PAGE_AUDIT)
    cdp.screenshot(OUTPUT / f"{case['name']}-top.png")
    cdp.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
    cdp.evaluate("new Promise(resolve => setTimeout(resolve, 300))")
    cdp.screenshot(OUTPUT / f"{case['name']}-bottom.png")
    failures = []
    if audit["theme"] != "dark":
        failures.append("data-theme is not dark")
    if audit["body"]["background"] in BAD_BACKGROUNDS:
        failures.append("body background is light")
    if audit["lightBackgrounds"]:
        failures.append(f"{len(audit['lightBackgrounds'])} light surfaces")
    if audit["badText"]:
        failures.append(f"{len(audit['badText'])} dark text nodes")
    if audit["documentWidth"]["scrollWidth"] > audit["documentWidth"]["clientWidth"] + 1:
        failures.append("document overflows horizontally")
    return {"case": case["name"], "audit": audit, "failures": failures}


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


def run_comments(cdp, case):
    load_desktop_dom(cdp, case["url"])
    inject_scripts(cdp)
    if not click_comment_button(cdp):
        raise AssertionError("comments: no visible answer comment button")
    wait_until(cdp, "document.querySelector('.Comments-container .CommentContent')", 20)
    normal = cdp.evaluate(COMMENT_AUDIT)
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
    cdp.screenshot(OUTPUT / "comments-expanded-loading.png")
    wait_until(
        cdp,
        "document.querySelectorAll('.Modal-content:has(.CommentContent) .CommentContent').length > 1",
        20,
    )
    deep = cdp.evaluate(COMMENT_AUDIT)
    cdp.screenshot(OUTPUT / "comments-expanded-replies.png")

    failures = []
    for name, audit in (
        ("comments", normal),
        ("expanded loading", loading),
        ("expanded replies", deep),
    ):
        if not audit["commentCount"]:
            failures.append(f"{name}: no comments rendered")
        if audit["badText"]:
            failures.append(f"{name}: {len(audit['badText'])} dark text nodes")
        if audit["lightBackgrounds"]:
            failures.append(f"{name}: {len(audit['lightBackgrounds'])} light surfaces")
    if deep["inputCount"] < 1:
        failures.append("expanded replies: reply editor missing")
    if deep["root"] != "expanded-replies":
        failures.append("expanded replies: modal audit root missing")
    return {
        "case": case["name"],
        "normal": normal,
        "loading": loading,
        "expanded": deep,
        "failures": failures,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9222)
    parser.add_argument(
        "--case",
        action="append",
        help="Run one named case; repeat for multiple cases. Defaults to all.",
    )
    args = parser.parse_args()
    selected = set(args.case or [])
    known = {case["name"] for case in CASES["pages"]} | {CASES["comments"]["name"]}
    unknown = selected - known
    if unknown:
        parser.error(f"unknown cases: {', '.join(sorted(unknown))}")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    cdp = CDP(args.port)
    results = {
        "target": {"id": cdp.target["id"], "url": cdp.target["url"]},
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
                results["results"].append(run_page(cdp, case))
        comment_case = CASES["comments"]
        if not selected or comment_case["name"] in selected:
            results["results"].append(run_comments(cdp, comment_case))
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
