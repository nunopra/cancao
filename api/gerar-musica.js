// api/gerar-musica.js
// Submete um pedido de geração de música à Suno API (sunoapi.org) e devolve o taskId.
// A letra vem do teu gerador de letras (Claude) e é usada TAL E QUAL como letra da canção.

const MODELO = 'V4_5ALL'; // boa estrutura de canção, até 8 min. Alternativas: 'V5', 'V5_5'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Usa POST' });
  }

  const API_KEY = process.env.SUNOAPI_KEY;
  if (!API_KEY) {
    return res.status(500).json({ erro: 'Falta a variável SUNOAPI_KEY no Vercel' });
  }

  try {
    const { letra, estilo, titulo, voz } = req.body || {};

    if (!letra || !estilo || !titulo) {
      return res.status(400).json({
        erro: 'Faltam campos: "letra", "estilo" e "titulo" são obrigatórios'
      });
    }

    const corpo = {
      customMode: true,      // usamos a nossa letra tal e qual
      instrumental: false,   // queremos VOZ + instrumental
      model: MODELO,
      prompt: letra,         // em customMode + instrumental:false isto é a LETRA cantada
      style: estilo,         // ex.: "canção infantil alegre, acústica, em português"
      title: titulo,
      // Não é usado — fazemos polling. Tem de ser um URL válido; qualquer um serve.
      callBackUrl: 'https://example.com/callback'
    };

    // Género da voz: 'f' (feminina) ou 'm' (masculina). Se vier outra coisa
    // (ex.: 'auto'), não enviamos o campo e a Suno escolhe sozinha.
    if (voz === 'f' || voz === 'm') {
      corpo.vocalGender = voz;
    }

    const resposta = await fetch('https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(corpo)
    });

    const dados = await resposta.json();

    // A Suno responde { code: 200, msg, data: { taskId } }
    if (dados.code !== 200 || !dados.data || !dados.data.taskId) {
      return res.status(502).json({
        erro: `A Suno recusou o pedido: ${dados.msg || 'erro desconhecido'}`,
        detalhe: dados
      });
    }

    return res.status(200).json({ taskId: dados.data.taskId });
  } catch (e) {
    return res.status(500).json({ erro: 'Erro ao contactar a Suno', detalhe: String(e) });
  }
}
