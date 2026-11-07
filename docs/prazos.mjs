// Cálculo de prazo processual em dias úteis, com o calendário da Justiça Federal da 3ª Região (TRF3).
// Premissas (CPC, arts. 216, 219, 220 e 224):
//  - só contam dias úteis: sem sábado, domingo, feriado nacional nem dia sem expediente forense;
//  - não se conta o dia da publicação; a contagem começa no primeiro dia útil seguinte;
//  - o dia do vencimento é incluído;
//  - de 20/12 a 20/01 os prazos ficam suspensos (recesso forense).
// Calendário do TRF3: conferido para 2026 (calendário oficial atualizado em 25/06/2026).
// Para outros anos usamos só as datas previstas em lei e as móveis (Carnaval, Semana Santa, Corpus Christi).
// NÃO considera: feriados de outros municípios, suspensões decretadas depois do calendário,
// indisponibilidade do sistema, nem prazos em dias corridos. O advogado confere sempre.

const UM_DIA = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const soma = (d, n) => new Date(d.getTime() + n * UM_DIA);

export const ANO_CONFERIDO = 2026;
export const FONTE_CALENDARIO = 'Calendário de feriados do TRF3 para 2026, atualizado em 25/06/2026';
export const CATEGORIAS = {
  nacional: 'feriado nacional',
  forense: 'feriado forense (Lei 5.010/66, art. 62, e calendário do TRF3)',
  portaria: 'sem expediente por portaria do TRF3',
  sp: 'feriado em São Paulo (capital)',
};

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

// Dias sem expediente na Justiça Federal da 3ª Região, além dos feriados nacionais.
// Mapa: data -> { nome, categoria, fonte }.
const cacheTRF3 = new Map();
export function feriadosTRF3(ano) {
  if (cacheTRF3.has(ano)) return cacheTRF3.get(ano);
  const f = new Map();
  const add = (data, nome, categoria, fonte) => f.set(iso(data), { nome, categoria, fonte });
  const fixo = (m, d, nome, categoria, fonte) => add(new Date(Date.UTC(ano, m - 1, d)), nome, categoria, fonte);
  const p = pascoa(ano);
  const LEI = 'Lei 5.010/66, art. 62';
  add(soma(p, -48), 'Carnaval (segunda-feira)', 'forense', LEI);
  add(soma(p, -47), 'Carnaval (terça-feira)', 'forense', LEI);
  add(soma(p, -4), 'Quarta-feira Santa', 'forense', LEI);
  add(soma(p, -3), 'Quinta-feira Santa', 'forense', LEI);
  add(soma(p, 60), 'Corpus Christi', 'forense', 'Calendário do TRF3');
  fixo(8, 11, 'Dia do Advogado e da Justiça Federal (11/08)', 'forense', LEI);
  fixo(12, 8, 'Dia da Justiça', 'forense', LEI);
  if (ano === 2026) {
    fixo(4, 20, 'Sem expediente (ponte do feriado de Tiradentes)', 'portaria', 'Portaria CATRF3R nº 48/2025');
    fixo(6, 5, 'Sem expediente (ponte do feriado de Corpus Christi)', 'portaria', 'Portaria CATRF3R nº 48/2025');
    fixo(10, 30, 'Dia do Servidor Público (transferido de 28/10)', 'portaria', 'Calendário do TRF3');
  }
  cacheTRF3.set(ano, f);
  return f;
}

// Dias em que o expediente muda, mas o prazo segue contando. Servem de aviso.
export function avisosTRF3(ano) {
  const a = new Map();
  if (ano === 2026) {
    a.set('2026-02-18', 'Expediente começa às 14h (calendário do TRF3).');
    a.set('2026-06-24', 'Jogo da Seleção: expediente alterado (Portaria nº 56/2026).');
    a.set('2026-06-29', 'Jogo da Seleção: expediente alterado (Portaria nº 57/2026).');
  }
  return a;
}

// Feriados de São Paulo que constam no calendário do TRF3.
export function feriadosSP(ano) {
  return new Map([
    [`${ano}-01-25`, { nome: 'Aniversário da cidade de São Paulo', categoria: 'sp', fonte: 'Calendário do TRF3' }],
    [`${ano}-07-09`, { nome: 'Revolução Constitucionalista', categoria: 'sp', fonte: 'Calendário do TRF3' }],
  ]);
}

