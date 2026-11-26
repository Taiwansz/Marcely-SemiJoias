/**
 * Marcely Semijoias - Local Standalone Server & API Gateway
 * Plataforma Boutique Digital, Atendimento Assistido via WhatsApp & Painel Administrativo
 *
 * Rotas de API:
 *   POST   /api/chat         -> Concierge Marcely (Vercel AI Gateway + Motor Heuristico)
 *   GET    /api/products     -> Catalogo completo com filtros (category, metal, maxPrice, search, inStock, limit)
 *   GET    /api/products/:id -> Detalhes de peca especifica
 *   POST   /api/products     -> Cadastra nova peca no catalogo (com suporte a upload base64)
 *   PUT    /api/products/:id -> Edita peca existente e recalcula Pix / parcelas
 *   DELETE /api/products/:id -> Retira peca do catalogo
 *   GET    /api/health       -> Health check de infraestrutura
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

const SITE_DIR = path.join(__dirname, 'site');
const CATALOG_PATH = path.join(SITE_DIR, 'products.json');
const API_CATALOG_PATH = path.join(__dirname, 'api', '_catalog.json');
const PRODUCTS_IMG_DIR = path.join(SITE_DIR, 'assets', 'products');

const ALLOWED_CATEGORIES = new Set(['brincos', 'colares', 'pulseiras', 'aneis']);
const DEFAULT_FALLBACK_IMAGE = 'assets/products/item_ac30f328e209483a98fbcc35074b9295.jpg';
const DEFAULT_SPECS = {
  banho: '10 milésimos de Ouro 18k ou Ródio Nobre',
  verniz: 'Nano-cerâmico hipoalergênico (German Tech)',
  pedras: 'Zircônias 5A Lapidação Brilhante Suíça / Pérolas Naturais',
  garantia: 'Garantia Vitalícia no Banho e Certificado de Autenticidade',
  niquel: '100% Livre de Níquel e Metais Pesados'
};

// Middlewares essenciais (10mb para suportar upload de foto em base64 data URI)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Rota de Chat do Concierge Marcely
app.all('/api/chat', (req, res) => {
  chatHandler(req, res);
});

// ==========================================================================
// HELPERS DE CATALOGO, VALIDACAO E PERSISTENCIA ATOMICA
// ==========================================================================

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCategory(raw) {
  const cleaned = normalizeText(raw);
  if (cleaned === 'aneis' || cleaned === 'anel') return 'aneis';
  if (cleaned === 'brincos' || cleaned === 'brinco') return 'brincos';
  if (cleaned === 'colares' || cleaned === 'colar') return 'colares';
  if (cleaned === 'pulseiras' || cleaned === 'pulseira') return 'pulseiras';
  return cleaned;
}

function calculatePricing(rawPrice) {
  const price = Number(Number(rawPrice).toFixed(2));
  const pix_discount_price = Number((price * 0.95).toFixed(2));
  const installments = '6x de R$ ' + (price / 6).toFixed(2) + ' sem juros';
  return { price, pix_discount_price, installments };
}

function normalizeSpecs(rawSpecs) {
  const base = { ...DEFAULT_SPECS };
  if (rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)) {
    for (const key of Object.keys(DEFAULT_SPECS)) {
      if (typeof rawSpecs[key] === 'string' && rawSpecs[key].trim()) {
        base[key] = rawSpecs[key].trim();
      }
    }
  }
  return base;
}

function validateImagePath(rawImage) {
  if (typeof rawImage !== 'string') return null;
  const trimmed = rawImage.trim();
  if (!trimmed) return null;
  if (/^(javascript|vbscript|data):/i.test(trimmed)) return null;
  if (trimmed.includes('..')) return null;
  if (/^https?:\/\//i.test(trimmed) || /^\/?assets\//i.test(trimmed) || /^\/?brand\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function saveImageDataUrl(dataUrl, productId) {
  if (typeof dataUrl !== 'string') {
    throw new Error('Formato de imagem invalido.');
  }
  const match = dataUrl.trim().match(/^data:image\/(jpeg|jpg|png|webp);base64,([\s\S]+)$/i);
  if (!match) {
    throw new Error('Imagem deve estar no formato Data URI base64 (JPEG, PNG ou WEBP).');
  }

  const rawExt = match[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const base64Payload = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer || buffer.length === 0) {
    throw new Error('Arquivo de imagem vazio.');
  }
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error('Imagem excede o limite maximo de 8MB.');
  }

  const safeId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `item_${safeId}.${ext}`;

  if (!fs.existsSync(PRODUCTS_IMG_DIR)) {
    fs.mkdirSync(PRODUCTS_IMG_DIR, { recursive: true });
  }

  const absPath = path.join(PRODUCTS_IMG_DIR, filename);
  const tmpPath = `${absPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, absPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}
    fs.writeFileSync(absPath, buffer);
  }

  return `assets/products/${filename}`;
}

function cleanupUploadedImage(imagePath) {
  if (typeof imagePath !== 'string') return;
  const normalized = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  // Limpa apenas imagens geradas dinamicamente pelo CRUD (prefixo item_marcely_)
  if (!/^assets\/products\/item_marcely_[a-f0-9]+\.(jpg|png|webp)$/i.test(normalized)) {
    return;
  }
  const absPath = path.join(SITE_DIR, normalized);
  try {
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    console.warn('[Products] Aviso ao remover imagem antiga:', err.message);
  }
}

function generateProductId(existingItems) {
  const existingIds = new Set(existingItems.map(item => item.id));
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `marcely_${crypto.randomBytes(6).toString('hex')}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `marcely_${Date.now().toString(16).slice(-12).padStart(12, '0')}`;
}

function readCatalog() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[Products] Erro ao ler site/products.json:', e.message);
  }
  try {
    if (fs.existsSync(API_CATALOG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(API_CATALOG_PATH, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[Products] Erro ao ler api/_catalog.json:', e.message);
  }
  return [];
}

function atomicWriteJson(targetPath, data) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const serialized = JSON.stringify(data, null, 2) + '\n';
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tmpPath, serialized, 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}
    fs.writeFileSync(targetPath, serialized, 'utf-8');
  }
}

function writeCatalog(items) {
  if (!Array.isArray(items)) {
    throw new Error('Catalogo deve ser um array de produtos.');
  }
  atomicWriteJson(CATALOG_PATH, items);
  atomicWriteJson(API_CATALOG_PATH, items);
}

// ==========================================================================
// ROTAS REST CRUD DE PRODUTOS (/api/products)
// ==========================================================================

// Listagem com filtros opcionais (sem cache preso)
app.get('/api/products', (req, res) => {
  const { category, metal, maxPrice, search, inStock, limit } = req.query;
  let items = readCatalog();

  if (category && normalizeText(category) !== 'all' && normalizeText(category) !== 'todos') {
    const catNorm = normalizeCategory(category);
    items = items.filter(p => normalizeCategory(p.category) === catNorm);
  }

  if (metal && normalizeText(metal) !== 'all' && normalizeText(metal) !== 'todos') {
    const metalNorm = normalizeText(metal);
    items = items.filter(p => normalizeText(p.metal).includes(metalNorm));
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const priceNum = parseFloat(maxPrice);
    if (!isNaN(priceNum)) {
      items = items.filter(p => Number(p.price) <= priceNum);
    }
  }

  if (inStock !== undefined && inStock !== '' && normalizeText(inStock) !== 'all') {
    const flag = normalizeText(inStock);
    if (flag === 'true' || flag === '1' || flag === 'yes') {
      items = items.filter(p => p.in_stock !== false);
    } else if (flag === 'false' || flag === '0' || flag === 'no') {
      items = items.filter(p => p.in_stock === false);
    }
  }

  if (search) {
    const term = normalizeText(search);
    items = items.filter(p => {
      const refCode = normalizeText((p.id || '').replace('marcely_', 'm-'));
      return (
        normalizeText(p.name).includes(term) ||
        normalizeText(p.description).includes(term) ||
        normalizeText(p.metal).includes(term) ||
        normalizeText(p.category).includes(term) ||
        normalizeText(p.id).includes(term) ||
        refCode.includes(term)
      );
    });
  }

  if (limit) {
    const limNum = parseInt(limit, 10);
    if (!isNaN(limNum) && limNum > 0) {
      items = items.slice(0, limNum);
    }
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).json({
    total: items.length,
    products: items
  });
});

// Detalhes de produto individual por ID
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const items = readCatalog();
  const product = items.find(p => p.id === id);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (!product) {
    return res.status(404).json({ error: 'Produto nao encontrado no catalogo.' });
  }

  return res.status(200).json(product);
});

// Cadastro de nova peca
app.post('/api/products', (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const category = normalizeCategory(body.category);
    const rawPrice = Number(body.price);

    if (name.length < 2) {
      return res.status(400).json({ error: 'Nome da peca e obrigatorio (minimo 2 caracteres).' });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Categoria invalida. Use: brincos, colares, pulseiras ou aneis.' });
    }
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
      return res.status(400).json({ error: 'Preco deve ser um numero maior que zero.' });
    }

    const items = readCatalog();
    const id = generateProductId(items);
    const { price, pix_discount_price, installments } = calculatePricing(rawPrice);

    let imagePath = DEFAULT_FALLBACK_IMAGE;
    if (body.imageDataUrl && typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim()) {
      imagePath = saveImageDataUrl(body.imageDataUrl, id);
    } else if (body.image && typeof body.image === 'string' && body.image.trim()) {
      const validated = validateImagePath(body.image);
      if (!validated) {
        return res.status(400).json({ error: 'Caminho ou URL de imagem invalido.' });
      }
      imagePath = validated;
    }

    const metal = typeof body.metal === 'string' && body.metal.trim()
      ? body.metal.trim()
      : 'Ouro 18k (10 milésimos)';

    const description = typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : 'Acabamento de alta joalheria com banho nobre hipoalergênico e curadoria Marcely Semijoias.';

    const badge = typeof body.badge === 'string' ? body.badge.trim() : '';
    const inStock = body.in_stock !== undefined ? Boolean(body.in_stock) : true;
    const rating = Number.isFinite(Number(body.rating)) && Number(body.rating) >= 1 && Number(body.rating) <= 5
      ? Number(Number(body.rating).toFixed(1))
      : 5.0;
    const reviewsCount = Number.isInteger(Number(body.reviews_count)) && Number(body.reviews_count) >= 0
      ? Number(body.reviews_count)
      : 1;

    const newProduct = {
      id,
      name,
      category,
      metal,
      price,
      installments,
      pix_discount_price,
      image: imagePath,
      description,
      specs: normalizeSpecs(body.specs),
      in_stock: inStock,
      badge,
      rating,
      reviews_count: reviewsCount
    };

    items.unshift(newProduct);
    writeCatalog(items);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({
      success: true,
      product: newProduct,
      total: items.length
    });
  } catch (err) {
    console.error('[Products] Erro ao cadastrar produto:', err.message);
    return res.status(400).json({ error: err.message || 'Erro ao cadastrar produto.' });
  }
});

// Edicao de peca existente
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const items = readCatalog();
    const index = items.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Produto nao encontrado no catalogo.' });
    }

    const current = items[index];
    const updated = { ...current };

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 2) {
        return res.status(400).json({ error: 'Nome da peca deve ter pelo menos 2 caracteres.' });
      }
      updated.name = name;
    }

    if (body.category !== undefined) {
      const category = normalizeCategory(body.category);
      if (!ALLOWED_CATEGORIES.has(category)) {
        return res.status(400).json({ error: 'Categoria invalida. Use: brincos, colares, pulseiras ou aneis.' });
      }
      updated.category = category;
    }

    if (body.metal !== undefined) {
      const metal = typeof body.metal === 'string' ? body.metal.trim() : '';
      if (metal) updated.metal = metal;
    }

    if (body.price !== undefined) {
      const rawPrice = Number(body.price);
      if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
        return res.status(400).json({ error: 'Preco deve ser um numero maior que zero.' });
      }
      const pricing = calculatePricing(rawPrice);
      updated.price = pricing.price;
      updated.pix_discount_price = pricing.pix_discount_price;
      updated.installments = pricing.installments;
    }

    if (body.description !== undefined) {
      updated.description = typeof body.description === 'string' ? body.description.trim() : current.description;
    }

    if (body.badge !== undefined) {
      updated.badge = typeof body.badge === 'string' ? body.badge.trim() : '';
    }

    if (body.in_stock !== undefined) {
      updated.in_stock = Boolean(body.in_stock);
    }

    if (body.specs !== undefined && typeof body.specs === 'object' && body.specs !== null) {
      updated.specs = normalizeSpecs({ ...(current.specs || {}), ...body.specs });
    }

    if (body.imageDataUrl && typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim()) {
      const newImagePath = saveImageDataUrl(body.imageDataUrl, id);
      if (current.image && current.image !== newImagePath) {
        cleanupUploadedImage(current.image);
      }
      updated.image = newImagePath;
    } else if (body.image !== undefined && typeof body.image === 'string' && body.image.trim()) {
      const validated = validateImagePath(body.image);
      if (!validated) {
        return res.status(400).json({ error: 'Caminho ou URL de imagem invalido.' });
      }
      updated.image = validated;
    }

    items[index] = updated;
    writeCatalog(items);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      product: updated,
      total: items.length
    });
  } catch (err) {
    console.error('[Products] Erro ao atualizar produto:', err.message);
    return res.status(400).json({ error: err.message || 'Erro ao atualizar produto.' });
  }
});

// Remocao / retirada de peca do catalogo
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const items = readCatalog();
    const index = items.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Produto nao encontrado no catalogo.' });
    }

    const [removed] = items.splice(index, 1);
    writeCatalog(items);

    if (removed && removed.image) {
      cleanupUploadedImage(removed.image);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      deletedId: id,
      total: items.length
    });
  } catch (err) {
    console.error('[Products] Erro ao remover produto:', err.message);
    return res.status(500).json({ error: err.message || 'Erro ao remover produto.' });
  }
});

// Rota de Health Check
app.get('/api/health', (req, res) => {
  const hasGatewayKey = Boolean(process.env.AI_GATEWAY_API_KEY);
  const productsCount = readCatalog().length;

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'healthy',
    admin_crud: true,
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

// Servico de arquivos estaticos (sem cache agressivo para JSON dinamico)
app.use(express.static(SITE_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));
app.use('/brand', express.static(path.join(__dirname, 'brand')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// Atalho amigavel /admin -> site/admin.html
app.get('/admin', (req, res) => {
  const adminPath = path.join(SITE_DIR, 'admin.html');
  if (fs.existsSync(adminPath)) {
    return res.sendFile(adminPath);
  }
  return res.redirect('/index.html');
});

// Rota raiz e SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const siteIndexPath = path.join(SITE_DIR, 'index.html');
  if (fs.existsSync(siteIndexPath)) {
    return res.sendFile(siteIndexPath);
  }

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Marcely Semijoias</title>
      <link rel="stylesheet" href="/concierge.css">
      <style>
        body {
          margin: 0;
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #FCF9F4;
          color: #1C1C19;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          box-sizing: border-box;
        }
        .container { max-width: 680px; text-align: center; }
        h1 { font-family: "Bodoni Moda", Georgia, serif; font-size: 2.75rem; font-weight: 500; letter-spacing: 0.05em; margin-bottom: 8px; }
        p { color: #787571; line-height: 1.6; font-size: 1.1rem; }
        .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(116, 90, 46, 0.12); color: #745A2E; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">Marcely Semijoias</span>
        <h1>Alta Joalheria Contemporanea</h1>
        <p>Servidor operacional com Concierge Marcely conectado ao Vercel AI Gateway e painel administrativo CRUD integrado.</p>
      </div>
      <script src="/concierge.js"></script>
    </body>
    </html>
  `);
});

// Inicializacao do servidor em ambiente local (ou exportacao como funcao Serverless na Vercel)
let server;
if (!process.env.VERCEL) {
  const listenPort = require.main === module ? PORT : 0;
  server = app.listen(listenPort, () => {
    if (require.main === module) {
      console.log(`=======================================================`);
      console.log(`  MARCELY SEMIJOIAS - BACKEND & API SERVER`);
      console.log(`=======================================================`);
      console.log(`  Local URL:        http://localhost:${PORT}`);
      console.log(`  Admin Console:    http://localhost:${PORT}/admin.html`);
      console.log(`  Health Check:     http://localhost:${PORT}/api/health`);
      console.log(`  Chat Endpoint:    http://localhost:${PORT}/api/chat`);
      console.log(`  Catalog Endpoint: http://localhost:${PORT}/api/products`);
      console.log(`  Static Root:      ${SITE_DIR}`);
      console.log(`=======================================================`);
    }
  });
}

// Exporta o app Express mantendo compatibilidade com destructuring { app, server } da suite de testes
app.app = app;
app.server = server;
module.exports = app;
