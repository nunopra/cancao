module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { tema, humor, nome } = req.body || {};
  if (!tema || !humor) return res.status(400).json({ error: 'Tema ou humor em falta' });

  const nomeFrase = nome ? ` O nome "${nome}" deve aparecer de forma natural na letra.` : '';

  const humores = {
    alegre:      'alegre, saltitante e cheia de energia, com muito ponto de exclamação',
    disparatada: 'completamente disparatada e absurda — animais a fazer coisas impossíveis, palavras inventadas, situações nonsense que façam as crianças rir',
    aventura:    'épica e corajosa, cheia de ação e desafios, como uma banda sonora de aventura',
    dormir:      'suave e sonolenta, com ritmo lento, para acalmar e adormecer'
  };

  const tomDescricao = humores[humor] || 'alegre e divertida';

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
        system: 'És um compositor de canções infantis portuguesas, especialista em letras divertidas e rimadas para crianças de 4 a 6 anos. Respondes SEMPRE e APENAS com JSON válido — sem texto adicional, sem markdown, sem backticks.',
        messages: [{
          role: 'user',
          content: `Compõe uma canção infantil em português europeu sobre o tema "${tema}". O tom deve ser ${tomDescricao}.${nomeFrase}

Responde APENAS com este JSON (sem mais nada):
{"titulo":"...","verso1":"...","refrao":"...","verso2":"..."}

Regras:
- Português europeu (nunca brasileiro)
- Rimas ricas e criativas — é o mais importante
- Cada verso: exatamente 4 linhas rimadas
- Refrão: 4 linhas cativantes, fáceis de memorizar e repetir
- Linguagem simples, adequada a crianças de 4 a 6 anos
- Sem violência ou temas inapropriados
- As linhas de cada secção separadas por \\n`
        }]
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
