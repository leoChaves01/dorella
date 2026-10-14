const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, initialize, pool } = require("./server");
const crypto = require("crypto");
test("Fluxo integrado com PostgreSQL e sessões reais", async () => {
  await initialize();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const usuario = "qa_" + crypto.randomBytes(8).toString("hex"),
    senha = "Dorella-test-2026!";
  let cookie = "";
  const call = async (
    url,
    method = "GET",
    data,
    customCookie = cookie,
    headers = {},
  ) => {
    const r = await fetch(base + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: customCookie,
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    let json;
    try {
      json = await r.json();
    } catch {}
    return { status: r.status, json, headers: r.headers };
  };
  try {
    assert.equal((await call("/api/me")).status, 401);
    assert.equal(
      (
        await call("/api/cadastro", "POST", {
          nome: "A",
          usuario,
          senha: "123",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("/api/cadastro", "POST", {
          nome: "Teste Dorella",
          usuario,
          senha,
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await call("/api/cadastro", "POST", {
          nome: "Teste Dorella",
          usuario,
          senha,
        })
      ).status,
      409,
    );
    const saved = (
      await pool.query("SELECT senha FROM usuarios WHERE usuario=$1", [usuario])
    ).rows[0];
    assert.notEqual(saved.senha, senha);
    assert.ok(saved.senha.startsWith("$2b$"));
    assert.equal(
      (await call("/api/login", "POST", { usuario, senha: "incorreta" }))
        .status,
      401,
    );
    const login = await call("/api/login", "POST", { usuario, senha });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal((await call("/api/me")).json.usuario.usuario, usuario);
    assert.equal(
      (await call("/api/me", "PATCH", { nome: "Nome atualizado" })).status,
      200,
    );
    assert.equal((await call("/api/me")).json.usuario.nome, "Nome atualizado");
    assert.equal(
      (
        await call("/api/me", "PATCH", { nome: "Ataque" }, cookie, {
          Origin: "https://example.org",
        })
      ).status,
      403,
    );
    const data = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
      payload = { tratamento: "Clínico Geral", data, periodo: "Manhã" };
    assert.equal(
      (
        await call("/api/agendamentos", "POST", {
          ...payload,
          data: "2020-01-01",
        })
      ).status,
      400,
    );
    assert.equal(
      (await call("/api/agendamentos", "POST", payload)).status,
      201,
    );
    assert.equal(
      (await call("/api/agendamentos", "POST", payload)).status,
      409,
    );
    const rows = (await call("/api/agendamentos")).json.agendamentos;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "Pendente");
    assert.equal(
      (await call("/api/agendamentos/" + rows[0].id, "DELETE", undefined, ""))
        .status,
      401,
    );
    assert.equal(
      (await call("/api/agendamentos/" + rows[0].id, "DELETE")).status,
      200,
    );
    assert.equal(
      (await call("/api/agendamentos")).json.agendamentos[0].status,
      "Cancelada",
    );
    assert.equal((await call("/api/logout", "POST")).status, 200);
    assert.equal((await call("/api/me")).status, 401);
    const relogin = await call("/api/login", "POST", { usuario, senha });
    cookie = relogin.headers.get("set-cookie").split(";")[0];
    await pool.query(
      "UPDATE dorella_sessions SET expires_at=NOW()-INTERVAL '1 minute' WHERE usuario_id=(SELECT id FROM usuarios WHERE usuario=$1)",
      [usuario],
    );
    assert.equal((await call("/api/me")).status, 401);
    for (const url of [
      "/",
      "/login.html",
      "/cadastro.html",
      "/paciente.html",
      "/styles.css",
      "/shared.js",
    ])
      assert.equal((await fetch(base + url)).status, 200);
    for (const url of ["/backend/.env", "/.git/config", "/backend/server.js"])
      assert.equal((await fetch(base + url)).status, 404);
  } finally {
    await pool.query("DELETE FROM usuarios WHERE usuario=$1", [usuario]);
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});
