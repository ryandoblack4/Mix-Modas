// static/js/firebase-auth.js
// REMOVA AS LINHAS DE EXPORT NO FINAL DO ARQUIVO!

// ============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ============================================

let firebaseApp = null;
let firebaseInitialized = false;

/**
 * Carrega a configuração do Firebase de forma segura
 */
async function loadFirebaseConfig() {
  // Prioridade 1: Configuração global injetada pelo servidor
  if (typeof window !== 'undefined' && window.firebaseConfig) {
    console.log("✅ Configuração do Firebase carregada do window");
    return window.firebaseConfig;
  }
  
  // Prioridade 2: Arquivo de configuração local (apenas dev)
  try {
    // Para script tradicional, use uma função de callback
    if (typeof window.firebaseConfigFromFile !== 'undefined') {
      console.log("✅ Configuração do Firebase carregada do arquivo local");
      return window.firebaseConfigFromFile;
    }
  } catch (error) {
    console.log("ℹ️ Arquivo de configuração local não encontrado:", error.message);
  }
  
  // Fallback: Configuração de desenvolvimento (modo demo)
  console.warn("⚠️ Usando configuração de desenvolvimento DEMO");
  return {
    apiKey: "AIzaSyBWpN_MWnNGB7ODj-JJ3gPVTXusD3_E9W8",
    authDomain: "mixmodas-ecom.firebaseapp.com",
    projectId: "mixmodas-ecom",
    storageBucket: "mixmodas-ecom.firebasestorage.app",
    messagingSenderId: "663940847047",
    appId: "1:663940847047:web:e6d459f90a34ec51e517b4"
  };
}

/**
 * Inicializa o Firebase de forma segura
 */
async function initializeFirebase() {
  if (firebaseInitialized && firebaseApp) {
    return firebaseApp;
  }
  
  try {
    // Verificar se Firebase SDK foi carregado
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não foi carregado. Verifique se os scripts estão incluídos.");
    }
    
    // Carregar configuração
    const firebaseConfig = await loadFirebaseConfig();
    
    // Verificar se a configuração é válida
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      throw new Error("Configuração do Firebase inválida");
    }
    
    // Inicializar Firebase
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      console.log("✅ Firebase inicializado com sucesso");
    } else {
      firebaseApp = firebase.apps[0];
      console.log("✅ Firebase já estava inicializado");
    }
    
    firebaseInitialized = true;
    
    // Configurar observador de estado de autenticação
    setupAuthStateObserver();
    
    return firebaseApp;
    
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    firebaseInitialized = false;
    return null;
  }
}

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

/**
 * Faz login com email e senha
 */
async function loginFirebaseFrontend(email, senha) {
  try {
    // Inicializar Firebase se necessário
    const app = await initializeFirebase();
    if (!app) {
      return {
        success: false,
        error: "Serviço de autenticação indisponível"
      };
    }
    
    // Verificar se módulo de autenticação está disponível
    if (typeof firebase.auth !== 'function') {
      return {
        success: false,
        error: "Módulo de autenticação não carregado"
      };
    }
    
    // Fazer login
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, senha);
    const user = userCredential.user;
    
    // Obter token
    const token = await user.getIdToken();
    
    // Salvar dados no localStorage
    localStorage.setItem('firebaseToken', token);
    localStorage.setItem('userUID', user.uid);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userName', user.displayName || email.split('@')[0]);
    localStorage.setItem('usuarioLogado', 'true');
    localStorage.setItem('lastLogin', new Date().toISOString());
    
    console.log("✅ Login bem-sucedido:", user.email);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        nome: user.displayName || email.split('@')[0],
        token: token
      }
    };
    
  } catch (error) {
    console.error("❌ Erro no login:", error);
    
    let mensagemErro = "Erro ao fazer login";
    switch(error.code) {
      case 'auth/user-not-found':
        mensagemErro = "Usuário não encontrado";
        break;
      case 'auth/wrong-password':
        mensagemErro = "Senha incorreta";
        break;
      case 'auth/invalid-email':
        mensagemErro = "Email inválido";
        break;
      case 'auth/user-disabled':
        mensagemErro = "Esta conta foi desativada";
        break;
      case 'auth/too-many-requests':
        mensagemErro = "Muitas tentativas. Tente novamente mais tarde";
        break;
      case 'auth/network-request-failed':
        mensagemErro = "Erro de conexão. Verifique sua internet";
        break;
      default:
        mensagemErro = error.message || "Erro desconhecido no login";
    }
    
    return {
      success: false,
      error: mensagemErro,
      code: error.code
    };
  }
}

/**
 * Cria uma nova conta
 */
