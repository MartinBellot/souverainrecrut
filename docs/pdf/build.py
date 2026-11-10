"""
Version PDF de RAPPORT.md (lancé par docs/pdf/build.sh).

    python3 build.py extract   extrait les schémas Mermaid dans build/diagram-N.mmd
    python3 build.py render    HTML mis en page → PDF (Chromium), sommaire paginé, pieds de page

Le rendu se fait en deux passes : la première sert à repérer la page de chaque section
pour numéroter le sommaire, la seconde produit le document final.
"""
import html
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "docs" / "pdf"
BUILD = HERE / "build"
SOURCE = ROOT / "RAPPORT.md"
OUTPUT = ROOT / "RAPPORT.pdf"

MERMAID = re.compile(r"```mermaid\n(.*?)```", re.S)
SECTION = re.compile(r"^## (\d+)\. (.+)$", re.M)


def extract():
    BUILD.mkdir(exist_ok=True)
    for i, block in enumerate(MERMAID.findall(SOURCE.read_text(encoding="utf-8")), 1):
        (BUILD / f"diagram-{i}.mmd").write_text(block, encoding="utf-8")
        print(f"  diagram-{i}.mmd")


# ------------------------------------------------------------------ HTML
def body_html(markdown_text):
    import markdown

    # Corps du rapport : à partir de la première section (l'en-tête devient la couverture).
    text = markdown_text[SECTION.search(markdown_text).start():]
    counter = iter(range(1, 100))
    text = MERMAID.sub(
        lambda m: f'\n<figure class="diagram"><img src="docs/pdf/build/diagram-{next(counter)}.png"></figure>\n',
        text,
    )
    text = re.sub(r"^---\s*$", "", text, flags=re.M)
    # Python-Markdown exige une ligne vide avant une liste.
    text = re.sub(r"(?m)^([^\n-][^\n]*)\n(- )", r"\1\n\n\2", text)

    out = markdown.markdown(text, extensions=["tables", "fenced_code"])

    def section(m):
        num, title = m.group(1), m.group(2)
        return (
            f'<h2 id="s{num}"><span class="num">{int(num):02d}</span>'
            f'<span class="title">{title}</span></h2>'
        )

    out = re.sub(r"<h2>(\d+)\. (.+?)</h2>", section, out)
    # Paragraphe réduit à un intitulé en gras → sous-titre.
    out = re.sub(r"<p><strong>([^<]+)</strong>(\s*\([^)]*\))?\s*:?</p>",
                 lambda m: f"<h3>{m.group(1)}</h3>", out)
    # Captures : figure + légende.
    out = re.sub(
        r'<p><img alt="([^"]*)" src="([^"]+)"\s*/?></p>',
        lambda m: f'<figure class="shot"><img src="{m.group(2)}"><figcaption>{m.group(1)}</figcaption></figure>',
        out,
    )
    return out


def toc_html(markdown_text, pages):
    rows = []
    for num, title in SECTION.findall(markdown_text):
        page = pages.get(num, "")
        rows.append(
            f'<a class="toc-row" href="#s{num}"><span class="toc-num">{int(num):02d}</span>'
            f'<span class="toc-title">{html.escape(title)}</span><span class="toc-dots"></span>'
            f'<span class="toc-page">{page}</span></a>'
        )
    return "\n".join(rows)


def document(markdown_text, pages):
    css = (HERE / "style.css").read_text(encoding="utf-8")
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<base href="file:///work/">
<title>SouverainRecrut — Chaîne CI/CD du Backend</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=block" rel="stylesheet">
<style>{css}</style></head>
<body>

