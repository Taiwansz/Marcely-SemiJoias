import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\Users\stdma\projetos\Marcely - SemiJoias")
SITE = ROOT / "site"
OUT_DIR = ROOT / "screenshots_audit"
OUT_DIR.mkdir(parents=True, exist_ok=True)

EMOJI_RE = re.compile(
    "[\U0001F300-\U0001F9FF\U0001FA00-\U0001FAFF\u2600-\u26FF\u2700-\u27BF]"
)


def pick_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_for_server(url, timeout=15.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.25)
    return False


def scan_violet_pixels(img_path):
    im = Image.open(img_path).convert("RGB")
    arr = np.asarray(im, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    diff = mx - mn
    sat = np.where(mx > 1e-6, diff / np.maximum(mx, 1e-6), 0.0)
    val = mx
    hue = np.zeros_like(mx)
    mask = diff > 1e-6
    mr = mask & (mx == r)
    mg = mask & (mx == g)
    mb = mask & (mx == b)
    hue[mr] = (60.0 * ((g[mr] - b[mr]) / diff[mr]) + 360.0) % 360.0
    hue[mg] = 60.0 * ((b[mg] - r[mg]) / diff[mg]) + 120.0
    hue[mb] = 60.0 * ((r[mb] - g[mb]) / diff[mb]) + 240.0
    violet = (hue >= 250.0) & (hue <= 330.0) & (sat > 0.28) & (val > 0.22)
    return int(np.sum(violet))


def collect_page_health(page, label):
    return page.evaluate(
        """(label) => {
          const imgs = Array.from(document.querySelectorAll('img'));
          const visibleImgs = imgs.filter(img => {
            const st = getComputedStyle(img);
            return st.display !== 'none' && st.visibility !== 'hidden' && img.offsetParent !== null;
          });
          const brokenImgs = visibleImgs
            .filter(img => !img.complete || img.naturalWidth === 0)
            .map(img => img.getAttribute('src') || img.src);
          const canvas = document.getElementById('marcelyRingCanvas');
          const canvasSize = canvas ? [canvas.width, canvas.height] : null;
          const bodyText = document.body ? document.body.innerText : '';
          return {
            label,
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            scrollHeight: document.documentElement.scrollHeight,
            totalImgs: imgs.length,
            visibleImgs: visibleImgs.length,
            brokenImgs,
            ring3dReady: Boolean(window.__marcelyRing3dReady),
            canvasSize,
            textLen: bodyText.length,
            bodySample: bodyText.slice(0, 120),
          };
        }""",
        label,
    )


def main():
    port = pick_free_port()
    base_url = f"http://127.0.0.1:{port}"
    env = os.environ.copy()
    env["PORT"] = str(port)
    proc = subprocess.Popen(
        ["node", "server.js"],
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    console_errors = []
    page_errors = []
    report = {
        "base_url": base_url,
        "desktop": {},
        "mobile": {},
        "crud_e2e": {},
        "violet_pixel_hits": {},
        "emoji_hits": {},
        "console_errors": console_errors,
        "page_errors": page_errors,
    }

    try:
        if not wait_for_server(f"{base_url}/api/health", timeout=15.0):
            raise RuntimeError("Marcely server.js did not start within 15s")

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-webgl",
                    "--ignore-gpu-blocklist",
                ],
            )

            # ===================== DESKTOP 1440x900 =====================
            ctx_d = browser.new_context(
                viewport={"width": 1440, "height": 900}, device_scale_factor=1.0
            )
            page = ctx_d.new_page()
            page.on(
                "console",
                lambda msg: console_errors.append(f"[desktop] {msg.text}")
                if msg.type == "error"
                else None,
            )
            page.on("pageerror", lambda err: page_errors.append(f"[desktop] {err}"))

            page.goto(f"{base_url}/index.html", wait_until="networkidle")
            page.wait_for_function("() => window.__marcelyRing3dReady === true", timeout=25000)
            page.evaluate("() => window.__marcelyRing3D?.forceSync()")
            page.wait_for_timeout(300)
            report["desktop"]["home_gold"] = collect_page_health(page, "desktop_home_gold")
            p1 = OUT_DIR / "01_desktop_hero_ring_gold.png"
            page.screenshot(path=str(p1), animations="disabled", timeout=60000)

            # Switch metal to Rhodium Nobre
            page.click('[data-ring-metal="rhodium"]')
            page.evaluate("() => window.__marcelyRing3D?.forceSync()")
            page.wait_for_timeout(250)
            p2 = OUT_DIR / "02_desktop_hero_ring_rhodium.png"
            page.screenshot(path=str(p2), animations="disabled", timeout=60000)

            # Switch back to gold and test Halo 5A camera preset
            page.click('[data-ring-metal="gold"]')
            page.click('[data-ring-preset="halo"]')
            page.evaluate("() => window.__marcelyRing3D?.forceSync()")
            page.wait_for_timeout(250)
            p2b = OUT_DIR / "02b_desktop_hero_ring_halo.png"
            page.screenshot(path=str(p2b), animations="disabled", timeout=60000)

            # Scroll to Apple-style Bento Grid (#acervo)
            page.evaluate("() => document.getElementById('acervo')?.scrollIntoView({behavior:'instant'})")
            page.wait_for_timeout(500)
            report["desktop"]["bento"] = collect_page_health(page, "desktop_bento")
            p3 = OUT_DIR / "03_desktop_bento_grid.png"
            page.screenshot(path=str(p3), animations="disabled", timeout=60000)

            # Scroll to Featured Grid (#featuredProductsGrid)
            page.evaluate("() => document.getElementById('featuredProductsGrid')?.scrollIntoView({behavior:'instant'})")
            page.wait_for_timeout(400)
            p4 = OUT_DIR / "04_desktop_featured_grid.png"
            page.screenshot(path=str(p4), animations="disabled", timeout=60000)

            # Check emoji across Home text
            home_text = page.evaluate("() => document.body.innerText")
            report["emoji_hits"]["index.html"] = len(EMOJI_RE.findall(home_text))

            # Catalogo filtered by Rhodium (?metal=rodio)
            page.goto(f"{base_url}/catalogo.html?metal=rodio", wait_until="networkidle")
            page.wait_for_timeout(600)
            report["desktop"]["catalogo_rodio"] = collect_page_health(page, "desktop_catalogo_rodio")
            p5 = OUT_DIR / "05_desktop_catalogo_rodio.png"
            page.screenshot(path=str(p5))

            # Admin Console
            page.goto(f"{base_url}/admin.html", wait_until="networkidle")
            page.wait_for_function(
                "() => Number(document.getElementById('kpiTotalProducts')?.textContent || '0') >= 58",
                timeout=10000,
            )
            page.wait_for_timeout(500)
            report["desktop"]["admin_initial"] = collect_page_health(page, "desktop_admin_initial")
            initial_total = int(page.locator("#kpiTotalProducts").inner_text().strip())
            persistence_txt = page.locator("#persistenceModeText").inner_text().strip()
            p6 = OUT_DIR / "06_desktop_admin_console.png"
            page.screenshot(path=str(p6))

            admin_text = page.evaluate("() => document.body.innerText")
            report["emoji_hits"]["admin.html"] = len(EMOJI_RE.findall(admin_text))

            # LIVE CRUD E2E TEST via UI
            test_name = "Anel Auditoria Solitario 18k"
            page.click("#btnOpenCreateProduct")
            page.wait_for_timeout(350)
            page.fill("#fieldName", test_name)
            page.select_option("#fieldCategory", "aneis")
            page.fill("#fieldPrice", "390.00")
            page.select_option("#fieldBadge", "Lançamento")
            page.fill("#fieldDescription", "Peca criada em auditoria E2E Playwright.")
            page.fill("#fieldImageUrl", "assets/img/ring-gold-cutout.png")
            page.wait_for_timeout(300)
            p7 = OUT_DIR / "07_desktop_admin_modal_create.png"
            page.screenshot(path=str(p7))

            page.click("#btnSubmitProductForm")
            page.wait_for_function(
                f"() => Number(document.getElementById('kpiTotalProducts')?.textContent || '0') === {initial_total + 1}",
                timeout=10000,
            )
            after_create_total = int(page.locator("#kpiTotalProducts").inner_text().strip())

            # Verify live reflection on catalogo.html
            page.goto(f"{base_url}/catalogo.html?cat=aneis", wait_until="networkidle")
            page.wait_for_timeout(600)
            found_in_catalog = page.locator("body").inner_text().find(test_name) != -1

            # Return to admin, search, edit price -> 420.00, then delete
            page.goto(f"{base_url}/admin.html", wait_until="networkidle")
            page.wait_for_function(
                f"() => Number(document.getElementById('kpiTotalProducts')?.textContent || '0') === {initial_total + 1}",
                timeout=10000,
            )
            page.fill("#adminSearchInput", test_name)
            page.wait_for_timeout(400)
            # Click Editar button on first matching desktop row
            page.locator("#adminProductsTableBody button:has-text('Editar')").first.click()
            page.wait_for_timeout(350)
            page.fill("#fieldPrice", "420.00")
            page.click("#btnSubmitProductForm")
            page.wait_for_timeout(600)
            edited_row_text = page.locator("#adminProductsTableBody").inner_text()
            edit_reflected = "420,00" in edited_row_text

            # Delete test product
            page.locator("#adminProductsTableBody button:has-text('Retirar')").first.click()
            page.wait_for_timeout(350)
            page.click("#btnConfirmDelete")
            page.wait_for_function(
                f"() => Number(document.getElementById('kpiTotalProducts')?.textContent || '0') === {initial_total}",
                timeout=10000,
            )
            after_delete_total = int(page.locator("#kpiTotalProducts").inner_text().strip())

            report["crud_e2e"] = {
                "persistence_mode": persistence_txt,
                "initial_total": initial_total,
                "after_create_total": after_create_total,
                "found_in_catalog": found_in_catalog,
                "edit_reflected_420": edit_reflected,
                "after_delete_total": after_delete_total,
                "passed": (
                    after_create_total == initial_total + 1
                    and found_in_catalog
                    and edit_reflected
                    and after_delete_total == initial_total
                ),
            }
            ctx_d.close()

            # ===================== MOBILE 390x844 =====================
            ctx_m = browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=1.5,
                is_mobile=True,
                has_touch=True,
            )
            mpage = ctx_m.new_page()
            mpage.on(
                "console",
                lambda msg: console_errors.append(f"[mobile] {msg.text}")
                if msg.type == "error"
                else None,
            )
            mpage.on("pageerror", lambda err: page_errors.append(f"[mobile] {err}"))

            mpage.goto(f"{base_url}/index.html", wait_until="networkidle")
            mpage.wait_for_function("() => window.__marcelyRing3dReady === true", timeout=25000)
            mpage.evaluate("() => window.__marcelyRing3D?.forceSync()")
            mpage.wait_for_timeout(300)
            report["mobile"]["home_hero"] = collect_page_health(mpage, "mobile_home_hero")
            pm1 = OUT_DIR / "08_mobile_hero_ring.png"
            mpage.screenshot(path=str(pm1), animations="disabled", timeout=60000)

            mpage.evaluate("() => document.getElementById('acervo')?.scrollIntoView({behavior:'instant'})")
            mpage.wait_for_timeout(500)
            report["mobile"]["bento"] = collect_page_health(mpage, "mobile_bento")
            pm2 = OUT_DIR / "09_mobile_bento_grid.png"
            mpage.screenshot(path=str(pm2), animations="disabled", timeout=60000)

            mpage.goto(f"{base_url}/admin.html", wait_until="networkidle")
            mpage.wait_for_function(
                "() => Number(document.getElementById('kpiTotalProducts')?.textContent || '0') >= 58",
                timeout=10000,
            )
            mpage.wait_for_timeout(400)
            report["mobile"]["admin"] = collect_page_health(mpage, "mobile_admin")
            pm3 = OUT_DIR / "10_mobile_admin.png"
            mpage.screenshot(path=str(pm3), animations="disabled", timeout=60000)

            ctx_m.close()
            browser.close()

        for png in sorted(OUT_DIR.glob("*.png")):
            report["violet_pixel_hits"][png.name] = scan_violet_pixels(png)

        report_path = OUT_DIR / "audit_report.json"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps(report, indent=2, ensure_ascii=False))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
