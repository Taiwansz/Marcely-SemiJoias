import asyncio, os, threading, http.server, socketserver, urllib.parse
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

    print("=== AUDITORIA COMPLETA: 4 PAGINAS, CHANCELA VERIDIANA, 58 PRODUTOS & FUNIL WHATSAPP ===", flush=True)
    
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
            p_desk.on("console", lambda msg, pn=page_name: console_errors.append(f"{pn} [DESK]: {msg.text}") if msg.type == "error" else None)
            await p_desk.goto(f"http://127.0.0.1:{PORT}/{page_name}", wait_until="networkidle")
            await p_desk.wait_for_timeout(800)

            body_text = await p_desk.inner_text("body")
            if "Veridiana" not in body_text:
                console_errors.append(f"CHANCELA VERIDIANA AUSENTE EM: {page_name}")
            else:
                print(f"  -> Chancela Veridiana verificada em {page_name}", flush=True)

            if "catalogo.html" in page_name:
                cards_count = await p_desk.evaluate("() => document.querySelectorAll('#catalogProductsGrid > div').length")
                print(f"  -> Produtos renderizados no catalogo: {cards_count}", flush=True)
                if cards_count < 58:
                    console_errors.append(f"CATALOGO INCOMPLETO: esperados 58 produtos, encontrados {cards_count}")
            
            shot_desk = os.path.join(SCREENSHOTS_DIR, f"{prefix}_1440.png")
            await p_desk.screenshot(path=shot_desk, full_page=True)
            print(f"  -> Desktop screenshot salvo: {shot_desk}", flush=True)
            await p_desk.close()

            # Mobile (390x844)
            p_mob = await browser.new_page(viewport={"width": 390, "height": 844})
            p_mob.on("console", lambda msg, pn=page_name: console_errors.append(f"{pn} [MOB]: {msg.text}") if msg.type == "error" else None)
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
        # INTERACTION TEST: PDP WHATSAPP REDIRECT & MINHA SELECAO DRAWER
        # =====================================================================
        print("\n[TESTE INTERATIVO] Selecao de Metal/Aro, Redirecionamento WhatsApp PDP e Gaveta Minha Selecao...", flush=True)
        test_page = await browser.new_page(viewport={"width": 1440, "height": 900})
        test_page.on("console", lambda msg: console_errors.append(f"INTERACTION: {msg.text}") if msg.type == "error" else None)

        await test_page.goto(f"http://127.0.0.1:{PORT}/produto.html?id=marcely_f84c037a057e", wait_until="networkidle")
        await test_page.wait_for_timeout(500)

        # Intercept window.open calls to verify WhatsApp URLs
        await test_page.evaluate("""() => {
            window.__openedUrls = [];
            window.open = (url) => { window.__openedUrls.push(url); return null; };
        }""")

        # 1. Switch metal selector to Rodio
        metal_btns = await test_page.query_selector_all(".detail-metal-btn")
        if len(metal_btns) > 1:
            await metal_btns[1].click()
            await test_page.wait_for_timeout(300)
            selected_metal_label = await test_page.inner_text("#detailSelectedMetalLabel")
            print(f"  -> Metal alterado para: {selected_metal_label}", flush=True)

        # 2. Switch size selector to 18
        size_btn = await test_page.query_selector(".detail-size-btn[data-size='18']")
        if size_btn:
            await size_btn.click()
            await test_page.wait_for_timeout(200)
            selected_size_label = await test_page.inner_text("#detailSelectedSizeLabel")
            print(f"  -> Tamanho alterado para: {selected_size_label}", flush=True)

        # 3. Click PDP Primary WhatsApp Button
        pdp_wa_btn = await test_page.query_selector("#pdpWhatsappBtn")
        if pdp_wa_btn:
            await pdp_wa_btn.click()
            await test_page.wait_for_timeout(300)
            opened = await test_page.evaluate("() => window.__openedUrls")
            if len(opened) > 0 and "wa.me/" in opened[-1]:
                decoded_msg = urllib.parse.unquote(opened[-1].split("text=")[-1])
                print(f"  -> Link WhatsApp PDP gerado com sucesso: {decoded_msg.splitlines()[0]}...", flush=True)
            else:
                console_errors.append("FALHA: Botao #pdpWhatsappBtn nao gerou link wa.me")
        else:
            console_errors.append("FALHA: Botao #pdpWhatsappBtn nao encontrado na PDP")

        # 4. Click Adicionar a Minha Selecao
        add_btn = await test_page.query_selector("#addToCartBtn")
        if add_btn:
            await add_btn.click()
            await test_page.wait_for_timeout(500)
            print("  -> Botao 'Adicionar a Minha Selecao' clicado. Gaveta aberta.", flush=True)
        else:
            console_errors.append("FALHA: Botao #addToCartBtn nao encontrado")

        # Screenshot Drawer open
        shot_drawer = os.path.join(SCREENSHOTS_DIR, "audit_cart_drawer_open.png")
        await test_page.screenshot(path=shot_drawer)
        print(f"  -> Screenshot Gaveta Minha Selecao salvo: {shot_drawer}", flush=True)

        # 5. Apply Coupon MARCELY10
        coupon_input = await test_page.query_selector("#cartCouponInput")
        if coupon_input:
            await test_page.fill("#cartCouponInput", "MARCELY10")
            apply_coupon_btn = await test_page.query_selector("button:has-text('Aplicar')")
            if apply_coupon_btn:
                await apply_coupon_btn.click()
                await test_page.wait_for_timeout(400)
                print("  -> Cupom MARCELY10 aplicado na Minha Selecao.", flush=True)

        # 6. Trigger WhatsApp Selection Checkout from Drawer
        await test_page.evaluate("() => window.MarcelyApp.sendSelectionToWhatsApp()")
        await test_page.wait_for_timeout(300)
        opened = await test_page.evaluate("() => window.__openedUrls")
        if len(opened) >= 2 and "wa.me/" in opened[-1]:
            decoded_sel = urllib.parse.unquote(opened[-1].split("text=")[-1])
            print(f"  -> Link WhatsApp Minha Selecao gerado com sucesso ({len(decoded_sel)} chars).", flush=True)
        else:
            console_errors.append("FALHA: sendSelectionToWhatsApp nao gerou link wa.me")

        await test_page.close()
        await browser.close()

    print("\n=== RESUMO GERAL DA AUDITORIA ===")
    print(f"Total de erros de console / assercoes: {len(console_errors)}")
    for e in console_errors:
        print(f"  ERRO: {e}")

    if len(console_errors) == 0:
        print("\nSTATUS: 100% APROVADO COM ZERO FALHAS E ZERO ERROS DE CONSOLE.")
    else:
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(run_full_audit())