<section class="cover">
  <div class="cover-band"></div>
  <div class="cover-orb"></div>
  <div class="cover-inner">
    <p class="eyebrow">Rapport de projet · M2 DevOps · RNCP 40166</p>
    <h1>SouverainRecrut</h1>
    <p class="subtitle">Chaîne CI/CD du Backend</p>
    <p class="tagline">Du <code>git push</code> à la production : tests, qualité, image signée par son commit,
      provisionnement et déploiement approuvé, avec retour arrière éprouvé.</p>

    <div class="kpis">
      <div class="kpi"><b>330</b><span>tests automatisés</span></div>
      <div class="kpi"><b>100&nbsp;%</b><span>de couverture</span></div>
      <div class="kpi"><b>PASSED</b><span>Quality Gate SonarQube</span></div>
      <div class="kpi"><b>0</b><span>vulnérabilité bloquante</span></div>
    </div>

    <div class="pipeline">
      <span>GitHub</span><i></i><span>Jenkins</span><i></i><span>SonarQube</span><i></i><span>Trivy</span><i></i>
      <span>Docker Hub</span><i></i><span>GitLab CI</span><i></i><span class="accent">VPS</span>
    </div>

    <div class="cover-foot">
      <div>
        <p class="who">Martin BELLOT</p>
        <p class="muted">M2 · SUP DE VINCI Rennes · novembre 2026</p>
      </div>
      <dl>
        <dt>Dépôt</dt><dd><a href="https://github.com/MartinBellot/souverainrecrut/tree/Dev">github.com/MartinBellot/souverainrecrut · Dev</a></dd>
        <dt>Déploiement</dt><dd><a href="https://gitlab.com/martin.bellot.off/souverainrecrut">gitlab.com/martin.bellot.off/souverainrecrut</a></dd>
        <dt>Image</dt><dd><a href="https://hub.docker.com/r/martinbellot/souverainrecrut-backend">hub.docker.com/r/martinbellot/souverainrecrut-backend</a></dd>
        <dt>API</dt><dd><a href="http://148.230.115.48:4000/v1/info">148.230.115.48:4000/v1/info</a> · <a href="http://148.230.115.48:4000/api-docs/">Swagger</a></dd>
      </dl>
    </div>
  </div>
</section>

<section class="toc">
  <p class="eyebrow">Sommaire</p>
  <h2 class="toc-head">Contenu du rapport</h2>
  {toc_html(markdown_text, pages)}
</section>

<main>
{body_html(markdown_text)}
</main>
</body></html>"""


# ------------------------------------------------------------------ PDF
def print_pdf(page, markdown_text, pages):
    path = BUILD / "rapport.html"
    path.write_text(document(markdown_text, pages), encoding="utf-8")
    page.goto(f"file://{path}")
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    return page.pdf(format="A4", print_background=True, prefer_css_page_size=True)


def section_pages(pdf_bytes, markdown_text):
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    texts = [re.sub(r"\s+", " ", p.extract_text() or "") for p in reader.pages]
    pages, start = {}, 2
    for num, title in SECTION.findall(markdown_text):
        needle = re.sub(r"\s+", " ", title)[:30]
        for index in range(start, len(texts)):
            if needle in texts[index][:160]:
                pages[num] = index + 1
                start = index + 1
                break
    return pages


def footers(pdf_bytes):
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    total = len(reader.pages)
    for number, page in enumerate(reader.pages, 1):
        if number > 1:
            width, height = float(page.mediabox.width), float(page.mediabox.height)
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=(width, height))
            mm = 72 / 25.4
            c.setStrokeColorRGB(0.886, 0.910, 0.941)
            c.setLineWidth(0.5)
            c.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)
            c.setFont("Helvetica", 7.5)
            c.setFillColorRGB(0.392, 0.455, 0.545)
            c.drawString(20 * mm, 9.5 * mm, "SouverainRecrut  ·  Chaîne CI/CD du Backend  ·  Martin BELLOT")
            c.setFillColorRGB(0.310, 0.275, 0.898)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawRightString(width - 20 * mm, 9.5 * mm, f"{number} / {total}")
            c.save()
            page.merge_page(PdfReader(buffer).pages[0])
        writer.add_page(page)
    writer.add_metadata({
        "/Title": "SouverainRecrut — Chaîne CI/CD du Backend",
        "/Author": "Martin BELLOT",
        "/Subject": "Rapport de projet CI/CD — M2 SUP DE VINCI Rennes",
    })
    with open(OUTPUT, "wb") as handle:
        writer.write(handle)
    return total


def render():
    from playwright.sync_api import sync_playwright

    markdown_text = SOURCE.read_text(encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        draft = print_pdf(page, markdown_text, {})
        pages = section_pages(draft, markdown_text)
        final = print_pdf(page, markdown_text, pages)
        browser.close()
    missing = [n for n, _ in SECTION.findall(markdown_text) if n not in pages]
    total = footers(final)
    print(f"  RAPPORT.pdf : {total} pages" + (f" (sections non localisées : {missing})" if missing else ""))


if __name__ == "__main__":
    {"extract": extract, "render": render}[sys.argv[1]]()
