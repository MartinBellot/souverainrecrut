"""
Captures d'écran du rapport (Chromium headless, image Playwright officielle).

    docker run --rm -v "$PWD/docs/captures:/out" -v "$PWD/backend/coverage:/coverage:ro" \
      -e JENKINS_PASSWORD -e SONAR_PASSWORD -e GITLAB_PIPELINE \
      mcr.microsoft.com/playwright/python:v1.49.1-jammy \
      python /out/capture.py <capture> [<capture> ...]

Les identifiants sont lus dans l'environnement, jamais écrits ici.
"localhost" est redirigé vers l'hôte Docker pour joindre Jenkins (8080) et SonarQube (9000).
"""
import os
import sys

from playwright.sync_api import sync_playwright

OUT = "/out"
API = "http://148.230.115.48:4000"
JENKINS = "http://localhost:8080"
SONAR = "http://localhost:9000"
JOB = f"{JENKINS}/job/souverainrecrut-backend"
GITLAB = "https://gitlab.com/martin.bellot.off/souverainrecrut"


def jenkins_login(page):
    page.goto(f"{JENKINS}/login")
    page.fill("input[name=j_username]", "admin")
    page.fill("input[name=j_password]", os.environ["JENKINS_PASSWORD"])
    page.click("button[type=submit], input[type=submit]")
    page.wait_for_load_state("networkidle")


def sonar_login(page):
    page.goto(f"{SONAR}/sessions/new")
    page.fill("#login-input", "admin")
    page.fill("#password-input", os.environ["SONAR_PASSWORD"])
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")


def save(page, name, full_page=False):
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/{name}.png", full_page=full_page)
    print(f"  ✓ {name}.png")


# ---------------------------------------------------------------- captures
def jenkins_pipeline(page):
    jenkins_login(page)
    page.goto(JOB)
    page.wait_for_selector("table.jobsTable, .table-box, #pipeline-box", timeout=30000)
    save(page, "jenkins-pipeline")


def jenkins_tests(page):
    jenkins_login(page)
    page.goto(f"{JOB}/lastSuccessfulBuild/testReport/")
    save(page, "jenkins-tests")


def jenkins_build(page):
    jenkins_login(page)
    page.goto(f"{JOB}/lastSuccessfulBuild/")
    save(page, "jenkins-build")


def sonar_clean(page):
    """Ferme les bannières, le tour guidé et les popups promotionnels."""
    for selector in (
        "button:has-text('Not now')",
        "button:has-text('Got it')",
        "button:has-text('Dismiss')",
        "[role=alert] button[aria-label]",
        "button[aria-label='Dismiss']",
    ):
        for element in page.locator(selector).all():
            try:
                element.click(timeout=1500)
                page.wait_for_timeout(500)
            except Exception:
                pass


def sonar_dashboard(page):
    sonar_login(page)
    page.goto(f"{SONAR}/dashboard?id=souverainrecrut-backend&codeScope=overall")
    page.wait_for_timeout(4000)
    sonar_clean(page)
    if page.locator("text=Overall Code").count():
        page.locator("text=Overall Code").first.click()
        page.wait_for_timeout(2500)
    save(page, "sonarqube-dashboard", full_page=True)


def sonar_quality_gate(page):
    sonar_login(page)
    page.goto(f"{SONAR}/quality_gates/show/SouverainRecrut")
    page.wait_for_timeout(4000)
    sonar_clean(page)
    save(page, "sonarqube-quality-gate", full_page=True)


def coverage(page):
    page.goto("file:///coverage/lcov-report/index.html")
    save(page, "couverture")


def dockerhub(page):
    page.goto("https://hub.docker.com/r/martinbellot/souverainrecrut-backend/tags")
    page.wait_for_timeout(5000)
    for selector in ("#onetrust-accept-btn-handler", "button:has-text('Accept All')"):
        if page.locator(selector).count():
            page.locator(selector).first.click()
            page.wait_for_timeout(1500)
    save(page, "dockerhub-tags")


