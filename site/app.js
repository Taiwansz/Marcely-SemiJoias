/**
 * MARCELY OLIVEIRA -- SEMI-JOIAS FINAS
 * Central Interactive Application Engine (app.js)
 * 
 * Features:
 * - Dynamic Product Engine (products.json integration)
 * - LocalStorage Cart Persistence & Realtime Badges
 * - Slide-out Drawer Cart with Free Shipping Progress Bar (R$ 300 goal)
 * - Coupon Management (MARCELY10 - 10% OFF)
 * - Instant Pix Checkout Modal with QR Code Canvas & 15:00 Countdown Timer
 * - Debounced Catalog Search & Category/Metal Filtering
 * - Product Details Page Controller with Metal Selector & FAQ Accordions
 * - Toast Notification System
 * - Zero Emojis Enforced Across Entire Codebase
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================
  const CONFIG = {
    productsUrl: 'products.json',
    cartStorageKey: 'marcely_cart_v1',
    wishlistStorageKey: 'marcely_wishlist_v1',
    freeShippingThreshold: 300.0,
    defaultProductId: 'marcely_f84c037a057e', // Anel Solitario Diamon Majestic
    pixDiscountRate: 0.05, // 5% discount on Pix
    validCoupons: {
      'MARCELY10': 0.10,
      'DIAMON15': 0.15,
      'PRIVE5': 0.05
    }
  };

  // Global State
  const state = {
    products: [],
    cart: [],
    wishlist: new Set(),
    appliedCoupon: null,
    pixTimerInterval: null,
    pixTimeRemaining: 900 // 15 minutes in seconds
  };

  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================
  function formatBRL(value) {
    if (typeof value !== 'number' || isNaN(value)) value = 0;
    return 'R$ ' + value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Minimalist Luxury Indicator
    const icon = document.createElement('span');
    icon.style.display = 'inline-block';
    icon.style.width = '8px';
    icon.style.height = '8px';
    icon.style.borderRadius = '50%';
    icon.style.backgroundColor = type === 'success' ? '#D4AF37' : '#787571';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    // Animation trigger
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 350);
    }, 3500);
  }

  // ==========================================================================
  // STORAGE & CART MANAGEMENT
  // ==========================================================================
  function loadStoredState() {
    try {
      const storedCart = localStorage.getItem(CONFIG.cartStorageKey);
      if (storedCart) {
        state.cart = JSON.parse(storedCart);
      }
      const storedWishlist = localStorage.getItem(CONFIG.wishlistStorageKey);
      if (storedWishlist) {
        state.wishlist = new Set(JSON.parse(storedWishlist));
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do localStorage:', e);
      state.cart = [];
      state.wishlist = new Set();
    }
  }

  function saveCartState() {
    try {
      localStorage.setItem(CONFIG.cartStorageKey, JSON.stringify(state.cart));
    } catch (e) {
      console.warn('Erro ao salvar sacola no localStorage:', e);
    }
    updateCartBadges();
    renderCartDrawer();
  }

  function saveWishlistState() {
    try {
      localStorage.setItem(CONFIG.wishlistStorageKey, JSON.stringify(Array.from(state.wishlist)));
    } catch (e) {
      console.warn('Erro ao salvar favoritos:', e);
    }
    updateWishlistBadges();
  }

  function updateCartBadges() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(badge => {
      badge.textContent = totalItems;
      badge.style.display = totalItems > 0 ? 'flex' : 'none';
    });
  }

  function updateWishlistBadges() {
    const count = state.wishlist.size;
    const badges = document.querySelectorAll('.wishlist-count-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function addToCart(product, quantity = 1, selectedMetal = null) {
    if (!product) return;
    const metal = selectedMetal || product.metal || 'Ouro 18k (10 milésimos)';
    const itemKey = `${product.id}_${metal}`;

    const existingIndex = state.cart.findIndex(item => item.cartKey === itemKey);
    if (existingIndex > -1) {
      state.cart[existingIndex].quantity += quantity;
    } else {
      state.cart.push({
        cartKey: itemKey,
        id: product.id,
        name: product.name,
        category: product.category,
        metal: metal,
        price: product.price,
        image: product.image,
        quantity: quantity
      });
    }

    saveCartState();
    showToast(`"${product.name}" adicionado à sua Sacola.`, 'success');
    openCart();
  }

  function removeFromCart(cartKey) {
    state.cart = state.cart.filter(item => item.cartKey !== cartKey);
    saveCartState();
    showToast('Item removido da sacola.', 'info');
  }

  function updateCartQuantity(cartKey, delta) {
    const item = state.cart.find(i => i.cartKey === cartKey);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(cartKey);
    } else {
      saveCartState();
    }
  }

  function toggleWishlist(productId) {
    if (state.wishlist.has(productId)) {
      state.wishlist.delete(productId);
      showToast('Item removido dos favoritos.', 'info');
    } else {
      state.wishlist.add(productId);
      showToast('Item salvo na sua lista de desejos.', 'success');
    }
    saveWishlistState();
    
    // Update any active icon states on page
    document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
      if (state.wishlist.has(productId)) {
        btn.classList.add('text-secondary');
      } else {
        btn.classList.remove('text-secondary');
      }
    });
  }

  // ==========================================================================
  // DRAWER CART UI
  // ==========================================================================
  function openCart() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) {
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderCartDrawer();
    }
  }

  function closeCart() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) {
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function renderCartDrawer() {
    const itemsContainer = document.getElementById('cartDrawerItems');
    const emptyState = document.getElementById('cartDrawerEmpty');
    const footer = document.getElementById('cartDrawerFooter');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    const discountRow = document.getElementById('cartDrawerDiscountRow');
    const discountEl = document.getElementById('cartDrawerDiscount');
    const totalEl = document.getElementById('cartDrawerTotal');
    const pixTotalEl = document.getElementById('cartDrawerPixTotal');
    const progressFill = document.getElementById('shippingProgressFill');
    const progressText = document.getElementById('shippingProgressText');

    if (!itemsContainer) return;

    if (state.cart.length === 0) {
      itemsContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (footer) footer.style.display = 'none';
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = `Adicione R$ ${CONFIG.freeShippingThreshold.toFixed(2)} para Frete Cortesia`;
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (footer) footer.style.display = 'block';

    // Calculate Totals
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    if (state.appliedCoupon) {
      discount = subtotal * state.appliedCoupon.rate;
    }
    const finalTotal = Math.max(0, subtotal - discount);
    const pixTotal = finalTotal * (1 - CONFIG.pixDiscountRate);

    // Free Shipping Progress
    const remainingToFreeShipping = CONFIG.freeShippingThreshold - subtotal;
    const progressPercent = Math.min(100, Math.round((subtotal / CONFIG.freeShippingThreshold) * 100));
    
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    if (progressText) {
      if (remainingToFreeShipping <= 0) {
        progressText.innerHTML = '<span class="text-secondary font-semibold">Parabéns! Sua compra atingiu Frete Cortesia Oficial.</span>';
      } else {
        progressText.textContent = `Faltam ${formatBRL(remainingToFreeShipping)} para você garantir Frete Cortesia`;
      }
    }

    // Render Items
    itemsContainer.innerHTML = state.cart.map(item => `
      <div class="flex gap-4 p-4 border-b border-subtle bg-surface-container-lowest/60 rounded-xl mb-3">
        <div class="w-20 h-20 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div class="flex justify-between items-start gap-2">
            <div>
              <h4 class="font-serif text-sm font-semibold text-primary line-clamp-1">${item.name}</h4>
              <p class="text-xs text-on-surface-variant mt-0.5">${item.metal}</p>
            </div>
            <button class="text-on-surface-variant hover:text-error transition-colors p-1" onclick="window.MarcelyApp.removeFromCart('${item.cartKey}')" title="Remover item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="flex justify-between items-center mt-2">
            <div class="flex items-center border border-outline-variant rounded bg-surface-container-low px-2 py-0.5">
              <button class="text-primary hover:text-secondary px-1 text-sm font-semibold" onclick="window.MarcelyApp.updateCartQuantity('${item.cartKey}', -1)">-</button>
              <span class="mx-2 text-xs font-semibold">${item.quantity}</span>
              <button class="text-primary hover:text-secondary px-1 text-sm font-semibold" onclick="window.MarcelyApp.updateCartQuantity('${item.cartKey}', 1)">+</button>
            </div>
            <span class="font-serif text-sm font-semibold text-primary">${formatBRL(item.price * item.quantity)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Summary texts
    if (subtotalEl) subtotalEl.textContent = formatBRL(subtotal);
    if (discountRow && discountEl) {
      if (discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `- ${formatBRL(discount)} (${state.appliedCoupon.code})`;
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (totalEl) totalEl.textContent = formatBRL(finalTotal);
    if (pixTotalEl) pixTotalEl.textContent = formatBRL(pixTotal);
  }

  function applyCoupon() {
    const input = document.getElementById('cartCouponInput');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    if (CONFIG.validCoupons[code]) {
      state.appliedCoupon = {
        code: code,
        rate: CONFIG.validCoupons[code]
      };
      showToast(`Cupom ${code} aplicado com sucesso!`, 'success');
      renderCartDrawer();
    } else {
      showToast('Cupom inválido ou expirado.', 'info');
    }
  }

  // ==========================================================================
  // PIX CHECKOUT MODAL & SIMULATION
  // ==========================================================================
  function generatePixQrMatrix(canvas, code) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // High elegance QR Code pattern generator
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const modules = 29;
    const cellSize = Math.floor(size / modules);
    const offset = Math.floor((size - (modules * cellSize)) / 2);

    ctx.fillStyle = '#141416';

    // Simple pseudo-random hash from string to create static aesthetic QR
    let seed = 0;
    for (let i = 0; i < code.length; i++) {
      seed = (seed * 31 + code.charCodeAt(i)) & 0xFFFFFFFF;
    }

    const pseudoRandom = () => {
      seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (seed >>> 0) / 4294967296;
    };

    // Draw finder patterns (top-left, top-right, bottom-left)
    function drawFinder(startX, startY) {
      ctx.fillRect(offset + startX * cellSize, offset + startY * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(offset + (startX + 1) * cellSize, offset + (startY + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#141416';
      ctx.fillRect(offset + (startX + 2) * cellSize, offset + (startY + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    }

    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Draw random data cells (avoiding finder patterns)
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const inTL = (r < 8 && c < 8);
        const inTR = (r < 8 && c >= modules - 8);
        const inBL = (r >= modules - 8 && c < 8);
        const inCenterLogo = (r >= 12 && r <= 16 && c >= 12 && c <= 16);

        if (!inTL && !inTR && !inBL && !inCenterLogo) {
          if (pseudoRandom() > 0.5) {
            ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize - 0.5, cellSize - 0.5);
          }
        }
      }
    }

    // Draw central luxury monogram badge
    const badgeSize = 5 * cellSize;
    const badgeX = offset + 12 * cellSize;
    const badgeY = offset + 12 * cellSize;
    ctx.fillStyle = '#0D0D0E';
    ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
    ctx.fillStyle = '#D4AF37';
    ctx.font = `bold ${Math.round(badgeSize * 0.4)}px "Bodoni Moda", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MO', badgeX + badgeSize / 2, badgeY + badgeSize / 2);
  }

  function startPixTimer() {
    if (state.pixTimerInterval) clearInterval(state.pixTimerInterval);
    state.pixTimeRemaining = 900; // 15:00

    const timerEl = document.getElementById('pixTimerCountdown');
    const updateDisplay = () => {
      const minutes = Math.floor(state.pixTimeRemaining / 60);
      const seconds = state.pixTimeRemaining % 60;
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      if (timerEl) timerEl.textContent = formatted;

      if (state.pixTimeRemaining <= 0) {
        clearInterval(state.pixTimerInterval);
        if (timerEl) timerEl.textContent = '00:00 (Expirado)';
        showToast('Código Pix expirado. Solicite uma nova chave.', 'info');
      }
      state.pixTimeRemaining--;
    };

    updateDisplay();
    state.pixTimerInterval = setInterval(updateDisplay, 1000);
  }

  function openPixCheckout(customTotal = null, customTitle = null) {
    let finalAmount = 0;
    let description = customTitle || 'Compra Marcely Joalheria';

    if (customTotal !== null) {
      finalAmount = customTotal * (1 - CONFIG.pixDiscountRate);
    } else {
      const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      let discount = state.appliedCoupon ? subtotal * state.appliedCoupon.rate : 0;
      finalAmount = Math.max(0, subtotal - discount) * (1 - CONFIG.pixDiscountRate);
    }

    if (finalAmount <= 0) {
      showToast('Sua sacola está vazia.', 'info');
      return;
    }

    const modal = document.getElementById('pixModal');
    const amountEl = document.getElementById('pixModalAmount');
    const codeEl = document.getElementById('pixCopiaEColaInput');
    const canvas = document.getElementById('pixQrCanvas');

    if (amountEl) amountEl.textContent = formatBRL(finalAmount);

    // Realistic EMV Pix Code
    const cleanAmount = finalAmount.toFixed(2);
    const pixPayload = `00020126580014br.gov.bcb.pix0136pix@marcelysemijoias.com.br520400005303986540${cleanAmount}5802BR5925MARCELY OLIVEIRA ATELIER6009SAO PAULO62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;

    if (codeEl) codeEl.value = pixPayload;
    if (canvas) generatePixQrMatrix(canvas, pixPayload);

    startPixTimer();

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closePixModal() {
    const modal = document.getElementById('pixModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    if (state.pixTimerInterval) clearInterval(state.pixTimerInterval);
  }

  function copyPixCode() {
    const input = document.getElementById('pixCopiaEColaInput');
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('Chave Pix Copia e Cola copiada para a área de transferência!', 'success');
    }).catch(() => {
      showToast('Código copiado.', 'info');
    });
  }

  function confirmPixPayment() {
    closePixModal();
    closeCart();
    state.cart = [];
    saveCartState();

    showToast('Pagamento Pix identificado com sucesso! Pedido confirmado.', 'success');
    setTimeout(() => {
      alert('Marcely Joalheria: Pagamento via Pix aprovado! Seu pedido foi encaminhado para embalagem de veludo exclusiva e certificado de garantia.');
    }, 400);
  }

  // ==========================================================================
  // DATA FETCHING & INITIALIZATION
  // ==========================================================================
  async function loadProductsData() {
    try {
      const response = await fetch(CONFIG.productsUrl);
      if (!response.ok) throw new Error('Falha ao carregar catálogo');
      state.products = await response.json();
      window.MarcelyProducts = state.products;
    } catch (error) {
      console.warn('Aviso: Utilizando catálogo em cache interno:', error);
      // Fallback cache if products.json path is accessed from nested path
      state.products = window.MarcelyProducts || [];
    }
  }

  // ==========================================================================
  // HOME PAGE CONTROLLER (index.html)
  // ==========================================================================
  function initHomePage() {
    const featuredGrid = document.getElementById('featuredProductsGrid');
    if (!featuredGrid) return;

    if (!state.products || state.products.length === 0) {
      setTimeout(initHomePage, 150);
      return;
    }

    // Select 8 high-tier showcase items
    const showcaseItems = state.products.slice(0, 8);

    featuredGrid.innerHTML = showcaseItems.map(prod => `
      <div class="group flex flex-col liquid-glass-card p-4 rounded-2xl relative">
        <div class="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-container mb-4">
          <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <span class="absolute top-3 left-3 ${prod.metal.includes('Ouro') ? 'badge-gold' : 'badge-rhodium'}">
            ${prod.metal.includes('Ouro') ? 'Ouro 18k' : 'Ródio Nobre'}
          </span>
          <button class="absolute top-3 right-3 w-8 h-8 rounded-full liquid-glass-light flex items-center justify-center text-primary hover:text-secondary transition-colors" onclick="window.MarcelyApp.toggleWishlist('${prod.id}')" data-wishlist-id="${prod.id}" title="Favoritar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${state.wishlist.has(prod.id) ? '#D4AF37' : 'none'}" stroke="currentColor" stroke-width="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <span class="font-sans text-[11px] uppercase tracking-wider text-secondary font-semibold">${prod.category}</span>
            <h3 class="font-serif text-base font-medium text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              <a href="produto.html?id=${prod.id}">${prod.name}</a>
            </h3>
            <p class="font-sans text-xs text-on-surface-variant mt-1">${prod.installments}</p>
          </div>
          <div class="pt-4 border-t border-subtle mt-3 flex items-center justify-between">
            <div>
              <span class="font-serif text-lg font-semibold text-primary">${formatBRL(prod.price)}</span>
              <span class="block font-sans text-[11px] text-secondary font-medium">${formatBRL(prod.pix_discount_price)} à vista</span>
            </div>
            <button class="w-10 h-10 rounded-full bg-primary text-on-primary hover:bg-secondary flex items-center justify-center transition-colors shadow-sm" onclick="window.MarcelyApp.addToCartById('${prod.id}')" title="Adicionar à Sacola">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // CATALOG PAGE CONTROLLER (catalogo.html)
  // ==========================================================================
  const catalogState = {
    activeCategory: 'all',
    activeMetal: 'all',
    searchQuery: '',
    sortBy: 'featured',
    currentPage: 1,
    itemsPerPage: 12
  };

  function initCatalogPage() {
    const grid = document.getElementById('catalogProductsGrid');
    if (!grid) return;

    if (!state.products || state.products.length === 0) {
      setTimeout(initCatalogPage, 150);
      return;
    }

    // Check URL parameters (e.g. ?cat=aneis&metal=ouro&q=solitario)
    const urlCat = getUrlParam('cat');
    const urlMetal = getUrlParam('metal');
    const urlSearch = getUrlParam('q');

    if (urlCat) catalogState.activeCategory = urlCat.toLowerCase();
    if (urlMetal) catalogState.activeMetal = urlMetal.toLowerCase();
    if (urlSearch) catalogState.searchQuery = urlSearch;

    // Set search input value if present
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput && urlSearch) {
      searchInput.value = urlSearch;
    }

    setupCatalogEventListeners();
    renderCatalogGrid();
  }

  function setupCatalogEventListeners() {
    // Category Chips
    const categoryButtons = document.querySelectorAll('.filter-category');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        categoryButtons.forEach(b => {
          b.classList.remove('bg-primary', 'text-on-primary');
          b.classList.add('bg-surface-container-lowest', 'text-on-surface-variant');
        });
        btn.classList.add('bg-primary', 'text-on-primary');
        btn.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant');

        catalogState.activeCategory = btn.dataset.cat || 'all';
        catalogState.currentPage = 1;
        renderCatalogGrid();
      });
    });

    // Metal Filter
    const metalSelect = document.getElementById('catalogMetalFilter');
    if (metalSelect) {
      metalSelect.addEventListener('change', (e) => {
        catalogState.activeMetal = e.target.value;
        catalogState.currentPage = 1;
        renderCatalogGrid();
      });
    }

    // Sort Filter
    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        catalogState.sortBy = e.target.value;
        renderCatalogGrid();
      });
    }

    // Search Input Debounced
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        catalogState.searchQuery = e.target.value.trim().toLowerCase();
        catalogState.currentPage = 1;
        renderCatalogGrid();
      }, 300));
    }

    // Load More Button
    const loadMoreBtn = document.getElementById('catalogLoadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        catalogState.currentPage++;
        renderCatalogGrid(true);
      });
    }
  }

  function renderCatalogGrid(append = false) {
    const grid = document.getElementById('catalogProductsGrid');
    const counterEl = document.getElementById('catalogProductsCount');
    const loadMoreContainer = document.getElementById('catalogLoadMoreContainer');
    if (!grid) return;

    // Filter Logic
    let filtered = state.products.filter(item => {
      // Category
      if (catalogState.activeCategory !== 'all') {
        if (item.category.toLowerCase() !== catalogState.activeCategory) return false;
      }
      // Metal
      if (catalogState.activeMetal !== 'all') {
        const itemMetalLower = item.metal.toLowerCase();
        if (catalogState.activeMetal === 'ouro' && !itemMetalLower.includes('ouro')) return false;
        if (catalogState.activeMetal === 'rodio' && !itemMetalLower.includes('ródio') && !itemMetalLower.includes('rodio')) return false;
      }
      // Search
      if (catalogState.searchQuery) {
        const query = catalogState.searchQuery;
        const nameMatch = item.name.toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        const catMatch = item.category.toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }
      return true;
    });

    // Sorting Logic
    if (catalogState.sortBy === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (catalogState.sortBy === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (catalogState.sortBy === 'best-sellers') {
      filtered.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
    }

    // Update Counter
    if (counterEl) {
      counterEl.textContent = `Exibindo ${Math.min(catalogState.currentPage * catalogState.itemsPerPage, filtered.length)} de ${filtered.length} peças`;
    }

    const itemsToDisplay = filtered.slice(0, catalogState.currentPage * catalogState.itemsPerPage);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <p class="font-serif text-xl text-primary">Nenhuma joia encontrada com esses filtros.</p>
          <p class="text-sm text-on-surface-variant mt-2">Experimente buscar por outros termos ou redefinir as categorias.</p>
          <button class="btn-luxury-outline mt-6" onclick="window.MarcelyApp.resetCatalogFilters()">Redefinir Filtros</button>
        </div>
      `;
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      return;
    }

    const html = itemsToDisplay.map(prod => `
      <div class="group flex flex-col liquid-glass-card p-4 rounded-2xl relative">
        <div class="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-container mb-4">
          <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <span class="absolute top-3 left-3 ${prod.metal.includes('Ouro') ? 'badge-gold' : 'badge-rhodium'}">
            ${prod.metal.includes('Ouro') ? 'Ouro 18k' : 'Ródio Nobre'}
          </span>
          <button class="absolute top-3 right-3 w-8 h-8 rounded-full liquid-glass-light flex items-center justify-center text-primary hover:text-secondary transition-colors" onclick="window.MarcelyApp.toggleWishlist('${prod.id}')" data-wishlist-id="${prod.id}" title="Favoritar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${state.wishlist.has(prod.id) ? '#D4AF37' : 'none'}" stroke="currentColor" stroke-width="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <span class="font-sans text-[11px] uppercase tracking-wider text-secondary font-semibold">${prod.category}</span>
            <h3 class="font-serif text-base font-medium text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              <a href="produto.html?id=${prod.id}">${prod.name}</a>
            </h3>
            <p class="font-sans text-xs text-on-surface-variant mt-1 line-clamp-1">${prod.description || ''}</p>
          </div>
          <div class="pt-4 border-t border-subtle mt-3 flex items-center justify-between">
            <div>
              <span class="font-serif text-lg font-semibold text-primary">${formatBRL(prod.price)}</span>
              <span class="block font-sans text-[11px] text-secondary font-medium">${formatBRL(prod.pix_discount_price)} à vista</span>
            </div>
            <button class="w-10 h-10 rounded-full bg-primary text-on-primary hover:bg-secondary flex items-center justify-center transition-colors shadow-sm" onclick="window.MarcelyApp.addToCartById('${prod.id}')" title="Adicionar à Sacola">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    grid.innerHTML = html;

    // Toggle Load More Button
    if (loadMoreContainer) {
      loadMoreContainer.style.display = itemsToDisplay.length < filtered.length ? 'flex' : 'none';
    }
  }

  function resetCatalogFilters() {
    catalogState.activeCategory = 'all';
    catalogState.activeMetal = 'all';
    catalogState.searchQuery = '';
    catalogState.currentPage = 1;

    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) searchInput.value = '';

    const categoryButtons = document.querySelectorAll('.filter-category');
    categoryButtons.forEach((b, idx) => {
      if (idx === 0) {
        b.classList.add('bg-primary', 'text-on-primary');
        b.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant');
      } else {
        b.classList.remove('bg-primary', 'text-on-primary');
        b.classList.add('bg-surface-container-lowest', 'text-on-surface-variant');
      }
    });

    renderCatalogGrid();
  }

  // ==========================================================================
  // PRODUCT DETAILS CONTROLLER (produto.html)
  // ==========================================================================
  const productDetailState = {
    product: null,
    selectedMetal: 'Ouro 18k (10 milésimos)',
    quantity: 1,
    currentImageIndex: 0
  };

  function initProductDetailPage() {
    const detailContainer = document.getElementById('productDetailContainer');
    if (!detailContainer) return;

    if (!state.products || state.products.length === 0) {
      setTimeout(initProductDetailPage, 150);
      return;
    }

    const productId = getUrlParam('id') || CONFIG.defaultProductId;
    let product = state.products.find(p => p.id === productId);

    // Fallback to Anel Solitario Diamon Majestic if not found
    if (!product) {
      product = state.products.find(p => p.id === CONFIG.defaultProductId) || state.products[0];
    }

    productDetailState.product = product;
    productDetailState.selectedMetal = product.metal || 'Ouro 18k (10 milésimos)';

    renderProductDetails();
    renderRelatedProducts(product);
  }

  function renderProductDetails() {
    const p = productDetailState.product;
    if (!p) return;

    // Document title
    document.title = `${p.name} | Marcely Oliveira Alta Joalheria`;

    // Breadcrumb & Headings
    const breadcrumbCat = document.getElementById('detailBreadcrumbCat');
    const breadcrumbTitle = document.getElementById('detailBreadcrumbTitle');
    const titleEl = document.getElementById('detailProductTitle');
    const badgeEl = document.getElementById('detailBadge');
    const refCodeEl = document.getElementById('detailRefCode');
    const descEl = document.getElementById('detailDescription');

    if (breadcrumbCat) {
      breadcrumbCat.textContent = p.category.toUpperCase();
      breadcrumbCat.href = `catalogo.html?cat=${p.category}`;
    }
    if (breadcrumbTitle) breadcrumbTitle.textContent = p.name;
    if (titleEl) titleEl.textContent = p.name;
    if (badgeEl) badgeEl.textContent = p.badge || 'Peça Exclusiva';
    if (refCodeEl) refCodeEl.textContent = `REF: ${p.id.replace('marcely_', 'MO-').toUpperCase()}`;
    if (descEl) descEl.textContent = p.description;

    // Prices calculation
    updateDetailPrices();

    // Main Image & Thumbnails
    const mainImg = document.getElementById('detailMainImage');
    if (mainImg) mainImg.src = p.image;

    // Specs table
    const specsContainer = document.getElementById('detailSpecsList');
    if (specsContainer && p.specs) {
      specsContainer.innerHTML = `
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Banho Nobre</span>
          <span class="font-semibold text-primary">${p.specs.banho || '10 milésimos de Ouro 18k'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Verniz de Proteção</span>
          <span class="font-semibold text-primary">${p.specs.verniz || 'Nano-cerâmico German Tech'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Cravação & Pedras</span>
          <span class="font-semibold text-primary">${p.specs.pedras || 'Zircônias 5A Lapidação Suíça'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Hipoalergênico</span>
          <span class="font-semibold text-primary">${p.specs.niquel || '100% Livre de Níquel'}</span>
        </div>
        <div class="py-2.5 flex justify-between">
          <span class="text-on-surface-variant">Garantia Oficial</span>
          <span class="font-semibold text-secondary">${p.specs.garantia || 'Garantia Vitalícia'}</span>
        </div>
      `;
    }

    // Metal Options setup
    setupMetalSelector();
  }

  function updateDetailPrices() {
    const p = productDetailState.product;
    if (!p) return;

    let basePrice = p.price;
    // Ródio vs Ouro slight adjustment or direct reflection
    if (productDetailState.selectedMetal.includes('Ródio') && !p.metal.includes('Ródio')) {
      basePrice = Math.round(basePrice * 0.96); // 4% metal variation
    }

    const priceEl = document.getElementById('detailPrice');
    const pixPriceEl = document.getElementById('detailPixPrice');
    const installmentsEl = document.getElementById('detailInstallments');

    const pixPrice = basePrice * (1 - CONFIG.pixDiscountRate);
    const installmentValue = (basePrice / 6).toFixed(2);

    if (priceEl) priceEl.textContent = formatBRL(basePrice);
    if (pixPriceEl) pixPriceEl.textContent = formatBRL(pixPrice);
    if (installmentsEl) installmentsEl.textContent = `ou 6x de R$ ${installmentValue} sem juros`;
  }

  function setupMetalSelector() {
    const metalButtons = document.querySelectorAll('.detail-metal-btn');
    metalButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        metalButtons.forEach(b => {
          b.classList.remove('ring-2', 'ring-primary', 'bg-surface-container-high');
        });
        btn.classList.add('ring-2', 'ring-primary', 'bg-surface-container-high');

        productDetailState.selectedMetal = btn.dataset.metal || 'Ouro 18k (10 milésimos)';
        updateDetailPrices();

        const metalLabel = document.getElementById('detailSelectedMetalLabel');
        if (metalLabel) metalLabel.textContent = productDetailState.selectedMetal;
      });
    });
  }

  function changeProductImage(src, btnElement) {
    const mainImg = document.getElementById('detailMainImage');
    if (mainImg) mainImg.src = src;

    const thumbnails = document.querySelectorAll('.detail-thumb-btn');
    thumbnails.forEach(t => t.classList.remove('ring-2', 'ring-primary', 'opacity-100'));
    if (btnElement) {
      btnElement.classList.add('ring-2', 'ring-primary', 'opacity-100');
    }
  }

  function renderRelatedProducts(currentProduct) {
    const container = document.getElementById('relatedProductsGrid');
    if (!container) return;

    const related = state.products
      .filter(p => p.id !== currentProduct.id && p.category !== currentProduct.category)
      .slice(0, 4);

    container.innerHTML = related.map(prod => `
      <div class="group flex flex-col liquid-glass-card p-3 rounded-xl relative">
        <div class="aspect-square w-full rounded-lg overflow-hidden bg-surface-container mb-3 relative">
          <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        </div>
        <span class="font-sans text-[10px] uppercase text-secondary font-semibold">${prod.category}</span>
        <h4 class="font-serif text-sm font-medium text-primary mt-0.5 line-clamp-1 group-hover:text-secondary">
          <a href="produto.html?id=${prod.id}">${prod.name}</a>
        </h4>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-subtle">
          <span class="font-serif text-sm font-semibold text-primary">${formatBRL(prod.price)}</span>
          <a href="produto.html?id=${prod.id}" class="text-xs uppercase tracking-wider text-secondary font-semibold hover:underline">Ver</a>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // ABOUT PAGE CONTROLLER (sobre.html)
  // ==========================================================================
  function initAboutPage() {
    // FAQ Accordion Toggle
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const content = toggle.nextElementSibling;
        const icon = toggle.querySelector('.faq-icon');
        const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';

        if (isOpen) {
          content.style.maxHeight = '0px';
          if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
          if (icon) icon.style.transform = 'rotate(180deg)';
        }
      });
    });
  }

  // ==========================================================================
  // PUBLIC EXPOSED API (window.MarcelyApp)
  // ==========================================================================
  window.MarcelyApp = {
    addToCartById: function (productId, quantity = 1) {
      const product = state.products.find(p => p.id === productId);
      if (product) {
        addToCart(product, quantity);
      }
    },
    addToCartFromDetail: function () {
      if (productDetailState.product) {
        const qtyInput = document.getElementById('detailQuantityInput');
        const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
        addToCart(productDetailState.product, qty, productDetailState.selectedMetal);
      }
    },
    buyNowPixFromDetail: function () {
      if (productDetailState.product) {
        const qtyInput = document.getElementById('detailQuantityInput');
        const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
        const basePrice = productDetailState.product.price * qty;
        openPixCheckout(basePrice, `${productDetailState.product.name} (${productDetailState.selectedMetal})`);
      }
    },
    removeFromCart: removeFromCart,
    updateCartQuantity: updateCartQuantity,
    toggleWishlist: toggleWishlist,
    openCart: openCart,
    closeCart: closeCart,
    applyCoupon: applyCoupon,
    openPixCheckout: openPixCheckout,
    closePixModal: closePixModal,
    copyPixCode: copyPixCode,
    confirmPixPayment: confirmPixPayment,
    changeProductImage: changeProductImage,
    resetCatalogFilters: resetCatalogFilters,
    showToast: showToast
  };

  // ==========================================================================
  // GLOBAL BOOTSTRAP
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    loadStoredState();
    updateCartBadges();
    updateWishlistBadges();

    await loadProductsData();

    // Check which page is active and initialize corresponding controller
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('catalogo.html') || document.getElementById('catalogProductsGrid')) {
      initCatalogPage();
    } else if (path.endsWith('produto.html') || document.getElementById('productDetailContainer')) {
      initProductDetailPage();
    } else if (path.endsWith('sobre.html') || document.getElementById('aboutStorySection')) {
      initAboutPage();
    } else {
      initHomePage();
    }

    // General Drawer and Modal Close Handlers
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCart();
        closePixModal();
      }
    });

    // Close on backdrop clicks
    const cartDrawer = document.getElementById('cartDrawer');
    if (cartDrawer) {
      const backdrop = cartDrawer.querySelector('.drawer-backdrop');
      if (backdrop) backdrop.addEventListener('click', closeCart);
    }

    const pixModal = document.getElementById('pixModal');
    if (pixModal) {
      const backdrop = pixModal.querySelector('.modal-backdrop');
      if (backdrop) backdrop.addEventListener('click', closePixModal);
    }
  });

})();
