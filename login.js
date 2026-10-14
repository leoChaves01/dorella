const form = document.querySelector("#loginForm"),
  message = document.querySelector("#mensagem-login");
if (new URLSearchParams(location.search).has("cadastro"))
  feedback(message, "Conta criada com sucesso. Entre para continuar.");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  feedback(message, "Entrando…");
  try {
    await api("/login", {
      method: "POST",
      body: JSON.stringify({
        usuario: form.usuario.value.trim(),
        senha: form.senha.value,
      }),
    });
    location.assign("paciente.html");
  } catch (error) {
    feedback(message, error.message, true);
  } finally {
    button.disabled = false;
  }
});
