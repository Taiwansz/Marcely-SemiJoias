/**
 * Marcely Semijoias - Atelier Concierge AI Gateway Endpoint
 * Curadoria Marcely Oliveira • Revendedora Autorizada Veridiana Semijoias
 * Suporta execucao como Vercel Serverless Function e middleware Express local.
 * Conecta ao Vercel AI Gateway (https://ai-gateway.vercel.sh/v1)
 * com motor de contingencia heuristico de alta joalheria integrado.
 */

const fs = require('fs');
const path = require('path');

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

function findRelevantProducts(text, maxCount = 3) {
  const catalog = getProductsCatalog();
  if (!catalog || catalog.length === 0) return [];

  const lower = text.toLowerCase();
  const scored = catalog.map(p => {
    let score = 0;
    const pName = p.name.toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    const pDesc = (p.description || '').toLowerCase();

    if (lower.includes(p.id.toLowerCase())) score += 100;

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

    if (lower.includes('350') || lower.includes('presente')) {
      if (p.price <= 350 && p.price >= 200) score += 15;
    }

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

const CONCIERGE_SYSTEM_PROMPT = `Voce e o Atelier Concierge Marcely, a consultora virtual de estilo de Marcely Oliveira, Curadora de Estilo e Revendedora Autorizada Veridiana Semijoias.

DIRETRIZES DE PERSONA:
1. Posicionamento Oficial: Apresente a Marcely Oliveira como Curadora de Estilo e Revendedora Autorizada Veridiana Semijoias. O catalogo conta com 58 pecas oficiais selecionadas a dedo.
2. Tom de voz: Refinado, aristocratico, acolhedor e seguro. Vocabulario primoroso com cadencia de consultoria de luxo europeia (quiet luxury). Zero bajulacao, zero termos popularescos ou slogans promocionais agressivos.
3. Proibicao absoluta de emojis: E expressamente proibido usar qualquer emoji Unicode em qualquer sentenca.
4. Padrao Tecnico Oficial Veridiana Semijoias:
   - Todas as 58 pecas possuem banho nobre de 10 a 15 milesimos de Ouro 18k ou Rodio Nobre multicamada.
   - Verniz nano-ceramico hipoalergenico de tecnologia alema (German Tech), selando a superficie contra abrasao, suor e oxidacao.
   - Formula 100% livre de niquel, cadmio e chumbo (tecnologia hipoalergenica certificada).
   - Zirconias lapidadas em 5A (lapidacao brilhante suica com 57 facetas) e perolas selecionadas.
   - Certificado de Garantia Oficial de Fabrica Veridiana Semijoias incluso em todas as pecas.
5. Fechamento e Atendimento via WhatsApp:
   - O fechamento do pedido (pronta entrega com a Marcely ou encomenda direta Veridiana) e feito de forma personalizada diretamente com a Marcely no WhatsApp.
   - Oriente a cliente a clicar em "Pedir no WhatsApp" na peca desejada ou montar sua lista em "+ Minha Selecao" para enviar todas as pecas juntas para o WhatsApp da Marcely.
6. Conhecimento pratico de estilo:
   - Mix de colares em 3 alturas: choker de perolas ou fita (38-40cm), ponto focal intermediario (45-50cm) e extensor alongador ou escapulario (60cm).
   - Composicoes de orelha: ear cuffs de pressao anatomica sem necessidade de perfuracao adicional, combinados com argolas ou pontos de luz.
   - Tabela de medidas de anel: diametro interno em milimetros (15,2mm = Aro 12; 16,0mm = Aro 14; 16,5mm = Aro 16; 17,2mm = Aro 18; 17,8mm = Aro 20; 18,5mm = Aro 22).
7. Formato de resposta: Conciso, direto e elegante (2 a 4 paragrafos curtos e objetivos).`;

function generateHeuristicResponse(userMessage) {
  const lower = userMessage.toLowerCase().trim();
  let reply = '';
  let products = [];

  if (lower.includes('segundo furo') || lower.includes('ear cuff') || (lower.includes('brinco') && lower.includes('furo'))) {
    reply = `Na curadoria de Marcely Oliveira como Revendedora Autorizada Veridiana Semijoias, recomendamos duas abordagens elegantes para o segundo furo sem sobrecarregar a anatomia da orelha:

Primeiramente, os Ear Cuffs Veridiana com fixacao por pressao ergonomica sao ideais para quem deseja volume escultural sem necessidade de perfuracao adicional. Seus aros contornam a cartilagem com conforto absoluto e banho nobre de 10 a 15 milesimos.

Caso ja possua o segundo furo, a combinacao perfeita envolve um ponto de luz em zirconia 5A ou mini-argola em Ouro 18k ou Rodio Nobre. Voce pode adicionar suas pecas favoritas em Minha Selecao e finalizar o pedido diretamente com a Marcely no WhatsApp.`;
    products = findRelevantProducts('segundo furo ear cuff brincos', 3);
  } else if (lower.includes('presente') || lower.includes('350') || lower.includes('aniversario') || lower.includes('namorada') || lower.includes('esposa') || lower.includes('amiga')) {
    reply = `Para presentear com distincao ate R$ 350, a curadoria de Marcely Oliveira reúne pecas Veridiana Semijoias que dispensam numeracao exata de aro:

1. Pulseira Gotas de Luz Cristal (R$ 349,00): Corrente veneziana com banho de 10 a 15 milesimos de Ouro 18k e zirconias facetadas em gota.
2. Ear Cuff Multi-Aros Espiralados (R$ 289,00): Design contemporaneo em Rodio Nobre hipoalergenico que veste com ergonomia imediata.
3. Brincos Geometricos Pave Radiant (R$ 279,00): Cravacao em micropave de alto brilho.

Todas as 58 pecas contam com tecnologia hipoalergenica alema e Certificado de Garantia Oficial de Fabrica Veridiana. Clique em Pedir no WhatsApp para confirmar pronta entrega ou encomenda diretamente com a Marcely.`;
    products = findRelevantProducts('presente 350 pulseira gotas ear cuff brinco', 3);
  } else if (lower.includes('garantia') || lower.includes('veridiana') || lower.includes('banho') || lower.includes('ouro') || lower.includes('oxida') || lower.includes('alergia') || lower.includes('niquel')) {
    reply = `Marcely Oliveira atua como Curadora de Estilo e Revendedora Autorizada Veridiana Semijoias, assegurando procedencia integral em todas as 58 pecas do catalogo:

Cada joia recebe banho nobre de 10 a 15 milesimos de Ouro 18k ou Rodio Nobre multicamada, finalizado com verniz nano-ceramico de tecnologia hipoalergenica alema (100% livre de niquel e metais pesados).

Todas as pecas sao acompanhadas pelo Certificado de Garantia Oficial de Fabrica Veridiana Semijoias. O fechamento do pedido e o suporte pós-venda sao realizados pessoalmente pela Marcely via WhatsApp.`;
    products = findRelevantProducts('garantia banho ouro 18k rodio', 2);
  } else if (lower.includes('mix') || lower.includes('colar') || lower.includes('choker') || lower.includes('colo') || lower.includes('camadas') || lower.includes('whatsapp')) {
    reply = `Para compor um mix de colares Veridiana Semijoias com harmonia editorial, a Marcely recomenda a construcao em tres alturas:

1. Base de Colo (38 a 40 cm): Choker de Perolas Barrocas ou malha fita espelhada.
2. Ponto Focal (45 a 50 cm): Colar veneziano com ponto de luz ou pingente cravado em zirconia 5A.
3. Alongamento Vertical (60 cm): Escapulario Sacred em relevo ou colar longo.

Adicione as pecas desejadas em Minha Selecao e clique em Enviar Selecao no WhatsApp para que a Marcely verifique a disponibilidade e finalize seu atendimento personalizado.`;
    products = findRelevantProducts('mix colar choker perolas escapulario', 3);
  } else if (lower.includes('medida') || lower.includes('tamanho') || lower.includes('anel') || lower.includes('aro')) {
    reply = `Para identificar o aro ideal do seu anel Veridiana Semijoias com precisao:

Meça o diametro interno livre de um anel que lhe vista bem (sem somar as bordas do metal):
- 15,2 mm corresponde ao Aro 12
- 16,0 mm corresponde ao Aro 14
- 16,5 mm corresponde ao Aro 16
- 17,2 mm corresponde ao Aro 18
- 17,8 mm corresponde ao Aro 20
- 18,5 mm corresponde ao Aro 22

Se desejar auxilio personalizado, na pagina do produto basta clicar no botao de ajuda de medidas para conversar diretamente com a Marcely no WhatsApp.`;
    products = findRelevantProducts('anel solitario diamon alianca', 3);
  } else if (lower.includes('cuidado') || lower.includes('limpeza') || lower.includes('conservar') || lower.includes('perfume') || lower.includes('mar') || lower.includes('piscina')) {
    reply = `Para preservar o brilho espelhado do banho de 10 a 15 milesimos e a blindagem alemã de suas pecas Veridiana Semijoias:

1. Aplique perfumes e cosmeticos 5 minutos antes de vestir a joia.
2. Retire as pecas antes de banhos de mar, piscina ou contato com produtos quimicos abrasivos.
3. Para higienizacao, utilize apenas agua morna com sabao neutro liquido e seque com flanela macia.

Todas as pecas possuem Certificado de Garantia Oficial de Fabrica Veridiana e suporte direto com a Marcely pelo WhatsApp.`;
    products = findRelevantProducts('aneis brincos colares', 2);
  } else {
    reply = `Seja bem-vinda ao Atelier Concierge. Marcely Oliveira e Curadora de Estilo e Revendedora Autorizada Veridiana Semijoias.

Nosso catalogo apresentando 58 criacoes oficiais conta com banho nobre de 10 a 15 milesimos de Ouro 18k ou Rodio Nobre, tecnologia hipoalergenica alema (zero niquel) e Certificado de Garantia Oficial de Fabrica Veridiana.

Voce pode escolher suas pecas, adiciona-las em Minha Selecao e concluir seu pedido diretamente com a Marcely no WhatsApp. Como posso orientar sua escolha hoje?`;
    products = findRelevantProducts('solitario diamon ear cuff pulseira', 3);
  }

  return { reply, products };
}

async function handleChat(req, res) {
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

    if (body.message && (!messages || messages.length === 0)) {
      messages = [{ role: 'user', content: String(body.message) }];
    }

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada no corpo da requisicao.' });
    }

    const lastUserMsgObj = [...messages].reverse().find(m => m.role === 'user');
    const userPrompt = lastUserMsgObj ? lastUserMsgObj.content : '';

    const apiKey = process.env.AI_GATEWAY_API_KEY || '';
    const baseUrl = process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1';
    const model = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini';

    let aiSuccess = false;
    let finalReply = '';
    let finalProducts = [];
    let responseSource = 'heuristic_fallback';

    if (apiKey && !apiKey.includes('sua_chave')) {
      try {
        const gatewayMessages = [
          { role: 'system', content: CONCIERGE_SYSTEM_PROMPT },
          ...messages.slice(-8)
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
            content = content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu, '');
            finalReply = content.trim();
            finalProducts = findRelevantProducts(userPrompt + ' ' + finalReply, 3);
            responseSource = 'vercel_ai_gateway';
            aiSuccess = true;
          }
        }
      } catch (gatewayErr) {
        console.warn('[Atelier Concierge] Gateway indisponivel ou timeout. Ativando contingencia heuristica:', gatewayErr.message);
      }
    }

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
    const fallback = generateHeuristicResponse('ajuda geral joias');
    return res.status(200).json({
      success: true,
      reply: fallback.reply,
      source: 'atelier_emergency_fallback',
      products: fallback.products
    });
  }
}

module.exports = handleChat;
