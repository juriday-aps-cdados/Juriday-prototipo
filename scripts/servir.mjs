// Servidor local simples: abre o site em http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'docs');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer(async (req, res) => {
  try {
    let caminho = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (caminho.endsWith('/')) caminho += 'index.html';
    const arquivo = join(RAIZ, caminho);
    if (!arquivo.startsWith(RAIZ)) throw new Error('fora da pasta');
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(dados);
  } catch {
    res.writeHead(404); res.end('Não encontrado');
  }
}).listen(8080, () => console.log('Juriday no ar: http://localhost:8080'));
