document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('mensagem');
  
  // Verificar se já está logado
  const usuarioLogado = localStorage.getItem('usuarioLogado');
  if (usuarioLogado) {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
      window.location.href = '/templates/lista_produtos.html';
    } else {
      window.location.href = '/templates/index.html';
    }
  }
  
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('password').value.trim();
    
    // Mostrar loading
    const btnSubmit = form.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = 'Entrando...';
    btnSubmit.disabled = true;
    msg.textContent = '';
    
    try{
      const res = await fetch('/api/login', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({email, senha}) 
      });
      
      const data = await res.json();
      
      if(res.ok && data.success){
        // Salvar dados
        localStorage.setItem('usuarioLogado', data.email);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('nomeUsuario', data.nome);
        localStorage.setItem('userUID', data.uid);
        localStorage.setItem('firebaseToken', data.token);
        
        msg.textContent = 'Login realizado com sucesso!';
        msg.style.color = 'green';
        
        // Redirecionar
        setTimeout(() => {
          if (data.role === 'admin') {
            window.location.href = '/templates/lista_produtos.html';
          } else {
            window.location.href = '/templates/index.html';
          }
        }, 1000);
        
      } else {
        msg.textContent = data.error || 'Erro no login';
        msg.style.color = 'red';
        btnSubmit.textContent = originalText;
        btnSubmit.disabled = false;
      }
    } catch(err){ 
      console.error('Erro:', err);
      msg.textContent='Erro de conexão. Tente novamente.';
      msg.style.color = 'red';
      btnSubmit.textContent = originalText;
      btnSubmit.disabled = false;
    }
  });
});