# Dorella

Site da Clínica Dorella com Express, PostgreSQL, bcrypt e sessões em cookies HttpOnly.

## Executar no VS Code

1. Na raiz, execute `npm ci`.
2. Configure `backend/.env` com `DATABASE_URL=postgresql://...` e `PORT=3001`.
3. Execute `npm start` e abra http://localhost:3001. O servidor entrega as páginas e a API na mesma origem. Não use Live Server para testar a autenticação.
4. Execute `npm test`. Os testes criam e removem exclusivamente suas próprias contas temporárias no banco configurado.

As tabelas adicionais são criadas de forma idempotente. Usuários existentes são preservados. Sessões antigas em localStorage não são aceitas; faça login novamente.

## Vercel

O projeto está preparado em `vercel.json`. O build copia somente arquivos públicos para `public/`. As rotas `/api/*` usam `api/index.js`. Configure um PostgreSQL hospedado em `DATABASE_URL` e defina `PUBLIC_ORIGIN` com a URL HTTPS de produção. Nunca envie `backend/.env`, `.git` ou `node_modules` como arquivos públicos.

`NODE_ENV=production` habilita cookies Secure. A Vercel define esse ambiente automaticamente. O banco deve aceitar conexões TLS e usar a string de conexão com pooling fornecida pelo provedor. Inicialização de esquema é realizada na primeira chamada de cada instância. Para operação em escala, execute migrações em etapa separada e use um usuário SQL com permissões mínimas.

## Funcionalidades

- Cadastro com validação no cliente e no servidor; senhas com bcrypt (custo 12).
- Login por nome de usuário, sessão de 8 horas armazenada por hash no PostgreSQL e logout que revoga a sessão.
- Limite persistido de tentativas por IP, proteção de origem e cookies HttpOnly/SameSite.
- Perfil e solicitações vinculados ao usuário autenticado, com consultas parametrizadas.
- Solicitação de consulta, listagem e cancelamento. São preferências pendentes: disponibilidade e confirmação são combinadas pelo WhatsApp da clínica. Não existe agenda de horários ou painel de equipe neste escopo.

## Operação

Mantenha backups do PostgreSQL, acompanhe logs e limites do provedor. Não há recuperação de senha por e-mail: o login existente usa nome de usuário, sem e-mail verificado. As credenciais locais estavam rastreadas pelo Git antes desta revisão; não publique o histórico que as contém. Troque qualquer credencial que tenha sido exposta em um repositório remoto.
