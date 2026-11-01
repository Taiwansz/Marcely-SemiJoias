/**
 * MARCELY SEMIJOIAS -- REVENDEDORA AUTORIZADA VERIDIANA SEMIJOIAS
 * Central Interactive Application, Native Mobile App Tab Bar & WhatsApp Conversion Engine (app.js)
 *
 * Features:
 * - Dynamic Product Engine (58 real studio pieces from products.json)
 * - Contextualized WhatsApp Funnel (Single piece, Size help, Full selection)
 * - Instagram-Style Luxury Mobile Bottom Tab Bar (#mobileAppTabBar)
 * - Slide-out Mobile Navigation Drawer (#mobileNavDrawer) & Selection Drawer (#cartDrawer)
 * - Debounced Catalog Search & Category/Metal Filtering
 * - Product Details Page Controller with Single-Photo Guard & Smart Ring Size Selector
 * - Safe Scroll Reveal Micro-Animations (initScrollReveal)
 * - Zero Emojis Enforced Across Entire Codebase
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================
  const CONFIG = {
    whatsappNumber: '5519999999999',
    productsUrl: 'products.json',
    cartStorageKey: 'marcely_cart_v1',
    wishlistStorageKey: 'marcely_wishlist_v1',
    freeShippingThreshold: 300.0,
    defaultProductId: 'marcely_b69fa9a5a0ac',
    pixDiscountRate: 0.05,
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
    pixTimeRemaining: 900
  };

  let revealObserver = null;

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

  function isRingProduct(product) {
    if (!product) return false;
    return (product.category || '').toLowerCase() === 'aneis' ||
           (product.name || '').toLowerCase().includes('anel');
  }

  // Toast Notification System (Zero Emojis)
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';

    const icon = document.createElement('span');
    icon.style.display = 'inline-block';
    icon.style.width = '8px';
    icon.style.height = '8px';
    icon.style.borderRadius = '50%';
    icon.style.flexShrink = '0';
    icon.style.backgroundColor = type === 'success' ? '#D4AF37' : '#A09D98';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 350);
    }, 3400);
  }

  // ==========================================================================
  // SAFE SCROLL REVEAL ENGINE (initScrollReveal)
  // ==========================================================================
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal-up:not(.is-visible)');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window) || navigator.webdriver) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0,
        rootMargin: '80px 0px 80px 0px'
      });
    }

    const viewportTrigger = (window.innerHeight || document.documentElement.clientHeight) + 80;
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top <= viewportTrigger) {
        el.classList.add('is-visible');
      } else {
        revealObserver.observe(el);
      }
    });
  }

  // ==========================================================================
  // CONTEXTUALIZED WHATSAPP CONVERSION ENGINE (ZERO EMOJIS)
  // ==========================================================================
  function buildWhatsAppUrl(message) {
    return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsAppForProduct(productId, customMetal = null, customSize = null, customQty = 1) {
    const product = state.products.find(p => p.id === productId) || productDetailState.product;
    if (!product) {
      openWhatsAppConcierge();
      return;
    }

    const metal = customMetal || product.metal || 'Ouro 18k (10 milesimos)';
    const isRing = isRingProduct(product);
    const size = customSize || 'Aro 16';
    const qty = Math.max(1, parseInt(customQty, 10) || 1);
    const refCode = product.id.replace('marcely_', 'M-').toUpperCase();
    const totalPrice = product.price * qty;
    const pixPrice = product.pix_discount_price
      ? product.pix_discount_price * qty
      : totalPrice * (1 - CONFIG.pixDiscountRate);

    const lines = [
      'Ola Marcely! Estava no seu site e me interessei por esta joia:',
      '',
      `*${product.name}*`,
      `- Acabamento: ${metal}`,
      isRing ? `- Tamanho/Aro: ${size}` : null,
      qty > 1 ? `- Quantidade: ${qty}` : null,
      `- Referencia: ${refCode}`,
      `- Valor no site: ${formatBRL(totalPrice)} (ou ${formatBRL(pixPrice)} no Pix)`,
      '',
      'Gostaria de confirmar a disponibilidade e combinar o pedido com voce!'
    ].filter(Boolean);

    const url = buildWhatsAppUrl(lines.join('\n'));
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Abrindo atendimento da Marcely no WhatsApp...', 'success');
  }

  function openWhatsAppFromDetail() {
    const product = productDetailState.product;
    if (!product) {
      openWhatsAppConcierge();
      return;
    }
    const isRing = isRingProduct(product);
    const metal = productDetailState.selectedMetal || product.metal || 'Ouro 18k (10 milesimos)';
    const size = isRing ? (productDetailState.selectedSize || 'Aro 16') : null;
    const qtyInput = document.getElementById('detailQuantityInput');
    const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

    openWhatsAppForProduct(product.id, metal, size, qty);
  }

  function openWhatsAppSizeHelp() {
    const product = productDetailState.product;
    const name = product ? product.name : 'Semijoia Marcely';
    const refCode = product ? product.id.replace('marcely_', 'M-').toUpperCase() : 'M-GERAL';
    const message = `Ola Marcely! Estou vendo a peca *${name}* (Ref: ${refCode}) no site e gostaria da sua ajuda para descobrir o tamanho/aro ideal para mim.`;
    const url = buildWhatsAppUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Direcionando para consultoria de medidas no WhatsApp...', 'info');
  }

  function sendSelectionToWhatsApp() {
    if (!state.cart || state.cart.length === 0) {
      showToast('Sua selecao esta vazia. Adicione pecas primeiro.', 'info');
      return;
    }

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = state.appliedCoupon ? subtotal * state.appliedCoupon.rate : 0;
    const finalTotal = Math.max(0, subtotal - discount);
    const pixTotal = finalTotal * (1 - CONFIG.pixDiscountRate);

    const itemLines = state.cart.map((item, idx) => {
      const hasValidRingSize = item.size && item.size !== 'Padrao' && item.size !== 'Unico / Ajustavel';
      const sizeInfo = hasValidRingSize ? ` | ${item.size}` : '';
      return `${idx + 1}. *${item.name}* (${item.metal}${sizeInfo}) - Qtd: ${item.quantity} - ${formatBRL(item.price * item.quantity)}`;
    });

    const messageLines = [
      'Ola Marcely! Montei minha selecao de joias no seu site e gostaria de atendimento para finalizar:',
      '',
      ...itemLines,
      '',
      `*Total Estimado:* ${formatBRL(finalTotal)} (ou ${formatBRL(pixTotal)} com 5% OFF no Pix)`,
      '',
      'Poderia verificar a disponibilidade das pecas e me passar as opcoes de pagamento e entrega?'
    ];

    const url = buildWhatsAppUrl(messageLines.join('\n'));
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Enviando sua selecao para o WhatsApp da Marcely...', 'success');
  }

  function openWhatsAppConcierge(customText = null) {
    const text = customText || 'Ola Marcely! Estava navegando no site da Marcely Semijoias e gostaria de atendimento personalizado para escolher uma peca.';
    const url = buildWhatsAppUrl(text);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Iniciando atendimento com a Marcely...', 'success');
  }

  function openConciergeChat() {
    if (window.MarcelyConcierge && typeof window.MarcelyConcierge.open === 'function') {
      window.MarcelyConcierge.open();
    } else {
      openWhatsAppConcierge();
    }
  }

  // ==========================================================================
  // MOBILE MENU DRAWER (#mobileNavDrawer)
  // ==========================================================================
  function openMobileMenu() {
    closeCart();
    const navDrawer = document.getElementById('mobileNavDrawer');
    if (navDrawer) {
      navDrawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeMobileMenu() {
    const navDrawer = document.getElementById('mobileNavDrawer');
    if (navDrawer && navDrawer.classList.contains('active')) {
      navDrawer.classList.remove('active');
      const cartDrawer = document.getElementById('cartDrawer');
      if (!cartDrawer || !cartDrawer.classList.contains('active')) {
        document.body.style.overflow = '';
      }
    }
  }

  function toggleMobileMenu() {
    const navDrawer = document.getElementById('mobileNavDrawer');
    if (!navDrawer) return;
    if (navDrawer.classList.contains('active')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function bindMobileNavEvents() {
    const navDrawer = document.getElementById('mobileNavDrawer');
    if (!navDrawer || navDrawer.dataset.bound === 'true') return;
    navDrawer.dataset.bound = 'true';

    const backdrop = navDrawer.querySelector('.mobile-nav-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeMobileMenu);
    }

    navDrawer.querySelectorAll('a, [data-close-mobile-nav]').forEach(el => {
      el.addEventListener('click', closeMobileMenu);
    });
  }

  // ==========================================================================
  // STORAGE & SELECTION ("MINHA SELECAO") MANAGEMENT
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
      console.warn('Erro ao salvar selecao no localStorage:', e);
    }
    updateCartBadges();
    renderCartDrawer();
    updateMobileSelectionBar();
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

  // ==========================================================================
  // INSTAGRAM-STYLE LUXURY MOBILE BOTTOM TAB BAR (#mobileAppTabBar)
  // ==========================================================================
  function ensureMobileAppTabBar() {
    let tabBar = document.getElementById('mobileAppTabBar');
    if (!tabBar) {
      tabBar = document.createElement('nav');
      tabBar.id = 'mobileAppTabBar';
      tabBar.setAttribute('aria-label', 'Navegacao principal');
      tabBar.innerHTML = `
        <div class="mobile-app-tabbar-inner">
          <a href="index.html" class="mobile-tab-item" data-tab="home">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1V9.5z"/>
            </svg>
            <span>Inicio</span>
          </a>
          <a href="catalogo.html" class="mobile-tab-item" data-tab="explore">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7.5"/>
              <path d="M20.5 20.5L16.65 16.65"/>
            </svg>
            <span>Explorar</span>
          </a>
          <button type="button" class="mobile-tab-item" data-tab="whatsapp" onclick="window.MarcelyApp.openWhatsAppConcierge()" aria-label="Atendimento no WhatsApp">
            <span class="mobile-tab-center-pill">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </span>
            <span>WhatsApp</span>
          </button>
          <a href="sobre.html" class="mobile-tab-item" data-tab="lookbook">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>Lookbook</span>
          </a>
          <button type="button" class="mobile-tab-item" data-tab="selection" onclick="window.MarcelyApp.openCart()" aria-label="Abrir Minha Selecao">
            <span class="mobile-tab-icon-wrap">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span class="cart-count-badge" style="display:none;">0</span>
            </span>
            <span>Selecao</span>
          </button>
        </div>
      `;
      document.body.appendChild(tabBar);
    }

    // Synchronize .active state across tabs (supports both pre-rendered HTML and injected Tab Bar)
    const path = (window.location.pathname || '').toLowerCase();
    const isExplore = path.includes('catalogo') || path.includes('produto') ||
                      Boolean(document.getElementById('catalogProductsGrid')) ||
                      Boolean(document.getElementById('productDetailContainer'));
    const isLookbook = !isExplore && (path.includes('sobre') || Boolean(document.getElementById('aboutStorySection')));
    const isHome = !isExplore && !isLookbook;

    tabBar.querySelectorAll('.mobile-tab-item').forEach(item => {
      const href = (item.getAttribute('href') || '').toLowerCase();
      const tabKey = (item.dataset.tab || '').toLowerCase();

      const matchHome = isHome && (tabKey === 'home' || tabKey === 'inicio' || href.includes('index'));
      const matchExplore = isExplore && (tabKey === 'explore' || tabKey === 'explorar' || tabKey === 'catalogo' || href.includes('catalogo'));
      const matchLookbook = isLookbook && (tabKey === 'lookbook' || tabKey === 'sobre' || href.includes('sobre'));

      item.classList.toggle('active', Boolean(matchHome || matchExplore || matchLookbook));
    });

    updateCartBadges();
  }

  function ensureAuxWidgets() {
    // Remove any legacy floating WhatsApp button so widgets never clash
    const legacyFloatingWa = document.getElementById('floatingWhatsappConcierge');
    if (legacyFloatingWa) {
      legacyFloatingWa.remove();
    }

    // Coordinate PDP mobile bottom bar flag
    if (document.getElementById('productDetailContainer')) {
      document.body.classList.add('has-mobile-pdp-bar');
    }

    // 1. Ensure #mobileSelectionBar exists (clean rounded capsule on desktop)
    let selectionBar = document.getElementById('mobileSelectionBar');
    if (!selectionBar) {
      selectionBar = document.createElement('div');
      selectionBar.id = 'mobileSelectionBar';
      selectionBar.innerHTML = `
        <div class="selection-bar-inner">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 h-7 rounded-full bg-[#1C1C19] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center flex-shrink-0" id="mobileSelectionCountBadge">0</span>
            <div class="min-w-0">
              <span class="text-xs font-semibold text-[#1C1C19] block truncate" id="mobileSelectionSummaryText">Minha Selecao</span>
              <span class="text-[11px] text-[#745A2E] font-medium block truncate" id="mobileSelectionTotalText">R$ 0,00</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="button" onclick="window.MarcelyApp.openCart()" class="rounded-full border border-[#1C1C19]/15 bg-white hover:border-[#745A2E] hover:text-[#745A2E] text-[#1C1C19] min-h-[38px] px-3.5 text-[10px] font-semibold uppercase tracking-wider transition-colors">
              Minha Selecao
            </button>
            <button type="button" onclick="window.MarcelyApp.sendSelectionToWhatsApp()" class="rounded-full bg-[#000000] hover:bg-[#745A2E] text-white min-h-[38px] px-4 text-[10px] font-semibold uppercase tracking-wider transition-colors">
              Pedir no WhatsApp
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(selectionBar);
    }

    // 2. Ensure Instagram-style Mobile App Bottom Tab Bar exists and is synced
    ensureMobileAppTabBar();

    // 3. Ensure Mobile Nav Drawer events are bound if present in HTML
    bindMobileNavEvents();
  }

  function updateMobileSelectionBar() {
    ensureAuxWidgets();
    const bar = document.getElementById('mobileSelectionBar');
    if (!bar) return;

    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const pixTotal = subtotal * (1 - CONFIG.pixDiscountRate);

    if (totalItems > 0) {
      bar.classList.add('active');
      bar.style.display = 'flex';
      document.body.classList.add('has-selection-bar');

      const countEl = document.getElementById('mobileSelectionCountBadge') || bar.querySelector('.selection-count');
      const summaryEl = document.getElementById('mobileSelectionSummaryText');
      const totalEl = document.getElementById('mobileSelectionTotalText');

      if (countEl) countEl.textContent = totalItems;
      if (summaryEl) summaryEl.textContent = 'Minha Selecao';
      if (totalEl) totalEl.textContent = `${formatBRL(subtotal)} (${formatBRL(pixTotal)} no Pix)`;
    } else {
      bar.classList.remove('active');
      bar.style.display = 'none';
      document.body.classList.remove('has-selection-bar');
    }
  }

  function addToCart(product, quantity = 1, selectedMetal = null, selectedSize = null) {
    if (!product) return;
    const metal = selectedMetal || product.metal || 'Ouro 18k (10 milesimos)';
    const isRing = isRingProduct(product);
    const size = isRing ? (selectedSize || productDetailState.selectedSize || 'Aro 16') : 'Padrao';
    const itemKey = `${product.id}_${metal}_${size}`;

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
        size: size,
        price: product.price,
        image: product.image,
        quantity: quantity
      });
    }

    saveCartState();
    showToast(`"${product.name}" adicionado a Minha Selecao.`, 'success');
    openCart();
  }

  function removeFromCart(cartKey) {
    state.cart = state.cart.filter(item => item.cartKey !== cartKey);
    saveCartState();
    showToast('Item removido da Minha Selecao.', 'info');
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
    const isSaved = state.wishlist.has(productId);
    if (isSaved) {
      state.wishlist.delete(productId);
      showToast('Item removido dos favoritos.', 'info');
    } else {
      state.wishlist.add(productId);
      showToast('Item salvo na sua lista de desejos.', 'success');
    }
    saveWishlistState();

    const activeNow = state.wishlist.has(productId);
    document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
      btn.classList.toggle('text-[#745A2E]', activeNow);
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', activeNow ? '#745A2E' : 'none');
        svg.setAttribute('stroke', activeNow ? '#745A2E' : 'currentColor');
      }
    });
  }

  // ==========================================================================
  // DRAWER CART UI ("MINHA SELECAO")
  // ==========================================================================
  function openCart() {
    closeMobileMenu();
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
      const navDrawer = document.getElementById('mobileNavDrawer');
      if (!navDrawer || !navDrawer.classList.contains('active')) {
        document.body.style.overflow = '';
      }
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

    updateMobileSelectionBar();

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

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    if (state.appliedCoupon) {
      discount = subtotal * state.appliedCoupon.rate;
    }
    const finalTotal = Math.max(0, subtotal - discount);
    const pixTotal = finalTotal * (1 - CONFIG.pixDiscountRate);

    const remainingToFreeShipping = CONFIG.freeShippingThreshold - subtotal;
    const progressPercent = Math.min(100, Math.round((subtotal / CONFIG.freeShippingThreshold) * 100));

    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    if (progressText) {
      if (remainingToFreeShipping <= 0) {
        progressText.innerHTML = '<span class="text-[#745A2E] font-semibold">Sua selecao atingiu Frete Cortesia Oficial.</span>';
      } else {
        progressText.textContent = `Faltam ${formatBRL(remainingToFreeShipping)} para voce garantir Frete Cortesia`;
      }
    }

    itemsContainer.innerHTML = state.cart.map(item => {
      const showSize = item.size && item.size !== 'Padrao' && item.size !== 'Unico / Ajustavel';
      return `
        <div class="flex gap-3.5 p-3.5 border border-[#1C1C19]/[0.07] bg-white rounded-2xl mb-3 shadow-[0_6px_18px_-10px_rgba(28,28,25,0.08)]">
          <div class="w-20 h-20 bg-[#F6F3EE] rounded-xl overflow-hidden flex-shrink-0">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
          </div>
          <div class="flex-1 flex flex-col justify-between min-w-0">
            <div class="flex justify-between items-start gap-2">
              <div class="min-w-0">
                <h4 class="font-serif text-sm font-semibold text-[#1C1C19] line-clamp-1">${item.name}</h4>
                <p class="text-[11px] text-[#787571] mt-0.5 truncate">${item.metal}${showSize ? ' • ' + item.size : ''}</p>
              </div>
              <button type="button" class="w-7 h-7 rounded-full hover:bg-[#F6F3EE] text-[#787571] hover:text-[#ba1a1a] flex items-center justify-center transition-colors flex-shrink-0" onclick="window.MarcelyApp.removeFromCart('${item.cartKey}')" title="Remover da Minha Selecao" aria-label="Remover item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="flex justify-between items-center mt-2">
              <div class="inline-flex items-center border border-[#1C1C19]/12 rounded-full bg-[#FCF9F4] p-0.5">
                <button type="button" class="w-7 h-7 rounded-full text-[#1C1C19] hover:bg-white hover:text-[#745A2E] flex items-center justify-center text-sm font-semibold transition-colors" onclick="window.MarcelyApp.updateCartQuantity('${item.cartKey}', -1)" aria-label="Diminuir quantidade">-</button>
                <span class="mx-2.5 text-xs font-semibold text-[#1C1C19]">${item.quantity}</span>
                <button type="button" class="w-7 h-7 rounded-full text-[#1C1C19] hover:bg-white hover:text-[#745A2E] flex items-center justify-center text-sm font-semibold transition-colors" onclick="window.MarcelyApp.updateCartQuantity('${item.cartKey}', 1)" aria-label="Aumentar quantidade">+</button>
              </div>
              <span class="font-serif text-sm font-semibold text-[#1C1C19]">${formatBRL(item.price * item.quantity)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

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
      showToast(`Cupom ${code} aplicado na Minha Selecao!`, 'success');
      renderCartDrawer();
    } else {
      showToast('Cupom invalido ou expirado.', 'info');
    }
  }

  // ==========================================================================
  // LEGACY PIX HOOKS REDIRECTED TO WHATSAPP FUNNEL
  // ==========================================================================
  function openPixCheckout() {
    sendSelectionToWhatsApp();
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
      showToast('Chave Pix copiada!', 'success');
    }).catch(() => {
      showToast('Codigo copiado.', 'info');
    });
  }

  function confirmPixPayment() {
    closePixModal();
    sendSelectionToWhatsApp();
  }

  // ==========================================================================
  // DATA FETCHING & ULTRA-CLEAN ROUNDED PRODUCT CARD
  // ==========================================================================
  async function loadProductsData() {
    try {
      const response = await fetch(CONFIG.productsUrl);
      if (!response.ok) throw new Error('Falha ao carregar catalogo');
      state.products = await response.json();
      window.MarcelyProducts = state.products;
    } catch (error) {
      console.warn('Aviso: Utilizando catalogo em cache interno:', error);
      state.products = window.MarcelyProducts || [];
    }
  }

  function buildProductCardHtml(prod) {
    const isGold = (prod.metal || '').toLowerCase().includes('ouro');
    const badgeClass = isGold ? 'badge-gold' : 'badge-rhodium';
    const badgeLabel = isGold ? 'Ouro 18k' : 'Rodio Nobre';
    const pixValue = prod.pix_discount_price || (prod.price * (1 - CONFIG.pixDiscountRate));
    const isWishlisted = state.wishlist.has(prod.id);

    return `
      <div class="group flex flex-col bg-white p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#1C1C19]/[0.06] shadow-[0_8px_24px_-12px_rgba(28,28,25,0.06)] hover:shadow-[0_14px_32px_-12px_rgba(28,28,25,0.1)] transition-all duration-300 relative reveal-up">
        <div class="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#F6F3EE] mb-2.5 sm:mb-3.5">
          <a href="produto.html?id=${prod.id}" class="block w-full h-full">
            <img src="${prod.image}" alt="${prod.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          </a>
          <div class="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 pointer-events-none">
            <span class="${badgeClass}">${badgeLabel}</span>
          </div>
          <button type="button" class="absolute top-2 right-2 sm:top-3 sm:right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#1C1C19] hover:text-[#745A2E] shadow-sm transition-colors" onclick="window.MarcelyApp.toggleWishlist('${prod.id}')" data-wishlist-id="${prod.id}" aria-label="Favoritar ${prod.name}" title="Favoritar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${isWishlisted ? '#745A2E' : 'none'}" stroke="${isWishlisted ? '#745A2E' : 'currentColor'}" stroke-width="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <span class="block font-sans text-[10px] uppercase tracking-[0.12em] text-[#745A2E] font-semibold mb-0.5">${prod.category}</span>
            <h3 class="font-serif text-[14px] sm:text-[16px] leading-snug font-medium text-[#1C1C19] line-clamp-1 group-hover:text-[#745A2E] transition-colors">
              <a href="produto.html?id=${prod.id}">${prod.name}</a>
            </h3>
            <div class="mt-1.5">
              <span class="font-serif text-[15px] sm:text-lg font-semibold text-[#1C1C19]">${formatBRL(prod.price)}</span>
              <span class="block font-sans text-[11px] text-[#745A2E] font-medium">${formatBRL(pixValue)} no Pix</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 sm:gap-2 mt-3 pt-2.5 border-t border-[#1C1C19]/[0.06]">
            <button type="button" class="btn-whatsapp-primary flex-1 min-h-[42px] sm:min-h-[44px] rounded-full px-3 text-[11px] font-medium tracking-wider" onclick="window.MarcelyApp.openWhatsAppForProduct('${prod.id}')">
              <span class="sm:hidden">Pedir</span>
              <span class="hidden sm:inline">Pedir no WhatsApp</span>
            </button>
            <button type="button" class="w-[42px] h-[42px] sm:w-[44px] sm:h-[44px] rounded-full border border-[#1C1C19]/15 bg-[#FCF9F4] hover:border-[#745A2E] hover:text-[#745A2E] text-[#1C1C19] flex items-center justify-center flex-shrink-0 transition-colors" onclick="window.MarcelyApp.addToCartById('${prod.id}')" aria-label="Adicionar a Minha Selecao" title="Adicionar a Minha Selecao">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // HOME PAGE CONTROLLER (index.html)
  // ==========================================================================
  function initHomePage() {
    const featuredGrid = document.getElementById('featuredProductsGrid');
    if (!featuredGrid) {
      initScrollReveal();
      return;
    }

    if (!state.products || state.products.length === 0) {
      setTimeout(initHomePage, 150);
      return;
    }

    const showcaseItems = state.products.slice(0, 8);
    featuredGrid.innerHTML = showcaseItems.map(prod => buildProductCardHtml(prod)).join('');
    initScrollReveal();
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
    itemsPerPage: 60
  };

  function initCatalogPage() {
    const grid = document.getElementById('catalogProductsGrid');
    if (!grid) return;

    if (!state.products || state.products.length === 0) {
      setTimeout(initCatalogPage, 150);
      return;
    }

    const urlCat = getUrlParam('cat');
    const urlMetal = getUrlParam('metal');
    const urlSearch = getUrlParam('q');

    if (urlCat) {
      catalogState.activeCategory = urlCat.toLowerCase();
      const categoryButtons = document.querySelectorAll('.filter-category');
      categoryButtons.forEach(b => {
        const isMatch = (b.dataset.cat || '').toLowerCase() === catalogState.activeCategory;
        b.classList.toggle('bg-primary', isMatch);
        b.classList.toggle('text-on-primary', isMatch);
        b.classList.toggle('active', isMatch);
        if (isMatch) {
          b.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant', 'bg-white');
        }
      });
    }
    if (urlMetal) catalogState.activeMetal = urlMetal.toLowerCase();
    if (urlSearch) catalogState.searchQuery = urlSearch;

    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput && urlSearch) {
      searchInput.value = urlSearch;
    }

    setupCatalogEventListeners();
    renderCatalogGrid();
  }

  function setupCatalogEventListeners() {
    const categoryButtons = document.querySelectorAll('.filter-category');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryButtons.forEach(b => {
          b.classList.remove('bg-primary', 'text-on-primary', 'bg-[#000000]', 'text-white', 'active');
          b.classList.add('bg-surface-container-lowest', 'text-on-surface-variant');
        });
        btn.classList.add('bg-primary', 'text-on-primary', 'active');
        btn.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant');

        catalogState.activeCategory = btn.dataset.cat || 'all';
        catalogState.currentPage = 1;
        renderCatalogGrid();
      });
    });

    const metalSelect = document.getElementById('catalogMetalFilter');
    if (metalSelect) {
      metalSelect.addEventListener('change', (e) => {
        catalogState.activeMetal = e.target.value;
        catalogState.currentPage = 1;
        renderCatalogGrid();
      });
    }

    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        catalogState.sortBy = e.target.value;
        renderCatalogGrid();
      });
    }

    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        catalogState.searchQuery = e.target.value.trim().toLowerCase();
        catalogState.currentPage = 1;
        renderCatalogGrid();
      }, 220));
    }

    const loadMoreBtn = document.getElementById('catalogLoadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        catalogState.currentPage++;
        renderCatalogGrid(true);
      });
    }
  }

  function renderCatalogGrid() {
    const grid = document.getElementById('catalogProductsGrid');
    const counterEl = document.getElementById('catalogProductsCount');
    const loadMoreContainer = document.getElementById('catalogLoadMoreContainer');
    if (!grid) return;

    const filtered = state.products.filter(item => {
      if (catalogState.activeCategory !== 'all' && catalogState.activeCategory !== 'diamon') {
        if ((item.category || '').toLowerCase() !== catalogState.activeCategory) return false;
      }
      if (catalogState.activeMetal !== 'all') {
        const itemMetalLower = (item.metal || '').toLowerCase();
        if (catalogState.activeMetal === 'ouro' && !itemMetalLower.includes('ouro')) return false;
        if (catalogState.activeMetal === 'rodio' && !itemMetalLower.includes('ródio') && !itemMetalLower.includes('rodio')) return false;
      }
      if (catalogState.searchQuery) {
        const query = catalogState.searchQuery;
        const nameMatch = (item.name || '').toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        const catMatch = (item.category || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }
      return true;
    });

    if (catalogState.sortBy === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (catalogState.sortBy === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (catalogState.sortBy === 'best-sellers') {
      filtered.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
    }

    const itemsToDisplay = filtered.slice(0, catalogState.currentPage * catalogState.itemsPerPage);

    if (counterEl) {
      counterEl.textContent = `Exibindo ${itemsToDisplay.length} de ${filtered.length} joias`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-[#1C1C19]/[0.06] px-6">
          <p class="font-serif text-xl text-[#1C1C19]">Nenhuma joia encontrada com esses filtros.</p>
          <p class="text-sm text-[#787571] mt-2">Experimente buscar por outros termos ou falar diretamente com a Marcely no WhatsApp.</p>
          <div class="flex flex-wrap justify-center gap-3 mt-6">
            <button type="button" class="btn-luxury-outline" onclick="window.MarcelyApp.resetCatalogFilters()">Redefinir Filtros</button>
            <button type="button" class="btn-whatsapp-primary" onclick="window.MarcelyApp.openWhatsAppConcierge()">Consultar no WhatsApp</button>
          </div>
        </div>
      `;
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      return;
    }

    grid.innerHTML = itemsToDisplay.map(prod => buildProductCardHtml(prod)).join('');
    initScrollReveal();

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

    const metalSelect = document.getElementById('catalogMetalFilter');
    if (metalSelect) metalSelect.value = 'all';

    const categoryButtons = document.querySelectorAll('.filter-category');
    categoryButtons.forEach((b, idx) => {
      if (idx === 0) {
        b.classList.add('bg-primary', 'text-on-primary', 'active');
        b.classList.remove('bg-surface-container-lowest', 'text-on-surface-variant');
      } else {
        b.classList.remove('bg-primary', 'text-on-primary', 'active');
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
    selectedMetal: 'Ouro 18k (10 milesimos)',
    selectedSize: 'Aro 16',
    quantity: 1,
    currentImageIndex: 0
  };

  function initProductDetailPage() {
    const detailContainer = document.getElementById('productDetailContainer');
    if (!detailContainer) return;

    document.body.classList.add('has-mobile-pdp-bar');

    if (!state.products || state.products.length === 0) {
      setTimeout(initProductDetailPage, 150);
      return;
    }

    const productId = getUrlParam('id') || CONFIG.defaultProductId;
    let product = state.products.find(p => p.id === productId);

    // Graceful ring fallback if ID does not exist in products.json (e.g. audit_full_flow.py)
    if (!product) {
      product = state.products.find(x => (x.category || '').toLowerCase() === 'aneis')
        || state.products.find(p => p.id === CONFIG.defaultProductId)
        || state.products[0];
    }

    const isRing = isRingProduct(product);

    productDetailState.product = product;
    productDetailState.selectedMetal = product.metal || 'Ouro 18k (10 milesimos)';
    productDetailState.selectedSize = isRing ? 'Aro 16' : 'Padrao';

    renderProductDetails();
    renderRelatedProducts(product);
    initScrollReveal();
    initMobilePdpActionBarScroll();
  }

  function renderProductDetails() {
    const p = productDetailState.product;
    if (!p) return;

    document.title = `${p.name} | Marcely Semijoias`;

    const breadcrumbCat = document.getElementById('detailBreadcrumbCat');
    const breadcrumbTitle = document.getElementById('detailBreadcrumbTitle');
    const titleEl = document.getElementById('detailProductTitle');
    const badgeEl = document.getElementById('detailBadge');
    const refCodeEl = document.getElementById('detailRefCode');
    const descEl = document.getElementById('detailDescription');
    const selectedMetalLabel = document.getElementById('detailSelectedMetalLabel');
    const selectedSizeLabel = document.getElementById('detailSelectedSizeLabel');

    if (breadcrumbCat) {
      breadcrumbCat.textContent = (p.category || 'Joias').toUpperCase();
      breadcrumbCat.href = `catalogo.html?cat=${p.category}`;
    }
    if (breadcrumbTitle) breadcrumbTitle.textContent = p.name;
    if (titleEl) titleEl.textContent = p.name;
    if (badgeEl) {
      const isGold = (p.metal || '').toLowerCase().includes('ouro');
      badgeEl.textContent = p.badge || (isGold ? 'Ouro 18k' : 'Rodio Nobre');
    }
    if (refCodeEl) refCodeEl.textContent = `REF: ${p.id.replace('marcely_', 'M-').toUpperCase()}`;
    if (descEl) descEl.textContent = p.description;
    if (selectedMetalLabel) selectedMetalLabel.textContent = productDetailState.selectedMetal;
    if (selectedSizeLabel) selectedSizeLabel.textContent = productDetailState.selectedSize;

    updateDetailPrices();

    // Main Image
    const mainImg = document.getElementById('detailMainImage');
    if (mainImg) {
      mainImg.src = p.image;
      mainImg.alt = p.name;
    }

    // Single-Photo Guard: Hide & purge extra thumbnails when product only has 1 real studio photo
    const thumbsContainer = document.getElementById('detailThumbnailsContainer');
    const extraImages = (Array.isArray(p.images) && p.images.length > 1) ? p.images : [];

    if (extraImages.length <= 1) {
      if (thumbsContainer) {
        thumbsContainer.innerHTML = '';
        thumbsContainer.style.display = 'none';
      }
      document.querySelectorAll('.detail-thumb-btn').forEach(el => {
        const parent = el.parentElement;
        el.remove();
        if (parent && parent.children.length === 0) {
          parent.style.display = 'none';
        }
      });
    } else if (thumbsContainer) {
      thumbsContainer.style.display = '';
      thumbsContainer.innerHTML = extraImages.map((imgSrc, idx) => `
        <button type="button" class="detail-thumb-btn aspect-square rounded-2xl overflow-hidden bg-[#F6F3EE] border border-[#1C1C19]/10 ${idx === 0 ? 'ring-2 ring-[#1C1C19] opacity-100' : 'opacity-70 hover:opacity-100'} transition-all" onclick="window.MarcelyApp.changeProductImage('${imgSrc}', this)">
          <img src="${imgSrc}" alt="${p.name} angulo ${idx + 1}" class="w-full h-full object-cover">
        </button>
      `).join('');
    }

    // Smart Ring Size Selector Visibility (#detailSizeSection)
    const isRing = isRingProduct(p);
    const sizeSection = document.getElementById('detailSizeSection') ||
                        (document.querySelector('.detail-size-btn') ? document.querySelector('.detail-size-btn').closest('.mb-space-lg') : null);
    if (sizeSection) {
      sizeSection.style.display = isRing ? 'block' : 'none';
    }

    // Technical Specs Table
    const specsContainer = document.getElementById('detailSpecsList');
    if (specsContainer) {
      const specs = p.specs || {};
      specsContainer.innerHTML = `
        <div class="py-2.5 flex justify-between border-b border-[#1C1C19]/[0.06] gap-4">
          <span class="text-[#787571]">Procedencia Oficial</span>
          <span class="font-semibold text-[#1C1C19] text-right">Revendedora Autorizada Veridiana Semijoias</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-[#1C1C19]/[0.06] gap-4">
          <span class="text-[#787571]">Banho Nobre</span>
          <span class="font-semibold text-[#1C1C19] text-right">${specs.banho || '10 a 15 milesimos de Ouro 18k ou Rodio Nobre'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-[#1C1C19]/[0.06] gap-4">
          <span class="text-[#787571]">Verniz de Protecao</span>
          <span class="font-semibold text-[#1C1C19] text-right">${specs.verniz || 'Nano-ceramico Hipoalergenico German Tech'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-[#1C1C19]/[0.06] gap-4">
          <span class="text-[#787571]">Cravacao & Pedras</span>
          <span class="font-semibold text-[#1C1C19] text-right">${specs.pedras || 'Zirconias 5A Lapidacao Suica / Perolas'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-[#1C1C19]/[0.06] gap-4">
          <span class="text-[#787571]">Pureza Hipoalergenica</span>
          <span class="font-semibold text-[#1C1C19] text-right">${specs.niquel || '100% Livre de Niquel e Metais Pesados'}</span>
        </div>
        <div class="py-2.5 flex justify-between gap-4">
          <span class="text-[#787571]">Garantia</span>
          <span class="font-semibold text-[#745A2E] text-right">Garantia Oficial Veridiana Semijoias</span>
        </div>
      `;
    }

    setupMetalSelector();
    setupSizeSelector();
  }

  function updateDetailPrices() {
    const p = productDetailState.product;
    if (!p) return;

    let basePrice = p.price;
    const selMetalLower = (productDetailState.selectedMetal || '').toLowerCase();
    const prodMetalLower = (p.metal || '').toLowerCase();
    if ((selMetalLower.includes('ródio') || selMetalLower.includes('rodio')) &&
        !prodMetalLower.includes('ródio') && !prodMetalLower.includes('rodio')) {
      basePrice = Math.round(basePrice * 0.96);
    }

    const priceEl = document.getElementById('detailPrice');
    const pixPriceEl = document.getElementById('detailPixPrice');
    const installmentsEl = document.getElementById('detailInstallments');
    const mobilePdpPrice = document.getElementById('mobilePdpPrice');
    const mobilePdpPixPrice = document.getElementById('mobilePdpPixPrice');

    const pixPrice = basePrice * (1 - CONFIG.pixDiscountRate);
    const installmentValue = (basePrice / 6).toFixed(2).replace('.', ',');

    if (priceEl) priceEl.textContent = formatBRL(basePrice);
    if (pixPriceEl) pixPriceEl.textContent = formatBRL(pixPrice);
    if (installmentsEl) installmentsEl.textContent = `ou 6x de R$ ${installmentValue} sem juros`;
    if (mobilePdpPrice) mobilePdpPrice.textContent = formatBRL(basePrice);
    if (mobilePdpPixPrice) mobilePdpPixPrice.textContent = `${formatBRL(pixPrice)} no Pix`;
  }

  function setupMetalSelector() {
    const metalButtons = document.querySelectorAll('.detail-metal-btn');
    metalButtons.forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        metalButtons.forEach(b => {
          b.classList.remove('ring-2', 'ring-primary', 'ring-[#1C1C19]', 'bg-surface-container-high');
        });
        btn.classList.add('ring-2', 'ring-primary', 'bg-surface-container-high');

        productDetailState.selectedMetal = btn.dataset.metal || 'Ouro 18k (10 milesimos)';
        updateDetailPrices();

        const metalLabel = document.getElementById('detailSelectedMetalLabel');
        if (metalLabel) metalLabel.textContent = productDetailState.selectedMetal;
      });
    });
  }

  function selectSize(sizeValue, btnElement = null) {
    const normalized = String(sizeValue || '').trim();
    const formattedLabel = /^\d+$/.test(normalized) ? `Aro ${normalized}` : normalized;
    productDetailState.selectedSize = formattedLabel;

    const sizeLabel = document.getElementById('detailSelectedSizeLabel');
    if (sizeLabel) sizeLabel.textContent = formattedLabel;

    const sizeButtons = document.querySelectorAll('.detail-size-btn');
    sizeButtons.forEach(b => {
      b.classList.remove('ring-2', 'ring-primary', 'bg-primary', 'text-white', 'text-on-primary', 'bg-surface-container-high', 'bg-[#1C1C19]');
      if (!btnElement && (b.dataset.size === sizeValue || b.dataset.size === formattedLabel || b.textContent.trim() === normalized)) {
        b.classList.add('ring-2', 'ring-primary', 'bg-primary', 'text-white');
      }
    });

    if (btnElement) {
      btnElement.classList.add('ring-2', 'ring-primary', 'bg-primary', 'text-white');
    }
  }

  function setupSizeSelector() {
    const sizeButtons = document.querySelectorAll('.detail-size-btn');
    sizeButtons.forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const sizeVal = btn.dataset.size || btn.textContent.trim();
        selectSize(sizeVal, btn);
      });
    });
  }

  function changeProductImage(src, btnElement) {
    const mainImg = document.getElementById('detailMainImage');
    if (mainImg) mainImg.src = src;

    const thumbnails = document.querySelectorAll('.detail-thumb-btn');
    thumbnails.forEach(t => t.classList.remove('ring-2', 'ring-primary', 'ring-[#1C1C19]', 'opacity-100'));
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

    container.innerHTML = related.map(prod => buildProductCardHtml(prod)).join('');
    initScrollReveal();
  }

  // ==========================================================================
  // ABOUT & FAQ ACCORDIONS CONTROLLER
  // ==========================================================================
  function initFaqAccordions() {
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(toggle => {
      if (toggle.dataset.bound === 'true') return;
      toggle.dataset.bound = 'true';
      toggle.addEventListener('click', () => {
        const content = toggle.nextElementSibling;
        const icon = toggle.querySelector('.faq-icon');
        if (!content) return;
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

  function initMobilePdpActionBarScroll() {
    const bar = document.getElementById('mobilePdpActionBar');
    if (!bar) return;

    const triggerTarget = document.getElementById('pdpWhatsappBtn') || document.getElementById('addToCartBtn');
    if (!triggerTarget) return;

    if (window.IntersectionObserver) {
      if (window._pdpBarObserver) {
        window._pdpBarObserver.disconnect();
      }
      window._pdpBarObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            bar.classList.remove('is-visible');
          } else {
            const rect = triggerTarget.getBoundingClientRect();
            if (rect.top < 0) {
              bar.classList.add('is-visible');
            } else {
              bar.classList.remove('is-visible');
            }
          }
        });
      }, { threshold: 0.1 });
      window._pdpBarObserver.observe(triggerTarget);
    } else {
      const handleScroll = () => {
        if (window.scrollY > 420) {
          bar.classList.add('is-visible');
        } else {
          bar.classList.remove('is-visible');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }
  }

  function initAboutPage() {
    initFaqAccordions();
    initScrollReveal();
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
        const isRing = isRingProduct(productDetailState.product);
        addToCart(
          productDetailState.product,
          qty,
          productDetailState.selectedMetal,
          isRing ? productDetailState.selectedSize : 'Padrao'
        );
      }
    },
    buyNowPixFromDetail: function () {
      openWhatsAppFromDetail();
    },
    openWhatsAppForProduct: openWhatsAppForProduct,
    openWhatsAppFromDetail: openWhatsAppFromDetail,
    openWhatsAppSizeHelp: openWhatsAppSizeHelp,
    sendSelectionToWhatsApp: sendSelectionToWhatsApp,
    openWhatsAppConcierge: openWhatsAppConcierge,
    openConciergeChat: openConciergeChat,
    openMobileMenu: openMobileMenu,
    closeMobileMenu: closeMobileMenu,
    toggleMobileMenu: toggleMobileMenu,
    selectSize: selectSize,
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
    initScrollReveal: initScrollReveal,
    initMobilePdpActionBarScroll: initMobilePdpActionBarScroll,
    navigateToPage: navigateToPage,
    showToast: showToast
  };

  // ==========================================================================
  // SILKY CLIENT-SIDE PAGE TRANSITIONS & INSTANT PREFETCH ENGINE
  // ==========================================================================
  const pageHtmlCache = new Map();
  let loadingBarTimeout = null;
  let isNavigating = false;

  function ensurePageLoadingBar() {
    let bar = document.getElementById('pageLoadingBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pageLoadingBar';
      document.body.appendChild(bar);
    }
    return bar;
  }

  function startPageLoadingBar() {
    const bar = ensurePageLoadingBar();
    clearTimeout(loadingBarTimeout);
    bar.classList.remove('is-done');
    bar.classList.add('is-loading');
    bar.style.width = '35%';
    loadingBarTimeout = setTimeout(() => {
      if (bar.classList.contains('is-loading') && !bar.classList.contains('is-done')) {
        bar.style.width = '75%';
      }
    }, 120);
  }

  function finishPageLoadingBar() {
    const bar = ensurePageLoadingBar();
    clearTimeout(loadingBarTimeout);
    bar.style.width = '100%';
    bar.classList.add('is-done');
    loadingBarTimeout = setTimeout(() => {
      bar.classList.remove('is-loading', 'is-done');
      bar.style.width = '0%';
    }, 350);
  }

  function prefetchPage(url) {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.split('#')[0];
    if (!cleanUrl || pageHtmlCache.has(cleanUrl)) return;
    try {
      fetch(cleanUrl, { priority: 'low' })
        .then(res => {
          if (res.ok) return res.text();
          throw new Error('Falha no prefetch');
        })
        .then(html => {
          pageHtmlCache.set(cleanUrl, html);
        })
        .catch(() => {});
    } catch (e) {}
  }

  async function navigateToPage(targetUrl, isPopState = false) {
    if (isNavigating) return;
    const currentFullUrl = window.location.href;
    const cleanCurrent = currentFullUrl.split('#')[0];
    const cleanTarget = targetUrl.split('#')[0];

    const hash = targetUrl.includes('#') ? targetUrl.substring(targetUrl.indexOf('#')) : '';
    if (cleanCurrent === cleanTarget && hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (!isPopState) history.pushState(null, '', targetUrl);
        return;
      }
    }

    isNavigating = true;
    startPageLoadingBar();

    closeCart();
    closeMobileMenu();
    updateTabBarForTargetUrl(cleanTarget);

    try {
      let html = pageHtmlCache.get(cleanTarget);
      if (!html) {
        const response = await fetch(cleanTarget);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        html = await response.text();
        pageHtmlCache.set(cleanTarget, html);
      }

      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');
      const newMain = newDoc.querySelector('main');

      if (!newMain) {
        throw new Error('Nenhum elemento <main> encontrado na pagina de destino');
      }

      const executeSwap = () => {
        if (newDoc.title) {
          document.title = newDoc.title;
        }

        const newBodyClass = newDoc.body.className || '';
        document.body.className = newBodyClass;

        const currentMain = document.querySelector('main');
        if (currentMain) {
          currentMain.innerHTML = newMain.innerHTML;
          currentMain.className = newMain.className;
        }

        const existingPdpBar = document.getElementById('mobilePdpActionBar');
        const newPdpBar = newDoc.getElementById('mobilePdpActionBar');
        if (newPdpBar) {
          if (!existingPdpBar) {
            document.body.appendChild(newPdpBar.cloneNode(true));
          } else {
            existingPdpBar.innerHTML = newPdpBar.innerHTML;
            existingPdpBar.className = newPdpBar.className;
            existingPdpBar.style.display = '';
          }
        } else if (existingPdpBar) {
          existingPdpBar.remove();
        }

        syncHeaderActiveNav(cleanTarget);
        ensureMobileAppTabBar();
        updateCartBadges();
        updateWishlistBadges();

        if (!isPopState) {
          history.pushState({ url: targetUrl }, '', targetUrl);
        }

        if (hash) {
          const el = document.querySelector(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }

        reinitializePageScripts(cleanTarget);
      };

      if (document.startViewTransition) {
        await document.startViewTransition(executeSwap).finished;
      } else {
        const currentMain = document.querySelector('main');
        if (currentMain) {
          currentMain.classList.add('page-transition-exit');
          await new Promise(r => setTimeout(r, 140));
          executeSwap();
          const freshMain = document.querySelector('main');
          if (freshMain) {
            freshMain.classList.remove('page-transition-exit');
            freshMain.classList.add('page-transition-enter');
            setTimeout(() => freshMain.classList.remove('page-transition-enter'), 340);
          }
        } else {
          executeSwap();
        }
      }

    } catch (err) {
      console.warn('[PageTransition] Fallback para navegacao tradicional:', err);
      window.location.href = targetUrl;
    } finally {
      finishPageLoadingBar();
      isNavigating = false;
    }
  }

  function updateTabBarForTargetUrl(targetUrl) {
    const tabBar = document.getElementById('mobileAppTabBar');
    if (!tabBar) return;
    const lower = (targetUrl || '').toLowerCase();
    const isExplore = lower.includes('catalogo') || lower.includes('produto');
    const isLookbook = !isExplore && lower.includes('sobre');
    const isHome = !isExplore && !isLookbook;

    tabBar.querySelectorAll('.mobile-tab-item').forEach(item => {
      const href = (item.getAttribute('href') || '').toLowerCase();
      const tabKey = (item.dataset.tab || '').toLowerCase();

      const matchHome = isHome && (tabKey === 'home' || tabKey === 'inicio' || href.includes('index'));
      const matchExplore = isExplore && (tabKey === 'explore' || tabKey === 'explorar' || tabKey === 'catalogo' || href.includes('catalogo'));
      const matchLookbook = isLookbook && (tabKey === 'lookbook' || tabKey === 'sobre' || href.includes('sobre'));

      item.classList.toggle('active', Boolean(matchHome || matchExplore || matchLookbook));
    });
  }

  function syncHeaderActiveNav(cleanTarget) {
    const lower = (cleanTarget || '').toLowerCase();
    const navLinks = document.querySelectorAll('header nav a');
    navLinks.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const isCurrent = (lower.includes('catalogo') && href.includes('catalogo') && !href.includes('cat=')) ||
                        (lower.includes('sobre') && href.includes('sobre')) ||
                        ((lower.includes('index') || lower.endsWith('/')) && href.includes('index'));
      if (isCurrent) {
        link.classList.add('font-semibold', 'text-[#1C1C19]');
        link.classList.remove('text-[#787571]');
      } else if (!href.includes('cat=')) {
        link.classList.remove('font-semibold', 'text-[#1C1C19]');
        link.classList.add('text-[#787571]');
      }
    });
  }

  function reinitializePageScripts(url) {
    const lower = (url || '').toLowerCase();
    if (lower.includes('catalogo.html') || document.getElementById('catalogProductsGrid')) {
      initCatalogPage();
    } else if (lower.includes('produto.html') || document.getElementById('productDetailContainer')) {
      initProductDetailPage();
    } else if (lower.includes('sobre.html') || document.getElementById('aboutStorySection')) {
      initAboutPage();
    } else {
      initHomePage();
    }
    initScrollReveal();
  }

  function initSmoothPageTransitions() {
    ensurePageLoadingBar();

    document.addEventListener('pointerenter', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;
      const href = link.getAttribute('href');
      if (isInternalLink(href)) prefetchPage(href);
    }, { passive: true, capture: true });

    document.addEventListener('touchstart', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;
      const href = link.getAttribute('href');
      if (isInternalLink(href)) prefetchPage(href);
    }, { passive: true, capture: true });

    document.addEventListener('click', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;

      if (link.target === '_blank' || link.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const href = link.getAttribute('href');
      if (!isInternalLink(href)) return;

      e.preventDefault();
      navigateToPage(href);
    });

    window.addEventListener('popstate', () => {
      navigateToPage(window.location.href, true);
    });
  }

  function isInternalLink(href) {
    if (!href || typeof href !== 'string') return false;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) return false;
    if (href.includes('wa.me') || href.includes('whatsapp.com')) return false;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      const origin = window.location.origin;
      if (!href.startsWith(origin)) return false;
    }
    const clean = href.split('?')[0].split('#')[0].split('/').pop();
    const valid = ['index.html', 'catalogo.html', 'produto.html', 'sobre.html', ''];
    return valid.includes(clean);
  }

  // ==========================================================================
  // GLOBAL BOOTSTRAP
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    initSmoothPageTransitions();
    loadStoredState();
    ensureAuxWidgets();
    updateCartBadges();
    updateWishlistBadges();
    updateMobileSelectionBar();
    initFaqAccordions();
    initScrollReveal();

    await loadProductsData();

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

    renderCartDrawer();
    ensureMobileAppTabBar();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCart();
        closeMobileMenu();
        closePixModal();
      }
    });

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
