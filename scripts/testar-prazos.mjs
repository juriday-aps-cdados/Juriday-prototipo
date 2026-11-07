// Testes da calculadora de prazo. Rode com: npm run testar
import assert from 'node:assert/strict';
import { calcularPrazo, pascoa, feriadosNacionais, classificarDia, diasSemExpediente, paraData } from '../docs/prazos.mjs';

const testes = [];
const t = (nome, fn) => testes.push([nome, fn]);
const iso = (d) => d.toISOString().slice(0, 10);

t('Páscoa 2025, 2026 e 2027', () => {
  assert.equal(iso(pascoa(2025)), '2025-04-20');
  assert.equal(iso(pascoa(2026)), '2026-04-05');
  assert.equal(iso(pascoa(2027)), '2027-03-28');
});
t('Sexta-feira Santa 2026 é 03/04', () => {
  assert.equal(feriadosNacionais(2026).get('2026-04-03'), 'Sexta-feira Santa');
});
t('5 dias úteis a partir de quinta 05/11/2026 vencem em 12/11', () => {
  const r = calcularPrazo({ publicacao: '2026-11-05', dias: 5 });
  assert.equal(r.inicio, '2026-11-06');
  assert.equal(r.vencimento, '2026-11-12');
});
t('Consciência Negra (20/11/2026) não conta', () => {
  const r = calcularPrazo({ publicacao: '2026-11-17', dias: 5 });
  assert.equal(r.vencimento, '2026-11-25');
  assert.deepEqual(r.feriados.map((f) => f.data), ['2026-11-20']);
});
t('Prazo em dobro: 5 dias viram 10', () => {
  const r = calcularPrazo({ publicacao: '2026-11-05', dias: 5, dobro: true });
  assert.equal(r.totalDiasUteis, 10);
  assert.equal(r.vencimento, '2026-11-19');
});
t('Recesso forense suspende de 20/12 a 20/01', () => {
  const r = calcularPrazo({ publicacao: '2026-12-18', dias: 5, sp: false });
  assert.equal(r.inicio, '2027-01-21');
  assert.equal(r.vencimento, '2027-01-27');
  assert.equal(r.recesso, true);
  // com os feriados de São Paulo, 25/01 (aniversário da capital) também não conta
  assert.equal(calcularPrazo({ publicacao: '2026-12-18', dias: 5 }).vencimento, '2027-01-28');
});
t('Publicação em sábado: começa na segunda', () => {
  const r = calcularPrazo({ publicacao: '2026-11-07', dias: 1 });
  assert.equal(r.vencimento, '2026-11-09');
});
t('Data inexistente é recusada', () => {
  assert.throws(() => calcularPrazo({ publicacao: '2026-02-31', dias: 5 }));
});
t('Prazo inválido é recusado', () => {
  assert.throws(() => calcularPrazo({ publicacao: '2026-11-05', dias: 0 }));
});
// ---- calendário do TRF3 ----
t('Carnaval 2026 (16 e 17/02) não conta', () => {
  const r = calcularPrazo({ publicacao: '2026-02-13', dias: 2 });
  assert.equal(r.vencimento, '2026-02-19');
  assert.deepEqual(r.feriados.map((f) => f.data), ['2026-02-16', '2026-02-17']);
});
t('Quarta e quinta-feira santas 2026 não contam', () => {
  const r = calcularPrazo({ publicacao: '2026-03-30', dias: 1 });
  // 31/03 conta; o prazo de 1 dia vence em 31/03
  assert.equal(r.vencimento, '2026-03-31');
  const s = calcularPrazo({ publicacao: '2026-03-31', dias: 1 });
  assert.equal(s.vencimento, '2026-04-06');
  assert.deepEqual(s.feriados.map((f) => f.data), ['2026-04-01', '2026-04-02', '2026-04-03']);
});
t('Corpus Christi e ponte de 05/06/2026 não contam', () => {
  const r = calcularPrazo({ publicacao: '2026-06-03', dias: 1 });
  assert.equal(r.vencimento, '2026-06-08');
});
t('Dia da Justiça (08/12/2026) não conta', () => {
  const r = calcularPrazo({ publicacao: '2026-12-07', dias: 1 });
  assert.equal(r.vencimento, '2026-12-09');
});
t('Dia do Servidor (30/10/2026) e Finados (02/11) não contam', () => {
  const r = calcularPrazo({ publicacao: '2026-10-29', dias: 1 });
  assert.equal(r.vencimento, '2026-11-03');
});
t('11 de agosto de 2026 não conta', () => {
  const r = calcularPrazo({ publicacao: '2026-08-10', dias: 1 });
  assert.equal(r.vencimento, '2026-08-12');
});
t('Feriados de São Paulo (09/07) entram ou saem pela opção', () => {
  assert.equal(calcularPrazo({ publicacao: '2026-07-08', dias: 1, sp: true }).vencimento, '2026-07-10');
  assert.equal(calcularPrazo({ publicacao: '2026-07-08', dias: 1, sp: false }).vencimento, '2026-07-09');
});
t('Cada dia da linha do tempo tem tipo e a contagem vai de 1 ao total', () => {
  const r = calcularPrazo({ publicacao: '2026-11-06', dias: 15 });
  const ok = r.linha.filter((l) => l.tipo === 'ok');
  assert.equal(ok.length, 15);
  assert.equal(ok[14].n, 15);
  assert.equal(r.linha[r.linha.length - 1].data, r.vencimento);
});
t('Lista de dias sem expediente de 2026 está em ordem e tem 30/10', () => {
  const l = diasSemExpediente(2026);
  assert.ok(l.some((x) => x.data === '2026-10-30'));
  assert.deepEqual(l.map((x) => x.data), [...l.map((x) => x.data)].sort());
});
t('Aviso de expediente às 14h em 18/02/2026 não tira o dia da contagem', () => {
  const c = classificarDia(paraData('2026-02-18'));
  assert.equal(c.tipo, 'ok');
  assert.ok(c.aviso);
});

let falhas = 0;
for (const [nome, fn] of testes) {
  try { fn(); console.log('ok  ', nome); } catch (e) { falhas++; console.log('FALHOU', nome, '\n     ', e.message); }
}
console.log(falhas ? `\n${falhas} teste(s) falharam.` : `\nTodos os ${testes.length} testes passaram.`);
process.exit(falhas ? 1 : 0);
