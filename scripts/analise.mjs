// Gera os números da aba de Análise (docs/dados/analise.json) a partir das bases coletadas.
// Olha só os andamentos dos últimos 12 meses ("padrão atual") e compara cada vara com o normal do tipo de processo.
// Uso: npm run analise   (rode depois de "npm run normal")
import { readFile, writeFile } from 'node:fs/promises';

const ARQUIVOS = ['docs/dados/base.json', 'docs/dados/base-recentes.json', 'docs/dados/base-varas.json'];
const MIN_INTERVALOS = 30; // vara com menos que isso não entra na comparação
const hoje = new Date();
const corte = new Date(hoje.getTime() - 365 * 86400000);
const normal = JSON.parse(await readFile('docs/dados/normal.json', 'utf8')).classes;

const vistos = new Set();
const tipos = {}; // classe -> intervalos dos últimos 12 meses
const varas = {}; // vara -> { processos, intervalos[], longos, classes }
let totalProcessos = 0;

for (const arq of ARQUIVOS) {
  let base = [];
  try { base = JSON.parse(await readFile(arq, 'utf8')); } catch { continue; }
  for (const p of base) {
    if (vistos.has(p.numeroProcesso)) continue;
    vistos.add(p.numeroProcesso);
    totalProcessos++;
    const n = normal[String(p.classe?.codigo)];
    const dias = [...new Set((p.movimentos || []).map((m) => String(m.dataHora).slice(0, 10)))].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().map((d) => new Date(d + 'T00:00:00Z'));
    let teve = false;
    for (let i = 1; i < dias.length; i++) {
      if (dias[i] < corte) continue; // só intervalos que terminaram nos últimos 12 meses
      const iv = (dias[i] - dias[i - 1]) / 86400000;
      const t = (tipos[p.classe.codigo] ??= { nome: p.classe.nome, intervalos: [], processos: new Set() });
      t.intervalos.push(iv); t.processos.add(p.numeroProcesso);
      if (p.orgaoJulgador) {
        const v = (varas[p.orgaoJulgador] ??= { nome: p.orgaoJulgador, processos: new Set(), intervalos: 0, longos: 0, soma: [], lista: [], classes: {} });
        v.processos.add(p.numeroProcesso); v.intervalos++; v.soma.push(iv); v.lista.push([p.classe.codigo, iv]);
        v.classes[p.classe.nome] = (v.classes[p.classe.nome] || 0) + 1;
      }
      teve = true;
    }
  }
}
const perc = (v, q) => { v = [...v].sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(q * v.length))] : null; };

const tiposOut = Object.entries(tipos).map(([cod, t]) => ({
  codigo: Number(cod), nome: t.nome, processos: t.processos.size, intervalos: t.intervalos.length,
  p50: Math.ceil(perc(t.intervalos, .5)), p75: Math.ceil(perc(t.intervalos, .75)), p90: Math.ceil(perc(t.intervalos, .9)),
})).sort((a, b) => b.intervalos - a.intervalos);

// "intervalo longo" = maior que o 75º percentil do mesmo tipo de processo nos últimos 12 meses (por construção, 25% no total)
const p75Tipo = Object.fromEntries(tiposOut.map((t) => [t.codigo, t.p75]));
for (const v of Object.values(varas)) v.longos = v.lista.filter(([cod, iv]) => iv > p75Tipo[cod]).length;
const varasOut = Object.values(varas).filter((v) => v.intervalos >= MIN_INTERVALOS).map((v) => ({
  nome: v.nome, processos: v.processos.size, intervalos: v.intervalos,
  pctLongos: +(100 * v.longos / v.intervalos).toFixed(1), mediana: +perc(v.soma, .5).toFixed(1),
  tipoPrincipal: Object.entries(v.classes).sort((a, b) => b[1] - a[1])[0][0],
})).sort((a, b) => b.pctLongos - a.pctLongos);

const saida = {
  geradoEm: hoje.toISOString(), janela: 'últimos 12 meses', totalProcessos,
  totalIntervalos: tiposOut.reduce((s, t) => s + t.intervalos, 0), minIntervalos: MIN_INTERVALOS,
  esperado: 25, tipos: tiposOut, varas: varasOut,
};
await writeFile('docs/dados/analise.json', JSON.stringify(saida, null, 1));
console.log(`analise.json gravado: ${totalProcessos} processos, ${saida.totalIntervalos} intervalos, ${varasOut.length} varas comparáveis.`);
console.log('Tipos (últimos 12 meses):'); for (const t of tiposOut) console.log(`  ${t.nome}: ${t.processos} proc., ${t.intervalos} intervalos, 50%=${t.p50}d, 75%=${t.p75}d, 90%=${t.p90}d`);
console.log('Varas com mais intervalos longos (esperado: 25%):'); varasOut.slice(0, 5).forEach((v) => console.log(`  ${v.pctLongos}%  ${v.nome.slice(0, 62)} [${v.tipoPrincipal}]`));
console.log('Varas com menos:'); varasOut.slice(-5).forEach((v) => console.log(`  ${v.pctLongos}%  ${v.nome.slice(0, 62)} [${v.tipoPrincipal}]`));
