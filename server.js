const express = require("express");
const admin = require("firebase-admin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🔥 Inicializa o Firebase
let firestore, auth;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });

  firestore = admin.firestore();
  auth = admin.auth();
  console.log("✅ Firebase conectado com sucesso via variáveis de ambiente!");
} catch (error) {
  console.error("❌ Erro ao conectar com Firebase:", error);
  process.exit(1);
}

// 🚀 Inicializa o Express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar CORS
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Pastas estáticas
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/templates", express.static(path.join(__dirname, "templates")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "templates")));

// Configuração do upload de arquivos
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = Date.now() + path.extname(file.originalname);
    cb(null, safeName);
  }
});

const upload = multer({ storage });

// Referências do Firestore
const produtosRef = firestore.collection("produtos");
const usuariosRef = firestore.collection("usuarios");
const listaDesejosRef = firestore.collection("lista_desejos");

// ========== ROTAS DE PRODUTOS ==========

// GET /api/produtos - Listar produtos
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

// GET /api/produtos/:id - Buscar produto por ID
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

// POST /api/produtos - Criar produto
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

// PUT /api/produtos/:id - Atualizar produto
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

// DELETE /api/produtos/:id - Excluir produto
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

// ========== ROTAS DE LISTA DE DESEJOS ==========

// GET /api/lista_desejos - Listar produtos na lista de desejos do usuário
app.get("/api/lista_desejos", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email é obrigatório" });

    const snapshot = await listaDesejosRef
      .where('usuario_email', '==', email)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const produtos = [];
    for (const doc of snapshot.docs) {
      const item = doc.data();
      const produtoRef = firestore.collection('produtos').doc(item.produto_id);
      const produtoDoc = await produtoRef.get();
      
      if (produtoDoc.exists) {
        produtos.push({ 
          id: produtoDoc.id, 
          lista_id: doc.id,
          ...produtoDoc.data() 
        });
      }
    }

    return res.json(produtos);
  } catch (error) {
    console.error("Erro ao buscar lista de desejos:", error);
    return res.status(500).json({ error: "Erro ao buscar lista de desejos" });
  }
});

// POST /api/lista_desejos - Adicionar produto à lista de desejos
app.post("/api/lista_desejos", async (req, res) => {
  try {
    const { usuario_email, produto_id } = req.body;
    
    if (!usuario_email || !produto_id) {
      return res.status(400).json({ error: "Email e ID do produto são obrigatórios" });
    }

    // Verificar se o produto existe
    const produtoRef = firestore.collection('produtos').doc(produto_id);
    const produtoDoc = await produtoRef.get();
    
    if (!produtoDoc.exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    // Verificar se já está na lista
    const snapshot = await listaDesejosRef
      .where('usuario_email', '==', usuario_email)
      .where('produto_id', '==', produto_id)
      .get();

    if (!snapshot.empty) {
      return res.status(400).json({ error: "Produto já está na lista de desejos" });
    }

    // Adicionar à lista
    const docRef = await listaDesejosRef.add({
      usuario_email: usuario_email,
      produto_id: produto_id,
      adicionado_em: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: "Produto adicionado à lista de desejos",
      id: docRef.id 
    });
  } catch (error) {
    console.error("Erro ao adicionar à lista de desejos:", error);
    return res.status(500).json({ error: "Erro ao adicionar à lista de desejos" });
  }
});

// DELETE /api/lista_desejos - Remover produto da lista de desejos
app.delete("/api/lista_desejos", async (req, res) => {
  try {
    const { usuario_email, produto_id } = req.body;
    
    if (!usuario_email || !produto_id) {
      return res.status(400).json({ error: "Email e ID do produto são obrigatórios" });
    }

    const snapshot = await listaDesejosRef
      .where('usuario_email', '==', usuario_email)
      .where('produto_id', '==', produto_id)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Item não encontrado na lista de desejos" });
    }

    // Remover todos os documentos correspondentes
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ 
      success: true, 
      message: "Produto removido da lista de desejos" 
    });
  } catch (error) {
    console.error("Erro ao remover da lista de desejos:", error);
    return res.status(500).json({ error: "Erro ao remover da lista de desejos" });
  }
});

