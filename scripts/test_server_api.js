/**
 * Marcely Semijoias - Suite de Testes Automatizada do Backend & AI Gateway
 */

const { app, server } = require('../server.js');

async function runTests() {
  const PORT = server.address().port;
  const baseUrl = `http://localhost:${PORT}`;
  console.log(`[TEST SUITE] Executando verificacoes em ${baseUrl}...`);

  let allPassed = true;

  // 1. Health check
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    console.log(`[TEST 1] GET /api/health -> Status ${res.status}:`, data.status === 'healthy' ? 'OK' : 'FAIL');
    if (res.status !== 200 || data.status !== 'healthy') allPassed = false;
  } catch (e) {
    console.error(`[TEST 1] Falha:`, e.message);
    allPassed = false;
  }

  // 2. Catalogo de produtos
  try {
    const res = await fetch(`${baseUrl}/api/products?limit=5`);
    const data = await res.json();
    console.log(`[TEST 2] GET /api/products?limit=5 -> Status ${res.status}, Total: ${data.total}, Itens: ${data.products.length}:`, data.products.length === 5 ? 'OK' : 'FAIL');
    if (res.status !== 200 || data.products.length !== 5) allPassed = false;
  } catch (e) {
    console.error(`[TEST 2] Falha:`, e.message);
    allPassed = false;
  }

  // 3. Produto por ID
  try {
    const res = await fetch(`${baseUrl}/api/products/marcely_ac30f328e209`);
    const data = await res.json();
    console.log(`[TEST 3] GET /api/products/marcely_ac30f328e209 -> Status ${res.status}, Nome: ${data.name}:`, data.id === 'marcely_ac30f328e209' ? 'OK' : 'FAIL');
    if (res.status !== 200 || !data.name) allPassed = false;
  } catch (e) {
    console.error(`[TEST 3] Falha:`, e.message);
    allPassed = false;
  }

  // 4. Arquivos estaticos do Concierge
  try {
    const resJs = await fetch(`${baseUrl}/concierge.js`);
    const resCss = await fetch(`${baseUrl}/concierge.css`);
    console.log(`[TEST 4] Static Assets -> concierge.js: ${resJs.status}, concierge.css: ${resCss.status}:`, (resJs.status === 200 && resCss.status === 200) ? 'OK' : 'FAIL');
    if (resJs.status !== 200 || resCss.status !== 200) allPassed = false;
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
    console.log(`[TEST 5] POST /api/chat (Segundo Furo) -> Status ${res.status}, Source: ${data.source}, Produtos recomendados: ${data.products.length}:`, (res.status === 200 && data.success && data.reply) ? 'OK' : 'FAIL');
    if (res.status !== 200 || !data.success) allPassed = false;
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
    console.log(`[TEST 6] POST /api/chat (Presente R$ 350) -> Status ${res.status}, Source: ${data.source}:`, (res.status === 200 && data.success) ? 'OK' : 'FAIL');
    if (res.status !== 200 || !data.success) allPassed = false;
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
    console.log(`[TEST 7] POST /api/chat (Garantia Banho) -> Status ${res.status}, Source: ${data.source}:`, (res.status === 200 && data.success) ? 'OK' : 'FAIL');
    if (res.status !== 200 || !data.success) allPassed = false;
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
    console.log(`[TEST 8] POST /api/chat (Mix de Colares) -> Status ${res.status}, Source: ${data.source}:`, (res.status === 200 && data.success) ? 'OK' : 'FAIL');
    if (res.status !== 200 || !data.success) allPassed = false;
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

  server.close(() => {
    console.log(`[TEST SUITE] Servidor finalizado com sucesso.`);
    if (allPassed) {
      console.log(`[TEST VERDICT] TODOS OS 9 TESTES PASSARAM COM SUCESSO ABSOLUTO.`);
      process.exit(0);
    } else {
      console.error(`[TEST VERDICT] HOUVE FALHA EM UM OU MAIS TESTES.`);
      process.exit(1);
    }
  });
}

runTests();
