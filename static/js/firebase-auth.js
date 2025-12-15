// static/js/firebase-auth.js

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
    // Tentar carregar como módulo ES6
    const module = await import('./firebase-config.js');
    const config = module.default || module.firebaseConfig;
    if (config && config.apiKey && config.apiKey !== "SUA_API_KEY_AQUI") {
      console.log("✅ Configuração do Firebase carregada do arquivo local");
      return config;
    }
  } catch (error) {
    console.log("ℹ️ Arquivo de configuração local não encontrado:", error.message);
  }
  
  // Prioridade 3: Buscar do backend (recomendado para produção)
  try {
    const response = await fetch('/api/firebase-config');
    if (response.ok) {
      const config = await response.json();
      if (config.apiKey) {
        console.log("✅ Configuração do Firebase carregada do backend");
        return config;
      }
    }
  } catch (error) {
    console.log("ℹ️ Não foi possível obter configuração do backend:", error.message);
  }
  
  // Fallback: Configuração de desenvolvimento (modo demo)
  console.warn("⚠️ Usando configuração de desenvolvimento DEMO");
  return {
    apiKey: "demo-key-for-development-only",
    authDomain: "demo.firebaseapp.com",
    projectId: "demo-project-mixmodas",
    storageBucket: "demo-project-mixmodas.appspot.com",
    messagingSenderId: "123456789000",
    appId: "1:123456789000:web:abc123def456",
    measurementId: "G-XXXXXXXXXX"
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
    
    // Verificar se é chave de demo
    if (firebaseConfig.apiKey.includes('demo-key') || 
        firebaseConfig.apiKey === 'SUA_API_KEY_AQUI') {
      console.warn("⚠️ Usando chave de DEMO - Configure o Firebase para produção");
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
    
    // Enviar token para o backend (opcional)
    await sendTokenToBackend(token);
    
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
      case 'auth/operation-not-allowed':
        mensagemErro = "Login com email/senha não está habilitado";
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
  
  // Limpar sessionStorage também
  sessionStorage.clear();
  
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
  
  // Verificar se token não expirou (simples verificação)
  const lastLogin = localStorage.getItem('lastLogin');
  if (lastLogin) {
    const loginTime = new Date(lastLogin);
    const agora = new Date();
    const horasDesdeLogin = (agora - loginTime) / (1000 * 60 * 60);
    
    // Se passou mais de 24 horas, considerar como deslogado
    if (horasDesdeLogin > 24) {
      logoutFirebase();
      return false;
    }
  }
  
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
 * Envia token para o backend (opcional)
 */
async function sendTokenToBackend(token) {
  try {
    const response = await fetch('/api/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    });
    
    if (response.ok) {
      console.log("✅ Token verificado no backend");
    }
  } catch (error) {
    console.warn("⚠️ Não foi possível verificar token no backend:", error.message);
  }
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
      // Usuário logado
      console.log("👤 Usuário autenticado:", user.email);
      
      // Atualizar token se necessário
      user.getIdToken().then((token) => {
        localStorage.setItem('firebaseToken', token);
      });
    } else {
      // Usuário deslogado
      console.log("👤 Usuário deslogado");
      
      // Só limpar localStorage se não estiver em modo "lembrar-me"
      const lembrarMe = localStorage.getItem('lembrarMe');
      if (lembrarMe !== 'true') {
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('usuarioLogado');
      }
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
    configCarregada: !!firebaseApp,
    usuarioLogado: verificarUsuarioLogado(),
    modoDemo: false
  };
  
  // Verificar se está usando chave de demo
  if (firebaseApp && firebaseApp.options && firebaseApp.options.apiKey) {
    estado.modoDemo = firebaseApp.options.apiKey.includes('demo-key') || 
                     firebaseApp.options.apiKey === 'SUA_API_KEY_AQUI';
  }
  
  return estado;
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Inicializar Firebase quando a página carregar
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Só inicializar se não for uma página pública que não precisa de auth
    const paginasSemAuth = ['/templates/index.html', '/templates/sobre.html'];
    const paginaAtual = window.location.pathname;
    
    const precisaAuth = !paginasSemAuth.some(pagina => 
      paginaAtual.includes(pagina)
    );
    
    if (precisaAuth || localStorage.getItem('usuarioLogado') === 'true') {
      await initializeFirebase();
    }
  });
}

// ============================================
// EXPORTAÇÃO DAS FUNÇÕES
// ============================================

if (typeof window !== 'undefined') {
  window.loginFirebaseFrontend = loginFirebaseFrontend;
  window.criarContaFirebase = criarContaFirebase;
  window.logoutFirebase = logoutFirebase;
  window.verificarUsuarioLogado = verificarUsuarioLogado;
  window.getUsuarioAtual = getUsuarioAtual;
  window.redefinirSenha = redefinirSenha;
  window.verificarEstadoFirebase = verificarEstadoFirebase;
  window.initializeFirebase = initializeFirebase;
  
  console.log("✅ Firebase Auth Module carregado");
}

// Export para módulos ES6 (se necessário)
export {
  loginFirebaseFrontend,
  criarContaFirebase,
  logoutFirebase,
  verificarUsuarioLogado,
  getUsuarioAtual,
  redefinirSenha,
  verificarEstadoFirebase,
  initializeFirebase
};