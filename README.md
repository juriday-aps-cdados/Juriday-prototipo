# Juriday

Monitor de carteira processual com dados públicos do DataJud (CNJ).
Projeto acadêmico: Ciência de Dados Aplicada ao Direito I, Insper, 2026/2. Produto fictício da LawTech.

> Status: protótipo em construção.

## O que já funciona
- Lista processos com a última movimentação e quantos dias estão parados.
- Gera alerta com o motivo quando o processo passa de 30 dias sem movimentação.
- Funciona com dados de demonstração (fictícios) ou com dados reais coletados do DataJud.

## Como rodar
1. Instale o Node.js (versão LTS).
2. No terminal, dentro desta pasta: `npm run site`
3. Abra http://localhost:8080

## Como coletar processos reais
1. Escreva os números (formato CNJ) em `processos.txt`, um por linha.
2. Rode `npm run coletar`. A API do CNJ às vezes fica sobrecarregada; o script tenta de novo sozinho e guarda cada resposta em `site/dados/cache/`.

## O que o Juriday não faz
- Não substitui a análise jurídica nem decide pelo advogado.
- Usa só dados públicos (metadados e movimentações); não acessa documentos dos autos nem processos sigilosos.

## Estrutura
- `site/`: o site (HTML) e os dados que ele lê
- `scripts/coletar.mjs`: busca processos na API pública do DataJud
- `scripts/servir.mjs`: abre o site no seu computador
