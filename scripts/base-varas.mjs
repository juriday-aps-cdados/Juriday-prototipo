// Coleta por vara: descobre as varas mais movimentadas do TRF3 e pega cerca de 30 processos de cada uma.
// Uso: npm run base-varas      (leva de 60 a 90 minutos; a API do CNJ falha muito e o script repete sozinho)
// Pode parar com Control + C e rodar de novo: ele continua da vara em que parou.
// Opções (variáveis de ambiente): VARAS=65 (quantas varas), POR_VARA=30 (processos por vara)
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const CHAVE = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const SIGLA = 'trf3';
const QTD_VARAS = Number(process.env.VARAS || 65);
const POR_VARA = Number(process.env.POR_VARA || 30);
const CLASSES = [1116, 7, 156, 120]; // execução fiscal, procedimento comum, cumprimento de sentença, mandado de segurança
const ARQ_BASE = 'docs/dados/base-varas.json';
const ARQ_VARAS = 'docs/dados/varas.json';
const hora = () => new Date().toLocaleTimeString('pt-BR');
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const lerOuNulo = async (a) => { try { return JSON.parse(await readFile(a, 'utf8')); } catch { return null; } };

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
        if (j._shards?.failed) console.log('  parte da API falhou, tentando de novo...');
        else return j;
      } else if (r.status === 400) { return { erro400: true }; }
      else console.log(`  erro ${r.status}. Tentando de novo...`);
    } catch (e) { console.log(`  sem resposta (${e.name}). Tentando de novo...`); }
    await dorme(Math.min(60000, 4000 * 2 ** t));
  }
  return null;
}

const filtroBase = [{ terms: { 'classe.codigo': CLASSES } }, { range: { dataHoraUltimaAtualizacao: { gte: '2026-01-01' } } }];
const mkdirDados = () => mkdir('docs/dados', { recursive: true });

// 1) Descobrir as varas mais movimentadas (uma vez só; fica salvo em varas.json)
let varas = await lerOuNulo(ARQ_VARAS);
if (!varas) {
  console.log(`[${hora()}] Descobrindo as ${QTD_VARAS} varas mais movimentadas do TRF3...`);
  const campos = ['orgaoJulgador.codigo', 'orgaoJulgador.nome.keyword'];
  for (const campo of campos) {
    const j = await pedir({ size: 0, query: { bool: { filter: filtroBase } }, aggs: { varas: { terms: { field: campo, size: 300 } } } });
    const baldes = j?.aggregations?.varas?.buckets;
    if (baldes?.length) {
      varas = { campo, lista: baldes.slice(0, QTD_VARAS).map((b) => ({ chave: b.key, total: b.doc_count, nome: null, feita: false })) };
      break;
    }
    console.log(`  o campo ${campo} não funcionou para agrupar. Tentando outro...`);
  }
  if (!varas) { console.log('Não consegui listar as varas. Avise a Claude e cole esta mensagem.'); process.exit(1); }
  await mkdirDados(); await writeFile(ARQ_VARAS, JSON.stringify(varas, null, 1));
  console.log(`[${hora()}] ${varas.lista.length} varas encontradas (campo ${varas.campo}).`);
}

// 2) Coletar processos de cada vara: metade dos mais recentes e metade dos mais antigos (para misturar ativos e parados)
let base = (await lerOuNulo(ARQ_BASE)) || [];
const tem = new Set(base.map((p) => p.numeroProcesso));
const FONTE = ['numeroProcesso', 'tribunal', 'classe', 'assuntos', 'orgaoJulgador', 'dataAjuizamento', 'nivelSigilo', 'movimentos'];

for (const [i, v] of varas.lista.entries()) {
  if (v.feita) continue;
  console.log(`[${hora()}] Vara ${i + 1}/${varas.lista.length}: ${v.nome || v.chave} (${v.total} processos nos 4 tipos)`);
  let falhou = false;
  for (const ordem of ['desc', 'asc']) {
    const j = await pedir({
      size: Math.ceil(POR_VARA / 2), sort: [{ '@timestamp': { order: ordem } }], _source: FONTE,
      query: { bool: { filter: [...filtroBase, { term: { [varas.campo]: v.chave } }] } },
    });
    if (!j || j.erro400) { falhou = true; console.log('  não consegui esta vara agora; pulo e tento na próxima rodada.'); break; }
    for (const h of j.hits?.hits ?? []) {
      const p = h._source;
      v.nome ||= p?.orgaoJulgador?.nome;
      if (!p?.numeroProcesso || tem.has(p.numeroProcesso) || (p.nivelSigilo ?? 0) > 0) continue;
      tem.add(p.numeroProcesso);
      base.push({
        numeroProcesso: p.numeroProcesso, tribunal: p.tribunal, classe: p.classe,
        assunto: p.assuntos?.[0]?.nome ?? null, orgaoJulgador: p.orgaoJulgador?.nome ?? null,
        varaCodigo: p.orgaoJulgador?.codigo ?? null, dataAjuizamento: p.dataAjuizamento,
        movimentos: (p.movimentos ?? []).map((m) => ({ codigo: m.codigo, nome: m.nome, dataHora: m.dataHora })),
      });
    }
  }
  if (!falhou) v.feita = true;
  await mkdirDados();
  await writeFile(ARQ_BASE, JSON.stringify(base));
  await writeFile(ARQ_VARAS, JSON.stringify(varas, null, 1));
  console.log(`  total até agora: ${base.length} processos`);
}

const pendentes = varas.lista.filter((v) => !v.feita).length;
console.log(`\n[${hora()}] ${pendentes ? 'QUASE PRONTO' : 'PRONTO'}! ${base.length} processos em ${varas.lista.length - pendentes} varas (${ARQ_BASE}).`);
if (pendentes) console.log(`Faltaram ${pendentes} varas por causa da API. Rode "npm run base-varas" de novo para completar.`);
