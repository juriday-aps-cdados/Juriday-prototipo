// Testes da calculadora de prazo. Rode com: npm run testar
import assert from 'node:assert/strict';
import { calcularPrazo, pascoa, feriadosNacionais } from '../docs/prazos.mjs';

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
  const r = calcularPrazo({ publicacao: '2026-12-18', dias: 5 });
  assert.equal(r.inicio, '2027-01-21');
  assert.equal(r.vencimento, '2027-01-27');
  assert.equal(r.recesso, true);
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

let falhas = 0;
for (const [nome, fn] of testes) {
  try { fn(); console.log('ok  ', nome); } catch (e) { falhas++; console.log('FALHOU', nome, '\n     ', e.message); }
}
console.log(falhas ? `\n${falhas} teste(s) falharam.` : `\nTodos os ${testes.length} testes passaram.`);
process.exit(falhas ? 1 : 0);
