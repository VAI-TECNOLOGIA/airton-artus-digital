// Converte os .md desta pasta nas páginas públicas de frontend/public/legal/.
// Uso: node docs/legal/build-html.mjs  (na raiz do repo; requer `npx marked` disponível)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'frontend', 'public', 'legal');

const PAGES = [
  { md: 'politica-de-privacidade.md', title: 'Política de Privacidade' },
  { md: 'termos-de-uso.md', title: 'Termos de Uso' },
  { md: 'excluir-conta.md', title: 'Como excluir sua conta' },
  { md: 'excluir-dados.md', title: 'Excluir dados específicos' },
];

const NAV = [
  ['politica-de-privacidade.html', 'Privacidade'],
  ['termos-de-uso.html', 'Termos de Uso'],
  ['excluir-conta.html', 'Excluir conta'],
  ['excluir-dados.html', 'Excluir dados'],
];

const CSS = `
  :root { --navy:#1B1D39; --gold:#E8AF3C; --green:#398254; --red:#BD2E2F; --ink:#23253f; --muted:#6b6d85; }
  * { box-sizing:border-box; }
  body { margin:0; font:16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:var(--ink); background:#f7f7fa; }
  .tricolor { height:6px; background:linear-gradient(90deg, var(--green) 0 33.3%, var(--red) 33.3% 66.6%, var(--gold) 66.6% 100%); }
  header { background:var(--navy); color:#fff; padding:28px 20px 22px; }
  header .wrap { max-width:820px; margin:0 auto; }
  header .brand { font-family:Anton, "Arial Narrow", Impact, sans-serif; letter-spacing:.04em; text-transform:uppercase; color:var(--gold); font-size:14px; }
  header h1 { margin:6px 0 0; font-family:Anton, "Arial Narrow", Impact, sans-serif; font-weight:400; letter-spacing:.02em; font-size:clamp(26px,4.5vw,38px); text-transform:uppercase; }
  nav { background:#22254a; }
  nav .wrap { max-width:820px; margin:0 auto; padding:0 20px; display:flex; gap:18px; flex-wrap:wrap; }
  nav a { color:#cfd1e4; text-decoration:none; font-size:13.5px; padding:10px 0; border-bottom:2px solid transparent; }
  nav a.active, nav a:hover { color:var(--gold); border-bottom-color:var(--gold); }
  main { max-width:820px; margin:0 auto; padding:32px 20px 64px; }
  main h2 { color:var(--navy); font-size:21px; margin:36px 0 10px; }
  main h3 { color:var(--navy); font-size:17px; margin:26px 0 8px; }
  main a { color:var(--red); }
  main blockquote { margin:18px 0; padding:12px 16px; background:#fdf5e3; border-left:4px solid var(--gold); border-radius:0 8px 8px 0; }
  main blockquote p { margin:0; }
  table { border-collapse:collapse; width:100%; margin:14px 0; font-size:14.5px; background:#fff; }
  th, td { border:1px solid #e3e4ee; padding:9px 12px; text-align:left; vertical-align:top; }
  th { background:var(--navy); color:#fff; font-weight:600; }
  tr:nth-child(even) td { background:#fafafd; }
  hr { border:none; border-top:1px solid #e3e4ee; margin:32px 0; }
  footer { background:var(--navy); color:#cfd1e4; font-size:13px; padding:22px 20px; }
  footer .wrap { max-width:820px; margin:0 auto; }
  footer a { color:var(--gold); }
  @media print { nav, .tricolor { display:none; } header { padding:16px 0; } body { background:#fff; } }
`;

for (const { md, title } of PAGES) {
  const src = readFileSync(join(here, md), 'utf8')
    // remove o H1 do md (o template já tem <h1>)
    .replace(/^# .*\n/, '');
  const body = execFileSync('npx', ['--yes', 'marked', '--gfm'], { input: src, encoding: 'utf8' });
  const htmlName = md.replace(/\.md$/, '.html');
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === htmlName ? ' class="active"' : ''}>${label}</a>`).join('\n      ');
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow">
<title>${title} — Airton Artus Digital</title>
<meta name="description" content="${title} do aplicativo Airton Artus Digital — plataforma oficial da pré-campanha de Airton Artus.">
<link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
  <div class="tricolor"></div>
  <header>
    <div class="wrap">
      <div class="brand">Airton Artus Digital</div>
      <h1>${title}</h1>
    </div>
  </header>
  <nav>
    <div class="wrap">
      ${nav}
    </div>
  </nav>
  <main>
${body}  </main>
  <footer>
    <div class="wrap">
      Airton Artus Digital — plataforma oficial da pré-campanha. ·
      <a href="politica-de-privacidade.html">Política de Privacidade</a> ·
      <a href="termos-de-uso.html">Termos de Uso</a> ·
      <a href="mailto:privacidade@airtonartus.com.br">privacidade@airtonartus.com.br</a>
    </div>
  </footer>
</body>
</html>
`;
  writeFileSync(join(outDir, htmlName), html);
  console.log('✓', htmlName);
}
