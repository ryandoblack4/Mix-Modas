const express = require("express");
const admin = require("firebase-admin");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const axios = require("axios"); 
const path = require("path");
require('dotenv').config(); 

let firestore;
try {
  if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  } else {
    const serviceAccount = require("./config/firebase-key.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  firestore = admin.firestore();
  console.log("✅ Firebase conectado com sucesso!");
} catch (error) {
  console.warn("⚠️ Firebase não inicializado:", error.message);
  firestore = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = require('cors'); 
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seu-dominio.com', 'https://www.seu-dominio.com'] 
    : 'http://localhost:3000',
  credentials: true
}));

const __dirname = path.resolve(); 
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/templates", express.static(path.join(__dirname, "templates")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public"))); 

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/loja.db' 
  : path.join(__dirname, "loja.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco:", err.message);
  } else {
    console.log("✅ Conectado ao SQLite Database");
    initializeDatabase();
  }
});

function initializeDatabase() {
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
}

app.get("/api/produtos", (req, res) => {
  const categoria = req.query.categoria;
  if (categoria) {
    db.all(
      "SELECT * FROM produtos WHERE LOWER(categoria) = LOWER(?)",
      [categoria],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Erro no banco de dados" });
        }
        return res.json(rows || []);
      }
    );
  } else {
    db.all("SELECT * FROM produtos", [], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro no banco de dados" });
      }
      return res.json(rows || []);
    });
  }
});

app.get("/api/lista_desejos", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email é obrigatório" });

  const sql = `
    SELECT p.* FROM lista_desejos ld
    JOIN produtos p ON ld.produto_id = p.id
    WHERE ld.usuario_email = ?
  `;

  db.all(sql, [email], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro no banco de dados" });
    }
    return res.json(rows || []);
  });
});

app.post("/api/cadastro", async (req, res) => {
  const { nome, email, senha, recaptcha } = req.body;

  if (!nome || !email || !senha || !recaptcha) {
    return res.status(400).json({ error: "Campos incompletos ou reCAPTCHA ausente" });
  }

  try {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || 'SUA_SECRET_KEY';
    const googleVerify = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: recaptchaSecret,
          response: recaptcha
        }
      }
    );

    if (!googleVerify.data.success) {
      return res.status(400).json({ error: "Falha na validação do reCAPTCHA" });
    }
  } catch (error) {
    console.error("Erro reCAPTCHA:", error);
    return res.status(500).json({ error: "Erro ao validar reCAPTCHA" });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(senha, salt);

  db.run(
    "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
    [nome, email, hash],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: "Email já cadastrado" });
        }
        console.error(err);
        return res.status(500).json({ error: "Erro ao cadastrar usuário" });
      }
      res.json({ success: true, message: "Usuário cadastrado com sucesso" });
    }
  );
});

app.post("/api/login", async (req, res) => {
  const { email, senha, recaptcha } = req.body;

  if (!email || !senha || !recaptcha) {
    return res.status(400).json({ error: "Credenciais ou captcha ausentes" });
  }

  try {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || 'SUA_SECRET_KEY';
    const googleVerify = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: recaptchaSecret,
          response: recaptcha
        }
      }
    );

    if (!googleVerify.data.success) {
      return res.status(400).json({ error: "Captcha inválido" });
    }
  } catch (error) {
    console.error("Erro reCAPTCHA:", error);
    return res.status(500).json({ error: "Erro ao validar captcha" });
  }

  db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    bcrypt.compare(senha, user.senha, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao verificar senha" });
      }
      
      if (result) {
        res.json({ 
          success: true, 
          email: user.email, 
          role: user.role,
          nome: user.nome 
        });
      } else {
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    });
  });
});

app.get("/api/firebase-teste", async (req, res) => {
  if (!firestore) {
    return res.status(503).json({ error: "Firebase não configurado" });
  }
  
  try {
    const docRef = await firestore.collection("teste").add({
      mensagem: "Conexão com Firebase funcionando!",
      data: new Date().toISOString(),
    });
    res.json({ sucesso: true, id: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao conectar com o Firebase" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "online", 
    timestamp: new Date().toISOString(),
    database: "connected"
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'desenvolvimento'}`);
});