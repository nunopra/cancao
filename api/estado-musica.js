// api/estado-musica.js
// Consulta o estado de um pedido de música. O frontend chama isto de 5 em 5 segundos
// (polling) até o estado ser 'SUCCESS'. Cada chamada é curta -> cabe no timeout de 60s.

export default async function handler(req, res) {
  const API_KEY = process.env.SUNOAPI_KEY;
  if (!API_KEY) {
    return res.status(500).json({ estado: 'ERRO', erro: 'Falta a variável SUNOAPI_KEY no Vercel' });
  }

  const { taskId } = req.query;
  if (!taskId) {
    return res.status(400).json({ estado: 'ERRO', erro: 'Falta o taskId' });
  }

  try {
    const url = 'https://api.sunoapi.org/api/v1/generate/record-info?taskId='
      + encodeURIComponent(taskId);

    const resposta = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    const dados = await resposta.json();

    if (dados.code !== 200 || !dados.data) {
      return res.status(502).json({ estado: 'ERRO', detalhe: dados });
    }

    const info = dados.data;

    // Quando terminado, as faixas estão em info.response.data (a Suno devolve 2 versões)
    const brutas = (info.response && info.response.data) ? info.response.data : [];
    const faixas = brutas
      .filter(f => f.audio_url) // só as que já têm áudio
      .map(f => ({
        id: f.id,
        titulo: f.title,
        audio: f.audio_url,
        duracao: f.duration
      }));

    return res.status(200).json({
      estado: info.status, // ex.: PENDING / TEXT_SUCCESS / FIRST_SUCCESS / SUCCESS / *_FAILED
      faixas
    });
  } catch (e) {
    return res.status(500).json({ estado: 'ERRO', detalhe: String(e) });
  }
}
