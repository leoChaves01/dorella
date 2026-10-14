const { app, initialize } = require("../backend/server");
let ready;
module.exports = async (req, res) => {
  try {
    ready ||= initialize().catch((error) => {
      ready = undefined;
      throw error;
    });
    await ready;
    return app(req, res);
  } catch (error) {
    console.error("Database initialization failed:", error.code || error.name);
    res
      .status(503)
      .json({
        mensagem:
          "Serviço temporariamente indisponível. Tente novamente em instantes.",
      });
  }
};
