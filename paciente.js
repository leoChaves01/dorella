const content = document.querySelector("#conteudoPaciente"),
  message = document.querySelector("#page-message");
let user;
function fail(e) {
  if (e.status === 401) {
    location.replace("login.html");
    return;
  }
  feedback(message, e.message, true);
}
function select(id) {
  document.querySelectorAll(".dashboard-nav button").forEach((b) => {
    b.classList.toggle("outline", b.id !== id);
    b.setAttribute("aria-pressed", String(b.id === id));
  });
  feedback(message, "");
}
async function requests() {
  select("consultasBtn");
  content.textContent = "Carregando suas solicitações…";
  try {
    const data = await api("/agendamentos");
    content.innerHTML =
      '<h2>Minhas solicitações</h2><p>Solicitações pendentes dependem da confirmação da clínica. Para confirmar, <a class="text-link" href="https://wa.me/5511959073433">fale pelo WhatsApp ↗</a>.</p>';
    if (!data.agendamentos.length) {
      const p = document.createElement("p");
      p.textContent =
        "Você ainda não tem solicitações. Use “Solicitar consulta” para começar.";
      content.append(p);
    }
    for (const item of data.agendamentos) {
      const row = document.createElement("article");
      row.className = "request-row";
      const info = document.createElement("div"),
        title = document.createElement("h3"),
        date = document.createElement("p"),
        badge = document.createElement("span");
      title.textContent = item.tratamento;
      date.textContent =
        new Date(item.data_preferida).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        }) +
        " · " +
        item.periodo;
      badge.className = "badge";
      badge.textContent = item.status;
      info.append(title, date, badge);
      row.append(info);
      if (item.status === "Pendente") {
        const b = document.createElement("button");
        b.className = "button outline";
        b.textContent = "Cancelar solicitação";
        b.addEventListener("click", async () => {
          b.disabled = true;
          try {
            await api("/agendamentos/" + item.id, { method: "DELETE" });
            await requests();
            feedback(message, "Solicitação cancelada.");
          } catch (e) {
            fail(e);
            b.disabled = false;
          }
        });
        row.append(b);
      }
      content.append(row);
    }
  } catch (e) {
    content.textContent =
      "Não foi possível carregar as solicitações. Tente novamente.";
    fail(e);
  }
}
document.querySelector("#consultasBtn").addEventListener("click", requests);
document.querySelector("#agendarBtn").addEventListener("click", () => {
  select("agendarBtn");
  content.innerHTML =
    '<h2>Solicite sua consulta</h2><p>Informe sua preferência. O envio não confirma uma consulta: a disponibilidade deve ser combinada com a clínica pelo WhatsApp.</p><form id="request-form"><label for="tratamento">Tratamento</label><select id="tratamento" name="tratamento" required><option value="">Selecione</option>' +
    [
      "Clínico Geral",
      "Endodontia",
      "Implante",
      "Ortodontia",
      "Prótese",
      "Facetas",
    ]
      .map((t) => "<option>" + t + "</option>")
      .join("") +
    '</select><label for="data">Data de preferência</label><input type="date" id="data" name="data" required><label for="periodo">Período</label><select id="periodo" name="periodo" required><option value="">Selecione</option><option>Manhã</option><option>Tarde</option></select><p id="request-message" class="feedback" role="status"></p><button type="submit" class="button">Enviar solicitação →</button></form>';
  const form = content.querySelector("form");
  form.data.min = new Date(Date.now() + 864e5).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  form.data.max = new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = form.querySelector("button"),
      m = document.querySelector("#request-message");
    b.disabled = true;
    try {
      const result = await api("/agendamentos", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      await requests();
      feedback(message, result.mensagem);
    } catch (e) {
      if (e.status === 401) fail(e);
      else feedback(m, e.message, true);
    } finally {
      b.disabled = false;
    }
  });
});
document.querySelector("#dadosBtn").addEventListener("click", () => {
  select("dadosBtn");
  content.innerHTML =
    '<h2>Meus dados</h2><form><label for="nome">Nome completo</label><input id="nome" name="nome" autocomplete="name" minlength="3" maxlength="100" required><label for="usuario">Usuário</label><input id="usuario" disabled><small>Seu nome de usuário é usado para entrar na conta.</small><p class="feedback" role="status" id="profile-message"></p><button class="button" type="submit">Salvar alterações</button></form>';
  const f = content.querySelector("form");
  f.nome.value = user.nome;
  f.querySelector("#usuario").value = user.usuario;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = f.querySelector("button");
    b.disabled = true;
    try {
      const result = await api("/me", {
        method: "PATCH",
        body: JSON.stringify({ nome: f.nome.value.trim() }),
      });
      user.nome = f.nome.value.trim();
      document.querySelector("#nomeUsuario").textContent = user.nome;
      feedback(document.querySelector("#profile-message"), result.mensagem);
    } catch (e) {
      if (e.status === 401) fail(e);
      else
        feedback(document.querySelector("#profile-message"), e.message, true);
    } finally {
      b.disabled = false;
    }
  });
});
document.querySelector("#logoutBtn").addEventListener("click", async (e) => {
  e.target.disabled = true;
  try {
    await api("/logout", { method: "POST" });
    location.replace("login.html");
  } catch (error) {
    fail(error);
    e.target.disabled = false;
  }
});
api("/me")
  .then((result) => {
    user = result.usuario;
    document.querySelector("#nomeUsuario").textContent = user.nome;
    document.querySelector("#patient-content").hidden = false;
    requests();
  })
  .catch(fail);
