/**
 * Marcely Semijoias - Local Standalone Server & API Gateway
 * Plataforma de E-commerce de Alta Joalheria Contemporanea
 *
 * Rotas de API:
 *   POST /api/chat         -> Atelier Concierge (Vercel AI Gateway + Motor Heuristico)
 *   GET  /api/products     -> Catalogo completo de 58 joias com filtros
 *   GET  /api/products/:id -> Detalhes de peca especifica
 *   GET  /api/health       -> Health check de infraestrutura
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Carrega variaveis de ambiente (.env.local com precedencia sobre .env)
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares essenciais
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger estruturado de requisicoes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Importa o handler serverless de chat
const chatHandler = require('./api/chat.js');

// Rota de Chat do Atelier Concierge
app.all('/api/chat', (req, res) => {
  chatHandler(req, res);
});

// Helper para ler catalogo de produtos
function readCatalog() {
  const pPath = path.join(__dirname, 'site', 'products.json');
  try {
    if (fs.existsSync(pPath)) {
      return JSON.parse(fs.readFileSync(pPath, 'utf-8'));
    }
  } catch (e) {
    console.error('[Products] Erro ao ler products.json:', e.message);
  }
  return [];
}

// Rota de Produtos (Listagem com filtros opcionais)
app.get('/api/products', (req, res) => {
  const { category, maxPrice, search, limit } = req.query;
  let items = readCatalog();

  if (category) {
    const catLower = String(category).toLowerCase();
    items = items.filter(p => (p.category || '').toLowerCase() === catLower);
  }

  if (maxPrice) {
    const priceNum = parseFloat(maxPrice);
    if (!isNaN(priceNum)) {
      items = items.filter(p => p.price <= priceNum);
    }
  }

  if (search) {
    const term = String(search).toLowerCase();
    items = items.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.metal || '').toLowerCase().includes(term)
    );
  }

  if (limit) {
    const limNum = parseInt(limit, 10);
    if (!isNaN(limNum) && limNum > 0) {
      items = items.slice(0, limNum);
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    total: items.length,
    products: items
  });
});

// Rota de Produto Individual por ID
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const items = readCatalog();
  const product = items.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Produto nao encontrado no catalogo.' });
  }

  return res.status(200).json(product);
});

// Rota de Health Check
app.get('/api/health', (req, res) => {
  const hasGatewayKey = Boolean(process.env.AI_GATEWAY_API_KEY);
  const productsCount = readCatalog().length;

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    catalog_items: productsCount,
    ai_gateway: {
      configured: hasGatewayKey,
      endpoint: process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1',
      model: process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini'
    }
  });
});

// Servico de arquivos estaticos
app.use(express.static(path.join(__dirname, 'site')));
app.use('/brand', express.static(path.join(__dirname, 'brand')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// Rota raiz e SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const siteIndexPath = path.join(__dirname, 'site', 'index.html');
  if (fs.existsSync(siteIndexPath)) {
    return res.sendFile(siteIndexPath);
  }

  const referenceHome = path.join(__dirname, 'site', 'reference_screens', 'marcely_oliveira_-_p_gina_inicial.html');
  if (fs.existsSync(referenceHome)) {
    return res.sendFile(referenceHome);
  }

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Marcely Semijoias - Atelier Concierge</title>
      <link rel="stylesheet" href="/concierge.css">
      <style>
        body {
          margin: 0;
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #FBFBFA;
          color: #141416;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          box-sizing: border-box;
        }
        .container {
          max-width: 680px;
          text-align: center;
        }
        h1 {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 2.75rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        p {
          color: #787571;
          line-height: 1.6;
          font-size: 1.1rem;
        }
        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(212, 175, 55, 0.15);
          color: #A38020;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">Atelier Marcely</span>
        <h1>Alta Joalheria Contemporanea</h1>
        <p>Servidor operacional com Atelier Concierge de IA conectado ao Vercel AI Gateway e catalogo de 58 pecas finas com banho de 10 milesimos em Ouro 18k e Garantia Vitalicia.</p>
      </div>
      <script src="/concierge.js"></script>
    </body>
    </html>
  `);
});

// Inicializacao do servidor
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  MARCELY SEMIJOIAS - ATELIER & BACKEND SERVER`);
  console.log(`=======================================================`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  Health Check:     http://localhost:${PORT}/api/health`);
  console.log(`  Chat Endpoint:    http://localhost:${PORT}/api/chat`);
  console.log(`  Catalog Endpoint: http://localhost:${PORT}/api/products`);
  console.log(`  Static Root:      ${path.join(__dirname, 'site')}`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
