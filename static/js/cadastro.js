document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('cadastroForm');
  const msg = document.getElementById('mensagem');
  
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    
    // Verificar qual formulário estamos usando
    let nome, email, senha, confirmPassword;
    
    // Para formulário com firstName/lastName
    if (document.getElementById('firstName')) {
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      nome = `${firstName} ${lastName}`;
    } else {
      nome = document.getElementById('nome').value.trim();
    }
    
    email = document.getElementById('email').value.trim();
    senha = document.getElementById('password').value.trim();
    confirmPassword = document.getElementById('confirmPassword')?.value?.trim();
    
    // Validações
    if (!nome || !email || !senha) {
      msg.textContent = 'Todos os campos são obrigatórios';
      msg.style.color = 'red';
      return;
    }
    
    if (confirmPassword && senha !== confirmPassword) {
      msg.textContent = 'As senhas não coincidem';
      msg.style.color = 'red';
      return;
    }
    
    if (senha.length < 6) {
      msg.textContent = 'A senha deve ter pelo menos 6 caracteres';
      msg.style.color = 'red';
      return;
    }
    
    const terms = document.getElementById('terms');
    if (terms && !terms.checked) {
      msg.textContent = 'Você deve aceitar os termos de uso';
      msg.style.color = 'red';
      return;
    }
    
    try {
      const res = await fetch('/api/cadastro', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({nome, email, senha}) 
      });
      
      const data = await res.json();
      
      if(res.ok && data.success){ 
        msg.textContent = 'Cadastro realizado com sucesso!';
        msg.style.color = 'green';
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          window.location.href = '/templates/tela_login.html';
        }, 2000);
      } else {
        msg.textContent = data.error || 'Erro ao cadastrar';
        msg.style.color = 'red';
      }
    } catch(error){ 
      console.error('Erro:', error);
      msg.textContent='Erro de conexão. Tente novamente.'; 
      msg.style.color = 'red';
    }
  });
});