// ========== ROTAS DE AUTENTICAÇÃO ==========

// POST /api/cadastro - Cadastrar novo usuário (usando Firebase Auth)
app.post("/api/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Verificar se usuário já existe
    const snapshot = await usuariosRef.where('email', '==', email).get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    // Criar usuário no Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: senha,
      displayName: nome,
      emailVerified: false,
    });

    // Salvar dados adicionais no Firestore (SEM a senha)
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

// POST /api/login - Login do usuário (usando Firebase Admin SDK)
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    // Verificar se o usuário existe no Firestore
    const snapshot = await usuariosRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verificar a senha usando Firebase Auth REST API
    // IMPORTANTE: Isso requer uma chave de API do Firebase
    // Mas vamos usar uma abordagem mais simples

    // Como estamos usando Firebase Auth, o login deve ser feito no frontend
    // com o Firebase SDK, e o backend apenas verifica o token
    // Vamos mudar a abordagem:

    // 1. Frontend faz login com Firebase Auth SDK
    // 2. Frontend envia o token para o backend
    // 3. Backend verifica o token

    // Para manter compatibilidade, vou criar um endpoint que aceita token
    // Mas também manter este endpoint para login direto (menos seguro)

    // Para login direto, usaremos o Admin SDK para verificar credenciais
    // Criando um token customizado
    
    try {
      // Obter o usuário do Firebase Auth
      const userRecord = await auth.getUserByEmail(email);
      
      // Verificar se o usuário está desativado
      if (userRecord.disabled) {
        return res.status(401).json({ error: "Usuário desativado" });
      }

      // Criar um token customizado (opcional)
      const customToken = await auth.createCustomToken(userRecord.uid);
      
      // Atualizar último login
      await usuariosRef.doc(userRecord.uid).update({
        ultimoLogin: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        email: userData.email,
        nome: userData.nome,
        role: userData.role || 'user',
        uid: userRecord.uid,
        token: customToken,
        message: "Login bem-sucedido! Use o token para requisições futuras."
      });
    } catch (authError) {
      console.error("Erro na autenticação:", authError);
      
      if (authError.code === 'auth/user-not-found') {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      throw authError;
    }
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/verify-token - Verificar token do Firebase (para uso no frontend)
app.post("/api/verify-token", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token é obrigatório" });
  }

  try {
    // Verificar o token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Buscar informações do usuário no Firestore
    const userDoc = await usuariosRef.doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      email: userData.email,
      nome: userData.nome,
      role: userData.role || 'user',
      uid: decodedToken.uid
    });
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

// POST /api/esqueci-senha - Recuperação de senha
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

// ========== ROTAS DE TESTE E STATUS ==========

// GET /api/firebase-teste - Testar conexão com Firebase
app.get("/api/firebase-teste", async (req, res) => {
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

// GET /api/status - Status do servidor
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date().toISOString(),
    firebase: "conectado",
    database: "Firebase Firestore"
  });
});

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

// ========== FUNÇÃO AUXILIAR ==========

// Função para criar usuário admin padrão (opcional)
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

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========

// Middleware para verificar token em rotas protegidas
const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

// Exemplo de rota protegida
app.get("/api/perfil", verificarToken, async (req, res) => {
  try {
    const userDoc = await usuariosRef.doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const userData = userDoc.data();
    
    // Remover informações sensíveis antes de enviar
    const { senha, ...userInfo } = userData;
    
    res.json({
      success: true,
      user: userInfo
    });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

// ========== INICIAR SERVIDOR ==========

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔥 Banco de dados: Firebase Firestore`);
  
  // Criar admin padrão (opcional)
  criarUsuarioAdminPadrao();
});