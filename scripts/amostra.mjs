// Busca alguns processos reais e públicos no DataJud e escreve os números em processos.txt.
// Uso: npm run amostra   (pode demorar: a API do CNJ falha muito e o script tenta de novo sozinho)
import { writeFile } from 'node:fs/promises';

const CHAVE = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const TRIBUNAIS = ['tjdft', 'tjsp', 'trf3', 'trt2'];
const QUANTOS = 5;
const hora = () => new Date().toLocaleTimeString('pt-BR');
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const formata = (n) => `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n[13]}.${n.slice(14, 16)}.${n.slice(16)}`;

for (let i = 0; i < 40; i++) {
  const sigla = TRIBUNAIS[i % TRIBUNAIS.length];
  try {
    const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${sigla}/_search`, {
      method: 'POST',
      headers: { Authorization: `APIKey ${CHAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: QUANTOS,
        _source: ['numeroProcesso', 'tribunal', 'classe', 'orgaoJulgador'],
        query: { range: { dataHoraUltimaAtualizacao: { gte: '2026-10-01' } } },
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (r.ok) {
      const json = await r.json();
      const achados = (json.hits?.hits ?? []).map((h) => h._source?.numeroProcesso).filter((n) => /^\d{20}$/.test(n ?? ''));
      if (achados.length) {
        const linhas = [
          `# Processos reais e públicos sorteados no DataJud (${sigla}) em ${new Date().toLocaleDateString('pt-BR')}.`,
          '# Um por linha. Linhas com # são ignoradas.',
          ...achados.map(formata),
        ];
        await writeFile('processos.txt', linhas.join('\n') + '\n');
        console.log(`\n[${hora()}] PRONTO! ${achados.length} processos de ${sigla} gravados em processos.txt:`);
        achados.forEach((n) => console.log('  ' + formata(n)));
        process.exit(0);
      }
      console.log(`[${hora()}] ${sigla}: respondeu, mas sem processos (API sobrecarregada). Tentando de novo...`);
    } else console.log(`[${hora()}] ${sigla}: erro ${r.status}. Tentando de novo...`);
  } catch (e) {
    console.log(`[${hora()}] ${sigla}: sem resposta (${e.name}). Tentando de novo...`);
  }
  await dorme(60000);
}
console.log('Não consegui depois de 40 tentativas. Avise a Claude.');
