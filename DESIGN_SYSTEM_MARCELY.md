# DESIGN SYSTEM -- MARCELY SEMIJOIAS

## 1. Tokens Estruturais de Design (Organic Rounded Editorial Warm)

### Cores (CSS Variables)
```css
:root {
  --color-surface: #FCF9F4;
  --color-surface-container-low: #F6F3EE;
  --color-surface-container: #F0EDE9;
  --color-surface-container-high: #EBE8E3;
  --color-surface-container-lowest: #FFFFFF;
  --color-on-surface: #1C1C19;
  --color-on-surface-variant: #787571;
  --color-secondary: #745A2E;
  --color-primary: #000000;

  --color-border-subtle: rgba(28, 28, 25, 0.06);
  --color-border-gold: rgba(116, 90, 46, 0.28);
  --shadow-card: 0 10px 30px -10px rgba(28, 28, 25, 0.04);
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Tipografia
```css
:root {
  --font-serif: "Bodoni Moda", "Cormorant Garamond", Georgia, serif;
  --font-sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

---

## 2. Geometria Organica Arredondada ("Menos Quadrada, Mais Arredondada")

- **`.liquid-glass-card` & Product Cards:** Superficie `#FFFFFF`, borda ultrafina `1px solid rgba(28, 28, 25, 0.06)`, cantos generosos (`rounded-2xl` no mobile / `rounded-3xl` `1.5rem` no desktop) e sombra macia `0 10px 30px -10px rgba(28, 28, 25, 0.04)`.
- **Botoes Pill (`.btn-whatsapp-primary`, `.btn-whatsapp-selection`, `.btn-gold`, `.btn-luxury-outline`):** Formato capsula organico (`border-radius: 9999px`), area de toque ergonomica `min-height: 44px`, transicao `cubic-bezier(0.16, 1, 0.3, 1)` e feedback tatil `:active { transform: scale(0.98); }`.
- **Badges de Banho (`.badge-gold`, `.badge-rhodium`):** Pill discreta (`border-radius: 9999px; padding: 0.25rem 0.65rem; font-size: 0.625rem; letter-spacing: 0.08em;`).
- **Gavetas Deslizantes (`#cartDrawer` & `#mobileNavDrawer`):**
  - `#cartDrawer .drawer-panel` / `.drawer-content`: Cantos arredondados a esquerda (`border-radius: 1.75rem 0 0 1.75rem`) e `z-index: 1300`.
  - `#mobileNavDrawer .mobile-nav-panel`: Gaveta lateral esquerda suave (`border-radius: 0 1.75rem 1.75rem 0`, largura `84%`, `max-width: 340px`, `z-index: 1320`).

---

## 3. Experiencia Mobile-First Estilo App Nativo (`#mobileAppTabBar`)

Em telas `< 1024px`, a interface adota navegacao inferior fixa inspirada em aplicativos nativos de luxo (estilo Instagram):
- **Barra Inferior `#mobileAppTabBar` (`z-index: 115`):** Vidro fosco quente (`rgba(252, 249, 244, 0.94)`, `backdrop-filter: blur(22px) saturate(180%)`), altura `62px` + `env(safe-area-inset-bottom)` e grid de 5 abas:
  1. `Inicio` (`index.html`)
  2. `Explorar` (`catalogo.html`)
  3. `WhatsApp` (Pill central `#1C1C19` de acesso imediato ao atendimento da Marcely)
  4. `Lookbook` (`sobre.html`)
  5. `Selecao` (Abre `#cartDrawer` com badge dinamico `.cart-count-badge`)
- **Zero Poluicao Flutuante no Celular:** Em `< 1024px`, `#marcely-concierge-trigger` e `#mobileSelectionBar` sao ocultados para jamais cobrir cards ou colidir com a `#mobileAppTabBar`. O Concierge Marcely permanece acessivel via `window.MarcelyApp.openConciergeChat()` / `window.MarcelyConcierge.open()` (`z-index: 1350`).
- **Ergonomia iOS/Android:** `html, body { max-width: 100%; overflow-x: clip; }` e `font-size: 16px !important` em campos `input, select, textarea` (`<= 640px`) para impedir zoom involuntario no Safari.

---

## 4. Componentes Nucleares de Vitrine & PDP

1. **Card de Produto Ultra-Clean (2 Colunas Mobile `390px` / 4 Colunas Desktop `1440px`):**
   - Imagem real de estudio em proporcao 1:1 (`rounded-xl sm:rounded-2xl`).
   - Apenas **1 badge** discreto de acabamento (`Ouro 18k` ou `Rodio Nobre`) no topo esquerdo e botao circular de favoritar no topo direito.
   - Preco limpo com destaque de valor no Pix (`5% OFF`).
   - Linha de acao horizontal: botao pill principal (`Pedir` no mobile / `Pedir no WhatsApp` no desktop) + botao circular `+` (`42px-44px`) para adicionar a **Minha Selecao**.

2. **Pagina de Detalhe do Produto (`produto.html`):**
   - **Protecao de Foto Unica:** Se o produto possui apenas 1 foto real de estudio, `#detailThumbnailsContainer` e qualquer `.detail-thumb-btn` residual sao ocultados/removidos, impedindo que miniaturas de outras pecas aparecam.
   - **Seletor de Aro Inteligente (`#detailSizeSection`):** Exibido exclusivamente para aneis (`category === 'aneis'`) e ocultado automaticamente para brincos, colares e pulseiras (omitindo tambem a linha de aro na mensagem de WhatsApp quando nao aplicavel).

---

## 5. Diretrizes de Inspecao e Governanca (Sexta Lei de Ferro)

- **Proibicao Absoluta de Emojis:** Nenhum emoji Unicode permitido em HTML, CSS, JS, JSON, MD ou mensagens de WhatsApp.
- **Viewport Desktop:** `1440 x 900 px` sem sobreposicao de componentes fixos.
- **Viewport Mobile:** `390 x 844 px` com `#mobileAppTabBar` fixa, grid 2 colunas limpo e zero overflow horizontal.
