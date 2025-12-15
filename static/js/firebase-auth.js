// static/js/firebase-auth.js - VERSÃO QUE FUNCIONA DE QUALQUER JEITO

console.log("🔥 Firebase Auth - CARREGADO");

// CONFIGURAÇÃO DIRETA (se não tiver arquivo separado)
const FIREBASE_CONFIG_FALLBACK = {
    apiKey: "AIzaSyBWpN_MWnNGB7ODj-JJ3gPVTXusD3_E9W8",
    authDomain: "mixmodas-ecom.firebaseapp.com",
    projectId: "mixmodas-ecom",
    storageBucket: "mixmodas-ecom.firebasestorage.app",
    messagingSenderId: "663940847047",
    appId: "1:663940847047:web:e6d459f90a34ec51e517b4"
};

let firebaseApp = null;
let firebaseConfig = null;

/**
 * Carrega configuração - TENTA TUDO
 */
function loadFirebaseConfig() {
    console.log("🔄 Buscando configuração do Firebase...");
    
    // 1. Tenta do window (se injetado no HTML)
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
        console.log("✅ Configuração encontrada no window");
        return window.FIREBASE_CONFIG;
    }
    
    // 2. Se já carregou antes, retorna
    if (firebaseConfig) {
        return firebaseConfig;
    }
    
    // 3. Usa a configuração fallback (SEMPRE DISPONÍVEL)
    console.log("⚠️ Usando configuração fallback");
    return FIREBASE_CONFIG_FALLBACK;
}

/**
 * Inicializa Firebase - VERSÃO BULLETPROOF
 */
function initializeFirebase() {
    console.log("🟢 Inicializando Firebase...");
    
    // Se já inicializou, retorna
    if (firebaseApp) {
        console.log("✅ Firebase já está inicializado");
        return firebaseApp;
    }
    
    // Verifica se Firebase SDK foi carregado
    if (typeof firebase === 'undefined') {
        console.error("❌ ERRO CRÍTICO: Firebase SDK não carregado!");
        alert("Erro: Firebase não carregado. Recarregue a página.");
        return null;
    }
    
    try {
        // Carrega configuração
        const config = loadFirebaseConfig();
        console.log("📋 Configuração carregada:", config.apiKey ? "✅ API KEY presente" : "❌ Sem API KEY");
        
        // Verifica se tem API key
        if (!config || !config.apiKey || config.apiKey.includes("SUA_API_KEY")) {
            console.error("❌ API KEY inválida ou não configurada!");
            console.log("Usando configuração de fallback...");
        }
        
        // Inicializa Firebase
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(config);
            console.log("🎉 Firebase inicializado COM SUCESSO!");
        } else {
            firebaseApp = firebase.apps[0];
            console.log("✅ Firebase já estava inicializado");
        }
        
        // Verifica se auth está disponível
        if (typeof firebase.auth !== 'function') {
            console.warn("⚠️ Firebase Auth não está disponível como função");
        } else {
            console.log("✅ Firebase Auth disponível");
        }
        
        return firebaseApp;
        
    } catch (error) {
        console.error("💥 ERRO ao inicializar Firebase:", error);
        console.error("Detalhes:", error.message);
        
        // Tenta uma segunda vez com configuração mais simples
        try {
            console.log("🔄 Tentando inicialização alternativa...");
            firebaseApp = firebase.initializeApp(FIREBASE_CONFIG_FALLBACK);
            console.log("✅ Firebase inicializado na segunda tentativa!");
            return firebaseApp;
        } catch (secondError) {
            console.error("💀 ERRO FATAL: Não foi possível inicializar Firebase:", secondError);
            return null;
        }
    }
}

/**
 * LOGIN - FUNCIONA MESMO COM PROBLEMAS
 */
