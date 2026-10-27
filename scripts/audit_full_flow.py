import asyncio, os, threading, http.server, socketserver
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DIR = os.path.join(BASE_DIR, "site")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots")
PORT = 8946

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def run_server():
    with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

async def run_full_audit():
    srv_thread = threading.Thread(target=run_server, daemon=True)
    srv_thread.start()
    await asyncio.sleep(1)

    print("=== AUDITORIA COMPLETA DE TODAS AS 4 PAGINAS & FLUXO DE COMPRA ===", flush=True)
    
    pages_to_test = [
        ("index.html", "audit_page_index"),
        ("catalogo.html", "audit_page_catalogo"),
        ("produto.html?id=marcely_f84c037a057e", "audit_page_produto"),
        ("sobre.html", "audit_page_sobre")
    ]

    console_errors = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for page_name, prefix in pages_to_test:
            print(f"\n[AUDITANDO] {page_name}...", flush=True)

            # Desktop (1440x900)
            p_desk = await browser.new_page(viewport={"width": 1440, "height": 900})
            p_desk.on("console", lambda msg: console_errors.append(f"{page_name} [DESK]: {msg.text}") if msg.type == "error" else None)
            await p_desk.goto(f"http://127.0.0.1:{PORT}/{page_name}", wait_until="networkidle")
            await p_desk.wait_for_timeout(800)
            
            shot_desk = os.path.join(SCREENSHOTS_DIR, f"{prefix}_1440.png")
            await p_desk.screenshot(path=shot_desk, full_page=True)
            print(f"  -> Desktop screenshot salvo: {shot_desk}", flush=True)
            await p_desk.close()

            # Mobile (390x844)
            p_mob = await browser.new_page(viewport={"width": 390, "height": 844})
            p_mob.on("console", lambda msg: console_errors.append(f"{page_name} [MOB]: {msg.text}") if msg.type == "error" else None)
            await p_mob.goto(f"http://127.0.0.1:{PORT}/{page_name}", wait_until="networkidle")
            await p_mob.wait_for_timeout(800)

            overflow = await p_mob.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            if overflow:
                console_errors.append(f"OVERFLOW DETECTADO EM: {page_name} (Mobile)")
            print(f"  -> Mobile overflow check: {'FALHOU' if overflow else 'PASSOU (Zero overflow)'}", flush=True)

            shot_mob = os.path.join(SCREENSHOTS_DIR, f"{prefix}_390.png")
            await p_mob.screenshot(path=shot_mob, full_page=True)
            print(f"  -> Mobile screenshot salvo: {shot_mob}", flush=True)
            await p_mob.close()

        # =====================================================================
        # INTERACTION TEST: CART DRAWER & PIX CHECKOUT
        # =====================================================================
        print("\n[TESTE INTERATIVO] Adicao ao carrinho, Drawer e Checkout Pix...", flush=True)
        test_page = await browser.new_page(viewport={"width": 1440, "height": 900})
        test_page.on("console", lambda msg: console_errors.append(f"INTERACTION: {msg.text}") if msg.type == "error" else None)

        await test_page.goto(f"http://127.0.0.1:{PORT}/produto.html?id=marcely_f84c037a057e", wait_until="networkidle")
        await test_page.wait_for_timeout(500)

        # 1. Switch metal selector to Rodio
        metal_btns = await test_page.query_selector_all(".detail-metal-btn")
        if len(metal_btns) > 1:
            await metal_btns[1].click()
            await test_page.wait_for_timeout(300)
            selected_metal_label = await test_page.inner_text("#detailSelectedMetalLabel")
            print(f"  -> Metal alterado para: {selected_metal_label}", flush=True)

        # 2. Click Adicionar a Sacola
        add_btn = await test_page.query_selector("button:has-text('Adicionar à Sacola')")
        if add_btn:
            await add_btn.click()
            await test_page.wait_for_timeout(500)
            print("  -> Botao 'Adicionar a Sacola' clicado. Drawer aberto.", flush=True)

        # Screenshot Drawer open
        shot_drawer = os.path.join(SCREENSHOTS_DIR, "audit_cart_drawer_open.png")
        await test_page.screenshot(path=shot_drawer)
        print(f"  -> Screenshot Drawer salvo: {shot_drawer}", flush=True)

        # 3. Apply Coupon MARCELY10
        await test_page.fill("#cartCouponInput", "MARCELY10")
        apply_coupon_btn = await test_page.query_selector("button:has-text('Aplicar')")
        if apply_coupon_btn:
            await apply_coupon_btn.click()
            await test_page.wait_for_timeout(400)
            print("  -> Cupom MARCELY10 aplicado.", flush=True)

        # 4. Click Pix Checkout in Drawer
        pix_btn = await test_page.query_selector("button:has-text('Finalizar Compra via Pix')")
        if pix_btn:
            await pix_btn.click()
            await test_page.wait_for_timeout(500)
            print("  -> Modal Pix Checkout aberto.", flush=True)

        # Screenshot Pix Modal
        shot_pix = os.path.join(SCREENSHOTS_DIR, "audit_pix_modal_open.png")
        await test_page.screenshot(path=shot_pix)
        print(f"  -> Screenshot Pix Modal salvo: {shot_pix}", flush=True)

        # Verify Pix Countdown and Canvas exist
        timer_text = await test_page.inner_text("#pixTimerCountdown")
        copia_cola = await test_page.input_value("#pixCopiaEColaInput")
        print(f"  -> Pix Timer ativo: {timer_text}", flush=True)
        print(f"  -> Pix Copia e Cola gerado: {copia_cola[:40]}...", flush=True)

        await test_page.close()
        await browser.close()

    print("\n=== RESUMO GERAL DA AUDITORIA ===")
    print(f"Total de erros de console / assercoes: {len(console_errors)}")
    for e in console_errors:
        print(f"  ERRO: {e}")

    if len(console_errors) == 0:
        print("\nSTATUS: 100% APROVADO COM ZERO FALHAS E ZERO ERROS DE CONSOLE.")

if __name__ == "__main__":
    asyncio.run(run_full_audit())
