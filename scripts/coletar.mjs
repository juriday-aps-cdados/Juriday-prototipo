// Coleta processos na API pública do DataJud (CNJ) e guarda tudo em arquivos.
// Uso: npm run coletar            (busca só o que ainda não está salvo)
//      npm run coletar -- --refresh   (busca tudo de novo)
//
// A API do CNJ às vezes fica sobrecarregada (erro 429). Por isso o script
// tenta de novo sozinho, esperando mais a cada tentativa, e guarda cada
// resposta boa em site/dados/cache/. Assim a demonstração nunca depende
// da API estar no ar.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Chave pública do CNJ. Ela pode mudar: confira em
// https://datajud-wiki.cnj.jus.br/api-publica/acesso/
const CHAVE = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Justiça (J) + tribunal (TR) do número CNJ -> sigla do endereço da API.
const TRIBUNAIS = {
  '8.26': 'tjsp', '8.07': 'tjdft', '8.19': 'tjrj', '8.13': 'tjmg', '8.21': 'tjrs',
  '4.01': 'trf1', '4.02': 'trf2', '4.03': 'trf3', '4.04': 'trf4', '4.05': 'trf5', '4.06': 'trf6',
  '5.02': 'trt2', '5.03': 'trt3', '5.15': 'trt15',
};

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const soDigitos = (n) => n.replace(/\D/g, '');

function siglaDoTribunal(numero) {
  const d = soDigitos(numero);
  if (d.length !== 20) throw new Error(`Número fora do padrão CNJ: ${numero}`);
  const chave = `${d[13]}.${d.slice(14, 16)}`;
  const sigla = TRIBUNAIS[chave];
  if (!sigla) throw new Error(`Tribunal ${chave} ainda não está na lista (scripts/coletar.mjs)`);
  return sigla;
}

async function consultar(numero) {
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${siglaDoTribunal(numero)}/_search`;
  const corpo = JSON.stringify({ size: 1, query: { match: { numeroProcesso: soDigitos(numero) } } });
  for (let tentativa = 1; tentativa <= 6; tentativa++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `APIKey ${CHAVE}`, 'Content-Type': 'application/json' },
      body: corpo,
    });
    if (r.ok) {
      const json = await r.json();
      const achado = json.hits?.hits?.[0]?._source;
      if (!achado) throw new Error('Processo não encontrado na base pública (pode ser sigiloso)');
      return achado;
    }
    if ([429, 500, 502, 503, 504].includes(r.status)) {
      const espera = Math.min(60000, 2000 * 2 ** tentativa);
      console.log(`  API ocupada (${r.status}). Nova tentativa ${tentativa}/6 em ${espera / 1000}s...`);
      await dorme(espera);
      continue;
    }
    throw new Error(`Erro ${r.status} da API: ${(await r.text()).slice(0, 200)}`);
  }
  throw new Error('API continuou ocupada depois de 6 tentativas. Tente em outro horário.');
}

const refresh = process.argv.includes('--refresh');
const numeros = (await readFile('processos.txt', 'utf8'))
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

if (numeros.length === 0) {
  console.log('Nenhum número em processos.txt. Adicione um por linha e rode de novo.');
  process.exit(0);
}

for (const numero of numeros) {
  const arquivo = `site/dados/cache/${soDigitos(numero)}.json`;
  if (existsSync(arquivo) && !refresh) { console.log(`ok (já salvo): ${numero}`); continue; }
  console.log(`Buscando ${numero}...`);
  try {
    const dados = await consultar(numero);
    await writeFile(arquivo, JSON.stringify(dados, null, 2));
    console.log(`  salvo.`);
  } catch (e) {
    console.log(`  FALHOU: ${e.message}`);
  }
}

// Junta tudo num arquivo só, que o site lê.
const arquivos = (await readdir('site/dados/cache')).filter((f) => f.endsWith('.json'));
const todos = [];
for (const f of arquivos) todos.push(JSON.parse(await readFile(`site/dados/cache/${f}`, 'utf8')));
await writeFile('site/dados/processos.json', JSON.stringify(todos, null, 2));
console.log(`Pronto: ${todos.length} processo(s) em site/dados/processos.json`);
