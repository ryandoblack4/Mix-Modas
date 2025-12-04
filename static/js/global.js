function atualizarEstadoLogin() {
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    const loginLink = document.getElementById('loginLink');
    
    if (loginLink && usuarioLogado) {
        const nomeUsuario = localStorage.getItem('nomeUsuario') || usuarioLogado.split('@')[0];
        loginLink.innerHTML = `👤 ${nomeUsuario}`;
        loginLink.href = "#";
        loginLink.onclick = function(e) {
            e.preventDefault();
            fazerLogout();
        };
    } else if (loginLink) {
        loginLink.innerHTML = '👤 Entrar';
        loginLink.href = "/templates/tela_login.html";
        loginLink.onclick = null;
    }
}

function fazerLogout() {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('userRole');
    localStorage.removeItem('nomeUsuario');
    localStorage.removeItem('userUID');
    localStorage.removeItem('firebaseToken');
    
    // Atualizar estado imediatamente
    atualizarEstadoLogin();
    window.location.href = '/templates/index.html';
}

function atualizarCarrinhoVisual() {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const total = carrinho.reduce((t, p) => t + (p.quantidade || 0), 0);
    const link = document.getElementById('carrinhoLink');
    if (link) link.textContent = `🛒 Carrinho (${total})`;
}

function atualizarFavoritosVisual() {
    const fav = JSON.parse(localStorage.getItem('favoritos')) || [];
    const link = document.getElementById('listaDesejosLink');
    if (link) link.textContent = `❤️ Lista de Desejos (${fav.length})`;
}

// Adicionar menu admin se for admin
function adicionarMenuAdmin() {
    const userRole = localStorage.getItem('userRole');
    const iconsDiv = document.querySelector('.icons');
    
    if (userRole === 'admin' && iconsDiv && !document.getElementById('adminLink')) {
        const adminLink = document.createElement('a');
        adminLink.id = 'adminLink';
        adminLink.href = '/templates/lista_produtos.html';
        adminLink.innerHTML = '👑 Admin';
        adminLink.style.color = '#ff6600';
        adminLink.style.fontWeight = 'bold';
        adminLink.style.marginRight = '15px';
        iconsDiv.insertBefore(adminLink, iconsDiv.firstChild);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    atualizarEstadoLogin();
    atualizarCarrinhoVisual();
    atualizarFavoritosVisual();
    adicionarMenuAdmin();
});

// Exportar funções para uso global
window.atualizarEstadoLogin = atualizarEstadoLogin;
window.fazerLogout = fazerLogout;
window.atualizarCarrinhoVisual = atualizarCarrinhoVisual;
window.atualizarFavoritosVisual = atualizarFavoritosVisual;