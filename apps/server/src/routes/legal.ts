import type { FastifyInstance } from "fastify";

function renderLegalPage(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — z-notes</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f5f5f0;
      --card: #ffffff;
      --border: #e3e9ec;
      --text: #263238;
      --muted: #546e7a;
      --accent: #ffc107;
      --link: inherit;
      --code-bg: #eef1f2;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1c1c1e;
        --card: #303032;
        --border: #414144;
        --text: #eceff1;
        --muted: #b0bec5;
        --accent: #ffc107;
        --link: #ffc107;
        --code-bg: #28282a;
      }
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      background: var(--bg);
      color: var(--text);
    }
    main { max-width: 760px; margin: 0 auto; padding: 32px 20px 56px; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
    }
    h1 { margin: 0 0 8px; font-size: 1.75rem; line-height: 1.25; }
    h2 { margin: 24px 0 8px; font-size: 1.15rem; }
    p, li { font-size: 0.96rem; }
    ul, ol { padding-left: 20px; }
    code { padding: 0.1em 0.35em; border-radius: 4px; background: var(--code-bg); font-size: 0.9em; }
    .muted { color: var(--muted); font-size: 0.88rem; }
    a {
      color: var(--link);
      text-decoration: underline;
      text-decoration-color: var(--accent);
      text-underline-offset: 3px;
    }
    nav { margin-bottom: 20px; font-size: 0.9rem; display: flex; gap: 16px; flex-wrap: wrap; }
  </style>
</head>
<body>
  <main>
    <nav>
      <a href="/">← Voltar ao z-notes</a>
      <a href="/privacidade">Política de Privacidade</a>
      <a href="/excluir-conta">Excluir conta</a>
    </nav>
    <article class="card">
      ${bodyHtml}
    </article>
  </main>
</body>
</html>`;
}

const PRIVACY_HTML = renderLegalPage(
  "Política de Privacidade",
  `<h1>Política de Privacidade — z-notes</h1>
<p class="muted">Última atualização: 25 de novembro de 2026</p>

<p>O <strong>z-notes</strong> é um aplicativo de notas em Markdown desenvolvido e operado por <strong>Ziltro (Guilherme Nascimento)</strong>. Esta política descreve quais dados coletamos, como os utilizamos e como você pode exercer seus direitos previstos na LGPD (Lei nº 13.709/2018).</p>

<h2>1. Dados coletados</h2>
<ul>
  <li><strong>Conta Google (OAuth 2.0):</strong> identificador único da conta Google (<code>sub</code>), endereço de e-mail, nome e foto de perfil fornecidos no login.</li>
  <li><strong>Conteúdo do usuário:</strong> notas em Markdown, títulos, pastas, subpastas, marcações de fixação, arquivo e lixeira criados por você no aplicativo.</li>
  <li><strong>Dados técnicos mínimos:</strong> sessão autenticada (cookie <code>HttpOnly</code> na web ou token seguro no dispositivo) e cache local offline para permitir uso sem internet.</li>
</ul>

<h2>2. Finalidade do uso</h2>
<p>Os dados são usados exclusivamente para autenticar sua conta, armazenar e sincronizar suas notas entre seus dispositivos (web, Android e desktop) e oferecer busca e exportação em Markdown.</p>
<p>O z-notes <strong>não exibe anúncios</strong>, <strong>não vende dados pessoais</strong> e <strong>não compartilha suas notas com terceiros</strong>.</p>

<h2>3. Armazenamento, isolamento e segurança</h2>
<ul>
  <li>Cada conta é isolada logicamente por identificador de usuário (<code>user_id</code>) no banco de dados e em diretório separado no espelho Markdown.</li>
  <li>Toda comunicação entre o aplicativo e o servidor ocorre por conexão criptografada (HTTPS).</li>
  <li>Snapshots automáticos de backup são mantidos com retenção limitada exclusivamente para recuperação de desastres.</li>
</ul>

<h2>4. Exclusão de conta e dados</h2>
<p>Você pode excluir sua conta e todos os seus dados a qualquer momento diretamente dentro do aplicativo (Web, Desktop ou Android) ou seguindo as instruções na página <a href="/excluir-conta">/excluir-conta</a>.</p>

<h2>5. Contato do controlador</h2>
<p>Para dúvidas, solicitações de privacidade ou suporte, entre em contato pelo e-mail <a href="mailto:gui.liznas@gmail.com">gui.liznas@gmail.com</a>.</p>`,
);

const DELETE_ACCOUNT_HTML = renderLegalPage(
  "Excluir conta",
  `<h1>Exclusão de conta e dados — z-notes</h1>
<p class="muted">Última atualização: 25 de novembro de 2026</p>

<p>Você pode excluir sua conta do <strong>z-notes</strong> e todos os dados associados a qualquer momento, de forma imediata e irreversível.</p>

<h2>Como excluir diretamente no aplicativo</h2>
<ol>
  <li>Abra o <strong>z-notes</strong> (no aplicativo Android, Desktop ou em <a href="/">notes.o.ziltro.dev</a>) e entre com sua conta Google.</li>
  <li>Abra o menu de <strong>Configurações</strong>.</li>
  <li>Na seção de conta, toque ou clique em <strong>Excluir minha conta</strong> e confirme a exclusão.</li>
</ol>

<h2>Quais dados são removidos</h2>
<ul>
  <li><strong>Imediatamente apagados:</strong> seu registro de conta (nome, e-mail, foto de perfil e identificador Google), todas as suas notas (ativas, fixadas, arquivadas e na lixeira), todas as suas pastas e subpastas, o espelho <code>.md</code> no servidor, a sessão ativa e o cache offline no dispositivo.</li>
  <li><strong>Backups de segurança:</strong> cópias automáticas antigas de recuperação de desastres são sobrescritas e expiradas automaticamente conforme a janela de retenção do servidor, não sendo utilizadas para recriar contas excluídas.</li>
</ul>

<h2>Precisa de ajuda para excluir?</h2>
<p>Se você não conseguir acessar o aplicativo, envie um e-mail a partir do endereço vinculado à sua conta Google para <a href="mailto:gui.liznas@gmail.com">gui.liznas@gmail.com</a> com o assunto <em>Exclusão de conta z-notes</em>. A remoção será concluída em até 5 dias úteis.</p>

<p>Consulte também nossa <a href="/privacidade">Política de Privacidade</a>.</p>`,
);

export function registerLegalRoutes(app: FastifyInstance): void {
  const sendPrivacy = async (_req: unknown, reply: { type: (t: string) => { send: (body: string) => unknown } }) =>
    reply.type("text/html; charset=utf-8").send(PRIVACY_HTML);
  const sendDeleteAccount = async (_req: unknown, reply: { type: (t: string) => { send: (body: string) => unknown } }) =>
    reply.type("text/html; charset=utf-8").send(DELETE_ACCOUNT_HTML);

  app.get("/privacidade", sendPrivacy);
  app.get("/privacidade/", sendPrivacy);
  app.get("/excluir-conta", sendDeleteAccount);
  app.get("/excluir-conta/", sendDeleteAccount);
}
