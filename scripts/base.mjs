// Monta uma base maior de processos reais e públicos (TRF3) para o Termômetro.
// Uso: npm run base   (demora; a API do CNJ falha muito, então o script repete e guarda o progresso)
// Pode ser interrompido (Control + C) e rodado de novo: ele continua de onde parou.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const CHAVE = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const SIGLA = 'trf3';
const POR_CLASSE = Number(process.env.POR_CLASSE || 75);
const CLASSES = { 1116: 'Execução Fiscal', 7: 'Procedimento Comum Cível', 156: 'Cumprimento de Sentença', 120: 'Mandado de Segurança Cível' };
const RECENTES = process.env.RECENTES === '1'; // 1 = só processos mexidos nas últimas semanas
const ARQ = RECENTES ? 'docs/dados/base-recentes.json' : 'docs/dados/base.json';
const hora = () => new Date().toLocaleTimeString('pt-BR');
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

let base = [];
try { base = JSON.parse(await readFile(ARQ, 'utf8')); } catch {}
const tem = new Set(base.map((p) => p.numeroProcesso));
const contar = (cod) => base.filter((p) => String(p.classe?.codigo) === String(cod)).length;
const salvar = async () => { await mkdir('docs/dados', { recursive: true }); await writeFile(ARQ, JSON.stringify(base)); };

async function pedir(corpo) {
  for (let t = 0; t < 8; t++) {
    try {
      const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${SIGLA}/_search`, {
        method: 'POST',
        headers: { Authorization: `APIKey ${CHAVE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(120000),
      });
      if (r.ok) {
        const j = await r.json();
        if (j._shards?.failed) { console.log(`  parte da API falhou, tentando de novo...`); }
        else return j.hits?.hits ?? [];
      } else console.log(`  erro ${r.status}. Tentando de novo...`);
    } catch (e) { console.log(`  sem resposta (${e.name}). Tentando de novo...`); }
    await dorme(Math.min(60000, 4000 * 2 ** t));
  }
  return null;
}

for (const [cod, nome] of Object.entries(CLASSES)) {
  let depois;
  while (contar(cod) < POR_CLASSE) {
    console.log(`[${hora()}] ${nome}: ${contar(cod)}/${POR_CLASSE}`);
    const corpo = {
      size: 25,
      sort: [{ '@timestamp': { order: RECENTES ? 'desc' : 'asc' } }],
      _source: ['numeroProcesso', 'tribunal', 'classe', 'assuntos', 'orgaoJulgador', 'dataAjuizamento', 'nivelSigilo', 'movimentos'],
      query: { bool: { filter: [{ term: { 'classe.codigo': Number(cod) } }, { range: { dataHoraUltimaAtualizacao: { gte: RECENTES ? '2026-10-15' : '2026-01-01' } } }] } },
    };
    if (depois) corpo.search_after = depois;
    const hits = await pedir(corpo);
    if (!hits) { console.log('  desisti desta classe por agora. Rode de novo mais tarde.'); break; }
    if (!hits.length) break;
    depois = hits[hits.length - 1].sort;
    for (const h of hits) {
      const p = h._source;
      if (!p?.numeroProcesso || tem.has(p.numeroProcesso) || (p.nivelSigilo ?? 0) > 0) continue;
      tem.add(p.numeroProcesso);
      base.push({
        numeroProcesso: p.numeroProcesso, tribunal: p.tribunal, classe: p.classe,
        assunto: p.assuntos?.[0]?.nome ?? null, orgaoJulgador: p.orgaoJulgador?.nome ?? null,
        dataAjuizamento: p.dataAjuizamento,
        movimentos: (p.movimentos ?? []).map((m) => ({ codigo: m.codigo, nome: m.nome, dataHora: m.dataHora })),
      });
    }
    await salvar();
  }
}
console.log(`\n[${hora()}] PRONTO! ${base.length} processos em ${ARQ}:`);
for (const [cod, nome] of Object.entries(CLASSES)) console.log(`  ${nome}: ${contar(cod)}`);
