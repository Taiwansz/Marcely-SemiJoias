/**
 * Marcely Semijoias - Suite de Testes Automatizada do Backend, AI Gateway & CRUD Administrativo
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { app, server } = require('../server.js');

const ROOT_DIR = path.join(__dirname, '..');
const SITE_PRODUCTS_PATH = path.join(ROOT_DIR, 'site', 'products.json');
const API_CATALOG_PATH = path.join(ROOT_DIR, 'api', '_catalog.json');

// Tiny 1x1 PNG valid base64 payload for upload verification
const TINY_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2dIAAAAASUVORK5CYII=';

async function runTests() {
  const PORT = server.address().port;
  const baseUrl = `http://localhost:${PORT}`;
  console.log(`[TEST SUITE] Executando verificacoes em ${baseUrl}...`);

  let allPassed = true;
  let createdProductId = null;
  let createdImagePath = null;
  const initialCount = JSON.parse(fs.readFileSync(SITE_PRODUCTS_PATH, 'utf-8')).length;

  // 1. Health check
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    const ok = res.status === 200 && data.status === 'healthy' && data.admin_crud === true;
    console.log(`[TEST 1] GET /api/health -> Status ${res.status}, admin_crud=${data.admin_crud}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 1] Falha:`, e.message);
    allPassed = false;
  }

  // 2. Catalogo de produtos
  try {
    const res = await fetch(`${baseUrl}/api/products?limit=5`);
    const data = await res.json();
    const ok = res.status === 200 && data.products.length === 5;
    console.log(`[TEST 2] GET /api/products?limit=5 -> Status ${res.status}, Total: ${data.total}, Itens: ${data.products.length}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 2] Falha:`, e.message);
    allPassed = false;
  }

  // 3. Produto por ID
  try {
    const res = await fetch(`${baseUrl}/api/products/marcely_ac30f328e209`);
    const data = await res.json();
    const ok = res.status === 200 && data.id === 'marcely_ac30f328e209' && Boolean(data.name);
    console.log(`[TEST 3] GET /api/products/marcely_ac30f328e209 -> Status ${res.status}, Nome: ${data.name}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 3] Falha:`, e.message);
    allPassed = false;
  }

  // 4. Arquivos estaticos do Concierge
  try {
    const resJs = await fetch(`${baseUrl}/concierge.js`);
    const resCss = await fetch(`${baseUrl}/concierge.css`);
    const ok = resJs.status === 200 && resCss.status === 200;
    console.log(`[TEST 4] Static Assets -> concierge.js: ${resJs.status}, concierge.css: ${resCss.status}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 4] Falha:`, e.message);
    allPassed = false;
  }

  // 5. Chat POST /api/chat - Segundo Furo
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Qual o melhor brinco para segundo furo?' })
    });
    const data = await res.json();
    const ok = res.status === 200 && data.success && Boolean(data.reply);
    console.log(`[TEST 5] POST /api/chat (Segundo Furo) -> Status ${res.status}, Source: ${data.source}, Produtos recomendados: ${data.products.length}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 5] Falha:`, e.message);
    allPassed = false;
  }

  // 6. Chat POST /api/chat - Sugestao de Presente ate R$ 350
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Sugestão de presente sofisticado até R$ 350' })
    });
    const data = await res.json();
    const ok = res.status === 200 && data.success;
    console.log(`[TEST 6] POST /api/chat (Presente R$ 350) -> Status ${res.status}, Source: ${data.source}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 6] Falha:`, e.message);
    allPassed = false;
  }

  // 7. Chat POST /api/chat - Garantia do Banho
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Como funciona a garantia do banho de ouro 18k?' })
    });
    const data = await res.json();
    const ok = res.status === 200 && data.success;
    console.log(`[TEST 7] POST /api/chat (Garantia Banho) -> Status ${res.status}, Source: ${data.source}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 7] Falha:`, e.message);
    allPassed = false;
  }

  // 8. Chat POST /api/chat - Mix de Colares
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Quero montar um mix de colares' })
    });
    const data = await res.json();
    const ok = res.status === 200 && data.success;
    console.log(`[TEST 8] POST /api/chat (Mix de Colares) -> Status ${res.status}, Source: ${data.source}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 8] Falha:`, e.message);
    allPassed = false;
  }

  // 9. Auditoria de integridade de emojis: Garantir ZERO emojis nas respostas
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Olá, gostaria de saber os cuidados com a peça' })
    });
    const data = await res.json();
    const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu.test(data.reply);
    console.log(`[TEST 9] Zero Emojis Enforced -> Status ${res.status}, Has Emoji: ${hasEmoji}:`, !hasEmoji ? 'OK' : 'FAIL');
    if (hasEmoji) allPassed = false;
  } catch (e) {
    console.error(`[TEST 9] Falha:`, e.message);
    allPassed = false;
  }

  // 10. CRUD CREATE: POST /api/products (com upload base64 + calculo automatico Pix 5% OFF)
  try {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Brinco Teste Auditoria Ouro 18k',
        category: 'brincos',
        metal: 'Ouro 18k (15 milésimos)',
        price: 320.00,
        badge: 'Lançamento',
        description: 'Peca temporaria criada pela suite automatizada de testes CRUD.',
        imageDataUrl: TINY_PNG_DATA_URL
      })
    });
    const data = await res.json();
    const prod = data.product || {};
    createdProductId = prod.id || null;
    createdImagePath = prod.image ? path.join(ROOT_DIR, 'site', prod.image) : null;

    const expectedPix = Number((320 * 0.95).toFixed(2));
    const expectedInst = '6x de R$ ' + (320 / 6).toFixed(2) + ' sem juros';
    const imageExists = createdImagePath ? fs.existsSync(createdImagePath) : false;

    const ok = (
      res.status === 201 &&
      data.success === true &&
      /^marcely_[a-f0-9]{12}$/.test(prod.id || '') &&
      prod.pix_discount_price === expectedPix &&
      prod.installments === expectedInst &&
      prod.in_stock === true &&
      imageExists
    );
    console.log(`[TEST 10] POST /api/products -> Status ${res.status}, ID=${prod.id}, Pix=${prod.pix_discount_price}, ImgSaved=${imageExists}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 10] Falha:`, e.message);
    allPassed = false;
  }

  // 11. CRUD UPDATE: PUT /api/products/:id (edita nome, preco, in_stock=false e recalcula Pix)
  try {
    if (!createdProductId) throw new Error('Produto do TEST 10 nao foi criado.');
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Brinco Teste Auditoria Editado',
        price: 450.00,
        in_stock: false
      })
    });
    const data = await res.json();
    const prod = data.product || {};

    const verifyRes = await fetch(`${baseUrl}/api/products/${createdProductId}`);
    const verified = await verifyRes.json();

    const expectedPix = Number((450 * 0.95).toFixed(2));
    const ok = (
      res.status === 200 &&
      data.success === true &&
      prod.name === 'Brinco Teste Auditoria Editado' &&
      prod.price === 450 &&
      prod.pix_discount_price === expectedPix &&
      prod.in_stock === false &&
      verifyRes.status === 200 &&
      verified.in_stock === false &&
      verified.price === 450
    );
    console.log(`[TEST 11] PUT /api/products/${createdProductId} -> Status ${res.status}, Price=${prod.price}, Pix=${prod.pix_discount_price}, in_stock=${prod.in_stock}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 11] Falha:`, e.message);
    allPassed = false;
  }

  // 12. CRUD DELETE: DELETE /api/products/:id + restauracao exata de 58 pecas em site/products.json e api/_catalog.json
  try {
    if (!createdProductId) throw new Error('Produto do TEST 10 nao foi criado.');
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    const afterGet = await fetch(`${baseUrl}/api/products/${createdProductId}`);
    const siteItems = JSON.parse(fs.readFileSync(SITE_PRODUCTS_PATH, 'utf-8'));
    const apiItems = JSON.parse(fs.readFileSync(API_CATALOG_PATH, 'utf-8'));
    const imageRemoved = createdImagePath ? !fs.existsSync(createdImagePath) : true;

    const ok = (
      res.status === 200 &&
      data.success === true &&
      data.deletedId === createdProductId &&
      afterGet.status === 404 &&
      siteItems.length === initialCount &&
      apiItems.length === initialCount &&
      siteItems.length === 58 &&
      imageRemoved
    );
    console.log(`[TEST 12] DELETE /api/products/${createdProductId} -> Status ${res.status}, site=${siteItems.length}, api=${apiItems.length}, imgClean=${imageRemoved}:`, ok ? 'OK' : 'FAIL');
    if (ok) createdProductId = null;
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 12] Falha:`, e.message);
    allPassed = false;
  } finally {
    // Seguranca: garante limpeza caso algum erro tenha impedido o DELETE
    if (createdProductId) {
      try {
        await fetch(`${baseUrl}/api/products/${createdProductId}`, { method: 'DELETE' });
      } catch (_) {}
    }
  }

  // 13. Auditoria de Zero Emojis, Sintaxe JS (node --check) e Disponibilidade HTTP do Painel Admin
  try {
    const filesToScan = [
      path.join(ROOT_DIR, 'site', 'admin.html'),
      path.join(ROOT_DIR, 'site', 'admin.js'),
      path.join(ROOT_DIR, 'server.js'),
      path.join(ROOT_DIR, 'api', 'products.js')
    ];

    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu;
    let emojiViolations = [];

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (emojiRegex.test(content)) {
        emojiViolations.push(path.basename(filePath));
      }
    }

    const jsFilesToCheck = [
      path.join(ROOT_DIR, 'server.js'),
      path.join(ROOT_DIR, 'api', 'products.js'),
      path.join(ROOT_DIR, 'site', 'admin.js')
    ];
    for (const jsFile of jsFilesToCheck) {
      execFileSync(process.execPath, ['--check', jsFile], { stdio: 'pipe' });
    }

    const adminRes = await fetch(`${baseUrl}/admin.html`);
    const adminJsRes = await fetch(`${baseUrl}/admin.js`);
    const ok = emojiViolations.length === 0 && adminRes.status === 200 && adminJsRes.status === 200;
    console.log(`[TEST 13] Admin Zero Emojis & JS Syntax -> Emojis=${emojiViolations.length}, admin.html=${adminRes.status}, admin.js=${adminJsRes.status}:`, ok ? 'OK' : 'FAIL');
    if (!ok) allPassed = false;
  } catch (e) {
    console.error(`[TEST 13] Falha:`, e.message);
    allPassed = false;
  }

  server.close(() => {
    console.log(`[TEST SUITE] Servidor finalizado com sucesso.`);
    if (allPassed) {
      console.log(`[TEST VERDICT] TODOS OS 13 TESTES PASSARAM COM SUCESSO ABSOLUTO.`);
      process.exit(0);
    } else {
      console.error(`[TEST VERDICT] HOUVE FALHA EM UM OU MAIS TESTES.`);
      process.exit(1);
    }
  });
}

runTests();