export function emRecesso(d) {
  const m = d.getUTCMonth() + 1, dia = d.getUTCDate();
  return (m === 12 && dia >= 20) || (m === 1 && dia <= 20);
}

// Classifica um dia: { tipo: 'ok'|'fds'|'fer'|'rec', nome, categoria, fonte, aviso }
export function classificarDia(d, { sp = true } = {}) {
  const k = iso(d), ano = d.getUTCFullYear(), dow = d.getUTCDay();
  const aviso = avisosTRF3(ano).get(k) || null;
  if (dow === 0) return { tipo: 'fds', nome: 'domingo', aviso };
  if (dow === 6) return { tipo: 'fds', nome: 'sábado', aviso };
  if (emRecesso(d)) return { tipo: 'rec', nome: 'recesso forense (20/12 a 20/01)', categoria: 'forense', fonte: 'CPC, art. 220', aviso };
  const nac = feriadosNacionais(ano).get(k);
  if (nac) return { tipo: 'fer', nome: nac, categoria: 'nacional', fonte: 'Lei federal', aviso };
  const trf = feriadosTRF3(ano).get(k);
  if (trf) return { tipo: 'fer', ...trf, aviso };
  if (sp) {
    const s = feriadosSP(ano).get(k);
    if (s) return { tipo: 'fer', ...s, aviso };
  }
  return { tipo: 'ok', aviso };
}

// Lista de dias sem expediente de um ano (para mostrar na tela), em ordem de data.
export function diasSemExpediente(ano, { sp = true } = {}) {
  const l = [];
  for (const [data, nome] of feriadosNacionais(ano)) l.push({ data, nome, categoria: 'nacional', fonte: 'Lei federal' });
  for (const [data, v] of feriadosTRF3(ano)) l.push({ data, ...v });
  if (sp) for (const [data, v] of feriadosSP(ano)) l.push({ data, ...v });
  return l.sort((a, b) => a.data.localeCompare(b.data));
}

// Compatível com a versão anterior: devolve o motivo de o dia não contar, ou null se for dia útil.
export function motivoNaoContar(d, opts) {
  const c = classificarDia(d, opts);
  if (c.tipo === 'ok') return null;
  if (c.tipo === 'fds') return c.nome;
  if (c.tipo === 'rec') return 'recesso forense';
  return 'feriado: ' + c.nome;
}

// publicacao: 'AAAA-MM-DD'; dias: prazo em dias úteis; dobro: prazo em dobro (CPC, arts. 180, 183 e 186).
export function calcularPrazo({ publicacao, dias, dobro = false, sp = true }) {
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error('O prazo deve ser um número de 1 a 365 dias');
  const total = dobro ? dias * 2 : dias;
  let atual = paraData(publicacao);
  let contados = 0, inicio = null, recesso = false, fimDeSemana = 0;
  const feriados = [], linha = [], avisos = [];
  while (contados < total) {
    atual = soma(atual, 1);
    const c = classificarDia(atual, { sp }), k = iso(atual);
    if (c.tipo === 'fds') { fimDeSemana++; linha.push({ data: k, tipo: 'fds', nome: c.nome }); continue; }
    if (c.tipo === 'rec') { recesso = true; linha.push({ data: k, tipo: 'rec', nome: c.nome }); continue; }
    if (c.tipo === 'fer') {
      feriados.push({ data: k, motivo: 'feriado: ' + c.nome, nome: c.nome, categoria: c.categoria, fonte: c.fonte });
      linha.push({ data: k, tipo: 'fer', nome: c.nome, categoria: c.categoria, fonte: c.fonte });
      continue;
    }
    contados++;
    if (!inicio) inicio = k;
    if (c.aviso) avisos.push({ data: k, texto: c.aviso });
    linha.push({ data: k, tipo: 'ok', n: contados, aviso: c.aviso });
  }
  return { publicacao, inicio, vencimento: iso(atual), totalDiasUteis: total, feriados, recesso, fimDeSemana, linha, avisos, anoConferido: ANO_CONFERIDO };
}
