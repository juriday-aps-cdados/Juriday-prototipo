// Calcula o "normal" de cada tipo de processo: quantos dias costumam passar entre um dia com andamento e o seguinte.
// Lê as bases (base, base-recentes e base-varas) e grava docs/dados/normal.json.
// Usa só os andamentos dos últimos 12 meses, a mesma janela da análise (npm run analise), para o Termômetro e o Panorama usarem o mesmo normal.
// Uso: npm run normal
import { readFile, writeFile } from 'node:fs/promises';

const ARQUIVOS = ['docs/dados/base.json', 'docs/dados/base-recentes.json', 'docs/dados/base-varas.json'];
const MIN_INTERVALOS = 30; // tipo com menos que isso fica sem referência
const corte = new Date(Date.now() - 365 * 86400000);
const vistos = new Set();
const por = {};
for (const arq of ARQUIVOS) {
  let base = [];
  try { base = JSON.parse(await readFile(arq, 'utf8')); } catch { console.log('não achei', arq); }
  for (const p of base) {
    if (vistos.has(p.numeroProcesso)) continue;
    vistos.add(p.numeroProcesso);
    // vários registros no mesmo dia contam como um só: o que importa é quantos dias passam entre um andamento e o seguinte
    const datas = [...new Set((p.movimentos || []).map((m) => String(m.dataHora).slice(0, 10)))].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().map((d) => new Date(d + 'T00:00:00Z'));
    if (datas.length < 2) continue;
    const k = String(p.classe.codigo);
    let teve = false;
    for (let i = 1; i < datas.length; i++) {
      if (datas[i] < corte) continue; // só intervalos que terminaram nos últimos 12 meses
      por[k] ??= { nome: p.classe.nome, processos: 0, intervalos: [] };
      por[k].intervalos.push((datas[i] - datas[i - 1]) / 86400000);
      teve = true;
    }
    if (teve) por[k].processos++;
  }
}
const perc = (v, q) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
const classes = {};
for (const [k, c] of Object.entries(por)) {
  if (c.intervalos.length < MIN_INTERVALOS) continue;
  const v = c.intervalos.sort((a, b) => a - b);
  classes[k] = { nome: c.nome, processos: c.processos, intervalos: v.length, p50: Math.ceil(perc(v, 0.5)), p75: Math.ceil(perc(v, 0.75)), p90: Math.ceil(perc(v, 0.9)) };
}
await writeFile('docs/dados/normal.json', JSON.stringify({ geradoEm: new Date().toISOString(), classes }, null, 1));
console.log('normal.json gravado:');
for (const [k, c] of Object.entries(classes)) console.log(`  ${c.nome}: ${c.processos} processos, ${c.intervalos} intervalos, metade até ${c.p50}d, 3 de 4 até ${c.p75}d, 9 de 10 até ${c.p90}d`);
