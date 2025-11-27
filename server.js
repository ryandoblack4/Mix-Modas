// server.js (versão corrigida)
// 📦 Dependências
const express = require("express");
const admin = require("firebase-admin");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🔑 Service account (confirma que é o JSON correto)
const serviceAccount = require("./config/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sistema-de-loja-85c8a-default-rtdb.firebaseio.com/",
});

const realtimeDB = admin.database();
console.log("✅ Firebase Realtime Database conectado com sucesso!");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/templates", express.static(path.join(__dirname, "templates")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "templates")));

// Garante que a pasta uploads exista
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer (upload de imagens)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = Date.now() + path.extname(file.originalname);
    cb(null, safeName);
  },
});
const upload = multer({ storage });

// Banco SQLite
const db = new sqlite3.Database(path.join(__dirname, "loja.db"));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    email TEXT PRIMARY KEY,
    nome TEXT,
    senha TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    descricao TEXT,
    preco REAL,
    quantidade INTEGER,
    imagem TEXT,
    categoria TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lista_desejos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_email TEXT,
    produto_id INTEGER,
    FOREIGN KEY(usuario_email) REFERENCES usuarios(email),
    FOREIGN KEY(produto_id) REFERENCES produtos(id)
  )`);
});

console.log("✅ Banco SQLite conectado e tabelas verificadas!");

// --------------------- ROTAS ---------------------

// GET - listar produtos (necessário pro listar_produtos.js)
app.get("/api/produtos", (req, res) => {
  // Suporta filtro por categoria opcional (mesma interface que você já tinha)
  const categoria = req.query.categoria;
  const sql = categoria
    ? "SELECT * FROM produtos WHERE LOWER(categoria) = LOWER(?)"
    : "SELECT * FROM produtos";
  const params = categoria ? [categoria] : [];

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("❌ Erro ao listar produtos:", err.message);
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }
    res.json(rows);
  });
});

// PUT - atualizar produto existente
app.put("/api/produtos/:id", (req, res) => {
  const { id } = req.params;

  const contentType = req.headers["content-type"] || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const proceed = () => {
    let { nome, descricao, preco, quantidade, categoria } = req.body;
    const imagem = req.file ? `/uploads/${req.file.filename}` : req.body.imagem || null;

    preco = typeof preco === "string" ? preco.trim() : preco;
    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade) || 0;

    if (!nome || isNaN(precoNumerico)) {
      console.error("❌ Erro: nome ou preço ausentes/inválidos");
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    // Atualiza campos no SQLite
    const sql = `
      UPDATE produtos 
      SET nome = ?, descricao = ?, preco = ?, quantidade = ?, categoria = ?, imagem = COALESCE(?, imagem)
      WHERE id = ?
    `;

    db.run(sql, [nome, descricao || "", precoNumerico, quantidadeNumerica, categoria || "Outros", imagem, id], function (err) {
      if (err) {
        console.error("❌ Erro ao atualizar produto:", err.message);
        return res.status(500).json({ error: "Erro ao atualizar produto" });
      }

      // Atualiza também no Firebase
      const produtoAtualizado = {
        id,
        nome,
        descricao: descricao || "",
        preco: precoNumerico,
        quantidade: quantidadeNumerica,
        categoria: categoria || "Outros",
        imagem: imagem || null,
        atualizadoEm: new Date().toISOString(),
      };

      realtimeDB
        .ref("produtos/" + id)
        .update(produtoAtualizado)
        .then(() => console.log("♻️ Produto atualizado no Firebase:", nome))
        .catch((e) => console.warn("⚠️ Falha ao atualizar no Firebase:", e.message));

      res.json({ success: true, produto: produtoAtualizado });
    });
  };

  if (isMultipart) {
    upload.single("imagem")(req, res, (err) => {
      if (err) {
        console.error("❌ Erro no upload:", err.message);
        return res.status(500).json({ error: "Erro no upload da imagem" });
      }
      proceed();
    });
  } else {
    proceed();
  }
});


// DELETE - excluir produto (usado pelo listar_produtos.js)
app.delete("/api/produtos/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM produtos WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("❌ Erro ao excluir produto:", err.message);
      return res.status(500).json({ error: "Erro ao excluir produto" });
    }

    // Tenta remover também do Firebase (não bloqueia a resposta se falhar)
    realtimeDB
      .ref("produtos/" + id)
      .remove()
      .then(() => console.log("🗑️ Produto removido do Firebase:", id))
      .catch((e) => console.warn("⚠️ Erro ao remover do Firebase:", e.message));

    res.json({ success: true });
  });
});

/*
  POST /api/produtos
  - aceita multipart/form-data com campo 'imagem' (FormData do front)
  - aceita application/json com os campos no body
  Implementação: detecta se a requisição é multipart e executa upload.single dinamicamente.
*/
app.post("/api/produtos", (req, res) => {
  // detecta multipart
  const contentType = req.headers["content-type"] || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const proceed = () => {
    // campos podem vir via req.body (se multipart, multer já preencheu; se json, também)
    let { nome, descricao, preco, quantidade, categoria } = req.body;
    // se multer foi usado e criou req.file, pega a imagem
    const imagem = req.file ? `/uploads/${req.file.filename}` : (req.body.imagem || null);

    // normaliza valores
    preco = typeof preco === "string" ? preco.trim() : preco;
    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade) || 0;

    console.log("📥 Dados produto recebidos:", { nome, preco, quantidade, categoria, imagem });

    if (!nome || isNaN(precoNumerico)) {
      console.error("❌ Erro: nome ou preço ausentes/inválidos");
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    db.run(
      "INSERT INTO produtos (nome, descricao, preco, quantidade, categoria, imagem) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, descricao || "", precoNumerico, quantidadeNumerica, categoria || "Outros", imagem],
      function (err) {
        if (err) {
          console.error("❌ Erro SQLite ao inserir produto:", err.message);
          return res.status(500).json({ error: "Erro ao salvar no banco" });
        }

        const produto = {
          id: this.lastID,
          nome,
          descricao: descricao || "",
          preco: precoNumerico,
          quantidade: quantidadeNumerica,
          categoria: categoria || "Outros",
          imagem,
          criadoEm: new Date().toISOString(),
        };

        // sincroniza com Firebase (não bloqueia a resposta em caso de falha)
        realtimeDB
          .ref("produtos/" + produto.id)
          .set(produto)
          .then(() => console.log("📦 Produto sincronizado com Firebase:", produto.nome))
          .catch((firebaseError) => console.warn("⚠️ Falha ao sincronizar produto:", firebaseError.message));

        res.json({ success: true, produto });
      }
    );
  };

  if (isMultipart) {
    // executa multer dinamicamente
    upload.single("imagem")(req, res, (err) => {
      if (err) {
        console.error("❌ Erro no upload:", err.message);
        return res.status(500).json({ error: "Erro no upload da imagem" });
      }
      proceed();
    });
  } else {
    // body possivelmente JSON; proceed direto
    proceed();
  }
});

// Rota de cadastro de usuários (mantida)
app.post("/api/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const hash = bcrypt.hashSync(senha, 10);

  db.run(
    "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
    [nome, email, hash],
    async function (err) {
      if (err) {
        console.error("❌ Erro SQLite:", err.message);
        return res.status(500).json({ error: "Email já cadastrado ou erro no banco" });
      }

      try {
        const userRecord = await admin.auth().createUser({
          email,
          password: senha,
          displayName: nome,
        });

        await realtimeDB.ref("usuarios/" + userRecord.uid).set({
          nome,
          email,
          criadoEm: new Date().toISOString(),
          origem: "sincronizado do SQLite",
        });

        console.log("✅ Usuário sincronizado com Firebase:", email);
        res.json({ success: true, firebaseUID: userRecord.uid });
      } catch (firebaseError) {
        console.error("❌ Erro Firebase:", firebaseError.message);
        res.json({
          success: true,
          aviso: "Usuário salvo localmente, mas falhou no Firebase",
          erroFirebase: firebaseError.message,
        });
      }
    }
  );
});

// Login (mantido)
app.post("/api/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    bcrypt.compare(senha, user.senha, (err, result) => {
      if (result) {
        res.json({ success: true, email: user.email, role: user.role });
      } else {
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    });
  });
});

// Teste Firebase
app.get("/api/firebase-teste", async (req, res) => {
  try {
    await realtimeDB.ref("teste").push({
      mensagem: "Conexão com Realtime Database funcionando!",
      data: new Date().toISOString(),
    });
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao conectar com o Firebase" });
  }
});

// Inicia servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
