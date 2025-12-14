async function loginFirebaseFrontend(email, senha) {
  try {
    if (!window.firebase || !window.firebase.auth) {
      console.error("Firebase não está disponível");
      return { success: false, error: "Firebase não configurado" };
    }
    
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, senha);
    const user = userCredential.user;
    
    const token = await user.getIdToken();
    
    localStorage.setItem('firebaseToken', token);
    localStorage.setItem('userUID', user.uid);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userName', user.displayName || email.split('@')[0]);
    localStorage.setItem('usuarioLogado', 'true');
    
    console.log("✅ Login Firebase frontend bem-sucedido:", user.email);
    
    return { 
      success: true, 
      user: {
        uid: user.uid,
        email: user.email,
        nome: user.displayName || email.split('@')[0]
      }
    };
    
  } catch (error) {
    console.error("❌ Erro no login Firebase frontend:", error);
    
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
      default:
        mensagemErro = error.message || "Erro desconhecido";
    }
    
    return { success: false, error: mensagemErro };
  }
}

function verificarUsuarioLogado() {
  return localStorage.getItem('usuarioLogado') !== null;
}

function logoutFirebase() {
  localStorage.removeItem('usuarioLogado');
  localStorage.removeItem('userRole');
  localStorage.removeItem('nomeUsuario');
  localStorage.removeItem('userUID');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('firebaseToken');
  
  if (window.firebase && window.firebase.auth) {
    firebase.auth().signOut();
  }
  
  console.log("✅ Logout realizado");
  window.location.href = '/templates/index.html';
}

window.loginFirebaseFrontend = loginFirebaseFrontend;
window.verificarUsuarioLogado = verificarUsuarioLogado;
window.logoutFirebase = logoutFirebase;

console.log("✅ Firebase Auth functions loaded");