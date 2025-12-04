const admin = require("firebase-admin");
const serviceAccount = require("./config/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const produtosRef = firestore.collection("produtos");

async function setupProdutosCollection() {
  console.log("🔧 Configurando coleção de produtos no Firestore...");
  
  try {
    const snapshot = await produtosRef.limit(1).get();
    
    if (snapshot.empty) {
      console.log("📦 Coleção 'produtos' está vazia ou não existe.");
      console.log("✅ A coleção será criada automaticamente quando o primeiro produto for salvo.");
    } else {
      console.log("✅ Coleção 'produtos' já existe com documentos.");
    }
    
    await adicionarProdutosExemplo();
    
    console.log("🎉 Configuração do Firestore concluída!");
    
  } catch (error) {
    console.error("❌ Erro ao configurar Firestore:", error);
  }
}

async function adicionarProdutosExemplo() {
  try {
    const produtosExemplo = [
      {
        nome: "Camiseta Básica Masculina",
        descricao: "Camiseta básica de algodão 100%",
        preco: 39.90,
        quantidade: 100,
        categoria: "masculino",
        tamanho: "M",
        cor: "Branco",
        composicao: "100% Algodão",
        imagem: "/static/img/sem-foto.png",
        criado_em: admin.firestore.FieldValue.serverTimestamp(),
        atualizado_em: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        nome: "Vestido Elegante",
        descricao: "Vestido para ocasiões especiais",
        preco: 189.90,
        quantidade: 20,
        categoria: "feminino",
        tamanho: "P",
        cor: "Preto",
        composicao: "Cetim e Poliéster",
        imagem: "/static/img/sem-foto.png",
        criado_em: admin.firestore.FieldValue.serverTimestamp(),
        atualizado_em: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        nome: "Conjunto Infantil Unissex",
        descricao: "Conjunto confortável para crianças",
        preco: 69.90,
        quantidade: 50,
        categoria: "infantil",
        idade: "3-6 anos",
        genero: "Unissex",
        imagem: "/static/img/sem-foto.png",
        criado_em: admin.firestore.FieldValue.serverTimestamp(),
        atualizado_em: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        nome: "Óculos de Sol",
        descricao: "Óculos de sol com proteção UV",
        preco: 79.90,
        quantidade: 35,
        categoria: "acessorios",
        tipo: "Óculos",
        material: "Acetato",
        cor: "Preto",
        imagem: "/static/img/sem-foto.png",
        criado_em: admin.firestore.FieldValue.serverTimestamp(),
        atualizado_em: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    for (const produto of produtosExemplo) {
      await produtosRef.add(produto);
      console.log(`✅ Produto exemplo adicionado: ${produto.nome}`);
    }
    
  } catch (error) {
    console.error("❌ Erro ao adicionar produtos exemplo:", error);
  }
}

setupProdutosCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });