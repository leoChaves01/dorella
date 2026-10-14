const form = document.querySelector("#cadastroForm"),
  message = document.querySelector("#mensagem-cadastro"),
  confirm = document.querySelector("#confirmar");
function validate() {
  confirm.setCustomValidity(
    confirm.value === form.senha.value ? "" : "As senhas precisam ser iguais.",
  );
  form.senha.setCustomValidity(
    new TextEncoder().encode(form.senha.value).length > 72
      ? "A senha deve ter no máximo 72 bytes."
      : "",
  );
  form.usuario.setCustomValidity(
    /^[\p{L}\p{N}_.@-]{3,80}$/u.test(form.usuario.value.trim())
      ? ""
      : "Use de 3 a 80 letras, números, ponto, @, hífen ou sublinhado.",
  );
}
form.addEventListener("input", validate);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  validate();
  if (!form.reportValidity()) return;
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  feedback(message, "Criando sua conta…");
  try {
    await api("/cadastro", {
      method: "POST",
      body: JSON.stringify({
        nome: form.nome.value.trim(),
        usuario: form.usuario.value.trim(),
        senha: form.senha.value,
      }),
    });
    location.assign("login.html?cadastro=sucesso");
  } catch (error) {
    feedback(message, error.message, true);
  } finally {
    button.disabled = false;
  }
});
