/**
 * Marcely Semijoias - Serverless Catalog Endpoint (/api/products)
 * Suporta leitura filtrada com invalidacao automatica de cache via mtimeMs
 * e retorna HTTP 501 explicativo em operacoes de escrita sob ambiente serverless read-only.
 */

const fs = require('fs');
const path = require('path');

let cachedProducts = null;
let cachedSourcePath = null;
let cachedMtimeMs = 0;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function loadProducts() {
  const paths = [
    path.join(__dirname, '../site/products.json'),
    path.join(__dirname, '_catalog.json'),
    path.join(process.cwd(), 'site/products.json'),
    path.join(process.cwd(), '_catalog.json')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const stat = fs.statSync(p);
        if (cachedProducts && cachedSourcePath === p && cachedMtimeMs === stat.mtimeMs) {
          return cachedProducts;
        }
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(parsed)) {
          cachedProducts = parsed;
          cachedSourcePath = p;
          cachedMtimeMs = stat.mtimeMs;
          return cachedProducts;
        }
      } catch (e) {}
    }
  }
  return [];
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return res.status(501).json({
      error: 'Operacoes de escrita direta indisponiveis em ambiente serverless somente leitura.',
      code: 'SERVERLESS_READ_ONLY',
      fallback: 'localStorage_and_json_export',
      message: 'As alteracoes serao mantidas no armazenamento local do navegador. Use Exportar products.json no painel administrativo para atualizar o catalogo em producao.'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const all = loadProducts();
  const query = req.query || {};
  const { category, metal, maxPrice, search, inStock, limit, id } = query;

  if (id) {
    const item = all.find(p => p.id === id);
    if (!item) return res.status(404).json({ error: 'Produto nao encontrado' });
    return res.status(200).json(item);
  }

  let items = [...all];

  if (category && normalizeText(category) !== 'all' && normalizeText(category) !== 'todos') {
    const catNorm = normalizeText(category);
    items = items.filter(p => normalizeText(p.category) === catNorm);
  }

  if (metal && normalizeText(metal) !== 'all' && normalizeText(metal) !== 'todos') {
    const metalNorm = normalizeText(metal);
    items = items.filter(p => normalizeText(p.metal).includes(metalNorm));
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) items = items.filter(p => Number(p.price) <= max);
  }

  if (inStock !== undefined && inStock !== '' && normalizeText(inStock) !== 'all') {
    const flag = normalizeText(inStock);
    if (flag === 'true' || flag === '1') {
      items = items.filter(p => p.in_stock !== false);
    } else if (flag === 'false' || flag === '0') {
      items = items.filter(p => p.in_stock === false);
    }
  }

  if (search) {
    const s = normalizeText(search);
    items = items.filter(p => {
      const refCode = normalizeText((p.id || '').replace('marcely_', 'm-'));
      return (
        normalizeText(p.name).includes(s) ||
        normalizeText(p.description).includes(s) ||
        normalizeText(p.metal).includes(s) ||
        normalizeText(p.id).includes(s) ||
        refCode.includes(s)
      );
    });
  }

  if (limit) {
    const l = parseInt(limit, 10);
    if (!isNaN(l) && l > 0) items = items.slice(0, l);
  }

  return res.status(200).json({
    total: items.length,
    products: items
  });
};
