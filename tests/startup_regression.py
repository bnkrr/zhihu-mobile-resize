#!/usr/bin/env python3
"""Test document-start injection while a synthetic parser resource is stalled.

Uses only the first Zhihu CDP tab. Fetch interception serves an artificial page;
no account content is captured, and the synthetic request never reaches Zhihu.
"""

import argparse
import base64
import json
import time

from cdp_regression import CDP, OUTPUT, PROJECT, WINDOWS_UA, set_viewport, wait_until


TEST_URL = "https://www.zhihu.com/question/0?zmr-startup-test=1"
SLOW_URL = "https://www.zhihu.com/__zmr_startup_test__/slow.js"
WORLD = "zmr-startup-regression"
FIXTURE = f"""<!doctype html>
<html data-theme="light"><head><meta charset="utf-8">
<title>Synthetic userscript startup test</title>
<style>
html, body {{ min-width: 1032px; background: white; }}
body {{ margin: 0; }}
.Question-main {{ width: 1032px; }}
.Question-mainColumn {{ width: 694px; }}
.Card {{ background: white; height: 180px; }}
</style></head><body>
<div class="QuestionPage"><div class="Question-main"><main class="Question-mainColumn">
<article class="Card">Synthetic layout probe</article>
</main></div></div>
<script src="{SLOW_URL}"></script>
</body></html>"""


class StartupCDP(CDP):
    def __init__(self, port):
        super().__init__(port)
        self.responses = {}
        self.context_id = None
        self.blocked_request = None

    def send(self, method, params=None):
        self.message_id += 1
        self.socket.send(json.dumps({
            "id": self.message_id, "method": method, "params": params or {},
        }))
        return self.message_id

    def receive(self):
        message = json.loads(self.socket.recv())
        if "id" in message:
            self.responses[message["id"]] = message
            return
        params = message.get("params", {})
        if message.get("method") == "Runtime.executionContextCreated":
            if params["context"].get("name") == WORLD:
                self.context_id = params["context"]["id"]
        if message.get("method") != "Fetch.requestPaused":
            return
        url = params["request"]["url"]
        if url == TEST_URL:
            self.send("Fetch.fulfillRequest", {
                "requestId": params["requestId"], "responseCode": 200,
                "responseHeaders": [
                    {"name": "Content-Type", "value": "text/html; charset=utf-8"},
                    {"name": "Cache-Control", "value": "no-store"},
                ],
                "body": base64.b64encode(FIXTURE.encode()).decode(),
            })
        elif url == SLOW_URL:
            self.blocked_request = params["requestId"]
        else:
            self.send("Fetch.continueRequest", {"requestId": params["requestId"]})

    def command(self, method, params=None):
        request_id = self.send(method, params)
        while request_id not in self.responses:
            self.receive()
        response = self.responses.pop(request_id)
        if "error" in response:
            raise RuntimeError(response["error"])
        return response.get("result", {})

    def startup_state(self):
        return self.command("Runtime.evaluate", {
            "expression": "globalThis.__zmrStartup",
            "contextId": self.context_id,
            "returnByValue": True,
        })["result"].get("value")


AUDIT = """(() => {
    const root = document.documentElement;
    const card = document.querySelector('.Card');
    const main = document.querySelector('.Question-mainColumn');
    const styles = ['zhihu-desktop-responsive', 'zhihu-desktop-responsive-route',
                    'zhihu-night-mode-fallbacks'];
    return {
        readyState: document.readyState,
        domContentLoaded: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
        innerWidth, clientWidth: root.clientWidth, scrollWidth: root.scrollWidth,
        mainWidth: main.getBoundingClientRect().width,
        theme: root.dataset.theme,
        background: getComputedStyle(card).backgroundColor,
        styleCounts: Object.fromEntries(styles.map(id =>
            [id, document.querySelectorAll('#' + id).length])),
        viewport: document.querySelector('meta[name="viewport"]')?.content,
        viewports: [...document.querySelectorAll('meta[name="viewport"]')].map(meta => meta.content),
    };
})()"""


