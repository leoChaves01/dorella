const token = localStorage.getItem("token");
const usuario = localStorage.getItem("usuario");

if (!token) {
    window.location.href = "login.html";
}

const nomeUsuario = document.getElementById("nomeUsuario");
const logoutBtn = document.getElementById("logoutBtn");

const agendarBtn = document.getElementById("agendarBtn");
const consultasBtn = document.getElementById("consultasBtn");
const dadosBtn = document.getElementById("dadosBtn");

const conteudoPaciente = document.getElementById("conteudoPaciente");

if (usuario) {
    nomeUsuario.textContent = usuario;
}

logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "login.html";
});

agendarBtn.addEventListener("click", function () {

    conteudoPaciente.innerHTML = `
        <div class="area-paciente-conteudo">
            <h2>Agendar consulta</h2>

            <p>
                Em breve você poderá escolher
                tratamento, data e horário por aqui.
            </p>
        </div>
    `;
});

consultasBtn.addEventListener("click", function () {

    conteudoPaciente.innerHTML = `
        <div class="area-paciente-conteudo">
            <h2>Meus agendamentos</h2>

            <p>
                Você ainda não possui consultas agendadas.
            </p>
        </div>
    `;
});

dadosBtn.addEventListener("click", function () {

    conteudoPaciente.innerHTML = `
        <div class="area-paciente-conteudo">
            <h2>Meus dados</h2>

            <p>
                Usuário: <strong>${usuario || ""}</strong>
            </p>
        </div>
    `;
});