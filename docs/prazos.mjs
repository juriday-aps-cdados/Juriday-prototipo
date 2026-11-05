// Cálculo de prazo processual em dias úteis.
// Premissas (CPC, arts. 219, 220 e 224):
//  - só contam dias úteis (sem sábado, domingo, feriado nacional);
//  - não se conta o dia da publicação; a contagem começa no primeiro dia útil seguinte;
//  - o dia do vencimento é incluído;
//  - de 20/12 a 20/01 os prazos ficam suspensos (recesso forense).
// NÃO considera: feriados estaduais ou municipais, suspensões decretadas por tribunais,
// indisponibilidade do sistema, nem prazos em dias corridos. O advogado confere sempre.

const UM_DIA = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const soma = (d, n) => new Date(d.getTime() + n * UM_DIA);

export function paraData(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new Error('Data inválida: use o formato AAAA-MM-DD');
  const [a, m, d] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if (iso(data) !== texto) throw new Error('Essa data não existe no calendário');
  return data;
}

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
export function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const cacheFeriados = new Map();
export function feriadosNacionais(ano) {
  if (cacheFeriados.has(ano)) return cacheFeriados.get(ano);
  const f = new Map();
  const fixo = (m, d, nome) => f.set(iso(new Date(Date.UTC(ano, m - 1, d))), nome);
  fixo(1, 1, 'Confraternização Universal');
  fixo(4, 21, 'Tiradentes');
  fixo(5, 1, 'Dia do Trabalho');
  fixo(9, 7, 'Independência');
  fixo(10, 12, 'Nossa Senhora Aparecida');
  fixo(11, 2, 'Finados');
  fixo(11, 15, 'Proclamação da República');
  if (ano >= 2024) fixo(11, 20, 'Consciência Negra');
  fixo(12, 25, 'Natal');
  f.set(iso(soma(pascoa(ano), -2)), 'Sexta-feira Santa');
  cacheFeriados.set(ano, f);
  return f;
}

export function emRecesso(d) {
  const m = d.getUTCMonth() + 1, dia = d.getUTCDate();
  return (m === 12 && dia >= 20) || (m === 1 && dia <= 20);
}

// Devolve o motivo de o dia não contar, ou null se for dia útil.
export function motivoNaoContar(d) {
  const dow = d.getUTCDay();
  if (dow === 0) return 'domingo';
  if (dow === 6) return 'sábado';
  if (emRecesso(d)) return 'recesso forense';
  const feriado = feriadosNacionais(d.getUTCFullYear()).get(iso(d));
  return feriado ? 'feriado: ' + feriado : null;
}

// publicacao: 'AAAA-MM-DD'; dias: prazo em dias úteis; dobro: prazo em dobro (CPC, arts. 180, 183 e 186).
export function calcularPrazo({ publicacao, dias, dobro = false }) {
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error('O prazo deve ser um número de 1 a 365 dias');
  const total = dobro ? dias * 2 : dias;
  let atual = paraData(publicacao);
  let contados = 0, inicio = null, recesso = false, fimDeSemana = 0;
  const feriados = [];
  while (contados < total) {
    atual = soma(atual, 1);
    const motivo = motivoNaoContar(atual);
    if (motivo === 'sábado' || motivo === 'domingo') { fimDeSemana++; continue; }
    if (motivo === 'recesso forense') { recesso = true; continue; }
    if (motivo) { feriados.push({ data: iso(atual), motivo }); continue; }
    contados++;
    if (!inicio) inicio = iso(atual);
  }
  return { publicacao, inicio, vencimento: iso(atual), totalDiasUteis: total, feriados, recesso, fimDeSemana };
}
