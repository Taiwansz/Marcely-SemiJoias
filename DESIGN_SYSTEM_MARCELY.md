# DESIGN SYSTEM -- MARCELY OLIVEIRA (CURADORIA VERIDIANA SEMIJOIAS)

## 1. Tokens Estruturais de Design (Google Stitch Editorial Warm)

### Cores (CSS Variables)
```css
:root {
  /* Google Stitch Canonical Editorial Tokens */
  --color-surface: #FCF9F4;
  --color-surface-container-low: #F6F3EE;
  --color-surface-container: #F0EDE9;
  --color-surface-container-high: #EBE8E3;
  --color-surface-container-lowest: #FFFFFF;
  --color-on-surface: #1C1C19;
  --color-on-surface-variant: #787571;
  --color-secondary: #745A2E;
  --color-primary: #000000;

  --color-border-subtle: rgba(28, 28, 25, 0.08);
  --color-border-gold: rgba(116, 90, 46, 0.28);
  --shadow-card: 0 8px 24px -6px rgba(28, 28, 25, 0.05);
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

## 2. Superficies Editoriais de Alta Joalheria

O sistema abandona efeitos pesados de *blur* sintetico de SaaS e adota superficies editoriais limpas inspiradas em papelaria de alta joalheria europeia:
- **`.liquid-glass-nav`:** Header fixo em `#FCF9F4` com 96% de opacidade e filete inferior `1px solid rgba(28, 28, 25, 0.08)`.
- **`.liquid-glass-card`:** Cartao solido `#FFFFFF` com borda `1px solid rgba(28, 28, 25, 0.08)` e sombra suave de papelaria `0 8px 24px -6px rgba(28, 28, 25, 0.05)`.
- **`.liquid-glass-light`:** Superficie editorial `#FCF9F4` com borda sutil.

---

## 3. Componentes Nucleares de Vitrine & Conversao WhatsApp

1. **Card de Produto (58 Pecas Reais Veridiana):**
   - Imagem real do acervo (`prod.image`) em proporcao 1:1 com zoom suave no hover.
   - Duplo selo superior: acabamento (`Ouro 18k` ou `Rodio Nobre`) + selo `Original Veridiana`.
   - Preco transparente em destaque (`R$ XXX,XX`), valor com 5% de desconto no Pix e parcelamento em ate 6x sem juros.
   - Dupla acao na base do card:
     - `.btn-whatsapp-primary`: Botao principal `Pedir no WhatsApp` (`background: #000000`, hover `#745A2E`, uppercase, tracking `0.12em`).
     - `.btn-luxury-outline`: Botao secundario `+ Minha Selecao` para adicionar a peca na gaveta de curadoria.

2. **Gaveta "Minha Selecao" (`#cartDrawer`) & Barra Fixa (`#mobileSelectionBar`):**
   - Permite acumular multiplas joias Veridiana com escolha de acabamento e tamanho/aro.
   - Barra inferior fixa (`#mobileSelectionBar`, `z-index: 45`) exibida automaticamente quando ha pecas selecionadas, apresentando contador, valor total e botao direto `Enviar Selecao no WhatsApp`.
   - Botao `.btn-whatsapp-selection` na gaveta lateral que formata a lista numerada completa e abre o WhatsApp da Marcely.

3. **Coordenacao Geometrica de Botoes Flutuantes:**
   - `#marcely-concierge-trigger` (Atelier Concierge IA): Posicionado no canto inferior direito (`bottom: 28px; right: 28px;`).
   - `#floatingWhatsappConcierge` (Acesso Rapido WhatsApp Marcely): Posicionado no canto inferior esquerdo (`bottom: 24px; left: 24px;`), garantindo zero colisao geometrica tanto em Desktop (`1440px`) quanto em Mobile (`390px`), com ajuste automatico de altura (`bottom: 84px`) quando a barra `#mobileSelectionBar` estiver ativa.

---

## 4. Diretrizes de Inspecao e Governanca (Sexta Lei de Ferro)

- **Proibicao Absoluta de Emojis:** Nenhum emoji Unicode permitido em HTML, CSS, JS ou mensagens de WhatsApp.
- **Viewport Desktop:** `1440 x 900 px` sem sobreposicao de componentes fixos.
- **Viewport Mobile:** `390 x 844 px` sem overflow horizontal (`overflow-x: hidden`).