def startup_source(names):
    # A never-settling GM API models an extension/background injection delay.
    # The actual source files, not a test copy of their bootstrap, run here.
    source = """
        globalThis.__zmrStartup = {
            rootAtEntry: Boolean(document.documentElement),
            readyStateAtEntry: document.readyState,
            gmCalls: 0, errors: [],
        };
        globalThis.GM = { addStyle() {
            __zmrStartup.gmCalls++;
            return new Promise(() => {});
        } };
    """
    for name in names:
        code = (PROJECT / name).read_text(encoding="utf-8")
        source += "\ntry {\n" + code + "\n} catch (error) {\n"
        source += f"__zmrStartup.errors.push({json.dumps(name)} + ': ' + error.name);\n}}\n"
    return source


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=9222)
    parser.add_argument("--script", choices=("resize", "night", "both"), default="both")
    parser.add_argument("--screenshots", action="store_true")
    args = parser.parse_args()
    resize = args.script in ("resize", "both")
    night = args.script in ("night", "both")
    names = (["zhihu-mobile-resize.user.js"] if resize else []) + (
        ["zhihu-night-mode.user.js"] if night else []
    )
    source = startup_source(names)
    cdp = StartupCDP(args.port)
    original_url = cdp.target["url"]  # Restore in memory; never include it in reports.
    registration = None
    results = []
    try:
        cdp.command("Page.enable")
        cdp.command("Runtime.enable")
        cdp.command("Emulation.setUserAgentOverride", {
            "userAgent": WINDOWS_UA, "platform": "Win32",
        })
        cdp.command("Emulation.setTouchEmulationEnabled", {"enabled": False})
        cdp.command("Fetch.enable", {"patterns": [
            {"urlPattern": TEST_URL, "requestStage": "Request"},
            {"urlPattern": SLOW_URL, "requestStage": "Request"},
        ]})
        registration = cdp.command("Page.addScriptToEvaluateOnNewDocument", {
            "source": source, "worldName": WORLD,
        })["identifier"]
        for width, height in ((403, 730), (390, 844)):
            set_viewport(cdp, width, height)
            cdp.blocked_request = None
            cdp.context_id = None
            cdp.command("Page.navigate", {"url": TEST_URL})
            deadline = time.monotonic() + 10
            while not (cdp.blocked_request and cdp.context_id):
                if time.monotonic() > deadline:
                    raise TimeoutError("Synthetic parser-blocking request did not start")
                cdp.receive()
            early = cdp.evaluate(AUDIT)
            state = cdp.startup_state()
            failures = []
            if state["rootAtEntry"] or state["readyStateAtEntry"] != "loading":
                failures.append("test did not execute before the document root existed")
            if state["errors"]:
                failures.append("userscript threw during document-start")
            if state["gmCalls"]:
                failures.append("stylesheet depends on the delayed GM API")
            if early["readyState"] != "loading" or early["domContentLoaded"]:
                failures.append("fixture was not still waiting for the slow resource")
            if resize:
                if early["mainWidth"] > early["clientWidth"]:
                    failures.append("responsive column was not constrained before DOMContentLoaded")
                if early["scrollWidth"] > early["clientWidth"]:
                    failures.append("document overflows before DOMContentLoaded")
                if "width=device-width" not in (early["viewport"] or ""):
                    failures.append("viewport metadata was not set during parsing")
            if night and (early["theme"] != "dark" or early["background"] == "rgb(255, 255, 255)"):
                failures.append("night colors were not applied before DOMContentLoaded")
            expected = (["zhihu-desktop-responsive", "zhihu-desktop-responsive-route"] if resize else []) + (
                ["zhihu-night-mode-fallbacks"] if night else []
            )
            if any(early["styleCounts"][name] != 1 for name in expected):
                failures.append("an early stylesheet is missing or duplicated")
            if resize:
                cdp.evaluate("""(() => {
                    const meta = document.createElement('meta');
                    meta.name = 'viewport';
                    meta.content = 'width=1032';
                    document.head.appendChild(meta);
                    document.querySelector('meta[name="viewport"]').content = 'width=980';
                })()""")
                updated = cdp.evaluate(AUDIT)
                if len(updated["viewports"]) != 2 or any(
                    content != early["viewport"] for content in updated["viewports"]
                ):
                    failures.append("later page viewport metadata overwrote the narrow viewport")
            if args.screenshots:
                OUTPUT.mkdir(parents=True, exist_ok=True)
                cdp.screenshot(OUTPUT / f"startup-{args.script}-{width}.png")
            cdp.command("Fetch.failRequest", {
                "requestId": cdp.blocked_request, "errorReason": "TimedOut",
            })
            cdp.blocked_request = None
            wait_until(cdp, "document.readyState === 'complete'", timeout=10)
            if night:
                cdp.evaluate("document.documentElement.dataset.theme = 'light'")
                try:
                    wait_until(cdp, "document.documentElement.dataset.theme === 'dark'", timeout=2)
                except TimeoutError:
                    failures.append("theme observer did not recover a later light-theme reset")
            # Repeated Console/CDP injection must not duplicate style elements.
            cdp.command("Runtime.evaluate", {"expression": source, "contextId": cdp.context_id})
            after = cdp.evaluate(AUDIT)
            if any(after["styleCounts"][name] != 1 for name in expected):
                failures.append("reinjection left styles missing or duplicated")
            results.append({"viewport": [width, height], "startup": state,
                            "beforeResourceFailure": early, "afterResourceFailure": after,
                            "failures": failures})
    finally:
        if registration:
            cdp.command("Page.removeScriptToEvaluateOnNewDocument", {"identifier": registration})
        if cdp.blocked_request:
            cdp.command("Fetch.failRequest", {
                "requestId": cdp.blocked_request, "errorReason": "Aborted",
            })
        cdp.command("Fetch.disable")
        set_viewport(cdp, 1032)
        cdp.command("Page.navigate", {"url": original_url})
        cdp.close()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / f"startup-{args.script}.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8",
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))
    raise SystemExit(1 if any(result["failures"] for result in results) else 0)


if __name__ == "__main__":
    main()
