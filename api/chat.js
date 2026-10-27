/**
 * Marcely Semijoias - Atelier Concierge AI Gateway Endpoint
 * Suporta execucao como Vercel Serverless Function e middleware Express local.
 * Conecta ao Vercel AI Gateway (https://ai-gateway.vercel.sh/v1)
 * com motor de contingencia heuristico de alta joalheria integrado.
 */

const fs = require('fs');
const path = require('path');

// Carregamento resiliente do catalogo de produtos
let cachedProducts = null;
function getProductsCatalog() {
  if (cachedProducts && cachedProducts.length > 0) {
    return cachedProducts;
  }
  const possiblePaths = [
    path.join(__dirname, '_catalog.json'),
    path.join(__dirname, '../site/products.json'),
    path.join(process.cwd(), 'site/products.json'),
    path.join(process.cwd(), '_catalog.json')
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        cachedProducts = JSON.parse(raw);
        return cachedProducts;
      }
    } catch (e) {
      // continua busca
    }
  }
  return [];
}

// Filtra produtos relevantes no catalogo por palavras-chave ou IDs
function findRelevantProducts(text, maxCount = 3) {
  const catalog = getProductsCatalog();
  if (!catalog || catalog.length === 0) return [];

  const lower = text.toLowerCase();
  const scored = catalog.map(p => {
    let score = 0;
    const pName = p.name.toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    const pDesc = (p.description || '').toLowerCase();

    // Match direto de id
    if (lower.includes(p.id.toLowerCase())) score += 100;

    // Categorias
    if (lower.includes('segundo furo') || lower.includes('ear cuff')) {
      if (pName.includes('ear cuff') || pDesc.includes('segundo furo') || pDesc.includes('sem furo')) score += 30;
      if (pCat === 'brincos') score += 10;
    }
    if (lower.includes('brinco') || lower.includes('argola')) {
      if (pCat === 'brincos') score += 15;
      if (pName.includes('argola') || pName.includes('croissant')) score += 10;
    }
    if (lower.includes('colar') || lower.includes('choker') || lower.includes('mix') || lower.includes('escapulário') || lower.includes('escapulario')) {
      if (pCat === 'colares') score += 20;
      if (pName.includes('choker') || pName.includes('pérola') || pName.includes('escapulário')) score += 10;
    }
    if (lower.includes('anel') || lower.includes('aliança') || lower.includes('solitário') || lower.includes('aro')) {
      if (pCat === 'aneis') score += 20;
      if (pName.includes('solitário') || pName.includes('diamon')) score += 15;
    }
    if (lower.includes('pulseira') || lower.includes('bracelete')) {
      if (pCat === 'pulseiras') score += 20;
    }

    // Orcamento e presentes
    if (lower.includes('350') || lower.includes('presente')) {
      if (p.price <= 350 && p.price >= 200) score += 15;
    }

    // Match de palavras especificas
    if (lower.includes('ouro') && (p.metal || '').includes('Ouro')) score += 5;
    if (lower.includes('ródio') || lower.includes('rodio') || lower.includes('prata')) {
      if ((p.metal || '').includes('Ródio')) score += 5;
    }
    if (lower.includes('pérola') || lower.includes('perola')) {
      if (pName.includes('pérola') || pDesc.includes('pérola')) score += 15;
    }

    return { product: p, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map(item => item.product);
}

// Prompt mestre do sistema da Consultora Virtual
const CONCIERGE_SYSTEM_PROMPT = `Voce e o Atelier Concierge Marcely, a consultora senior de alta joalheria e estilo pessoal da Marcely Semijoias.

DIRETRIZES DE PERSONA:
1. Tom de voz: Refinado, aristocratico, acolhedor e seguro. Vocabulario primoroso com cadencia de consultoria de luxo europeia (quiet luxury). Zero bajulacao, zero termos popularescos ou slogans promocionais agressivos ("o melhor preco", "imperdivel", "corra").
2. Proibicao absoluta de emojis: E expressamente proibido usar qualquer emoji em qualquer sentenca.
3. Conhecimento tecnico de ourivesaria e padroes de banho da Marcely:
   - Banho de 10 milesimos em Ouro 18k ou Rodio Nobre multicamada.
   - Verniz nano-ceramico hipoalergenico de tecnologia alema (German Tech), selando a superficie contra abrasao, suor e oxidacao.
   - Formula 100% livre de niquel, cadmio e chumbo (hipoalergenica certificada).
   - Zirconias lapidadas em 5A (lapidacao brilhante suica com 57 facetas) e perolas naturais barrocas de agua doce.
   - Garantia Vitalicia no banho, com cartao de garantia numerado e certificado de autenticidade individual.
4. Conhecimento pratico de estilo:
   - Mix de colares em 3 alturas: choker de perolas ou fita (38-40cm), ponto focal intermediario (45-50cm) e extensor alongador ou escapulario (60cm).
   - Composicoes de orelha: ear cuffs de pressao anatomica sem necessidade de perfuracao adicional, combinados com argolas croissant ou solitarios de ponto de luz.
   - Dicas de presentes: pecas versateis e universais que dispensam medida precisa (pulseiras ajustaveis, ear cuffs, chokers e brincos solares).
   - Tabela de medidas de anel: diametro interno em milimetros com acabamento interno confort fit.
   - Cuidados essenciais: aplicar perfumes e cremes 5 minutos antes de colocar a peca; retirar para banho de mar ou piscina; higienizar com agua morna e sabao neutro, secando com flanela de microfibra; armazenar individualmente em estojos de veludo.
5. Formato de resposta: Conciso, direto e elegante (2 a 4 paragrafos curtos e objetivos). Quando recomendar pecas, cite o nome exato e atributos nobres de destaque.`;

// Motor Heuristico de Contingencia Sagital
function generateHeuristicResponse(userMessage) {
  const lower = userMessage.toLowerCase().trim();
  let reply = '';
  let products = [];

  if (lower.includes('segundo furo') || lower.includes('ear cuff') || (lower.includes('brinco') && lower.includes('furo'))) {
    reply = `Para compor o segundo furo com harmonia aristocratica, o atelier recomenda duas abordagens sem sobrecarregar a anatomia da orelha:

Primeiramente, os Ear Cuffs com fixacao por pressao ergonomica sao a escolha perfeita para quem deseja volume arquitetonico sem a necessidade de perfuracoes adicionais. Seus aros espiralados contornam a cartilagem com conforto absoluto e toque acetinado.

Caso ja possua o segundo furo, a combinacao ideal envolve um ponto de luz solitario com zirconia 5A de 3 a 4 milimetros, ou uma mini-argola lisa em Ouro 18k, criando uma composicao em degradê sofisticada com sua argola principal.`;
    products = findRelevantProducts('segundo furo ear cuff brincos', 3);
  } else if (lower.includes('presente') || lower.includes('350') || lower.includes('aniversario') || lower.includes('namorada') || lower.includes('esposa') || lower.includes('amiga')) {
    reply = `Para presentear com distincao inquestionavel em um investimento de ate R$ 350, o segredo reside em pecas atemporais que dispensam a preocupacao com numeracao exata de aros:

1. Pulseira Gotas de Luz Cristal (R$ 349,00): Confeccionada em corrente veneziana finissima com banho de 10 milesimos de Ouro 18k, pontuada por zirconias em gota lapidadas à mao.
2. Ear Cuff Multi-Aros Espiralados (R$ 289,00): Design contemporaneo de pressao que veste com ergonomia perfeita qualquer formato auricular.
3. Brincos Geometricos Pave Radiant (R$ 279,00): Cravação primorosa em micropavê que captura a luz em qualquer angulo.

Todas as pecas sao entregues em estojo rigido de veludo nobre, lacrado com fita de gorgurao e acompanhado do Certificado de Garantia Vitalicia numerado.`;
    products = findRelevantProducts('presente 350 pulseira gotas ear cuff brinco', 3);
  } else if (lower.includes('garantia') || lower.includes('banho') || lower.includes('ouro') || lower.includes('oxida') || lower.includes('alergia') || lower.includes('niquel')) {
    reply = `A integridade do nosso acabamento e o pilar central da Marcely. Nao produzimos pecas efemeras; aplicamos engenharia de joalheria nobre:

Nossas pecas recebem uma camada densa de 10 milesimos de Ouro 18k genuino ou Rodio Nobre multicamada, seladas por nosso verniz nano-ceramico de tecnologia alema. Essa blindagem preserva o brilho espelhado e cria uma barreira fisica definitiva contra a oxidacao e o desgaste natural.

Alem disso, nossa liga base e 100% isenta de niquel e metais pesados sensibilizantes, atendendo aos padroes internacionais hipoalergenicos mais rigorosos. Todas as criacoes contam com Garantia Vitalicia no banho, registrada em certificado numerado que acompanha sua encomenda.`;
    products = findRelevantProducts('garantia banho ouro 18k rodio', 2);
  } else if (lower.includes('mix') || lower.includes('colar') || lower.includes('choker') || lower.includes('colo') || lower.includes('camadas')) {
    reply = `A arte de compor um mix de colares reside na tensao equilibrada entre diferentes comprimentos e texturas. No Atelier Marcely, sugerimos a composicao classica em tres estagios:

1. Base de Colo (38 a 40 cm): Uma Choker de Perolas Barrocas naturais ou malha fita polida, que contorna a base do pescoco com presenca escultural.
2. Ponto de Foco Central (45 a 50 cm): Um colar veneziano sustentando um solitario ou pingente de zirconia 5A de lapidacao brilhante.
3. Fechamento Alongador (60 cm): Um escapulario com medalhas lapidadas ou colar gravata longo, conferindo verticalidade e refinamento à silhueta.

Essa disposicao impede que as correntes se entrelacem e valoriza decotes retos, camisas de alfaiataria ou decotes em V profundo.`;
    products = findRelevantProducts('mix colar choker perolas escapulario', 3);
  } else if (lower.includes('medida') || lower.includes('tamanho') || lower.includes('anel') || lower.includes('aro')) {
    reply = `Para identificar o aro perfeito para seu anel Marcely com total precisao:

Recomendamos o metodo do diametro interno: utilize uma regua rigida ou paquimetro e meça apenas o espaco livre interno de um anel que lhe sirva com conforto no dedo desejado (sem contar as bordas de metal).
- 15,2 mm equivale ao Aro 12
- 16,0 mm equivale ao Aro 14
- 16,5 mm equivale ao Aro 16
- 17,2 mm equivale ao Aro 18
- 17,8 mm equivale ao Aro 20
- 18,5 mm equivale ao Aro 22

Nossos aneis possuem acabamento interno anatomico (confort fit), garantindo deslize suave sobre as articulacoes e conforto prolongado durante todo o dia.`;
    products = findRelevantProducts('anel solitario diamon alianca', 3);
  } else if (lower.includes('cuidado') || lower.includes('limpeza') || lower.includes('conservar') || lower.includes('perfume') || lower.includes('mar') || lower.includes('piscina')) {
    reply = `Para manter suas semijoias com o brilho espelhado do primeiro dia por decadas:

1. Cosméticos e Perfumes: Aplique perfumes, cremes corporais ou fixadores de cabelo ao menos 5 minutos antes de colocar suas joias. O alcool evaporado evita reacoes com o acabamento superficial.
2. Agua e Quimicos: Remova suas pecas antes de banhos de mar, piscinas tratadas com cloro ou realizacao de exercicios fisicos de alto impacto.
3. Higienizacao Suave: Quando notar acumulo de oleosidade natural da pele, lave a peca em agua corrente morna com algumas gotas de sabao neutro liquido. Enxague abundantemente e seque por completo com uma flanela macia de microfibra.
4. Acomodacao: Guarde cada peca individualmente em seu estojo de veludo, evitando o atrito mecânico entre metais e pedras lapidadas.`;
    products = findRelevantProducts('aneis brincos colares', 2);
  } else {
    // Resposta contextual de alto padrao
    reply = `Seja bem-vinda ao Atelier Marcely. E um prazer orienta-la na escolha de pecas que representem sua sofisticacao pessoal com quiet luxury e precisao artesanal.

Trabalhamos exclusivamente com ligas hipoalergenicas nobres, banho de 10 milesimos em Ouro 18k ou Rodio Nobre selados com verniz nano-ceramico alemao e Garantia Vitalicia.

Em que aspecto de sua composicao posso colaborar neste momento? Posso sugerir composicoes de mix de colares, opcoes ergonomicas para segundo furo, orientacoes de numeracao de aneis ou sugestoes de presentes memoraveis.`;
    products = findRelevantProducts('solitario diamon ear cuff pulseira', 3);
  }

  return { reply, products };
}

// Handler central
async function handleChat(req, res) {
  // Configura headers de CORS e JSON
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido. Utilize POST.' });
  }

  try {
    const body = req.body || {};
    let messages = body.messages || [];

    // Se o cliente enviar string direta
    if (body.message && (!messages || messages.length === 0)) {
      messages = [{ role: 'user', content: String(body.message) }];
    }

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada no corpo da requisicao.' });
    }

    const lastUserMsgObj = [...messages].reverse().find(m => m.role === 'user');
    const userPrompt = lastUserMsgObj ? lastUserMsgObj.content : '';

    // Preparacao para Vercel AI Gateway
    const apiKey = process.env.AI_GATEWAY_API_KEY || '';
    const baseUrl = process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1';
    const model = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini';

    let aiSuccess = false;
    let finalReply = '';
    let finalProducts = [];
    let responseSource = 'heuristic_fallback';

    // Tentativa de chamada ao Vercel AI Gateway
    if (apiKey && !apiKey.includes('sua_chave')) {
      try {
        const gatewayMessages = [
          { role: 'system', content: CONCIERGE_SYSTEM_PROMPT },
          ...messages.slice(-8) // Mantem contexto recente
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500);

        const gatewayResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: gatewayMessages,
            temperature: 0.7,
            max_tokens: 650
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (gatewayResponse.ok) {
          const data = await gatewayResponse.json();
          if (data && data.choices && data.choices[0] && data.choices[0].message) {
            let content = data.choices[0].message.content || '';
            // Remove emojis se houver algum retornado pelo modelo LLM
            content = content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu, '');
            finalReply = content.trim();
            finalProducts = findRelevantProducts(userPrompt + ' ' + finalReply, 3);
            responseSource = 'vercel_ai_gateway';
            aiSuccess = true;
          }
        } else {
          const errData = await gatewayResponse.json().catch(() => ({}));
          console.warn('[Atelier Concierge] Vercel AI Gateway retornou status:', gatewayResponse.status, errData.error ? errData.error.message : '');
        }
      } catch (gatewayErr) {
        console.warn('[Atelier Concierge] Gateway indisponivel ou timeout. Ativando contingencia heuristica:', gatewayErr.message);
      }
    }

    // Se a chamada de IA nao teve sucesso, aciona o motor heuristico de alta joalheria
    if (!aiSuccess || !finalReply) {
      const heuristic = generateHeuristicResponse(userPrompt);
      finalReply = heuristic.reply;
      finalProducts = heuristic.products;
      responseSource = 'atelier_heuristic_engine';
    }

    return res.status(200).json({
      success: true,
      reply: finalReply,
      source: responseSource,
      products: finalProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        metal: p.metal,
        price: p.price,
        installments: p.installments,
        pix_discount_price: p.pix_discount_price,
        image: p.image,
        description: p.description,
        badge: p.badge
      }))
    });

  } catch (error) {
    console.error('[Atelier Concierge Error]', error);
    // Contingencia de ultimo nivel: resposta segura
    const fallback = generateHeuristicResponse('ajuda geral joias');
    return res.status(200).json({
      success: true,
      reply: fallback.reply,
      source: 'atelier_emergency_fallback',
      products: fallback.products
    });
  }
}

// Exportacao compativel com Vercel Serverless Function (CommonJS/Node)
module.exports = handleChat;
