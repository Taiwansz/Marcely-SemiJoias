const fs = require('fs');
const path = require('path');

let cachedProducts = null;

function loadProducts() {
  if (cachedProducts) return cachedProducts;
  const paths = [
    path.join(__dirname, '_catalog.json'),
    path.join(__dirname, '../site/products.json'),
    path.join(process.cwd(), 'site/products.json'),
    path.join(process.cwd(), '_catalog.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        cachedProducts = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return cachedProducts;
      } catch (e) {}
    }
  }
  return [];
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const all = loadProducts();
  const { category, metal, maxPrice, search, limit, id } = req.query;

  if (id) {
    const item = all.find(p => p.id === id);
    if (!item) return res.status(404).json({ error: 'Produto nao encontrado' });
    return res.status(200).json(item);
  }

  let items = [...all];
  if (category) {
    items = items.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
  }
  if (metal) {
    items = items.filter(p => (p.metal || '').toLowerCase().includes(metal.toLowerCase()));
  }
  if (maxPrice) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) items = items.filter(p => p.price <= max);
  }
  if (search) {
    const s = String(search).toLowerCase();
    items = items.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.description || '').toLowerCase().includes(s)
    );
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
