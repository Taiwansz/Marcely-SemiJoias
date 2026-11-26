/**
 * Marcely Semijoias - Painel Administrativo de Catalogo (admin.js)
 * CRUD completo integrado ao backend REST (/api/products) com sincronizacao
 * automatica em localStorage ('marcely_admin_catalog_v1') e fallback para deploy estatico.
 * Zero emojis em 100% do codigo e mensagens.
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    catalog: 'marcely_admin_catalog_v1',
    catalogTs: 'marcely_admin_catalog_ts',
    pin: 'marcely_admin_pin_v1',
    locked: 'marcely_admin_locked_v1'
  };

  const DEFAULT_PIN = 'MARCELY2026';
  const DEFAULT_IMAGE = 'assets/products/item_ac30f328e209483a98fbcc35074b9295.jpg';

  const CATEGORY_LABELS = {
    brincos: 'Brincos',
    colares: 'Colares',
    pulseiras: 'Pulseiras',
    aneis: 'Anéis'
  };

  const PRESET_METALS = [
    'Ouro 18k (10 milésimos)',
    'Ouro 18k (15 milésimos)',
    'Ródio Nobre Hipoalergênico',
    'Ouro 18k & Pérolas Naturais',
    'Ouro 18k & Ródio',
    'Ouro 18k & Madrepérola',
    'Ródio Nobre & Pérolas'
  ];

  const DEFAULT_SPECS = {
    banho: '10 milésimos de Ouro 18k ou Ródio Nobre',
    verniz: 'Nano-cerâmico hipoalergênico (German Tech)',
    pedras: 'Zircônias 5A Lapidação Brilhante Suíça / Pérolas Naturais',
    garantia: 'Garantia Vitalícia no Banho e Certificado de Autenticidade',
    niquel: '100% Livre de Níquel e Metais Pesados'
  };

  const state = {
    products: [],
    apiAvailable: false,
    searchQuery: '',
    categoryFilter: 'all',
    stockFilter: 'all',
    sortBy: 'default',
    editingId: null,
    deletingId: null,
    pendingImageDataUrl: null,
    isSubmitting: false
  };

  // ==========================================================================
  // UTILITARIOS PUROS
  // ==========================================================================

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function formatBRL(value) {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return 'R$ ' + safe.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatRefCode(id) {
    if (!id) return 'M-NOVO';
    return String(id).replace(/^marcely_/i, 'M-').toUpperCase();
  }

  function computePricing(rawPrice) {
    const num = Number(rawPrice);
    const price = Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : 0;
    const pix = Number((price * 0.95).toFixed(2));
    const installments = '6x de R$ ' + (price / 6).toFixed(2) + ' sem juros';
    return { price, pix_discount_price: pix, installments };
  }

  function generateLocalProductId() {
    const bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `marcely_${hex}`;
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';

    const dot = document.createElement('span');
    dot.style.display = 'inline-block';
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.flexShrink = '0';
    dot.style.backgroundColor = type === 'success' ? '#D4AF37' : (type === 'error' ? '#E57373' : '#A09D98');

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(dot);
    toast.appendChild(text);
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 340);
    }, 3600);
  }

  function syncLocalStorageMirror(products) {
    try {
      localStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.catalogTs, String(Date.now()));
    } catch (err) {
      console.warn('[Admin] Nao foi possivel espelhar catalogo no localStorage:', err.message);
    }
    try {
      window.dispatchEvent(new CustomEvent('marcely:catalog-updated', {
        detail: { total: products.length }
      }));
    } catch (_) {}
  }

  function readLocalStorageCatalog() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.catalog);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return null;
  }

  // ==========================================================================
  // DETECCAO DE API E CARREGAMENTO DO CATALOGO
  // ==========================================================================

  async function detectApiAvailability() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data && data.status === 'healthy' && data.admin_crud === true);
    } catch (_) {
      clearTimeout(timer);
      return false;
    }
  }

  function updatePersistenceBadge() {
    const dot = document.getElementById('persistenceModeDot');
    const text = document.getElementById('persistenceModeText');
    const badge = document.getElementById('persistenceModeBadge');
    if (!dot || !text || !badge) return;

    if (state.apiAvailable) {
      dot.style.backgroundColor = '#21573B';
      text.textContent = 'API Local Ativa (Gravação Direta)';
      badge.className = 'inline-flex items-center gap-2 rounded-full bg-[#EDF5F0] border border-[#21573B]/20 px-3 py-1 text-[11px] font-medium text-[#21573B]';
    } else {
      dot.style.backgroundColor = '#745A2E';
      text.textContent = 'Modo Navegador (LocalStorage)';
      badge.className = 'inline-flex items-center gap-2 rounded-full bg-[#F6F3EE] border border-[#745A2E]/25 px-3 py-1 text-[11px] font-medium text-[#745A2E]';
    }
  }

  async function loadCatalog() {
    state.apiAvailable = await detectApiAvailability();
    updatePersistenceBadge();

    if (state.apiAvailable) {
      try {
        const res = await fetch('/api/products', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.products = Array.isArray(data.products) ? data.products : [];
        syncLocalStorageMirror(state.products);
        renderAll();
        return state.products;
      } catch (err) {
        console.warn('[Admin] Falha ao consultar /api/products, migrando para fallback local:', err.message);
        state.apiAvailable = false;
        updatePersistenceBadge();
      }
    }

    // Modo estatico / navegador: usa override localStorage se existir, senao carrega products.json
    const stored = readLocalStorageCatalog();
    if (stored && stored.length >= 0 && localStorage.getItem(STORAGE_KEYS.catalog) !== null) {
      state.products = stored;
      renderAll();
      return state.products;
    }

    try {
      const res = await fetch('products.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();
      state.products = Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('[Admin] Erro ao carregar products.json:', err.message);
      state.products = [];
      showToast('Nao foi possivel carregar o catalogo inicial.', 'error');
    }

    renderAll();
    return state.products;
  }

  // ==========================================================================
  // OPERACOES CRUD (API REAL + SINCRONIZACAO LOCALSTORAGE / FALLBACK ESTATICO)
  // ==========================================================================

  async function createProduct(payload) {
    const cleanName = String(payload.name || '').trim();
    const cleanCategory = String(payload.category || '').toLowerCase().trim();
    const numPrice = Number(payload.price);

    if (cleanName.length < 2) {
      throw new Error('Informe o nome da peça (mínimo 2 caracteres).');
    }
    if (!CATEGORY_LABELS[cleanCategory]) {
      throw new Error('Selecione uma categoria válida.');
    }
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      throw new Error('Informe um preço válido maior que zero.');
    }

    if (state.apiAvailable) {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 501 || res.status === 405) {
          state.apiAvailable = false;
          updatePersistenceBadge();
        } else if (!res.ok) {
          throw new Error(data.error || `Erro HTTP ${res.status} ao cadastrar peça.`);
        } else {
          const created = data.product;
          state.products.unshift(created);
          syncLocalStorageMirror(state.products);
          renderAll();
          showToast('Peça cadastrada e salva no catálogo.', 'success');
          return created;
        }
      } catch (err) {
        if (err && err.name !== 'TypeError') {
          throw err;
        }
        state.apiAvailable = false;
        updatePersistenceBadge();
      }
    }

    // Fallback LocalStorage (deploy estatico / Vercel read-only)
    const pricing = computePricing(numPrice);
    const localProduct = {
      id: generateLocalProductId(),
      name: cleanName,
      category: cleanCategory,
      metal: String(payload.metal || 'Ouro 18k (10 milésimos)').trim(),
      price: pricing.price,
      installments: pricing.installments,
      pix_discount_price: pricing.pix_discount_price,
      image: payload.imageDataUrl || payload.image || DEFAULT_IMAGE,
      description: String(payload.description || 'Acabamento de alta joalheria com banho nobre hipoalergênico.').trim(),
      specs: { ...DEFAULT_SPECS, ...(payload.specs || {}) },
      in_stock: payload.in_stock !== undefined ? Boolean(payload.in_stock) : true,
      badge: String(payload.badge || '').trim(),
      rating: 5.0,
      reviews_count: 1
    };

    state.products.unshift(localProduct);
    syncLocalStorageMirror(state.products);
    renderAll();
    showToast("Salvo localmente no navegador. Use 'Exportar products.json' para atualizar o servidor.", 'info');
    return localProduct;
  }

  async function updateProduct(id, payload) {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error('Peça não encontrada no catálogo.');
    }

    if (state.apiAvailable) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 501 || res.status === 405) {
          state.apiAvailable = false;
          updatePersistenceBadge();
        } else if (!res.ok) {
          throw new Error(data.error || `Erro HTTP ${res.status} ao atualizar peça.`);
        } else {
          state.products[idx] = data.product;
          syncLocalStorageMirror(state.products);
          renderAll();
          showToast('Alterações salvas no catálogo.', 'success');
          return data.product;
        }
      } catch (err) {
        if (err && err.name !== 'TypeError') {
          throw err;
        }
        state.apiAvailable = false;
        updatePersistenceBadge();
      }
    }

    // Fallback LocalStorage
    const current = state.products[idx];
    const updated = { ...current };

    if (payload.name !== undefined) updated.name = String(payload.name).trim();
    if (payload.category !== undefined) updated.category = String(payload.category).toLowerCase().trim();
    if (payload.metal !== undefined) updated.metal = String(payload.metal).trim();
    if (payload.description !== undefined) updated.description = String(payload.description).trim();
    if (payload.badge !== undefined) updated.badge = String(payload.badge).trim();
    if (payload.in_stock !== undefined) updated.in_stock = Boolean(payload.in_stock);
    if (payload.price !== undefined) {
      const pricing = computePricing(payload.price);
      updated.price = pricing.price;
      updated.pix_discount_price = pricing.pix_discount_price;
      updated.installments = pricing.installments;
    }
    if (payload.imageDataUrl) {
      updated.image = payload.imageDataUrl;
    } else if (payload.image) {
      updated.image = String(payload.image).trim();
    }

    state.products[idx] = updated;
    syncLocalStorageMirror(state.products);
    renderAll();
    showToast("Salvo localmente no navegador. Use 'Exportar products.json' para atualizar o servidor.", 'info');
    return updated;
  }

  async function deleteProduct(id) {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error('Peça não encontrada no catálogo.');
    }

    if (state.apiAvailable) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 501 || res.status === 405) {
          state.apiAvailable = false;
          updatePersistenceBadge();
        } else if (!res.ok) {
          throw new Error(data.error || `Erro HTTP ${res.status} ao retirar peça.`);
        } else {
          state.products.splice(idx, 1);
          syncLocalStorageMirror(state.products);
          renderAll();
          showToast('Peça retirada do catálogo.', 'success');
          return true;
        }
      } catch (err) {
        if (err && err.name !== 'TypeError') {
          throw err;
        }
        state.apiAvailable = false;
        updatePersistenceBadge();
      }
    }

    // Fallback LocalStorage
    state.products.splice(idx, 1);
    syncLocalStorageMirror(state.products);
    renderAll();
    showToast("Salvo localmente no navegador. Use 'Exportar products.json' para atualizar o servidor.", 'info');
    return true;
  }

  // ==========================================================================
  // RENDERIZACAO DE KPIS, TABELA DESKTOP E CARDS MOBILE
  // ==========================================================================

  function getFilteredProducts() {
    let list = state.products.slice();

    if (state.categoryFilter !== 'all') {
      list = list.filter(p => (p.category || '').toLowerCase() === state.categoryFilter);
    }

    if (state.stockFilter === 'in') {
      list = list.filter(p => p.in_stock !== false);
    } else if (state.stockFilter === 'out') {
      list = list.filter(p => p.in_stock === false);
    }

    if (state.searchQuery) {
      const q = normalizeText(state.searchQuery);
      list = list.filter(p => {
        const ref = normalizeText(formatRefCode(p.id));
        return (
          normalizeText(p.name).includes(q) ||
          normalizeText(p.metal).includes(q) ||
          normalizeText(p.category).includes(q) ||
          normalizeText(p.description).includes(q) ||
          normalizeText(p.id).includes(q) ||
          ref.includes(q)
        );
      });
    }

    if (state.sortBy === 'name-asc') {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    } else if (state.sortBy === 'price-asc') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (state.sortBy === 'price-desc') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    return list;
  }

  function renderKPIs() {
    const total = state.products.length;
    const inStock = state.products.filter(p => p.in_stock !== false).length;
    const outOfStock = total - inStock;
    const totalValue = state.products.reduce((acc, p) => acc + Number(p.price || 0), 0);
    const avgTicket = total > 0 ? totalValue / total : 0;
    const avgPix = avgTicket * 0.95;

    const counts = { brincos: 0, colares: 0, pulseiras: 0, aneis: 0 };
    state.products.forEach(p => {
      const cat = (p.category || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, cat)) {
        counts[cat]++;
      }
    });

    const elTotal = document.getElementById('kpiTotalProducts');
    const elInStock = document.getElementById('kpiInStockCount');
    const elOutLabel = document.getElementById('kpiOutOfStockLabel');
    const elStockBar = document.getElementById('kpiStockProgressBar');
    const elAvgTicket = document.getElementById('kpiAverageTicket');
    const elAvgPix = document.getElementById('kpiAveragePix');

    if (elTotal) elTotal.textContent = String(total);
    if (elInStock) elInStock.textContent = String(inStock);
    if (elOutLabel) elOutLabel.textContent = `${outOfStock} ${outOfStock === 1 ? 'esgotada' : 'esgotadas'}`;
    if (elStockBar) elStockBar.style.width = total > 0 ? `${Math.round((inStock / total) * 100)}%` : '0%';
    if (elAvgTicket) elAvgTicket.textContent = formatBRL(avgTicket);
    if (elAvgPix) elAvgPix.textContent = `Média Pix: ${formatBRL(avgPix)}`;

    const elBrincos = document.getElementById('kpiCatBrincos');
    const elColares = document.getElementById('kpiCatColares');
    const elPulseiras = document.getElementById('kpiCatPulseiras');
    const elAneis = document.getElementById('kpiCatAneis');
    if (elBrincos) elBrincos.textContent = String(counts.brincos);
    if (elColares) elColares.textContent = String(counts.colares);
    if (elPulseiras) elPulseiras.textContent = String(counts.pulseiras);
    if (elAneis) elAneis.textContent = String(counts.aneis);
  }

  function renderProductsList() {
    const filtered = getFilteredProducts();
    const tbody = document.getElementById('adminProductsTableBody');
    const mobileList = document.getElementById('adminProductsMobileList');
    const emptyState = document.getElementById('adminEmptyState');
    const counter = document.getElementById('adminResultsCounter');

    if (counter) {
      counter.textContent = `Exibindo ${filtered.length} de ${state.products.length} peças`;
    }

    if (filtered.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (mobileList) mobileList.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (tbody) {
      tbody.innerHTML = filtered.map(prod => {
        const refCode = formatRefCode(prod.id);
        const catLabel = CATEGORY_LABELS[(prod.category || '').toLowerCase()] || prod.category || 'Peça';
        const pixPrice = prod.pix_discount_price || Number((Number(prod.price || 0) * 0.95).toFixed(2));
        const inStock = prod.in_stock !== false;
        const safeId = escapeHtml(prod.id);
        const safeName = escapeHtml(prod.name);
        const safeMetal = escapeHtml(prod.metal || 'Ouro 18k (10 milésimos)');
        const safeBadge = prod.badge ? `<span class="inline-flex items-center rounded-full bg-[#F6F3EE] border border-[#745A2E]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#745A2E]">${escapeHtml(prod.badge)}</span>` : '';
        const imgSrc = escapeHtml(prod.image || DEFAULT_IMAGE);

        return `
          <tr class="hover:bg-[#FCF9F4]/80 transition-colors" data-product-id="${safeId}">
            <td class="py-3.5 pl-5 pr-3">
              <div class="flex items-center gap-3.5 min-w-0">
                <a href="produto.html?id=${encodeURIComponent(prod.id)}" target="_blank" rel="noopener" class="w-14 h-14 rounded-xl overflow-hidden bg-[#F6F3EE] border border-[#1C1C19]/[0.06] flex-shrink-0 block" title="Visualizar peça na loja">
                  <img src="${imgSrc}" alt="${safeName}" loading="lazy" class="w-full h-full object-cover">
                </a>
                <div class="min-w-0">
                  <p class="font-serif text-base font-medium text-[#1C1C19] truncate max-w-[280px]">${safeName}</p>
                  <div class="flex flex-wrap items-center gap-2 mt-0.5">
                    <span class="text-[11px] font-mono text-[#787571]">${escapeHtml(refCode)}</span>
                    ${safeBadge}
                  </div>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-3">
              <span class="text-xs font-semibold uppercase tracking-wider text-[#745A2E] block">${escapeHtml(catLabel)}</span>
              <span class="text-xs text-[#4D4540] block mt-0.5">${safeMetal}</span>
            </td>
            <td class="py-3.5 px-3 whitespace-nowrap">
              <span class="font-serif text-base font-semibold text-[#1C1C19] block">${formatBRL(prod.price)}</span>
              <span class="text-[11px] font-medium text-[#745A2E] block">Pix: ${formatBRL(pixPrice)}</span>
            </td>
            <td class="py-3.5 px-3">
              <button type="button" class="stock-pill ${inStock ? 'stock-pill-in' : 'stock-pill-out'}" data-action="toggle-stock" data-id="${safeId}" title="Clique para alternar disponibilidade">
                <span class="w-1.5 h-1.5 rounded-full ${inStock ? 'bg-[#21573B]' : 'bg-[#93000A]'}"></span>
                <span>${inStock ? 'Em estoque' : 'Esgotado'}</span>
              </button>
            </td>
            <td class="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
              <div class="inline-flex items-center justify-end gap-2">
                <button type="button" data-action="edit" data-id="${safeId}" class="min-h-[38px] px-4 rounded-full border border-[#1C1C19]/15 bg-white text-[#1C1C19] hover:border-[#745A2E] hover:text-[#745A2E] text-xs font-semibold transition-colors">
                  Editar
                </button>
                <button type="button" data-action="delete" data-id="${safeId}" class="min-h-[38px] px-4 rounded-full border border-[#93000A]/20 bg-[#FBF0EE] text-[#93000A] hover:bg-[#93000A] hover:text-white text-xs font-semibold transition-colors">
                  Retirar
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (mobileList) {
      mobileList.innerHTML = filtered.map(prod => {
        const refCode = formatRefCode(prod.id);
        const catLabel = CATEGORY_LABELS[(prod.category || '').toLowerCase()] || prod.category || 'Peça';
        const pixPrice = prod.pix_discount_price || Number((Number(prod.price || 0) * 0.95).toFixed(2));
        const inStock = prod.in_stock !== false;
        const safeId = escapeHtml(prod.id);
        const safeName = escapeHtml(prod.name);
        const safeMetal = escapeHtml(prod.metal || 'Ouro 18k (10 milésimos)');
        const imgSrc = escapeHtml(prod.image || DEFAULT_IMAGE);
        const safeBadge = prod.badge ? `<span class="inline-flex items-center rounded-full bg-[#F6F3EE] border border-[#745A2E]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#745A2E]">${escapeHtml(prod.badge)}</span>` : '';

        return `
          <article class="bg-white rounded-2xl p-4 border border-[#1C1C19]/[0.08] shadow-[0_8px_20px_-12px_rgba(28,28,25,0.06)] space-y-3" data-product-id="${safeId}">
            <div class="flex items-start gap-3">
              <img src="${imgSrc}" alt="${safeName}" loading="lazy" class="w-[72px] h-[72px] rounded-xl object-cover bg-[#F6F3EE] border border-[#1C1C19]/[0.06] flex-shrink-0">
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-semibold uppercase tracking-widest text-[#745A2E]">${escapeHtml(catLabel)}</span>
                  <span class="text-[10px] font-mono text-[#787571]">${escapeHtml(refCode)}</span>
                </div>
                <h3 class="font-serif text-base font-medium text-[#1C1C19] leading-snug line-clamp-2">${safeName}</h3>
                <p class="text-[11px] text-[#787571] truncate">${safeMetal}</p>
                ${safeBadge ? `<div class="pt-0.5">${safeBadge}</div>` : ''}
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 pt-2.5 border-t border-[#1C1C19]/[0.06]">
              <div>
                <span class="font-serif text-base font-semibold text-[#1C1C19] block">${formatBRL(prod.price)}</span>
                <span class="text-[11px] font-medium text-[#745A2E] block">Pix: ${formatBRL(pixPrice)}</span>
              </div>
              <button type="button" class="stock-pill ${inStock ? 'stock-pill-in' : 'stock-pill-out'}" data-action="toggle-stock" data-id="${safeId}">
                <span class="w-1.5 h-1.5 rounded-full ${inStock ? 'bg-[#21573B]' : 'bg-[#93000A]'}"></span>
                <span>${inStock ? 'Em estoque' : 'Esgotado'}</span>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <button type="button" data-action="edit" data-id="${safeId}" class="min-h-[44px] rounded-full border border-[#1C1C19]/15 bg-white text-[#1C1C19] hover:border-[#745A2E] text-xs font-semibold uppercase tracking-wider transition-colors">
                Editar
              </button>
              <button type="button" data-action="delete" data-id="${safeId}" class="min-h-[44px] rounded-full border border-[#93000A]/20 bg-[#FBF0EE] text-[#93000A] hover:bg-[#93000A] hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors">
                Retirar
              </button>
            </div>
          </article>
        `;
      }).join('');
    }
  }

  function renderAll() {
    renderKPIs();
    renderProductsList();
  }

  // ==========================================================================
  // MODAL DE CADASTRO / EDICAO & PREVIEW AO VIVO
  // ==========================================================================

  function setModalState(modalId, isOpen) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.toggle('active', isOpen);
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

    const anyOpen = Boolean(document.querySelector('.admin-modal.active'));
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  }

  function closeModals() {
    setModalState('productFormModal', false);
    setModalState('deleteConfirmModal', false);
    setModalState('pinConfigModal', false);
    state.editingId = null;
    state.deletingId = null;
  }

  function getSelectedMetalValue() {
    const preset = document.getElementById('fieldMetalPreset');
    const custom = document.getElementById('fieldMetalCustom');
    if (!preset) return 'Ouro 18k (10 milésimos)';
    if (preset.value === '__custom__') {
      return (custom && custom.value.trim()) || 'Ouro 18k (10 milésimos)';
    }
    return preset.value;
  }

  function setMetalFields(metalValue) {
    const preset = document.getElementById('fieldMetalPreset');
    const custom = document.getElementById('fieldMetalCustom');
    if (!preset || !custom) return;

    const value = String(metalValue || 'Ouro 18k (10 milésimos)').trim();
    if (PRESET_METALS.includes(value)) {
      preset.value = value;
      custom.value = '';
      custom.classList.add('hidden');
    } else {
      preset.value = '__custom__';
      custom.value = value;
      custom.classList.remove('hidden');
    }
  }

  function clearUploadedImage() {
    state.pendingImageDataUrl = null;
    const fileInput = document.getElementById('fieldImageFile');
    const infoBox = document.getElementById('uploadedFileInfo');
    if (fileInput) fileInput.value = '';
    if (infoBox) {
      infoBox.classList.add('hidden');
      infoBox.classList.remove('flex');
    }
    updateLivePreview();
  }

  function updateLivePreview() {
    const nameEl = document.getElementById('fieldName');
    const catEl = document.getElementById('fieldCategory');
    const priceEl = document.getElementById('fieldPrice');
    const badgeEl = document.getElementById('fieldBadge');
    const stockEl = document.getElementById('fieldInStock');
    const descEl = document.getElementById('fieldDescription');
    const urlEl = document.getElementById('fieldImageUrl');

    const name = (nameEl && nameEl.value.trim()) || 'Nova Semijoia Marcely';
    const category = (catEl && catEl.value) || 'brincos';
    const pricing = computePricing(priceEl ? priceEl.value : 0);
    const metal = getSelectedMetalValue();
    const badge = badgeEl ? badgeEl.value.trim() : '';
    const inStock = stockEl ? stockEl.checked : true;
    const description = (descEl && descEl.value.trim()) || 'Acabamento de alta joalheria com banho nobre hipoalergênico.';
    const imageSrc = state.pendingImageDataUrl || (urlEl && urlEl.value.trim()) || DEFAULT_IMAGE;

    const livePix = document.getElementById('livePixPriceText');
    const liveInst = document.getElementById('liveInstallmentsText');
    if (livePix) livePix.textContent = formatBRL(pricing.pix_discount_price);
    if (liveInst) liveInst.textContent = pricing.installments;

    const pImg = document.getElementById('previewImage');
    const pMetal = document.getElementById('previewMetalBadge');
    const pBadge = document.getElementById('previewEditorialBadge');
    const pOut = document.getElementById('previewOutOfStockBanner');
    const pCat = document.getElementById('previewCategory');
    const pName = document.getElementById('previewName');
    const pDesc = document.getElementById('previewDescription');
    const pPrice = document.getElementById('previewPrice');
    const pPix = document.getElementById('previewPixPrice');
    const pInst = document.getElementById('previewInstallments');

    if (pImg && pImg.getAttribute('src') !== imageSrc) {
      pImg.src = imageSrc;
    }

    if (pMetal) {
      const isGold = normalizeText(metal).includes('ouro');
      pMetal.className = isGold ? 'badge-gold' : 'badge-rhodium';
      pMetal.textContent = isGold ? 'Ouro 18k' : 'Ródio Nobre';
    }

    if (pBadge) {
      if (badge) {
        pBadge.textContent = badge;
        pBadge.classList.remove('hidden');
      } else {
        pBadge.classList.add('hidden');
      }
    }

    if (pOut) {
      pOut.classList.toggle('hidden', inStock);
    }

    if (pCat) pCat.textContent = CATEGORY_LABELS[category] || category;
    if (pName) pName.textContent = name;
    if (pDesc) pDesc.textContent = description;
    if (pPrice) pPrice.textContent = formatBRL(pricing.price);
    if (pPix) pPix.textContent = `${formatBRL(pricing.pix_discount_price)} no Pix (5% OFF)`;
    if (pInst) pInst.textContent = pricing.installments;
  }

  function showFormError(message) {
    const errBox = document.getElementById('productFormError');
    if (!errBox) return;
    if (!message) {
      errBox.textContent = '';
      errBox.classList.add('hidden');
      return;
    }
    errBox.textContent = message;
    errBox.classList.remove('hidden');
  }

  function openCreateModal() {
    state.editingId = null;
    state.pendingImageDataUrl = null;
    showFormError('');

    document.getElementById('productModalEyebrow').textContent = 'Novo Cadastro';
    document.getElementById('productModalTitle').textContent = 'Cadastrar Nova Peça';
    document.getElementById('btnSubmitProductLabel').textContent = 'Cadastrar Peça';

    document.getElementById('fieldProductId').value = '';
    document.getElementById('fieldName').value = '';
    document.getElementById('fieldCategory').value = 'brincos';
    document.getElementById('fieldPrice').value = '';
    setMetalFields('Ouro 18k (10 milésimos)');
    document.getElementById('fieldBadge').value = 'Lançamento';
    document.getElementById('fieldInStock').checked = true;
    document.getElementById('fieldDescription').value = '';
    document.getElementById('fieldImageUrl').value = '';
    clearUploadedImage();

    updateLivePreview();
    setModalState('productFormModal', true);
    setTimeout(() => {
      const nameInput = document.getElementById('fieldName');
      if (nameInput) nameInput.focus();
    }, 80);
  }

  function openEditModal(id) {
    const prod = state.products.find(p => p.id === id);
    if (!prod) {
      showToast('Peça não encontrada para edição.', 'error');
      return;
    }

    state.editingId = prod.id;
    state.pendingImageDataUrl = null;
    showFormError('');

    document.getElementById('productModalEyebrow').textContent = `Editando ${formatRefCode(prod.id)}`;
    document.getElementById('productModalTitle').textContent = 'Editar Peça do Catálogo';
    document.getElementById('btnSubmitProductLabel').textContent = 'Salvar Alterações';

    document.getElementById('fieldProductId').value = prod.id;
    document.getElementById('fieldName').value = prod.name || '';
    document.getElementById('fieldCategory').value = (prod.category || 'brincos').toLowerCase();
    document.getElementById('fieldPrice').value = Number(prod.price || 0).toFixed(2);
    setMetalFields(prod.metal || 'Ouro 18k (10 milésimos)');
    document.getElementById('fieldBadge').value = prod.badge || '';
    document.getElementById('fieldInStock').checked = prod.in_stock !== false;
    document.getElementById('fieldDescription').value = prod.description || '';
    document.getElementById('fieldImageUrl').value = prod.image || '';
    clearUploadedImage();

    updateLivePreview();
    setModalState('productFormModal', true);
  }

  function openDeleteModal(id) {
    const prod = state.products.find(p => p.id === id);
    if (!prod) {
      showToast('Peça não encontrada.', 'error');
      return;
    }

    state.deletingId = prod.id;
    const imgEl = document.getElementById('deletePreviewImage');
    const nameEl = document.getElementById('deletePreviewName');
    const metaEl = document.getElementById('deletePreviewMeta');

    if (imgEl) imgEl.src = prod.image || DEFAULT_IMAGE;
    if (nameEl) nameEl.textContent = prod.name || 'Peça Marcely';
    if (metaEl) metaEl.textContent = `${formatRefCode(prod.id)} | ${CATEGORY_LABELS[prod.category] || prod.category} | ${formatBRL(prod.price)}`;

    setModalState('deleteConfirmModal', true);
  }

  // ==========================================================================
  // UPLOAD DE FOTO COM REDIMENSIONAMENTO CANVAS (MAX 900PX, JPEG 0.86)
  // ==========================================================================

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
        reject(new Error('Selecione uma imagem válida no formato JPG, PNG ou WEBP.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Não foi possível processar esta imagem.'));
        img.onload = () => {
          const maxDim = 900;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FCF9F4';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
          resolve({ dataUrl, width, height, name: file.name });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageSelection(file) {
    if (!file) return;
    showFormError('');
    try {
      const result = await compressImageFile(file);
      state.pendingImageDataUrl = result.dataUrl;
      const infoBox = document.getElementById('uploadedFileInfo');
      const label = document.getElementById('uploadedFileLabel');
      if (label) {
        label.textContent = `${result.name} (${result.width}x${result.height}px otimizada)`;
      }
      if (infoBox) {
        infoBox.classList.remove('hidden');
        infoBox.classList.add('flex');
      }
      updateLivePreview();
      showToast('Foto carregada e otimizada para a vitrine.', 'success');
    } catch (err) {
      showFormError(err.message);
    }
  }

  // ==========================================================================
  // EXPORTACAO JSON, RESTAURACAO E PIN DE SESSAO OPCIONAL
  // ==========================================================================

  function exportCatalogJson() {
    const serialized = JSON.stringify(state.products, null, 2) + '\n';
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Arquivo products.json exportado (${state.products.length} peças).`, 'success');
  }

  async function resetCatalogOverride() {
    try {
      localStorage.removeItem(STORAGE_KEYS.catalog);
      localStorage.removeItem(STORAGE_KEYS.catalogTs);
    } catch (_) {}

    await loadCatalog();
    showToast('Catálogo sincronizado com a base padrão.', 'success');
  }

  function getConfiguredPin() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.pin);
      if (stored && stored.trim()) return stored.trim().toUpperCase();
    } catch (_) {}
    return DEFAULT_PIN;
  }

  function applyLockState() {
    const isLocked = sessionStorage.getItem(STORAGE_KEYS.locked) === '1';
    const overlay = document.getElementById('pinLockOverlay');
    const statusLabel = document.getElementById('pinStatusLabel');
    if (overlay) {
      overlay.classList.toggle('hidden', !isLocked);
    }
    if (statusLabel) {
      statusLabel.textContent = isLocked ? 'Bloqueado' : 'Sessão Ativa';
    }
  }

  function lockSession() {
    sessionStorage.setItem(STORAGE_KEYS.locked, '1');
    closeModals();
    applyLockState();
    const unlockInput = document.getElementById('fieldUnlockPin');
    if (unlockInput) {
      unlockInput.value = '';
      unlockInput.focus();
    }
  }

  // ==========================================================================
  // EVENT LISTENERS & BOOTSTRAP
  // ==========================================================================

  function bindEvents() {
    // Open create modal buttons
    ['btnOpenCreateProduct', 'btnHeaderCreateProduct', 'btnMobileTabCreate', 'btnEmptyCreateProduct'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', openCreateModal);
    });

    // Export & Reset buttons
    const btnExport = document.getElementById('btnExportJson');
    if (btnExport) btnExport.addEventListener('click', exportCatalogJson);

    const btnReset = document.getElementById('btnResetLocalCatalog');
    if (btnReset) btnReset.addEventListener('click', resetCatalogOverride);

    // Empty state reset filters
    const btnEmptyReset = document.getElementById('btnEmptyResetFilters');
    if (btnEmptyReset) {
      btnEmptyReset.addEventListener('click', () => {
        state.searchQuery = '';
        state.categoryFilter = 'all';
        state.stockFilter = 'all';
        state.sortBy = 'default';
        const searchEl = document.getElementById('adminSearchInput');
        if (searchEl) searchEl.value = '';
        const sortEl = document.getElementById('adminSortSelect');
        if (sortEl) sortEl.value = 'default';
        document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.category === 'all'));
        document.querySelectorAll('.stock-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.stock === 'all'));
        renderProductsList();
      });
    }

    // Real-time search
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderProductsList();
      });
    }

    // Category filter chips
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.categoryFilter = btn.dataset.category || 'all';
        document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderProductsList();
      });
    });

    // Stock status chips
    document.querySelectorAll('.stock-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.stockFilter = btn.dataset.stock || 'all';
        document.querySelectorAll('.stock-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderProductsList();
      });
    });

    // Sort select
    const sortSelect = document.getElementById('adminSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderProductsList();
      });
    }

    // Delegated actions on table & mobile cards (edit, delete, toggle-stock)
    const handleListClick = async (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      if (action === 'edit') {
        openEditModal(id);
      } else if (action === 'delete') {
        openDeleteModal(id);
      } else if (action === 'toggle-stock') {
        const prod = state.products.find(p => p.id === id);
        if (!prod) return;
        btn.disabled = true;
        try {
          await updateProduct(id, { in_stock: prod.in_stock === false });
        } catch (err) {
          showToast(err.message || 'Erro ao atualizar estoque.', 'error');
        } finally {
          btn.disabled = false;
        }
      }
    };

    const tbody = document.getElementById('adminProductsTableBody');
    const mobileList = document.getElementById('adminProductsMobileList');
    if (tbody) tbody.addEventListener('click', handleListClick);
    if (mobileList) mobileList.addEventListener('click', handleListClick);

    // Close modals via buttons or backdrops
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.getAttribute('data-close-modal');
        setModalState(target, false);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });

    // Metal preset custom input toggle
    const metalPreset = document.getElementById('fieldMetalPreset');
    const metalCustom = document.getElementById('fieldMetalCustom');
    if (metalPreset && metalCustom) {
      metalPreset.addEventListener('change', () => {
        const isCustom = metalPreset.value === '__custom__';
        metalCustom.classList.toggle('hidden', !isCustom);
        if (isCustom) metalCustom.focus();
        updateLivePreview();
      });
    }

    // Live preview updates
    ['fieldName', 'fieldCategory', 'fieldPrice', 'fieldMetalCustom', 'fieldBadge', 'fieldInStock', 'fieldDescription', 'fieldImageUrl'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', updateLivePreview);
      el.addEventListener('change', updateLivePreview);
    });

    // Image upload dropzone
    const dropzone = document.getElementById('imageUploadDropzone');
    const fileInput = document.getElementById('fieldImageFile');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImageSelection(e.target.files[0]);
        }
      });
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('is-dragover');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageSelection(e.dataTransfer.files[0]);
        }
      });
    }

    const btnClearUpload = document.getElementById('btnClearUploadedImage');
    if (btnClearUpload) btnClearUpload.addEventListener('click', clearUploadedImage);

    // Product form submission
    const productForm = document.getElementById('productForm');
    if (productForm) {
      productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (state.isSubmitting) return;
        showFormError('');

        const name = document.getElementById('fieldName').value.trim();
        const category = document.getElementById('fieldCategory').value;
        const price = parseFloat(document.getElementById('fieldPrice').value);
        const metal = getSelectedMetalValue();
        const badge = document.getElementById('fieldBadge').value.trim();
        const in_stock = document.getElementById('fieldInStock').checked;
        const description = document.getElementById('fieldDescription').value.trim();
        const imageUrl = document.getElementById('fieldImageUrl').value.trim();

        if (name.length < 2) {
          showFormError('Informe o nome da peça (mínimo 2 caracteres).');
          return;
        }
        if (!Number.isFinite(price) || price <= 0) {
          showFormError('Informe um preço válido maior que zero.');
          return;
        }

        const payload = {
          name,
          category,
          metal,
          price,
          badge,
          in_stock,
          description
        };

        if (state.pendingImageDataUrl) {
          payload.imageDataUrl = state.pendingImageDataUrl;
        } else if (imageUrl) {
          payload.image = imageUrl;
        }

        const submitBtn = document.getElementById('btnSubmitProductForm');
        const submitLabel = document.getElementById('btnSubmitProductLabel');
        const originalLabel = submitLabel ? submitLabel.textContent : 'Salvar';

        state.isSubmitting = true;
        if (submitBtn) submitBtn.disabled = true;
        if (submitLabel) submitLabel.textContent = 'Salvando...';

        try {
          if (state.editingId) {
            await updateProduct(state.editingId, payload);
          } else {
            await createProduct(payload);
          }
          closeModals();
        } catch (err) {
          showFormError(err.message || 'Não foi possível salvar a peça.');
        } finally {
          state.isSubmitting = false;
          if (submitBtn) submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = originalLabel;
        }
      });
    }

    // Confirm Delete button
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        if (!state.deletingId) return;
        btnConfirmDelete.disabled = true;
        btnConfirmDelete.textContent = 'Retirando...';
        try {
          await deleteProduct(state.deletingId);
          closeModals();
        } catch (err) {
          showToast(err.message || 'Erro ao retirar peça.', 'error');
        } finally {
          btnConfirmDelete.disabled = false;
          btnConfirmDelete.textContent = 'Retirar do Catálogo';
        }
      });
    }

    // Optional PIN modal & lock controls
    const btnOpenPin = document.getElementById('btnOpenPinModal');
    if (btnOpenPin) {
      btnOpenPin.addEventListener('click', () => {
        const pinInput = document.getElementById('fieldNewPin');
        if (pinInput) pinInput.value = '';
        setModalState('pinConfigModal', true);
      });
    }

    const btnSavePin = document.getElementById('btnSavePin');
    if (btnSavePin) {
      btnSavePin.addEventListener('click', () => {
        const pinInput = document.getElementById('fieldNewPin');
        const val = pinInput ? pinInput.value.trim().toUpperCase() : '';
        if (val.length >= 4) {
          localStorage.setItem(STORAGE_KEYS.pin, val);
          showToast('PIN de sessão atualizado com sucesso.', 'success');
          closeModals();
        } else {
          showToast('Informe um PIN com pelo menos 4 caracteres.', 'error');
        }
      });
    }

    const btnLockNow = document.getElementById('btnLockNow');
    if (btnLockNow) btnLockNow.addEventListener('click', lockSession);

    const pinUnlockForm = document.getElementById('pinUnlockForm');
    if (pinUnlockForm) {
      pinUnlockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('fieldUnlockPin');
        const err = document.getElementById('pinUnlockError');
        const entered = input ? input.value.trim().toUpperCase() : '';
        if (entered === getConfiguredPin()) {
          sessionStorage.removeItem(STORAGE_KEYS.locked);
          if (err) err.classList.add('hidden');
          applyLockState();
          showToast('Sessão administrativa desbloqueada.', 'success');
        } else {
          if (err) err.classList.remove('hidden');
        }
      });
    }
  }

  // API publica para auditoria Playwright e integracao
  window.__marcelyAdmin = {
    getProducts: () => state.products.slice(),
    getMode: () => (state.apiAvailable ? 'api' : 'localStorage'),
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModals,
    createProduct,
    updateProduct,
    deleteProduct,
    exportCatalogJson,
    resetCatalogOverride,
    reload: loadCatalog
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    applyLockState();
    loadCatalog();
  });
})();
