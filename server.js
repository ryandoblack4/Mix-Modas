const express = require("express");
const admin = require("firebase-admin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

// ================== FIREBASE ==================
let firestore = null;
let auth = null;

try {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID
      })
    });

    firestore = admin.firestore();
    auth = admin.auth();
    console.log("🔥 Firebase conectado com sucesso!");
  } else {
    console.warn("⚠️ Firebase não configurado (variáveis ausentes)");
  }
} catch (error) {
  console.error("❌ Erro ao iniciar Firebase:", error);
}

// ================== EXPRESS ==================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== STATIC FILES ==================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/templates", express.static(path.join(__dirname, "templates")));
app.use("/static", express.static(path.join(__dirname, "static")));

// ================== FRONTEND ==================
// 👉 ISSO AQUI É O QUE FAZ O SITE APARECER
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

// ================== UPLOAD ==================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ================== FIRESTORE REFS ==================
const produtosRef = firestore ? firestore.collection("produtos") : null;
const usuariosRef = firestore ? firestore.collection("usuarios") : null;
const listaDesejosRef = firestore ? firestore.collection("lista_desejos") : null;

// ================== API ==================
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    firebase: firestore ? "conectado" : "não configurado",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/produtos", async (req, res) => {
  if (!produtosRef) {
    return res.status(503).json({ error: "Firebase não configurado" });
  }

  try {
    const snapshot = await produtosRef.get();
    const produtos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

app.post("/api/produtos", upload.single("imagem"), async (req, res) => {
  if (!produtosRef) {
    return res.status(503).json({ error: "Firebase não configurado" });
  }

  try {
    const { nome, preco, categoria } = req.body;
    if (!nome || !preco || !categoria) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const produtoData = {
      nome,
      preco: parseFloat(preco),
      categoria,
      imagem: req.file ? `/uploads/${req.file.filename}` : null,
      criado_em: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await produtosRef.add(produtoData);

    res.status(201).json({
      success: true,
      produto: {
        id: docRef.id,
        ...produtoData
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

app.post("/api/lista_desejos", async (req, res) => {
  if (!listaDesejosRef) {
    return res.status(503).json({ error: "Firebase não configurado" });
  }

  try {
    const { usuario_email, produto_id } = req.body;
    if (!usuario_email || !produto_id) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const docRef = await listaDesejosRef.add({
      usuario_email,
      produto_id,
      criado_em: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar lista de desejos" });
  }
});

// ================== START ==================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
