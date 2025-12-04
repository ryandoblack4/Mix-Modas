document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('produtoForm');
  const editingIdInput = document.getElementById('editingId');
  const categoriaSelect = document.getElementById('categoria');

  const camposRoupas = document.getElementById('camposRoupas');
  const camposAcessorios = document.getElementById('camposAcessorios');
  const camposInfantil = document.getElementById('camposInfantil');

  function atualizarCamposDinamicos(categoria) {
    camposRoupas.classList.add('hidden');
    camposAcessorios.classList.add('hidden');
    camposInfantil.classList.add('hidden');

    if (categoria === 'masculino' || categoria === 'feminino') {
      camposRoupas.classList.remove('hidden');
    } else if (categoria === 'acessorios') {
      camposAcessorios.classList.remove('hidden');
    } else if (categoria === 'infantil') {
      camposInfantil.classList.remove('hidden');
    }
  }

  categoriaSelect.addEventListener('change', (e) => {
    atualizarCamposDinamicos(e.target.value);
  });

  const params = new URLSearchParams(window.location.search);
  const idToEdit = params.get('id');

  if (idToEdit) {
    fetch('/api/produtos')
      .then(r => r.json())
      .then(list => {
        const p = list.find(x => String(x.id) === String(idToEdit));
        if (p) {
          document.getElementById('nome').value = p.nome;
          categoriaSelect.value = p.categoria;
          atualizarCamposDinamicos(p.categoria);

          document.getElementById('descricao').value = p.descricao;
          document.getElementById('preco').value = p.preco;
          document.getElementById('quantidade').value = p.quantidade;

          if (p.categoria === 'masculino' || p.categoria === 'feminino') {
            document.getElementById('tamanhoRoupa').value = p.tamanho || '';
            document.getElementById('corRoupa').value = p.cor || '';
            document.getElementById('composicao').value = p.composicao || '';
          } else if (p.categoria === 'acessorios') {
            document.getElementById('tipoAcessorio').value = p.tipo || '';
            document.getElementById('materialAcessorio').value = p.material || '';
            document.getElementById('corAcessorio').value = p.cor || '';
          } else if (p.categoria === 'infantil') {
            document.getElementById('idadeRecomendada').value = p.idade || '';
            document.getElementById('generoInfantil').value = p.genero || '';
          }

          editingIdInput.value = idToEdit;
        }
      });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    const categoria = categoriaSelect.value;

    formData.append('nome', document.getElementById('nome').value.trim());
    formData.append('categoria', categoria);
    formData.append('descricao', document.getElementById('descricao').value.trim());
    formData.append('preco', parseFloat(document.getElementById('preco').value));
    formData.append('quantidade', parseInt(document.getElementById('quantidade').value));

    if (categoria === 'masculino' || categoria === 'feminino') {
      formData.append('tamanho', document.getElementById('tamanhoRoupa').value);
      formData.append('cor', document.getElementById('corRoupa').value);
      formData.append('composicao', document.getElementById('composicao').value);
    } else if (categoria === 'acessorios') {
      formData.append('tipo', document.getElementById('tipoAcessorio').value);
      formData.append('material', document.getElementById('materialAcessorio').value);
      formData.append('cor', document.getElementById('corAcessorio').value);
    } else if (categoria === 'infantil') {
      formData.append('idade', document.getElementById('idadeRecomendada').value);
      formData.append('genero', document.getElementById('generoInfantil').value);
    }

    const imagem = document.getElementById('imagem').files[0];
    if (imagem) formData.append('imagem', imagem);

    const editId = editingIdInput.value;

    try {
      const roleHeader = { role: localStorage.getItem('userRole') };
      let res;

      if (editId) {
        res = await fetch('/api/produtos/' + editId, { method: 'PUT', body: formData, headers: roleHeader });
      } else {
        res = await fetch('/api/produtos', { method: 'POST', body: formData, headers: roleHeader });
      }

      const resBody = await res.json().catch(() => null);
      if (res.ok) {
        alert(editId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado!');
        window.location.href = '/templates/lista_produtos.html';
      } else {
        const msg = resBody?.error || resBody?.message || 'Erro ao salvar produto.';
        throw new Error(msg);
      }
    } catch (err) {
      alert(err.message);
    }
  });
});
