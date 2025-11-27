const express = require("express");
const admin = require("firebase-admin");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

try {
  const serviceAccountPath = "./config/firebase-key.json";
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://sistema-de-loja-85c8a-default-rtdb.firebaseio.com/",
    });
    console.log("✅ Firebase conectado!");
  } else {
    console.warn("⚠️ Arquivo Firebase não encontrado - funcionalidades limitadas");
  }
} catch (error) {
  console.warn("⚠️ Firebase não inicializado:", error.message);
}

const realtimeDB = admin.database ? admin.database() : null;

let db;
try {
  const dbPath = path.join('/tmp', 'loja.db'); 
  
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
  console.log("✅ SQLite conectado em /tmp/loja.db");
} catch (dbError) {
  console.error("❌ Erro ao conectar SQLite:", dbError.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/tmp/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + path.extname(file.originalname);
    cb(null, safeName);
  },
});
const upload = multer({ storage });
app.get("/", (req, res) => {
  res.json({ 
    message: "API Mix Modas funcionando!",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/produtos", (req, res) => {
  if (!db) return res.status(500).json({ error: "Banco de dados não disponível" });
  
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

app.post("/api/produtos", (req, res) => {
  if (!db) return res.status(500).json({ error: "Banco de dados não disponível" });

  const contentType = req.headers["content-type"] || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const proceed = () => {
    let { nome, descricao, preco, quantidade, categoria } = req.body;
    const imagem = req.file ? `/tmp/uploads/${req.file.filename}` : (req.body.imagem || null);

    preco = typeof preco === "string" ? preco.trim() : preco;
    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade) || 0;

    if (!nome || isNaN(precoNumerico)) {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    db.run(
      "INSERT INTO produtos (nome, descricao, preco, quantidade, categoria, imagem) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, descricao || "", precoNumerico, quantidadeNumerica, categoria || "Outros", imagem],
      function (err) {
        if (err) {
          console.error("❌ Erro SQLite:", err.message);
          return res.status(500).json({ error: "Erro ao salvar produto" });
        }

        const produto = {
          id: this.lastID,
          nome,
          descricao: descricao || "",
          preco: precoNumerico,
          quantidade: quantidadeNumerica,
          categoria: categoria || "Outros",
          imagem,
        };

        if (realtimeDB) {
          realtimeDB.ref("produtos/" + produto.id).set(produto)
            .catch((firebaseError) => console.warn("⚠️ Firebase:", firebaseError.message));
        }

        res.json({ success: true, produto });
      }
    );
  };

  if (isMultipart) {
    upload.single("imagem")(req, res, (err) => {
      if (err) return res.status(500).json({ error: "Erro no upload" });
      proceed();
    });
  } else {
    proceed();
  }
});

app.put("/api/produtos/:id", (req, res) => {
  if (!db) return res.status(500).json({ error: "Banco de dados não disponível" });

  const { id } = req.params;
  const contentType = req.headers["content-type"] || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const proceed = () => {
    let { nome, descricao, preco, quantidade, categoria } = req.body;
    const imagem = req.file ? `/tmp/uploads/${req.file.filename}` : req.body.imagem;

    preco = typeof preco === "string" ? preco.trim() : preco;
    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade) || 0;

    if (!nome || isNaN(precoNumerico)) {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const sql = `
      UPDATE produtos 
      SET nome = ?, descricao = ?, preco = ?, quantidade = ?, categoria = ?, imagem = COALESCE(?, imagem)
      WHERE id = ?
    `;

    db.run(sql, [nome, descricao || "", precoNumerico, quantidadeNumerica, categoria || "Outros", imagem, id], function (err) {
      if (err) {
        console.error("❌ Erro ao atualizar:", err.message);
        return res.status(500).json({ error: "Erro ao atualizar produto" });
      }

      const produtoAtualizado = {
        id,
        nome,
        descricao: descricao || "",
        preco: precoNumerico,
        quantidade: quantidadeNumerica,
        categoria: categoria || "Outros",
        imagem: imagem || null,
      };

      if (realtimeDB) {
        realtimeDB.ref("produtos/" + id).update(produtoAtualizado)
          .catch((e) => console.warn("⚠️ Firebase:", e.message));
      }

      res.json({ success: true, produto: produtoAtualizado });
    });
  };

  if (isMultipart) {
    upload.single("imagem")(req, res, (err) => {
      if (err) return res.status(500).json({ error: "Erro no upload" });
      proceed();
    });
  } else {
    proceed();
  }
});

app.delete("/api/produtos/:id", (req, res) => {
  if (!db) return res.status(500).json({ error: "Banco de dados não disponível" });

  const { id } = req.params;
  db.run("DELETE FROM produtos WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("❌ Erro ao excluir:", err.message);
      return res.status(500).json({ error: "Erro ao excluir produto" });
    }

    if (realtimeDB) {
      realtimeDB.ref("produtos/" + id).remove()
        .catch((e) => console.warn("⚠️ Firebase:", e.message));
    }

    res.json({ success: true });
  });
});

app.post("/api/cadastro", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Banco de dados não disponível" });

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
        return res.status(500).json({ error: "Email já cadastrado" });
      }

      if (admin.auth) {
        try {
          const userRecord = await admin.auth().createUser({
            email,
            password: senha,
            displayName: nome,
          });

          if (realtimeDB) {
            await realtimeDB.ref("usuarios/" + userRecord.uid).set({
              nome,
              email,
              criadoEm: new Date().toISOString(),
            });
          }

          res.json({ success: true, firebaseUID: userRecord.uid });
        } catch (firebaseError) {
          res.json({
            success: true,
            aviso: "Usuário salvo localmente, mas falhou no Firebase",
          });
        }
      } else {
        res.json({ success: true, aviso: "Usuário salvo apenas localmente" });
      }
    }
  );
});

app.post("/api/login", (req, res) => {
  if (!db) return res.status(500).json({ error: "Banco de dados não disponível" });

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

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    database: db ? "connected" : "disconnected",
    firebase: realtimeDB ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;