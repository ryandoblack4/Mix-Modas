const express = require("express");
const admin = require("firebase-admin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const serviceAccount = require("./config/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const auth = admin.auth();
console.log("🔥 Firebase conectado!");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/templates", express.static(path.join(__dirname, "templates")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "templates")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = Date.now() + path.extname(file.originalname);
    cb(null, safeName);
  },
});
const upload = multer({ storage });

const produtosRef = firestore.collection("produtos");
const usuariosRef = firestore.collection("usuarios");

app.get("/api/produtos", async (req, res) => {
  try {
    const categoria = req.query.categoria;
    let query = produtosRef;
    
    if (categoria) {
      query = query.where("categoria", "==", categoria);
    }
    
    const snapshot = await query.get();
    const produtos = [];
    
    snapshot.forEach(doc => {
      produtos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(produtos);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

app.get("/api/produtos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await produtosRef.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    
    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

app.post("/api/produtos", upload.single("imagem"), async (req, res) => {
  try {
    const {
      nome, descricao, preco, quantidade, categoria,
      tamanho, cor, tipo, material, composicao, idade, genero
    } = req.body;
    
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;
    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade) || 0;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    
    if (!preco || isNaN(precoNumerico) || precoNumerico <= 0) {
      return res.status(400).json({ error: "Preço válido é obrigatório" });
    }
    
    if (!categoria) {
      return res.status(400).json({ error: "Categoria é obrigatória" });
    }

    const produtoData = {
      nome: nome.trim(),
      descricao: descricao ? descricao.trim() : "",
      preco: precoNumerico,
      quantidade: quantidadeNumerica,
      categoria: categoria.trim(),
      criado_em: admin.firestore.FieldValue.serverTimestamp(),
      atualizado_em: admin.firestore.FieldValue.serverTimestamp()
    };

    if (imagem) {
      produtoData.imagem = imagem;
    }

    if (categoria === 'masculino' || categoria === 'feminino') {
      produtoData.tamanho = tamanho || "";
      produtoData.cor = cor || "";
      produtoData.composicao = composicao || "";
    } else if (categoria === 'acessorios') {
      produtoData.tipo = tipo || "";
      produtoData.material = material || "";
      produtoData.cor = cor || "";
    } else if (categoria === 'infantil') {
      produtoData.idade = idade || "";
      produtoData.genero = genero || "";
    }

    Object.keys(produtoData).forEach(key => {
      if (produtoData[key] === undefined || produtoData[key] === null || produtoData[key] === "") {
        delete produtoData[key];
      }
    });

    const docRef = await produtosRef.add(produtoData);
    
    res.status(201).json({
      success: true,
      message: "Produto cadastrado com sucesso!",
      produto: {
        id: docRef.id,
        ...produtoData
      }
    });
    
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    res.status(500).json({ error: "Erro ao salvar produto" });
  }
});

app.put("/api/produtos/:id", upload.single("imagem"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, descricao, preco, quantidade, categoria,
      tamanho, cor, tipo, material, composicao, idade, genero
    } = req.body;
    
    let imagemPath = null;
    if (req.file) {
      imagemPath = `/uploads/${req.file.filename}`;
    }

    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade) || 0;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    
    if (!preco || isNaN(precoNumerico) || precoNumerico <= 0) {
      return res.status(400).json({ error: "Preço válido é obrigatório" });
    }
    
    if (!categoria) {
      return res.status(400).json({ error: "Categoria é obrigatória" });
    }

    const produtoDoc = await produtosRef.doc(id).get();
    if (!produtoDoc.exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const updateData = {
      nome: nome.trim(),
      descricao: descricao ? descricao.trim() : "",
      preco: precoNumerico,
      quantidade: quantidadeNumerica,
      categoria: categoria.trim(),
      atualizado_em: admin.firestore.FieldValue.serverTimestamp()
    };
    if (imagemPath) {
      updateData.imagem = imagemPath;
    }

    if (categoria === 'masculino' || categoria === 'feminino') {
      updateData.tamanho = tamanho || "";
      updateData.cor = cor || "";
      updateData.composicao = composicao || "";
      updateData.tipo = admin.firestore.FieldValue.delete();
      updateData.material = admin.firestore.FieldValue.delete();
      updateData.idade = admin.firestore.FieldValue.delete();
      updateData.genero = admin.firestore.FieldValue.delete();
    } else if (categoria === 'acessorios') {
      updateData.tipo = tipo || "";
      updateData.material = material || "";
      updateData.cor = cor || "";
      updateData.tamanho = admin.firestore.FieldValue.delete();
      updateData.composicao = admin.firestore.FieldValue.delete();
      updateData.idade = admin.firestore.FieldValue.delete();
      updateData.genero = admin.firestore.FieldValue.delete();
    } else if (categoria === 'infantil') {
      updateData.idade = idade || "";
      updateData.genero = genero || "";
      updateData.tamanho = admin.firestore.FieldValue.delete();
      updateData.cor = admin.firestore.FieldValue.delete();
      updateData.composicao = admin.firestore.FieldValue.delete();
      updateData.tipo = admin.firestore.FieldValue.delete();
      updateData.material = admin.firestore.FieldValue.delete();
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === "" || updateData[key] === undefined || updateData[key] === null) {
        if (key !== 'tamanho' && key !== 'cor' && key !== 'composicao' && 
            key !== 'tipo' && key !== 'material' && key !== 'idade' && key !== 'genero') {
          delete updateData[key];
        }
      }
    });

    await produtosRef.doc(id).update(updateData);
    
    res.json({
      success: true,
      message: "Produto atualizado com sucesso!"
    });
    
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    
    if (error.code === 5 || error.code === 'NOT_FOUND') {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

async function verificarEstruturaFirestore() {
  try {
    console.log("🔍 Verificando estrutura do Firestore...");
    
    const produtosSnapshot = await firestore.collection("produtos").limit(1).get();
    
    if (produtosSnapshot.empty) {
      console.log("📝 Coleção 'produtos' está vazia. Estrutura pronta para uso.");
      console.log("ℹ️  A coleção será populada quando produtos forem cadastrados.");
    } else {
      console.log("✅ Coleção 'produtos' já contém documentos.");
    }
    
    const usuariosSnapshot = await firestore.collection("usuarios").limit(1).get();
    
    if (usuariosSnapshot.empty) {
      console.log("👤 Coleção 'usuarios' está vazia.");
    } else {
      console.log(`✅ Coleção 'usuarios' tem ${usuariosSnapshot.size} documento(s).`);
    }
    
  } catch (error) {
    console.error("❌ Erro ao verificar estrutura Firestore:", error);
  }
}

app.delete("/api/produtos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const produtoDoc = await produtosRef.doc(id).get();
    if (!produtoDoc.exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    
    await produtosRef.doc(id).delete();
    
    res.json({
      success: true,
      message: "Produto excluído com sucesso!"
    });
    
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

app.post("/api/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const userRecord = await auth.createUser({
      email: email,
      password: senha,
      displayName: nome,
      emailVerified: false,
    });

    await usuariosRef.doc(userRecord.uid).set({
      nome: nome,
      email: email,
      role: "user",
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      uid: userRecord.uid,
    });

    res.json({ 
      success: true, 
      message: "Usuário cadastrado com sucesso!",
      uid: userRecord.uid
    });

  } catch (error) {
    console.error("Erro no cadastro:", error);

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: "Este email já está cadastrado" });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: "Email inválido" });
    } else if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: "Senha muito fraca (mínimo 6 caracteres)" });
    }

    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const firebaseApiKey = "AIzaSyAhtHCacGDIR_49DMmVxBWuqLRocwSgRDk";
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: senha,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = "Credenciais inválidas";
      if (data.error?.message === "EMAIL_NOT_FOUND") {
        errorMsg = "Email não encontrado";
      } else if (data.error?.message === "INVALID_PASSWORD") {
        errorMsg = "Senha incorreta";
      } else if (data.error?.message === "USER_DISABLED") {
        errorMsg = "Usuário desativado";
      }
      return res.status(401).json({ error: errorMsg });
    }

    const userId = data.localId;
    const userDoc = await usuariosRef.doc(userId).get();
    
    let userData = {};
    if (userDoc.exists) {
      userData = userDoc.data();
    }

    await usuariosRef.doc(userId).update({
      ultimoLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      email: email,
      nome: userData.nome || email.split('@')[0],
      role: userData.role || 'user',
      uid: userId,
      token: data.idToken
    });

  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});
app.post("/api/esqueci-senha", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" });
  }

  try {
    const link = await auth.generatePasswordResetLink(email);
    res.json({ 
      success: true, 
      message: "Link de recuperação enviado para o email" 
    });
  } catch (error) {
    console.error("Erro ao gerar link de recuperação:", error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: "Email não cadastrado" });
    }
    
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date().toISOString(),
    firebase: "conectado"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  
  criarUsuarioAdminPadrao();
});
async function criarUsuarioAdminPadrao() {
  try {
    const adminEmail = "admin@mk-modas.com";
    
    try {
      await auth.getUserByEmail(adminEmail);
      console.log("✅ Usuário admin já existe");
    } catch {
      const userRecord = await auth.createUser({
        email: adminEmail,
        password: "Admin123!",
        displayName: "Administrador",
        emailVerified: true,
      });
      
      await usuariosRef.doc(userRecord.uid).set({
        nome: "Administrador",
        email: adminEmail,
        role: "admin",
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        uid: userRecord.uid,
      });
      
      console.log("✅ Usuário admin criado:");
      console.log("   Email: admin@mk-modas.com");
      console.log("   Senha: Admin123!");
    }
  } catch (error) {
    console.error("Erro ao verificar/criar admin:", error);
  }
}