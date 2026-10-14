const fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "public");
fs.mkdirSync(out, { recursive: true });
for (const name of [
  "index.html",
  "login.html",
  "cadastro.html",
  "paciente.html",
  "styles.css",
  "shared.js",
  "login.js",
  "cadastro.js",
  "paciente.js",
])
  fs.copyFileSync(path.join(root, name), path.join(out, name));
fs.mkdirSync(path.join(out, "img"), { recursive: true });
for (const name of [
  "logo.webp",
  "Group 24.webp",
  "Group 25.webp",
  "Group 5.webp",
])
  fs.copyFileSync(path.join(root, "img", name), path.join(out, "img", name));
console.log("Arquivos públicos preparados.");
