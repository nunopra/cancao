module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { tema, humor, nome, extras, idioma } = req.body || {};
  const brief = (extras || '').trim().slice(0, 200);

  // É preciso o humor e, pelo menos, um tema OU palavras-chave
  if (!humor || (!tema && !brief)) {
    return res.status(400).json({ error: 'Falta o humor ou o assunto da canção' });
  }

  const lang = idioma === 'en' ? 'en' : 'pt';

  const humores = {
    pt: {
      alegre:      'alegre, saltitante e cheia de energia, com muito ponto de exclamação',
      disparatada: 'completamente disparatada e absurda — animais a fazer coisas impossíveis, palavras inventadas, situações nonsense que façam as crianças rir',
      aventura:    'épica e corajosa, cheia de ação e desafios, como uma banda sonora de aventura',
      dormir:      'suave e sonolenta, com ritmo lento, para acalmar e adormecer'
    },
    en: {
      alegre:      'cheerful, bouncy and full of energy, with lots of exclamation marks',
      disparatada: 'completely silly and absurd — animals doing impossible things, made-up words, nonsense situations that make children laugh',
      aventura:    'epic and brave, full of action and challenges, like an adventure soundtrack',
      dormir:      'soft and sleepy, with a slow rhythm, to calm down and fall asleep'
    }
  };

  const tomDescricao = humores[lang][humor] || humores[lang].alegre;

  let system, userContent;

  if (lang === 'en') {
    const nomeFrase = nome ? ` The name "${nome}" should appear naturally in the lyrics.` : '';
    // Se houver palavras-chave, são o assunto da canção; caso contrário, usa o tema.
    const assunto = brief
      ? `built entirely around these keywords: "${brief}". Make them the main subject and tell a little story that connects them`
      : `about the theme "${tema}"`;
    system = "You are a children's songwriter, specialised in fun, rhyming lyrics for children aged 4 to 6. You ALWAYS respond with ONLY valid JSON — no extra text, no markdown, no backticks.";
    userContent = `Write a children's song in English ${assunto}. The tone should be ${tomDescricao}.${nomeFrase}

Respond ONLY with this JSON (nothing else):
{"titulo":"...","verso1":"...","refrao":"...","verso2":"..."}

Rules:
- The song must clearly be about the subject above
- Rich, creative rhymes — this is the most important thing
- Each verse: exactly 4 rhyming lines
- Chorus: 4 catchy lines, easy to memorise and repeat
- Simple language, suitable for children aged 4 to 6
- No violence or inappropriate themes
- Separate the lines of each section with \\n`;
  } else {
    const nomeFrase = nome ? ` O nome "${nome}" deve aparecer de forma natural na letra.` : '';
    // Se houver palavras-chave, são o assunto da canção; caso contrário, usa o tema.
    const assunto = brief
      ? `construída inteiramente à volta destas palavras-chave: "${brief}". Fá-las o assunto principal e conta uma pequena história que as ligue`
      : `sobre o tema "${tema}"`;
    system = 'És um compositor de canções infantis portuguesas, especialista em letras divertidas e rimadas para crianças de 4 a 6 anos. Respondes SEMPRE e APENAS com JSON válido — sem texto adicional, sem markdown, sem backticks.';
    userContent = `Compõe uma canção infantil em português europeu ${assunto}. O tom deve ser ${tomDescricao}.${nomeFrase}

Responde APENAS com este JSON (sem mais nada):
{"titulo":"...","verso1":"...","refrao":"...","verso2":"..."}

Regras:
- A canção tem de ser claramente sobre o assunto acima
- Português europeu (nunca brasileiro)
- Rimas ricas e criativas — é o mais importante
- Cada verso: exatamente 4 linhas rimadas
- Refrão: 4 linhas cativantes, fáceis de memorizar e repetir
- Linguagem simples, adequada a crianças de 4 a 6 anos
- Sem violência ou temas inapropriados
- As linhas de cada secção separadas por \\n`;
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Erro API');

    const raw = data.content?.[0]?.text?.trim();
    if (!raw) throw new Error('Resposta vazia');

    const cancao = JSON.parse(raw);
    if (!cancao.titulo || !cancao.verso1 || !cancao.refrao || !cancao.verso2) throw new Error('Formato inválido');

    return res.status(200).json({ cancao });

  } catch (err) {
    console.error('Erro:', err.message);
    return res.status(500).json({ error: 'Não foi possível compor a canção. Tenta novamente.' });
  }
};
