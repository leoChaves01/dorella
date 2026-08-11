const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function cadastrar(req, res) {
    try {
        const { nome, usuario, senha } = req.body;

        const usuarioExistente = await pool.query(
            "SELECT id FROM usuarios WHERE usuario = $1",
            [usuario]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({
                mensagem: "Usuário já cadastrado"
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query(
            `
            INSERT INTO usuarios (nome, usuario, senha)
            VALUES ($1, $2, $3)
            RETURNING id, nome, usuario
            `,
            [nome, usuario, senhaHash]
        );

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso",
            usuario: resultado.rows[0]
        });

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            mensagem: "Erro interno do servidor"
        });
    }
}

async function login(req, res) {
    try {
        const { usuario, senha } = req.body;

        console.log("Tentativa de login:", usuario);

        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = $1",
            [usuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: "Usuário ou senha inválidos"
            });
        }

        const paciente = resultado.rows[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            paciente.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Usuário ou senha inválidos"
            });
        }

        const token = jwt.sign(
            {
                id: paciente.id,
                usuario: paciente.usuario
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.json({
            mensagem: "Login realizado com sucesso",
            token,
            usuario: {
                id: paciente.id,
                nome: paciente.nome,
                usuario: paciente.usuario
            }
        });

    } catch (erro) {
        console.error("Erro no login:", erro);

        return res.status(500).json({
            mensagem: "Erro interno do servidor"
        });
    }
}

module.exports = {
    cadastrar,
    login
};