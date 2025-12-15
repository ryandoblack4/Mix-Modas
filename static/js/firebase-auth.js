// static/js/firebase-auth.js (VAI PRO GIT)

console.log("🚀 Firebase Auth carregando...");

let firebaseApp = null;
let firebaseConfig = null;

/**
 * Carrega configuração SEGURA
 */
function loadFirebaseConfig() {
    // Se já carregou, retorna
    if (firebaseConfig) return firebaseConfig;
    
    try {
        // Tenta do window (se injetado pelo servidor)
        if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
            console.log("✅ Config carregada do window");
            firebaseConfig = window.FIREBASE_CONFIG;
            return firebaseConfig;
        }
        
        // Se estiver em desenvolvimento, tenta carregar do arquivo local
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            
            // Tenta fazer fetch do arquivo de configuração
            fetch('/static/js/firebase-config.js')
                .then(response => response.text())
                .then(text => {
                    // Extrai a configuração do arquivo JS
                    const match = text.match(/const FIREBASE_CONFIG = ({[^}]+})/);
                    if (match) {
                        try {
                            firebaseConfig = JSON.parse(match[1].replace(/(\w+):/g, '"$1":'));
                            console.log("✅ Config carregada do arquivo local");
                        } catch (e) {
                            console.error("Erro ao parsear config:", e);
                        }
                    }
                })
                .catch(e => console.log("Arquivo de config local não encontrado"));
        }
        
        // Fallback: Configuração de emergência (vai falhar, mas não expõe chaves)
        return {
            apiKey: "CONFIGURE-SUA-API-KEY",
            authDomain: "CONFIGURE-SEU-AUTH-DOMAIN",
            projectId: "CONFIGURE-SEU-PROJECT-ID",
            storageBucket: "CONFIGURE-SEU-STORAGE-BUCKET",
            messagingSenderId: "CONFIGURE-SEU-SENDER-ID",
            appId: "CONFIGURE-SEU-APP-ID"
        };
        
    } catch (error) {
        console.error("Erro ao carregar config:", error);
        return null;
    }
}

/**
 * Inicialização SEGURA
 */
function initializeFirebase() {
    if (firebaseApp) {
        console.log("✅ Firebase já inicializado");
        return firebaseApp;
    }
    
    try {
        console.log("🔄 Inicializando Firebase...");
        
        // Verificar SDK
        if (typeof firebase === 'undefined') {
            console.error("❌ Firebase SDK não carregado!");
            return null;
        }
        
        // Carregar configuração
        const config = loadFirebaseConfig();
        
        // Verificar se tem chave válida
        if (!config || config.apiKey === "CONFIGURE-SUA-API-KEY") {
            console.error("❌ API KEY não configurada!");
            console.log("⚠️ Crie o arquivo /static/js/firebase-config.js com suas chaves");
            console.log("⚠️ OU configure window.FIREBASE_CONFIG no seu HTML");
            return null;
        }
        
        // Inicializar
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(config);
            console.log("✅ Firebase inicializado com sucesso!");
        } else {
            firebaseApp = firebase.apps[0];
            console.log("✅ Firebase já estava inicializado");
        }
        
        return firebaseApp;
        
    } catch (error) {
        console.error("❌ ERRO ao inicializar Firebase:", error.message);
        return null;
    }
}

/**
 * LOGIN - Versão robusta
 */
async function loginFirebaseFrontend(email, senha) {
    console.log("🔐 Tentando login para:", email);
    
    // Inicializar
    const app = initializeFirebase();
    if (!app) {
        return {
            success: false,
            error: "⚠️ Sistema não configurado. Contate o administrador."
        };
    }
    
    // Verificar auth
    if (typeof firebase.auth !== 'function') {
        return {
            success: false,
            error: "Módulo de autenticação não disponível"
        };
    }
    
    try {
        // Login
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // Salvar dados
        localStorage.setItem('usuarioLogado', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userUID', user.uid);
        localStorage.setItem('userName', user.displayName || email.split('@')[0]);
        
        console.log("✅ LOGIN BEM-SUCEDIDO!");
        
        return {
            success: true,
            user: {
                email: user.email,
                uid: user.uid,
                nome: user.displayName || email.split('@')[0]
            }
        };
        
    } catch (error) {
        console.error("❌ ERRO NO LOGIN:", error.code);
        
        let mensagem = "Erro ao fazer login";
        switch(error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                mensagem = "Email ou senha incorretos";
                break;
            case 'auth/invalid-email':
                mensagem = "Email inválido";
                break;
            case 'auth/too-many-requests':
                mensagem = "Muitas tentativas. Tente mais tarde.";
                break;
            case 'auth/network-request-failed':
                mensagem = "Erro de conexão";
                break;
            default:
                mensagem = error.message || "Erro desconhecido";
        }
        
        return {
            success: false,
            error: mensagem
        };
    }
}

// Outras funções (simplificadas)
function verificarUsuarioLogado() {
    return localStorage.getItem('usuarioLogado') === 'true';
}

function logoutFirebase() {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userUID');
    localStorage.removeItem('userName');
    
    if (firebaseApp && typeof firebase.auth === 'function') {
        firebase.auth().signOut();
    }
    
    window.location.href = '/templates/index.html';
}

// Exportar
window.loginFirebaseFrontend = loginFirebaseFrontend;
window.verificarUsuarioLogado = verificarUsuarioLogado;
window.logoutFirebase = logoutFirebase;
window.initializeFirebase = initializeFirebase;

console.log("✅ Firebase Auth Module pronto");