const form = document.getElementById("cadastroForm");
const mensagem = document.getElementById("mensagem-cadastro");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    mensagem.textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value;

    try {

        const resposta = await fetch("http://localhost:3001/cadastro", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nome,
                usuario,
                senha
            })

        });

        const dados = await resposta.json();

        if (resposta.ok) {

            mensagem.style.color = "green";
            mensagem.textContent = "Cadastro realizado com sucesso!";

            form.reset();

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1500);

        } else {

            mensagem.style.color = "red";
            mensagem.textContent =
                dados.mensagem || "Não foi possível realizar o cadastro.";

        }

    } catch (erro) {

        console.error(erro);

        mensagem.style.color = "red";
        mensagem.textContent =
            "Não foi possível conectar ao servidor.";

    }

});