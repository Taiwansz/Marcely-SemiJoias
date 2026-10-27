# DESIGN SYSTEM -- MARCELY SEMIJOIAS

## 1. Tokens Estruturais de Design

### Cores (CSS Variables)
```css
:root {
  --color-bg-primary: #FBFBFA;
  --color-bg-surface: #FFFFFF;
  --color-bg-secondary: #F4F1EA;
  --color-bg-contrast: #0D0D0E;
  
  --color-text-main: #141416;
  --color-text-muted: #787571;
  --color-text-light: #FBFBFA;

  --color-accent-gold: #D4AF37;
  --color-accent-gold-light: #F0D890;
  --color-accent-gold-dark: #A38020;

  --color-border-subtle: rgba(20, 20, 22, 0.08);
  --color-border-gold: rgba(212, 175, 55, 0.25);
}
```

### Tipografia
```css
:root {
  --font-serif: "Cormorant Garamond", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  
  --text-hero: clamp(2.5rem, 5vw, 4.25rem);
  --text-h1: clamp(2rem, 3.5vw, 3rem);
  --text-h2: clamp(1.5rem, 2.5vw, 2.25rem);
  --text-h3: 1.25rem;
  --text-body: 1rem;
  --text-sm: 0.875rem;
  --text-xs: 0.75rem;
}
```

---

## 2. Componentes Nucleares de Vitrine

1. **Card de Produto (Jewelry Card):**
   - Fotografia isolada com fundo neutro claro (#F4F1EA ou #FBFBFA).
   - Proporcao estrita 4:5 ou 1:1.
   - Badge minimalista: "Ouro 18k (10 milésimos)" / "Rodio Branco" / "Zirconia 5A".
   - Microinteracao de zoom sutil no hover (scale 1.03, transicao 400ms cubic-bezier).
   - Preco e parcelamento claro em Pix ou cartao.

2. **Hero Section Editorial:**
   - Tipografia de cabecalho assimétrica com tracking refinado.
   - Macroshot de uma peca assinatura (ex: Choker Riviera ou Anel Solitario) com reflexo de luz.
   - Botao de chamada de alta costura com borda dourada fina e transicao suave.

3. **Drawer de Compra / Checkout Rapido:**
   - Gaveta lateral limpa, sem fricoes desnecessarias.
   - Resumo da peca, dados de garantia e integracao com motor Pix / WhatsApp.

---

## 3. Diretrizes de Inspecao Playwright (Sexta Lei de Ferro)

Toda implementacao de interface no projeto deve atender estritamente:
- **Viewport Desktop:** 1440 x 900 px (`screenshots/audit_desktop_1440.png`).
- **Viewport Mobile:** 390 x 844 px (`screenshots/audit_mobile_390.png`).
- Zero rolagem horizontal (overflow-x hidden garantido no body/wrapper).
- Contraste tipografico aprovado segundo WCAG AA em elementos textuais interativos.
