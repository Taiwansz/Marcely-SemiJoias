/**
 * MARCELY OLIVEIRA -- CURADORIA DE ESTILO & REVENDEDORA AUTORIZADA VERIDIANA SEMIJOIAS
 * Central Interactive Application & WhatsApp Conversion Engine (app.js)
 *
 * Features:
 * - Dynamic Product Engine (58 real Veridiana Semijoias pieces from products.json)
 * - Contextualized WhatsApp Concierge Funnel (Single piece, Size help, Full selection)
 * - LocalStorage Selection Persistence ("Minha Selecao") & Realtime Badges
 * - Slide-out Drawer & Sticky Mobile/Desktop Selection Bar (#mobileSelectionBar)
 * - Debounced Catalog Search & Category/Metal Filtering
 * - Product Details Page Controller with Metal & Ring Size Selector
 * - Zero Emojis Enforced Across Entire Codebase
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================
  const CONFIG = {
    // Para alterar o WhatsApp de atendimento da Marcely, substitua abaixo no formato DDI + DDD + Numero (apenas digitos)
    whatsappNumber: '5519999999999',
    productsUrl: 'products.json',
    cartStorageKey: 'marcely_cart_v1',
    wishlistStorageKey: 'marcely_wishlist_v1',
    freeShippingThreshold: 300.0,
    defaultProductId: 'marcely_b69fa9a5a0ac', // Anel Solitario Diamon Majestic
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
    pixTimeRemaining: 900
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
    icon.style.backgroundColor = type === 'success' ? '#745A2E' : '#787571';

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
    }, 3500);
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
    const isRing = (product.category || '').toLowerCase() === 'aneis' || (product.name || '').toLowerCase().includes('anel');
    const size = customSize || (isRing ? 'Aro 16' : 'Padrao');
    const qty = Math.max(1, parseInt(customQty, 10) || 1);
    const refCode = product.id.replace('marcely_', 'MO-').toUpperCase();
    const totalPrice = product.price * qty;
    const pixPrice = (product.pix_discount_price ? product.pix_discount_price * qty : totalPrice * (1 - CONFIG.pixDiscountRate));

    const lines = [
      'Ola Marcely! Estava no seu site e me interessei por esta joia:',
      '',
      `*${product.name}*`,
      `- Acabamento: ${metal}`,
      `- Tamanho/Aro: ${size}`,
      qty > 1 ? `- Quantidade: ${qty}` : null,
      `- Referencia: ${refCode}`,
      `- Valor no site: ${formatBRL(totalPrice)} (ou ${formatBRL(pixPrice)} no Pix)`,
      '',
      'Gostaria de confirmar a disponibilidade (pronta entrega ou encomenda Veridiana) e combinar o pedido com voce!'
    ].filter(Boolean);

    const url = buildWhatsAppUrl(lines.join('\n'));
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Abrindo atendimento exclusivo da Marcely no WhatsApp...', 'success');
  }

  function openWhatsAppFromDetail() {
    const product = productDetailState.product;
    if (!product) {
      openWhatsAppConcierge();
      return;
    }
    const isRing = (product.category || '').toLowerCase() === 'aneis' || (product.name || '').toLowerCase().includes('anel');
    const metal = productDetailState.selectedMetal || product.metal || 'Ouro 18k (10 milesimos)';
    const size = productDetailState.selectedSize || (isRing ? 'Aro 16' : 'Padrao');
    const qtyInput = document.getElementById('detailQuantityInput');
    const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

    openWhatsAppForProduct(product.id, metal, size, qty);
  }

  function openWhatsAppSizeHelp() {
    const product = productDetailState.product;
    const name = product ? product.name : 'Semijoia Veridiana';
    const refCode = product ? product.id.replace('marcely_', 'MO-').toUpperCase() : 'CAT-GERAL';
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
      const sizeInfo = item.size ? ` | ${item.size}` : '';
      return `${idx + 1}. *${item.name}* (${item.metal}${sizeInfo}) - Qtd: ${item.quantity} - ${formatBRL(item.price * item.quantity)}`;
    });

    const messageLines = [
      'Ola Marcely! Montei minha selecao de joias Veridiana no seu site e gostaria de atendimento para finalizar:',
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
    const text = customText || 'Ola Marcely! Estava navegando na sua vitrine oficial Veridiana Semijoias e gostaria de uma consultoria personalizada para escolher uma peca.';
    const url = buildWhatsAppUrl(text);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Iniciando consultoria personalizada com a Marcely...', 'success');
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

  function ensureAuxWidgets() {
    // 1. Ensure #mobileSelectionBar exists
    let selectionBar = document.getElementById('mobileSelectionBar');
    if (!selectionBar) {
      selectionBar = document.createElement('div');
      selectionBar.id = 'mobileSelectionBar';
      selectionBar.innerHTML = `
        <div class="selection-bar-inner">
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-[#000000] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center" id="mobileSelectionCountBadge">0</span>
            <div>
              <span class="text-xs font-semibold text-[#1C1C19] block" id="mobileSelectionSummaryText">Minha Selecao Veridiana</span>
              <span class="text-[11px] text-[#745A2E] font-medium block" id="mobileSelectionTotalText">R$ 0,00</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.MarcelyApp.openCart()" class="btn-luxury-outline py-2 px-3 text-[10px]">
              Ver Selecao
            </button>
            <button type="button" onclick="window.MarcelyApp.sendSelectionToWhatsApp()" class="btn-whatsapp-primary py-2 px-3.5 text-[10px]">
              Enviar Selecao no WhatsApp
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(selectionBar);
    }

    // 2. Ensure #floatingWhatsappConcierge exists if not already placed in HTML
    let floatingWa = document.getElementById('floatingWhatsappConcierge');
    if (!floatingWa) {
      floatingWa = document.createElement('button');
      floatingWa.id = 'floatingWhatsappConcierge';
      floatingWa.type = 'button';
      floatingWa.setAttribute('aria-label', 'Falar com Marcely no WhatsApp');
      floatingWa.onclick = () => openWhatsAppConcierge();
      floatingWa.innerHTML = `
        <span class="wa-dot"></span>
        <span>WhatsApp Marcely</span>
        <span class="wa-label-extended text-[10px] text-[#745A2E] font-normal">| Consultoria</span>
      `;
      document.body.appendChild(floatingWa);
    }
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
      if (summaryEl) summaryEl.textContent = `${totalItems} ${totalItems === 1 ? 'peca na Minha Selecao' : 'pecas na Minha Selecao'}`;
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
    const isRing = (product.category || '').toLowerCase() === 'aneis' || (product.name || '').toLowerCase().includes('anel');
    const size = selectedSize || (isRing ? (productDetailState.selectedSize || 'Aro 16') : 'Padrao');
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
    if (state.wishlist.has(productId)) {
      state.wishlist.delete(productId);
      showToast('Item removido dos favoritos.', 'info');
    } else {
      state.wishlist.add(productId);
      showToast('Item salvo na sua lista de desejos.', 'success');
    }
    saveWishlistState();

    document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
      if (state.wishlist.has(productId)) {
        btn.classList.add('text-secondary');
      } else {
        btn.classList.remove('text-secondary');
      }
    });
  }

  // ==========================================================================
  // DRAWER CART UI ("MINHA SELECAO")
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
        progressText.innerHTML = '<span class="text-secondary font-semibold">Sua selecao atingiu Frete Cortesia Oficial.</span>';
      } else {
        progressText.textContent = `Faltam ${formatBRL(remainingToFreeShipping)} para voce garantir Frete Cortesia`;
      }
    }

    // Render Items
    itemsContainer.innerHTML = state.cart.map(item => `
      <div class="flex gap-4 p-4 border border-subtle bg-white rounded-lg mb-3">
        <div class="w-20 h-20 bg-surface-container rounded overflow-hidden flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div class="flex justify-between items-start gap-2">
            <div>
              <h4 class="font-serif text-sm font-semibold text-primary line-clamp-1">${item.name}</h4>
              <p class="text-[11px] text-on-surface-variant mt-0.5">${item.metal}${item.size && item.size !== 'Padrao' ? ' • ' + item.size : ''}</p>
            </div>
            <button class="text-on-surface-variant hover:text-error transition-colors p-1" onclick="window.MarcelyApp.removeFromCart('${item.cartKey}')" title="Remover da Minha Selecao">
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
  // DATA FETCHING & INITIALIZATION
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

  // Helper to build standard high-conversion product card HTML
  function buildProductCardHtml(prod) {
    const isGold = (prod.metal || '').toLowerCase().includes('ouro');
    const badgeClass = isGold ? 'badge-gold' : 'badge-rhodium';
    const badgeLabel = isGold ? 'Ouro 18k' : 'Rodio Nobre';
    const pixValue = prod.pix_discount_price || (prod.price * (1 - CONFIG.pixDiscountRate));

    return `
      <div class="group flex flex-col liquid-glass-card p-4 rounded-xl relative">
        <div class="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-container mb-4">
          <a href="produto.html?id=${prod.id}" class="block w-full h-full">
            <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          </a>
          <div class="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none">
            <span class="${badgeClass}">${badgeLabel}</span>
            <span class="badge-veridiana">Original Veridiana</span>
          </div>
          <button type="button" class="absolute top-3 right-3 w-8 h-8 rounded-full liquid-glass-light flex items-center justify-center text-primary hover:text-secondary transition-colors" onclick="window.MarcelyApp.toggleWishlist('${prod.id}')" data-wishlist-id="${prod.id}" title="Favoritar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${state.wishlist.has(prod.id) ? '#745A2E' : 'none'}" stroke="currentColor" stroke-width="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="font-sans text-[10px] uppercase tracking-widest text-secondary font-semibold">${prod.category}</span>
              <span class="font-sans text-[10px] text-on-surface-variant">Garantia Oficial</span>
            </div>
            <h3 class="font-serif text-base font-medium text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              <a href="produto.html?id=${prod.id}">${prod.name}</a>
            </h3>
          </div>

          <div class="pt-3 border-t border-subtle mt-3 space-y-3">
            <div>
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-serif text-lg font-semibold text-primary">${formatBRL(prod.price)}</span>
                <span class="font-sans text-[11px] text-secondary font-semibold">${formatBRL(pixValue)} a vista no Pix</span>
              </div>
              <span class="block font-sans text-[11px] text-on-surface-variant mt-0.5">${prod.installments || '6x sem juros'}</span>
            </div>

            <div class="flex flex-col gap-2 pt-1">
              <button type="button" class="btn-whatsapp-primary w-full py-2.5 text-[11px]" onclick="window.MarcelyApp.openWhatsAppForProduct('${prod.id}')">
                Pedir no WhatsApp
              </button>
              <button type="button" class="btn-luxury-outline w-full py-2 text-[10px]" onclick="window.MarcelyApp.addToCartById('${prod.id}')">
                + Minha Selecao
              </button>
            </div>
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
    if (!featuredGrid) return;

    if (!state.products || state.products.length === 0) {
      setTimeout(initHomePage, 150);
      return;
    }

    const showcaseItems = state.products.slice(0, 8);
    featuredGrid.innerHTML = showcaseItems.map(prod => buildProductCardHtml(prod)).join('');
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

    if (urlCat) catalogState.activeCategory = urlCat.toLowerCase();
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
          b.classList.remove('bg-primary', 'text-on-primary', 'bg-[#000000]', 'text-white');
          b.classList.add('bg-surface-container-lowest', 'text-on-surface-variant');
        });
        btn.classList.add('bg-primary', 'text-on-primary');
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
      }, 250));
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

    let filtered = state.products.filter(item => {
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
      counterEl.textContent = `Exibindo ${itemsToDisplay.length} de ${filtered.length} pecas Veridiana Semijoias`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <p class="font-serif text-xl text-primary">Nenhuma joia encontrada com esses filtros.</p>
          <p class="text-sm text-on-surface-variant mt-2">Experimente buscar por outros termos ou falar diretamente com a Marcely no WhatsApp.</p>
          <div class="flex flex-wrap justify-center gap-3 mt-6">
            <button type="button" class="btn-luxury-outline" onclick="window.MarcelyApp.resetCatalogFilters()">Redefinir Filtros</button>
            <button type="button" class="btn-whatsapp-primary" onclick="window.MarcelyApp.openWhatsAppConcierge()">Consultar Disponibilidade no WhatsApp</button>
          </div>
        </div>
      `;
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      return;
    }

    grid.innerHTML = itemsToDisplay.map(prod => buildProductCardHtml(prod)).join('');

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
    selectedMetal: 'Ouro 18k (10 milesimos)',
    selectedSize: 'Aro 16',
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

    if (!product) {
      product = state.products.find(p => p.id === CONFIG.defaultProductId) || state.products[0];
    }

    const isRing = (product.category || '').toLowerCase() === 'aneis' || (product.name || '').toLowerCase().includes('anel');

    productDetailState.product = product;
    productDetailState.selectedMetal = product.metal || 'Ouro 18k (10 milesimos)';
    productDetailState.selectedSize = isRing ? 'Aro 16' : 'Unico / Ajustavel';

    renderProductDetails();
    renderRelatedProducts(product);
  }

  function renderProductDetails() {
    const p = productDetailState.product;
    if (!p) return;

    document.title = `${p.name} | Marcely Oliveira • Curadoria Oficial Veridiana Semijoias`;

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
    if (badgeEl) badgeEl.textContent = p.badge || 'Original Veridiana';
    if (refCodeEl) refCodeEl.textContent = `REF: ${p.id.replace('marcely_', 'MO-').toUpperCase()}`;
    if (descEl) descEl.textContent = p.description;
    if (selectedMetalLabel) selectedMetalLabel.textContent = productDetailState.selectedMetal;
    if (selectedSizeLabel) selectedSizeLabel.textContent = productDetailState.selectedSize;

    updateDetailPrices();

    // Main Image & Thumbnails
    const mainImg = document.getElementById('detailMainImage');
    if (mainImg) {
      mainImg.src = p.image;
      mainImg.alt = p.name;
    }

    // Populate thumbnails if #detailThumbnailsContainer or .detail-thumb-btn exist
    const thumbsContainer = document.getElementById('detailThumbnailsContainer');
    const galleryImages = Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : [p.image];

    if (thumbsContainer) {
      thumbsContainer.innerHTML = galleryImages.map((imgSrc, idx) => `
        <button type="button" class="detail-thumb-btn aspect-square rounded-xl overflow-hidden bg-surface-container border border-subtle ${idx === 0 ? 'ring-2 ring-primary opacity-100' : 'opacity-70 hover:opacity-100'} transition-all" onclick="window.MarcelyApp.changeProductImage('${imgSrc}', this)">
          <img src="${imgSrc}" alt="${p.name} angulo ${idx + 1}" class="w-full h-full object-cover">
        </button>
      `).join('');
    } else {
      const firstThumbBtn = document.querySelector('.detail-thumb-btn');
      if (firstThumbBtn) {
        firstThumbBtn.setAttribute('onclick', `window.MarcelyApp.changeProductImage('${p.image}', this)`);
        const firstThumbImg = firstThumbBtn.querySelector('img');
        if (firstThumbImg) {
          firstThumbImg.src = p.image;
          firstThumbImg.alt = p.name;
        }
      }
    }

    // Technical Specs Table highlighting Official Veridiana Factory Warranty
    const specsContainer = document.getElementById('detailSpecsList');
    if (specsContainer) {
      const specs = p.specs || {};
      specsContainer.innerHTML = `
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Procedencia & Curadoria</span>
          <span class="font-semibold text-primary">Revendedora Autorizada Veridiana Semijoias</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Banho Nobre</span>
          <span class="font-semibold text-primary">${specs.banho || '10 a 15 milesimos de Ouro 18k ou Rodio Nobre'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Verniz de Protecao</span>
          <span class="font-semibold text-primary">${specs.verniz || 'Nano-ceramico Hipoalergenico German Tech'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Cravacao & Pedras</span>
          <span class="font-semibold text-primary">${specs.pedras || 'Zirconias 5A Lapidacao Suica / Perolas'}</span>
        </div>
        <div class="py-2.5 flex justify-between border-b border-subtle">
          <span class="text-on-surface-variant">Pureza Hipoalergenica</span>
          <span class="font-semibold text-primary">${specs.niquel || '100% Livre de Niquel e Metais Pesados'}</span>
        </div>
        <div class="py-2.5 flex justify-between">
          <span class="text-on-surface-variant">Garantia Oficial</span>
          <span class="font-semibold text-secondary">Garantia Oficial de Fabrica Veridiana Semijoias</span>
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
    if (productDetailState.selectedMetal.includes('Ródio') && !(p.metal || '').includes('Ródio')) {
      basePrice = Math.round(basePrice * 0.96);
    }

    const priceEl = document.getElementById('detailPrice');
    const pixPriceEl = document.getElementById('detailPixPrice');
    const installmentsEl = document.getElementById('detailInstallments');

    const pixPrice = basePrice * (1 - CONFIG.pixDiscountRate);
    const installmentValue = (basePrice / 6).toFixed(2).replace('.', ',');

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

        productDetailState.selectedMetal = btn.dataset.metal || 'Ouro 18k (10 milesimos)';
        updateDetailPrices();

        const metalLabel = document.getElementById('detailSelectedMetalLabel');
        if (metalLabel) metalLabel.textContent = productDetailState.selectedMetal;
      });
    });
  }

  function selectSize(sizeValue, btnElement = null) {
    productDetailState.selectedSize = sizeValue;
    const sizeLabel = document.getElementById('detailSelectedSizeLabel');
    if (sizeLabel) sizeLabel.textContent = sizeValue;

    const sizeButtons = document.querySelectorAll('.detail-size-btn');
    sizeButtons.forEach(b => {
      b.classList.remove('ring-2', 'ring-primary', 'bg-primary', 'text-white', 'bg-surface-container-high');
      if (!btnElement && (b.dataset.size === sizeValue || b.textContent.trim() === sizeValue)) {
        b.classList.add('ring-2', 'ring-primary', 'bg-surface-container-high');
      }
    });

    if (btnElement) {
      btnElement.classList.add('ring-2', 'ring-primary', 'bg-surface-container-high');
    }
  }

  function setupSizeSelector() {
    const sizeButtons = document.querySelectorAll('.detail-size-btn');
    sizeButtons.forEach(btn => {
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
      <div class="group flex flex-col liquid-glass-card p-3.5 rounded-xl relative">
        <div class="aspect-square w-full rounded-lg overflow-hidden bg-surface-container mb-3 relative">
          <a href="produto.html?id=${prod.id}" class="block w-full h-full">
            <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          </a>
        </div>
        <span class="font-sans text-[10px] uppercase text-secondary font-semibold">${prod.category}</span>
        <h4 class="font-serif text-sm font-medium text-primary mt-0.5 line-clamp-1 group-hover:text-secondary">
          <a href="produto.html?id=${prod.id}">${prod.name}</a>
        </h4>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-subtle">
          <span class="font-serif text-sm font-semibold text-primary">${formatBRL(prod.price)}</span>
          <button type="button" onclick="window.MarcelyApp.openWhatsAppForProduct('${prod.id}')" class="text-[10px] uppercase tracking-wider text-secondary font-semibold hover:underline">
            Pedir no WhatsApp
          </button>
        </div>
      </div>
    `).join('');
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

  function initAboutPage() {
    initFaqAccordions();
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
        addToCart(
          productDetailState.product,
          qty,
          productDetailState.selectedMetal,
          productDetailState.selectedSize
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
    showToast: showToast
  };

  // ==========================================================================
  // GLOBAL BOOTSTRAP
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    loadStoredState();
    ensureAuxWidgets();
    updateCartBadges();
    updateWishlistBadges();
    updateMobileSelectionBar();
    initFaqAccordions();

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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCart();
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
