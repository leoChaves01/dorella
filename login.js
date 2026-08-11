const form = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem-login");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    mensagem.style.color = "yellow";
    mensagem.textContent = "Tentando fazer login...";

    const usuario = document
        .getElementById("usuario")
        .value
        .trim();

    const senha = document
        .getElementById("senha")
        .value;

    try {
        const resposta = await fetch("http://localhost:3001/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario,
                senha
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            mensagem.style.color = "lightgreen";
            mensagem.textContent = "Login realizado com sucesso!";

            localStorage.setItem("token", dados.token);
            localStorage.setItem("usuario", usuario);

            if (dados.usuario && dados.usuario.nome) {
                localStorage.setItem("nome", dados.usuario.nome);
            }

            setTimeout(() => {
                window.location.href = "paciente.html";
            }, 1000);

        } else {
            mensagem.style.color = "red";
            mensagem.textContent =
                dados.mensagem || "Usuário ou senha inválidos.";
        }

    } catch (erro) {
        mensagem.style.color = "red";
        mensagem.textContent =
            "Não foi possível conectar ao servidor.";
    }
})