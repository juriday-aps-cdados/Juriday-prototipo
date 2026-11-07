// Junta as três bases (base, base-recentes, base-varas) num arquivo único e leve para o site.
// Mantém só o que a tela usa: número, tipo, vara e as últimas movimentações.
// Uso: npm run compactar  ->  docs/dados/amostra.json
import { readFileSync, writeFileSync } from 'node:fs';

const PASTA = 'docs/dados/';
const MANTER = 8; // movimentações mais recentes guardadas por processo
const vistos = new Map();

for (const arq of ['base-varas.json', 'base-recentes.json', 'base.json']) {
  const lista = JSON.parse(readFileSync(PASTA + arq, 'utf8'));
  for (const p of lista) {
    if (vistos.has(p.numeroProcesso)) continue;
    const movs = [...(p.movimentos || [])].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
    const ultimoDia = movs[0] ? String(movs[0].dataHora).slice(0, 10) : '';
    // guarda as mais recentes e todas do último dia (para reconhecer a "Baixa Definitiva")
    const mantidas = movs.filter((m, i) => i < MANTER || String(m.dataHora).slice(0, 10) === ultimoDia)
      .map((m) => ({ codigo: m.codigo, nome: m.nome, dataHora: m.dataHora }));
    vistos.set(p.numeroProcesso, {
      numeroProcesso: p.numeroProcesso,
      tribunal: p.tribunal,
      classe: { codigo: p.classe?.codigo, nome: p.classe?.nome },
      orgaoJulgador: { nome: typeof p.orgaoJulgador === 'string' ? p.orgaoJulgador : p.orgaoJulgador?.nome },
      movimentos: mantidas,
    });
  }
}
const saida = [...vistos.values()];
writeFileSync(PASTA + 'amostra.json', JSON.stringify(saida));
const kb = Math.round(JSON.stringify(saida).length / 1024);
console.log(`PRONTO! ${saida.length} processos únicos (${kb} KB) em ${PASTA}amostra.json`);
