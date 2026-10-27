# Marcely -- SemiJoias

Marca contemporanea de semi-joias finas e acessorios de alta durabilidade, alinhando elegancia atemporal, banhos nobres (ouro 18k e rodio) e curadoria de design minimalista para o publico premium.

---

## 1. Topologia do Repositorio

```
Marcely - SemiJoias/
├── brand/
│   ├── raw/                 # Ativos brutos de marca gerados no Google Flow (Fase 1)
│   └── ref_site/            # Capturas de secoes de interface geradas no Flow com insumos (Fase 2)
├── site/
│   ├── assets/              # Vetores, tipografia e ativos otimizados para producao
│   ├── index.html           # Interface canonica em codigo vivo (Fase 3)
│   ├── styles.css           # Design tokens, tipografia editorial e layout responsivo
│   └── script.js            # Interatividade, microinteracoes e motor de checkout
├── screenshots/             # Evidencias de auditoria visual Playwright (1440px e 390px)
├── scripts/                 # Automacoes, rotinas do Google Flow e testes de qualidade
├── BRAND_BOOK_MARCELY.md    # Manual de identidade verbal, semiotica e atributos da marca
├── DESIGN_SYSTEM_MARCELY.md # Tokens, grids, paleta e contratos visuais
└── README.md                # Este documento executivo
```

---

## 2. Protocolo Operacional Obrigatorio (Flow-to-Code)

Este projeto opera sob a disciplina rigorosa do pipeline trifasico Flow-to-Code (FTC):

1. **Fase 1 (Identidade & Ativos de Marca):**
   - Geracao da heraldismo, logotipo vetorial e tipografia display.
   - Fotografias macro de produto em estudio (banho ouro 18k, reflexo especular, caixas rigidas, texturas de veludo e seda).
   - Armazenamento em `brand/raw/`.

2. **Fase 2 (Referencias de Interface no Flow):**
   - Utilizacao dos ativos de `brand/raw/` como insumos no Google Flow.
   - Geracao das secoes do site: Hero monumental, vitrine bento-grid de pecas, manifesto de qualidade hipoalergenica e drawer de checkout.
   - Armazenamento em `brand/ref_site/`.

3. **Fase 3 (Transcricao Image-to-Code & Auditoria):**
   - Decodificacao atonica das referencias em codigo limpo.
   - Verificacao visual automatizada via Playwright em Desktop (1440x900) e Mobile (390x844).
   - Criterio de aceite: Zero erros de console, zero overflow horizontal, renderizacao fluida a 60fps.

---

## 3. Pilares da Marca

- **Acabamento Superior:** Camadas multiplas de banho em ouro 18k (10 milesimos) e verniz protetor nano-ceramico.
- **Hipoalergenico:** Base 100% livre de niquel e chumbo.
- **Estetica Editorial:** Direcao de arte inspirada em publicacoes de alta costura, fugindo do visual generico de e-commerce popular.
