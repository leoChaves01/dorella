require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
  quiet: true,
});
const express = require("express"),
  path = require("path"),
  crypto = require("crypto"),
  bcrypt = require("bcrypt"),
  pool = require("./config/db");
const app = express();
if (process.env.VERCEL) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "8kb" }));
app.use((req, res, next) => {
  req.body ||= {};
  next();
});
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (
      req.get("sec-fetch-site") === "cross-site" ||
      (origin &&
        origin !==
          (process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`))
    )
      return res.status(403).json({ mensagem: "Origem não permitida." });
  }
  next();
});
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex"),
  clean = (s) => (typeof s === "string" ? s.trim() : "");
const cookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
const token = (req) =>
  (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("dorella_session="))
    ?.slice(16) || "";
async function auth(req, res, next) {
  const r = await pool.query(
    "SELECT u.id,u.nome,u.usuario FROM dorella_sessions s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",
    [hash(token(req))],
  );
  if (!r.rows[0])
    return res
      .status(401)
      .json({ mensagem: "Entre na sua conta para continuar." });
  req.user = r.rows[0];
  next();
}
async function limit(req, res, next) {
  const r = await pool.query(
    `INSERT INTO dorella_attempts(key,count,expires_at) VALUES($1,1,NOW()+INTERVAL '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN dorella_attempts.expires_at<NOW() THEN 1 ELSE dorella_attempts.count+1 END,expires_at=CASE WHEN dorella_attempts.expires_at<NOW() THEN NOW()+INTERVAL '15 minutes' ELSE dorella_attempts.expires_at END RETURNING count`,
    [hash(req.ip + "|" + req.path.replace(/^\/api/, ""))],
  );
  if (r.rows[0].count > 20) {
    res.set("Retry-After", "900");
    return res
      .status(429)
      .json({ mensagem: "Muitas tentativas. Aguarde 15 minutos." });
  }
  next();
}
app.post(["/api/cadastro", "/cadastro"], limit, async (req, res) => {
  const nome = clean(req.body.nome),
    usuario = clean(req.body.usuario),
    senha = req.body.senha;
  if (
    nome.length < 3 ||
    nome.length > 100 ||
    !/^[\p{L}\p{N}_.@-]{3,80}$/u.test(usuario) ||
    typeof senha !== "string" ||
    senha.length < 10 ||
    Buffer.byteLength(senha) > 72
  )
    return res.status(400).json({
      mensagem:
        "Informe nome válido, usuário de 3 a 80 caracteres e senha de pelo menos 10 caracteres (máximo 72 bytes).",
    });
  const c = await pool.connect();
  try {
    const encrypted = await bcrypt.hash(senha, 12);
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [usuario]);
    if (
      (await c.query("SELECT id FROM usuarios WHERE usuario=$1", [usuario]))
        .rowCount
    ) {
      await c.query("ROLLBACK");
      return res
        .status(409)
        .json({ mensagem: "Este usuário já está cadastrado." });
    }
    await c.query("INSERT INTO usuarios(nome,usuario,senha) VALUES($1,$2,$3)", [
      nome,
      usuario,
      encrypted,
    ]);
    await c.query("COMMIT");
    res.status(201).json({ mensagem: "Conta criada. Agora você pode entrar." });
  } catch (e) {
    await c.query("ROLLBACK");
    if (e.code === "23505")
      return res
        .status(409)
        .json({ mensagem: "Este usuário já está cadastrado." });
    throw e;
  } finally {
    c.release();
  }
});
app.post(["/api/login", "/login"], limit, async (req, res) => {
  const usuario = clean(req.body.usuario),
    senha = req.body.senha;
  if (
    !usuario ||
    usuario.length > 80 ||
    typeof senha !== "string" ||
    !senha ||
    Buffer.byteLength(senha) > 72
  )
    return res
      .status(400)
      .json({ mensagem: "Preencha usuário e senha corretamente." });
  const u = (
    await pool.query(
      "SELECT id,nome,usuario,senha FROM usuarios WHERE usuario=$1",
      [usuario],
    )
  ).rows[0];
  const valid = await bcrypt.compare(
    senha,
    u?.senha || "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
  );
  if (!u || !valid)
    return res.status(401).json({ mensagem: "Usuário ou senha inválidos." });
  const t = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "DELETE FROM dorella_sessions WHERE token_hash=$1 OR expires_at<NOW()",
    [hash(token(req))],
  );
  await pool.query(
    "INSERT INTO dorella_sessions(token_hash,usuario_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')",
    [hash(t), u.id],
  );
  res.cookie("dorella_session", t, { ...cookie, maxAge: 28800000 });
  res.json({ usuario: { id: u.id, nome: u.nome, usuario: u.usuario } });
});
app.get("/api/me", auth, (req, res) => res.json({ usuario: req.user }));
app.post("/api/logout", async (req, res) => {
  await pool.query("DELETE FROM dorella_sessions WHERE token_hash=$1", [
    hash(token(req)),
  ]);
  res.clearCookie("dorella_session", cookie);
  res.json({ mensagem: "Você saiu da conta." });
});
app.patch("/api/me", auth, async (req, res) => {
  const nome = clean(req.body.nome);
  if (nome.length < 3 || nome.length > 100)
    return res
      .status(400)
      .json({ mensagem: "Informe um nome de 3 a 100 caracteres." });
  await pool.query("UPDATE usuarios SET nome=$1 WHERE id=$2", [
    nome,
    req.user.id,
  ]);
  res.json({ mensagem: "Dados atualizados." });
});
const treatments = [
  "Clínico Geral",
  "Endodontia",
  "Implante",
  "Ortodontia",
  "Prótese",
  "Facetas",
];
app.get("/api/agendamentos", auth, async (req, res) =>
  res.json({
    agendamentos: (
      await pool.query(
        "SELECT id,tratamento,data_preferida,periodo,status FROM dorella_requests WHERE usuario_id=$1 ORDER BY criado_em DESC",
        [req.user.id],
      )
    ).rows,
  }),
);
app.post("/api/agendamentos", auth, async (req, res) => {
  const { tratamento, data, periodo } = req.body;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  if (
    !treatments.includes(tratamento) ||
    typeof data !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    Number.isNaN(Date.parse(data)) ||
    new Date(data).toISOString().slice(0, 10) !== data ||
    data <= today ||
    data > new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10) ||
    !["Manhã", "Tarde"].includes(periodo)
  )
    return res.status(400).json({
      mensagem:
        "Escolha tratamento, período e uma data futura nos próximos 180 dias.",
    });
  const r = await pool.query(
    "INSERT INTO dorella_requests(usuario_id,tratamento,data_preferida,periodo) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id",
    [req.user.id, tratamento, data, periodo],
  );
  if (!r.rowCount)
    return res
      .status(409)
      .json({ mensagem: "Esta solicitação já foi enviada." });
  res.status(201).json({
    mensagem:
      "Solicitação salva. Confirme a disponibilidade com a clínica pelo WhatsApp.",
  });
});
app.delete("/api/agendamentos/:id", auth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id))
    return res.status(400).json({ mensagem: "Solicitação inválida." });
  const r = await pool.query(
    "UPDATE dorella_requests SET status='Cancelada' WHERE id=$1 AND usuario_id=$2 AND status='Pendente' RETURNING id",
    [req.params.id, req.user.id],
  );
  res.status(r.rowCount ? 200 : 404).json({
    mensagem: r.rowCount
      ? "Solicitação cancelada."
      : "Solicitação não encontrada ou finalizada.",
  });
});
const root = path.resolve(__dirname, "..");
app.get(
  ["/", "/index.html", "/login.html", "/cadastro.html", "/paciente.html"],
  (req, res) =>
    res.sendFile(path.join(root, req.path === "/" ? "index.html" : req.path)),
);
for (const file of [
  "styles.css",
  "index.js",
  "login.js",
  "cadastro.js",
  "paciente.js",
  "shared.js",
])
  app.get("/" + file, (req, res) => res.sendFile(path.join(root, file)));
