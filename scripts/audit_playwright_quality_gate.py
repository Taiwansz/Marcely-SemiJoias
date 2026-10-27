import asyncio, os, threading, http.server, socketserver
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DIR = os.path.join(BASE_DIR, "site")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots")
PORT = 8945

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def run_server():
    with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

async def audit():
    if not os.path.exists(os.path.join(SITE_DIR, "index.html")):
        print("[AVISO] Arquivo site/index.html ainda nao criado. Auditoria aguardando Fase 3 do Flow-to-Code.")
        return

    srv_thread = threading.Thread(target=run_server, daemon=True)
    srv_thread.start()
    await asyncio.sleep(1)

    print("=== SEXTA LEI DE FERRO // AUDITORIA VISUAL MARCELY SEMIJOIAS ===", flush=True)
    print(f"Servidor ativo em: http://127.0.0.1:{PORT}", flush=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # 1. Desktop Audit (1440 x 900)
        print("\n[1/2] Executando Auditoria Desktop (1440x900)...", flush=True)
        page_desktop = await browser.new_page(viewport={"width": 1440, "height": 900})
        console_errors = []
        page_desktop.on("console", lambda msg: console_errors.append(f"DESKTOP: {msg.text}") if msg.type == "error" else None)

        await page_desktop.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
        await page_desktop.wait_for_timeout(1000)

        path_desktop = os.path.join(SCREENSHOTS_DIR, "audit_desktop_1440.png")
        await page_desktop.screenshot(path=path_desktop, full_page=True)
        print(f"Screenshot Desktop salvo: {path_desktop}", flush=True)

        # 2. Mobile Audit (390 x 844)
        print("\n[2/2] Executando Auditoria Mobile (390x844)...", flush=True)
        page_mobile = await browser.new_page(viewport={"width": 390, "height": 844})
        page_mobile.on("console", lambda msg: console_errors.append(f"MOBILE: {msg.text}") if msg.type == "error" else None)

        await page_mobile.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
        await page_mobile.wait_for_timeout(1000)

        # Verificar overflow horizontal
        overflow_x = await page_mobile.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        print(f"Mobile Overflow-X Detectado: {overflow_x}", flush=True)

        path_mobile = os.path.join(SCREENSHOTS_DIR, "audit_mobile_390.png")
        await page_mobile.screenshot(path=path_mobile, full_page=True)
        print(f"Screenshot Mobile salvo: {path_mobile}", flush=True)

        await browser.close()

    print("\n=== RESUMO DA AUDITORIA ===")
    print(f"Erros de console registrados: {len(console_errors)}")
    for err in console_errors:
        print(f"  - {err}")

if __name__ == "__main__":
    asyncio.run(audit())