def gitlab_pipeline(page, name):
    page.goto(f"{GITLAB}/-/pipelines/{os.environ['GITLAB_PIPELINE']}")
    page.wait_for_timeout(6000)
    for selector in ("button:has-text('Accept All Cookies')", "#onetrust-accept-btn-handler"):
        if page.locator(selector).count():
            page.locator(selector).first.click()
            page.wait_for_timeout(1000)
    save(page, name)


def swagger(page):
    page.goto(f"{API}/api-docs/")
    page.wait_for_selector(".swagger-ui .opblock", timeout=30000)
    save(page, "swagger")


def api_info(page):
    page.goto(f"{API}/v1/info")
    save(page, "api-info")


TERMINAL_CSS = """
body { margin: 0; padding: 24px; background: #e9edf2; font-family: -apple-system, 'Segoe UI', sans-serif; }
.win { width: 1180px; border-radius: 10px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,.25); }
.bar { background: #2d3139; padding: 10px 14px; display: flex; align-items: center; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.title { color: #c9d1d9; font-size: 13px; margin-left: 12px; }
pre { margin: 0; background: #0d1117; color: #c9d1d9; padding: 18px 22px; font: 14px/1.55 'DejaVu Sans Mono', monospace; white-space: pre-wrap; }
.cmd { color: #7ee787; } .ok { color: #3fb950; } .chg { color: #d29922; } .skip { color: #6e7681; }
.err { color: #f85149; } .warn { color: #e3b341; } .dim { color: #8b949e; }
"""


def render_terminal(page, name):
    import html
    import re

    lines = open(f"{OUT}/terminal/{name}.txt", encoding="utf-8").read().rstrip("\n").split("\n")
    title = lines[0].lstrip("# ") if lines and lines[0].startswith("#") else name
    body = []
    for line in lines[1:]:
        text = html.escape(line)
        if line.startswith("$"):
            text = f'<span class="cmd">{text}</span>'
        elif re.match(r"^\s*(ok|✅|✓|→ témoin|Job succeeded)", line) or "passed" in line or "100%" in line:
            text = f'<span class="ok">{text}</span>'
        elif re.match(r"^\s*changed", line) or line.startswith(("↩", "💾")):
            text = f'<span class="chg">{text}</span>'
        elif re.match(r"^\s*skipping", line):
            text = f'<span class="skip">{text}</span>'
        elif line.startswith("❌"):
            text = f'<span class="err">{text}</span>'
        body.append(text)
    page.set_content(
        f"<html><head><meta charset='utf-8'><style>{TERMINAL_CSS}</style></head><body>"
        f"<div class='win'><div class='bar'><span class='dot' style='background:#ff5f56'></span>"
        f"<span class='dot' style='background:#ffbd2e'></span><span class='dot' style='background:#27c93f'></span>"
        f"<span class='title'>{html.escape(title)}</span></div><pre>{chr(10).join(body)}</pre></div></body></html>"
    )
    page.locator(".win").screenshot(path=f"{OUT}/terminal-{name}.png")
    print(f"  ✓ terminal-{name}.png")


SHOTS = {
    "jenkins-pipeline": jenkins_pipeline,
    "jenkins-tests": jenkins_tests,
    "jenkins-build": jenkins_build,
    "sonarqube-dashboard": sonar_dashboard,
    "sonarqube-quality-gate": sonar_quality_gate,
    "couverture": coverage,
    "dockerhub-tags": dockerhub,
    "swagger": swagger,
    "api-info": api_info,
}


def main(names):
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--host-resolver-rules=MAP localhost host.docker.internal"])
        for name in names:
            context = browser.new_context(
                viewport={"width": 1440, "height": 900}, device_scale_factor=2, locale="fr-FR"
            )
            page = context.new_page()
            try:
                if name.startswith("terminal:"):
                    render_terminal(page, name.split(":", 1)[1])
                elif name.startswith("gitlab-"):
                    gitlab_pipeline(page, name)
                else:
                    SHOTS[name](page)
            except Exception as error:  # une capture ratée ne bloque pas les autres
                print(f"  ✗ {name} : {error}")
            context.close()
        browser.close()


if __name__ == "__main__":
    main(sys.argv[1:])
