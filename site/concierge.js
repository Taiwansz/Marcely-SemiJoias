/**
 * Marcely Semijoias - Concierge Marcely
 * Componente Interativo de Atendimento Assistido & Consultoria de Estilo
 * Conecta ao endpoint /api/chat com fallback inteligente in-browser e fechamento direto via WhatsApp
 */

(function () {
  'use strict';

  const SESSION_STORAGE_KEY = 'marcely_concierge_history_v2';

  const INITIAL_MESSAGE = {
    role: 'assistant',
    content: 'Seja bem-vinda ao Concierge Marcely. Sou a assistente virtual da Marcely Semijoias, Revendedora Autorizada Veridiana Semijoias. Como posso orientar sua escolha hoje? Todas as 58 pecas do catalogo contam com banho nobre de 10 a 15 milesimos de Ouro 18k ou Rodio Nobre, tecnologia hipoalergenica alema, Garantia Oficial Veridiana Semijoias e atendimento personalizado diretamente com a Marcely no WhatsApp.',
    time: formatCurrentTime()
  };

  const QUICK_SUGGESTIONS = [
    'Qual o melhor brinco para segundo furo?',
    'Sugestao de presente sofisticado ate R$ 350',
    'Como funciona a Garantia Oficial?',
    'Quero montar um mix de colares e pedir no WhatsApp'
  ];

  function formatCurrentTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getStoredHistory() {
    try {
      const data = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignora erro de storage
    }
    return [INITIAL_MESSAGE];
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      // Ignora erro de storage
    }
  }

  const ICONS = {
    chat: `<svg class="concierge-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>`,
    bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-right: 4px;">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>`
  };

  class MarcelyConciergeWidget {
    constructor() {
      this.isOpen = false;
      this.isLoading = false;
      this.messages = getStoredHistory();
      this.init();
    }

    init() {
      if (document.getElementById('marcely-concierge-root')) {
        this.triggerBtn = document.getElementById('marcely-concierge-trigger');
        this.panel = document.getElementById('marcely-concierge-panel');
        this.closeBtn = document.getElementById('marcely-concierge-close');
        this.messagesContainer = document.getElementById('marcely-concierge-messages');
        this.suggestionsContainer = document.getElementById('marcely-concierge-suggestions');
        this.form = document.getElementById('marcely-concierge-form');
        this.inputField = document.getElementById('marcely-concierge-input');
        this.submitBtn = document.getElementById('marcely-concierge-submit');
        return;
      }

      const root = document.createElement('div');
      root.id = 'marcely-concierge-root';
      root.innerHTML = `
        <!-- Botao Flutuante Trigger (Desktop) -->
        <button id="marcely-concierge-trigger" type="button" aria-label="Abrir Atendimento Marcely">
          <div class="concierge-trigger-icon-wrap">
            ${ICONS.chat}
          </div>
          <div class="concierge-trigger-text">
            <span class="concierge-trigger-title">Consultoria Marcely</span>
            <span class="concierge-trigger-badge">
              <span class="concierge-pulse-dot"></span>
              Atendimento Online
            </span>
          </div>
        </button>

        <!-- Painel Modal Editorial -->
        <div id="marcely-concierge-panel" class="concierge-hidden" role="dialog" aria-modal="true" aria-label="Concierge Marcely">
          <!-- Cabecalho -->
          <div class="concierge-header">
            <div class="concierge-brand-identity">
              <div class="concierge-monogram-shield">M</div>
              <div class="concierge-header-titles">
                <span class="concierge-title">Concierge Marcely</span>
                <span class="concierge-subtitle">
                  <span class="concierge-pulse-dot"></span>
                  Marcely Semijoias • Atendimento Assistido
                </span>
              </div>
            </div>
            <div class="concierge-header-actions">
              <button type="button" class="concierge-icon-btn" id="marcely-concierge-close" aria-label="Fechar painel">
                ${ICONS.close}
              </button>
            </div>
          </div>

          <!-- Area de Mensagens -->
          <div class="concierge-messages-area" id="marcely-concierge-messages"></div>

          <!-- Sugestoes Rapidas -->
          <div class="concierge-suggestions-wrap" id="marcely-concierge-suggestions"></div>

          <!-- Area de Input -->
          <div class="concierge-input-container">
            <form id="marcely-concierge-form" class="concierge-input-box">
              <input
                type="text"
                id="marcely-concierge-input"
                class="concierge-input-field"
                placeholder="Pergunte sobre joias, medidas, presentes..."
                autocomplete="off"
              />
              <button type="submit" id="marcely-concierge-submit" class="concierge-send-btn" aria-label="Enviar mensagem">
                ${ICONS.send}
              </button>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(root);

      this.triggerBtn = document.getElementById('marcely-concierge-trigger');
      this.panel = document.getElementById('marcely-concierge-panel');
      this.closeBtn = document.getElementById('marcely-concierge-close');
      this.messagesContainer = document.getElementById('marcely-concierge-messages');
      this.suggestionsContainer = document.getElementById('marcely-concierge-suggestions');
      this.form = document.getElementById('marcely-concierge-form');
      this.inputField = document.getElementById('marcely-concierge-input');
      this.submitBtn = document.getElementById('marcely-concierge-submit');

      this.bindEvents();
      this.renderMessages();
      this.renderSuggestions();
    }

    bindEvents() {
      this.triggerBtn.addEventListener('click', () => this.toggle());
      this.closeBtn.addEventListener('click', () => this.close());

      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.inputField.value.trim();
        if (text) {
          this.sendMessage(text);
          this.inputField.value = '';
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.panel.classList.remove('concierge-hidden');
      setTimeout(() => {
        if (this.inputField) this.inputField.focus();
        this.scrollToBottom();
      }, 100);
    }

    close() {
      this.isOpen = false;
      this.panel.classList.add('concierge-hidden');
    }

    renderMessages() {
      this.messagesContainer.innerHTML = '';
      this.messages.forEach(msg => {
        this.appendMessageElement(msg);
      });
      this.scrollToBottom();
    }

    appendMessageElement(msg) {
      const isAssistant = msg.role === 'assistant';
      const msgDiv = document.createElement('div');
      msgDiv.className = `concierge-msg ${isAssistant ? 'concierge-msg-assistant' : 'concierge-msg-user'}`;

      const formattedText = msg.content
        .split('\n\n')
        .map(paragraph => `<p style="margin: 0 0 8px 0; line-height: 1.55;">${this.escapeHtml(paragraph)}</p>`)
        .join('');

      let productsHtml = '';
      if (msg.products && Array.isArray(msg.products) && msg.products.length > 0) {
        productsHtml = `<div class="concierge-product-recommendations">` +
          msg.products.map(p => this.renderProductCard(p)).join('') +
          `</div>`;
      }

      msgDiv.innerHTML = `
        <div class="concierge-msg-bubble">
          ${formattedText}
          ${productsHtml}
        </div>
        <span class="concierge-msg-time">${msg.time || formatCurrentTime()}</span>
      `;

      this.messagesContainer.appendChild(msgDiv);
      this.bindProductCardActions(msgDiv);
    }

    renderProductCard(product) {
      const formattedPrice = Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const pixPrice = product.pix_discount_price
        ? Number(product.pix_discount_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : null;

      const rawImg = product.image ? product.image.replace(/^\//, '') : 'assets/products/item_ac30f328e209483a98fbcc35074b9295.jpg';
      const imgSrc = rawImg.startsWith('assets/') ? rawImg : `/${rawImg}`;

      return `
        <div class="concierge-product-card" data-product-id="${this.escapeHtml(product.id)}">
          <img class="concierge-product-thumb" src="${imgSrc}" alt="${this.escapeHtml(product.name)}" onerror="this.src='assets/products/item_ac30f328e209483a98fbcc35074b9295.jpg'" />
          <div class="concierge-product-info">
            <span class="concierge-product-badge">${this.escapeHtml(product.badge || 'Ouro 18k & Rodio')}</span>
            <div class="concierge-product-name" title="${this.escapeHtml(product.name)}">${this.escapeHtml(product.name)}</div>
            <div class="concierge-product-price-row">
              <span class="concierge-product-price">${formattedPrice}</span>
              ${pixPrice ? `<span class="concierge-product-pix">${pixPrice} no Pix</span>` : ''}
            </div>
            <div class="concierge-product-actions">
              <button type="button" class="concierge-btn-sm concierge-btn-outline concierge-action-view" data-id="${this.escapeHtml(product.id)}">
                Detalhes
              </button>
              <button type="button" class="concierge-btn-sm concierge-btn-gold concierge-action-bag" data-id="${this.escapeHtml(product.id)}" data-name="${this.escapeHtml(product.name)}" data-price="${product.price}">
                ${ICONS.bag}
                + Selecao
              </button>
            </div>
          </div>
        </div>
      `;
    }

    bindProductCardActions(container) {
      container.querySelectorAll('.concierge-action-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const prodId = btn.getAttribute('data-id');
          window.dispatchEvent(new CustomEvent('marcely:view-product', { detail: { id: prodId } }));

          if (window.location.pathname.includes('produto.html')) {
            window.location.search = `?id=${encodeURIComponent(prodId)}`;
          } else {
            window.location.href = `produto.html?id=${encodeURIComponent(prodId)}`;
          }
        });
      });

      container.querySelectorAll('.concierge-action-bag').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const prodId = btn.getAttribute('data-id');
          const prodName = btn.getAttribute('data-name');
          const prodPrice = parseFloat(btn.getAttribute('data-price'));

          if (window.MarcelyApp && typeof window.MarcelyApp.addToCartById === 'function') {
            window.MarcelyApp.addToCartById(prodId, 1);
          } else {
            window.dispatchEvent(new CustomEvent('marcely:add-to-cart', { detail: { product: { id: prodId, name: prodName, price: prodPrice } } }));
          }

          this.showToast(`"${prodName}" adicionado a Minha Selecao`);
        });
      });
    }

    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'concierge-toast';
      toast.textContent = message;
      this.panel.appendChild(toast);
      setTimeout(() => toast.remove(), 2600);
    }

    renderSuggestions() {
      this.suggestionsContainer.innerHTML = '';
      QUICK_SUGGESTIONS.forEach(text => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'concierge-chip';
        chip.textContent = text;
        chip.addEventListener('click', () => {
          this.sendMessage(text);
        });
        this.suggestionsContainer.appendChild(chip);
      });
    }

    async sendMessage(text) {
      if (!text || this.isLoading) return;

      const userMsg = {
        role: 'user',
        content: text,
        time: formatCurrentTime()
      };

      this.messages.push(userMsg);
      this.appendMessageElement(userMsg);
      saveHistory(this.messages);
      this.scrollToBottom();

      this.setLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: this.messages.map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!response.ok) {
          throw new Error(`Erro na requisicao HTTP: ${response.status}`);
        }

        const data = await response.json();
        const assistantMsg = {
          role: 'assistant',
          content: data.reply || 'Houve uma breve oscilacao na conexao. Poderia repetir sua pergunta ou chamar a Marcely diretamente no WhatsApp?',
          products: data.products || [],
          time: formatCurrentTime()
        };

        this.messages.push(assistantMsg);
        this.appendMessageElement(assistantMsg);
        saveHistory(this.messages);

      } catch (err) {
        console.warn('[Concierge Frontend] Erro ao contatar backend. Ativando resposta de contingencia local:', err);

        const fallbackMsg = {
          role: 'assistant',
          content: 'Todas as 58 pecas da Marcely Semijoias (Revendedora Autorizada Veridiana Semijoias) possuem banho nobre de 10 a 15 milesimos de Ouro 18k ou Rodio Nobre, tecnologia hipoalergenica alema e Garantia Oficial Veridiana Semijoias. Voce pode adicionar suas pecas prediletas em Minha Selecao e finalizar o atendimento diretamente com a Marcely pelo WhatsApp.',
          time: formatCurrentTime(),
          products: []
        };
        this.messages.push(fallbackMsg);
        this.appendMessageElement(fallbackMsg);
        saveHistory(this.messages);
      } finally {
        this.setLoading(false);
        this.scrollToBottom();
      }
    }

    setLoading(loading) {
      this.isLoading = loading;
      this.submitBtn.disabled = loading;
      this.inputField.disabled = loading;

      const existingIndicator = document.getElementById('concierge-typing-indicator');

      if (loading) {
        if (!existingIndicator) {
          const indicator = document.createElement('div');
          indicator.id = 'concierge-typing-indicator';
          indicator.className = 'concierge-typing-indicator';
          indicator.innerHTML = `
            <div class="concierge-typing-dot"></div>
            <div class="concierge-typing-dot"></div>
            <div class="concierge-typing-dot"></div>
          `;
          this.messagesContainer.appendChild(indicator);
        }
      } else {
        if (existingIndicator) {
          existingIndicator.remove();
        }
        this.inputField.focus();
      }
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  let conciergeInstance = null;

  function ensureConciergeInstance() {
    if (!conciergeInstance && document.body) {
      conciergeInstance = new MarcelyConciergeWidget();
    }
    return conciergeInstance;
  }

  function openPanel() {
    const inst = ensureConciergeInstance();
    if (inst) inst.open();
  }

  function closePanel() {
    const inst = ensureConciergeInstance();
    if (inst) inst.close();
  }

  function togglePanel() {
    const inst = ensureConciergeInstance();
    if (inst) inst.toggle();
  }

  window.MarcelyConcierge = {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensureConciergeInstance());
  } else {
    ensureConciergeInstance();
  }
})();
