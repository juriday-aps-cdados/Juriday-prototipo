// Fica tentando a API do DataJud até ela responder, e avisa quando funcionar.
// Uso: npm run testar-api   (deixe o terminal aberto; Control + C para parar)
const CHAVE = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const TRIBUNAIS = ['tjsp', 'tjdft', 'trf3', 'trt2']; // alterna: um deles pode estar menos sobrecarregado
const ESPERA_MIN = 3;

const hora = () => new Date().toLocaleTimeString('pt-BR');
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; ; i++) {
  const sigla = TRIBUNAIS[i % TRIBUNAIS.length];
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${sigla}/_search`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `APIKey ${CHAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: 1, _source: ['numeroProcesso', 'tribunal', 'classe'], query: { match_all: {} } }),
      signal: AbortSignal.timeout(60000),
    });
    if (r.ok) {
      const json = await r.json();
      console.log(`\n[${hora()}] FUNCIONOU em ${sigla}! Exemplo de resposta:`);
      console.log(JSON.stringify(json.hits?.hits?.[0]?._source ?? json, null, 2));
      console.log('\nAvise a Claude: a API respondeu.');
      process.exit(0);
    }
    console.log(`[${hora()}] ${sigla}: erro ${r.status}. Tentando de novo em ${ESPERA_MIN} min...`);
  } catch (e) {
    console.log(`[${hora()}] ${sigla}: sem resposta (${e.name}). Tentando de novo em ${ESPERA_MIN} min...`);
  }
  await dorme(ESPERA_MIN * 60000);
}