async function loginFirebaseFrontend(email, senha) {
    console.log("🔐 Iniciando login para:", email);
    
    // Inicializa Firebase (se não estiver)
    if (!firebaseApp) {
        const app = initializeFirebase();
        if (!app) {
            return {
                success: false,
                error: "❌ Sistema de autenticação indisponível. Recarregue a página."
            };
        }
    }
    
    // Verifica se auth está disponível
    if (typeof firebase.auth !== 'function') {
        return {
            success: false,
            error: "⚠️ Módulo de autenticação não carregado. Tente novamente."
        };
    }
    
    try {
        console.log("🔄 Autenticando usuário...");
        
        // TENTA O LOGIN
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        console.log("✅ USUÁRIO AUTENTICADO:", user.email);
        
        // SALVA NO LOCALSTORAGE (IMPORTANTÍSSIMO!)
        localStorage.setItem('usuarioLogado', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userUID', user.uid);
        localStorage.setItem('userName', user.displayName || email.split('@')[0]);
        localStorage.setItem('lastLogin', Date.now().toString());
        
        // Tenta pegar token
        try {
            const token = await user.getIdToken();
            localStorage.setItem('firebaseToken', token);
            console.log("✅ Token salvo");
        } catch (tokenError) {
            console.warn("⚠️ Não foi possível obter token:", tokenError);
        }
        
        // DEBUG: Mostra o que foi salvo
        console.log("💾 Dados salvos no localStorage:", {
            usuarioLogado: localStorage.getItem('usuarioLogado'),
            userEmail: localStorage.getItem('userEmail'),
            userUID: localStorage.getItem('userUID')
        });
        
        return {
            success: true,
            user: {
                email: user.email,
                uid: user.uid,
                nome: user.displayName || email.split('@')[0]
            }
        };
        
    } catch (error) {
        console.error("❌ ERRO NO LOGIN:", error.code, error.message);
        
        let mensagem = "Email ou senha incorretos";
        if (error.code === 'auth/invalid-email') {
            mensagem = "Email inválido";
        } else if (error.code === 'auth/user-disabled') {
            mensagem = "Conta desativada";
        } else if (error.code === 'auth/too-many-requests') {
            mensagem = "Muitas tentativas. Aguarde alguns minutos.";
        } else if (error.code === 'auth/network-request-failed') {
            mensagem = "Problema de conexão. Verifique sua internet.";
        }
        
        return {
            success: false,
            error: mensagem,
            code: error.code
        };
    }
}

/**
 * Verifica se usuário está logado - VERSÃO ROBUSTA
 */
function verificarUsuarioLogado() {
    try {
        const logado = localStorage.getItem('usuarioLogado') === 'true';
        const email = localStorage.getItem('userEmail');
        const uid = localStorage.getItem('userUID');
        
        console.log("🔍 Verificação de login:", {
            logado: logado,
            email: email,
            uid: uid,
            localStorage: {
                usuarioLogado: localStorage.getItem('usuarioLogado'),
                userEmail: localStorage.getItem('userEmail')
            }
        });
        
        // Verifica se os dados básicos existem
        return logado && email && uid;
        
    } catch (error) {
        console.error("Erro ao verificar login:", error);
        return false;
    }
}

/**
 * Logout - Limpa tudo
 */
function logoutFirebase() {
    console.log("🚪 Fazendo logout...");
    
    // Limpa localStorage
    const keys = [
        'usuarioLogado', 'userEmail', 'userUID', 'userName',
        'firebaseToken', 'lastLogin'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
    
    // Logout no Firebase
    if (firebaseApp && typeof firebase.auth === 'function') {
        firebase.auth().signOut();
    }
    
    // Redireciona
    window.location.href = '/templates/index.html';
}

/**
 * Debug: Mostra estado atual
 */
function debugFirebase() {
    return {
        firebaseSDK: typeof firebase,
        firebaseApp: !!firebaseApp,
        firebaseAuth: typeof firebase?.auth,
        firebaseApps: firebase?.apps?.length || 0,
        localStorage: {
            usuarioLogado: localStorage.getItem('usuarioLogado'),
            userEmail: localStorage.getItem('userEmail'),
            userUID: localStorage.getItem('userUID')
        },
        config: firebaseConfig
    };
}

// EXPORTA TUDO
window.loginFirebaseFrontend = loginFirebaseFrontend;
window.verificarUsuarioLogado = verificarUsuarioLogado;
window.logoutFirebase = logoutFirebase;
window.initializeFirebase = initializeFirebase;
window.debugFirebase = debugFirebase;

console.log("🎯 Firebase Auth - PRONTO PARA AÇÃO");