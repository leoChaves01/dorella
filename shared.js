const menu = document.querySelector(".menu-toggle"),
  nav = document.querySelector("#navigation");
menu?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
nav?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.classList.contains("open")) {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
    menu.focus();
  }
});
document.querySelectorAll(".show-password").forEach((button) =>
  button.addEventListener("click", () => {
    const input = button.previousElementSibling,
      show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    button.setAttribute("aria-pressed", String(show));
  }),
);
window.api = async (path, options = {}) => {
  let response;
  try {
    response = await fetch("/api" + path, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "Não foi possível conectar. Verifique sua conexão e tente novamente.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    const e = new Error(data.mensagem || "Não foi possível concluir.");
    e.status = response.status;
    throw e;
  }
  return data;
};
window.feedback = (element, text, error = false) => {
  element.textContent = text;
  element.className = "feedback " + (error ? "error" : "success");
};
for (const key of ["token", "usuario", "nome"]) localStorage.removeItem(key);