async function criarContaFirebase(email, senha, nome = "") {
  try {
    const app = await initializeFirebase();
    if (!app) {
      return {
        success: false,
        error: "Serviço de autenticação indisponível"
      };
    }
    
    // Criar usuário
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, senha);
    const user = userCredential.user;
    
    // Atualizar nome do usuário se fornecido
    if (nome) {
      await user.updateProfile({
        displayName: nome
      });
    }
    
    // Obter token
    const token = await user.getIdToken();
    
    // Salvar dados
    localStorage.setItem('firebaseToken', token);
    localStorage.setItem('userUID', user.uid);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userName', nome || email.split('@')[0]);
    localStorage.setItem('usuarioLogado', 'true');
    localStorage.setItem('accountCreated', 'true');
    
    console.log("✅ Conta criada com sucesso:", email);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        nome: nome || email.split('@')[0]
      }
    };
    
  } catch (error) {
    console.error("❌ Erro ao criar conta:", error);
    
    let mensagemErro = "Erro ao criar conta";
    switch(error.code) {
      case 'auth/email-already-in-use':
        mensagemErro = "Este email já está em uso";
        break;
      case 'auth/invalid-email':
        mensagemErro = "Email inválido";
        break;
      case 'auth/operation-not-allowed':
        mensagemErro = "Criação de conta não está habilitada";
        break;
      case 'auth/weak-password':
        mensagemErro = "Senha muito fraca. Use pelo menos 6 caracteres";
        break;
      default:
        mensagemErro = error.message || "Erro desconhecido";
    }
    
    return {
      success: false,
      error: mensagemErro
    };
  }
}

/**
 * Faz logout
 */
async function logoutFirebase() {
  try {
    // Fazer logout no Firebase
    if (firebaseInitialized && typeof firebase.auth === 'function') {
      await firebase.auth().signOut();
    }
  } catch (error) {
    console.error("❌ Erro no logout Firebase:", error);
  }
  
  // Limpar localStorage
  const itensParaRemover = [
    'usuarioLogado',
    'userRole',
    'nomeUsuario',
    'userUID',
    'userEmail',
    'userName',
    'firebaseToken',
    'lastLogin',
    'accountCreated'
  ];
  
  itensParaRemover.forEach(item => {
    localStorage.removeItem(item);
  });
  
  console.log("✅ Logout realizado");
  
  // Redirecionar para página inicial
  setTimeout(() => {
    window.location.href = '/templates/index.html';
  }, 500);
}

/**
 * Verifica se usuário está logado
 */
function verificarUsuarioLogado() {
  const logado = localStorage.getItem('usuarioLogado') === 'true';
  const token = localStorage.getItem('firebaseToken');
  return logado && token;
}

/**
 * Obtém o usuário atual
 */
function getUsuarioAtual() {
  if (!verificarUsuarioLogado()) {
    return null;
  }
  
  return {
    uid: localStorage.getItem('userUID'),
    email: localStorage.getItem('userEmail'),
    nome: localStorage.getItem('userName'),
    token: localStorage.getItem('firebaseToken')
  };
}

/**
 * Configura observador de estado de autenticação
 */
function setupAuthStateObserver() {
  if (!firebaseInitialized || typeof firebase.auth !== 'function') {
    return;
  }
  
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log("👤 Usuário autenticado:", user.email);
      user.getIdToken().then((token) => {
        localStorage.setItem('firebaseToken', token);
      });
    } else {
      console.log("👤 Usuário deslogado");
    }
  });
}

/**
 * Redefine senha
 */
async function redefinirSenha(email) {
  try {
    const app = await initializeFirebase();
    if (!app) {
      return {
        success: false,
        error: "Serviço indisponível"
      };
    }
    
    await firebase.auth().sendPasswordResetEmail(email);
    
    return {
      success: true,
      message: "Email de redefinição enviado com sucesso"
    };
    
  } catch (error) {
    console.error("❌ Erro ao redefinir senha:", error);
    
    let mensagemErro = "Erro ao enviar email de redefinição";
    switch(error.code) {
      case 'auth/user-not-found':
        mensagemErro = "Email não cadastrado";
        break;
      case 'auth/invalid-email':
        mensagemErro = "Email inválido";
        break;
      default:
        mensagemErro = error.message || "Erro desconhecido";
    }
    
    return {
      success: false,
      error: mensagemErro
    };
  }
}

/**
 * Verifica estado do Firebase (para debug)
 */
function verificarEstadoFirebase() {
  const estado = {
    sdkCarregado: typeof firebase !== 'undefined',
    firebaseInitialized: firebaseInitialized,
    firebaseApps: firebase?.apps?.length || 0,
    authDisponivel: typeof firebase?.auth === 'function',
    usuarioLogado: verificarUsuarioLogado(),
    localStorageToken: !!localStorage.getItem('firebaseToken')
  };
  
  return estado;
}

// ============================================
// EXPORTAÇÃO DAS FUNÇÕES PARA WINDOW
// ============================================

window.loginFirebaseFrontend = loginFirebaseFrontend;
window.criarContaFirebase = criarContaFirebase;
window.logoutFirebase = logoutFirebase;
window.verificarUsuarioLogado = verificarUsuarioLogado;
window.getUsuarioAtual = getUsuarioAtual;
window.redefinirSenha = redefinirSenha;
window.verificarEstadoFirebase = verificarEstadoFirebase;
window.initializeFirebase = initializeFirebase;

console.log("✅ Firebase Auth Module carregado - versão simplificada");