app.use("/img", express.static(path.join(root, "img"), { maxAge: "1d" }));
app.use((req, res) =>
  res.status(404).json({ mensagem: "Página não encontrada." }),
);
app.use((err, req, res, next) => {
  console.error("Erro de requisição:", err.code || err.name);
  res
    .status(
      err.type === "entity.parse.failed"
        ? 400
        : err.type === "entity.too.large"
          ? 413
          : 500,
    )
    .json({
      mensagem:
        err.type === "entity.parse.failed"
          ? "Dados inválidos."
          : "Não foi possível concluir. Tente novamente.",
    });
});
async function initialize() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS usuarios(id SERIAL PRIMARY KEY,nome VARCHAR(100) NOT NULL,usuario VARCHAR(80) UNIQUE NOT NULL,senha TEXT NOT NULL,criado_em TIMESTAMP DEFAULT NOW());CREATE TABLE IF NOT EXISTS dorella_sessions(token_hash TEXT PRIMARY KEY,usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL);CREATE TABLE IF NOT EXISTS dorella_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL);CREATE TABLE IF NOT EXISTS dorella_requests(id SERIAL PRIMARY KEY,usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,tratamento TEXT NOT NULL,data_preferida DATE NOT NULL,periodo TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Pendente',criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE UNIQUE INDEX IF NOT EXISTS dorella_request_active ON dorella_requests(usuario_id,tratamento,data_preferida,periodo) WHERE status='Pendente';`,
  );
}
if (require.main === module)
  initialize()
    .then(() =>
      app.listen(process.env.PORT || 3001, "127.0.0.1", () =>
        console.log(`Dorella: http://localhost:${process.env.PORT || 3001}`),
      ),
    )
    .catch((e) => {
      console.error("Falha no banco:", e.code || e.name);
      process.exit(1);
    });
module.exports = { app, initialize, pool };
