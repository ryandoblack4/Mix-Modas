document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('#tabela tbody');
  const busca = document.getElementById('busca');
  const btnAtualizar = document.getElementById('btnAtualizar');

  async function carregar(filtro = '') {
    try {
      const res = await fetch('/api/produtos');

      if (!res.ok) {
        throw new Error(`Erro ao buscar produtos: ${res.status}`);
      }

      const list = await res.json();

      if (!Array.isArray(list)) {
        throw new Error("Resposta inesperada do servidor");
      }

      tbody.innerHTML = '';

      list
        .filter(p => p.nome && p.nome.toLowerCase().includes(filtro.toLowerCase()))
        .forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="imgcell">
              <img src="${p.imagem && p.imagem.trim() !== '' ? p.imagem : '/static/img/sem-foto.png'}" 
                   alt="${p.nome}" width="70" height="70">
            </td>
            <td class="namecell">
              ${p.nome}
              <div class="cat">${p.categoria || 'Sem categoria'}</div>
            </td>
            <td class="desccell">${p.descricao || ''}</td>
            <td class="pricecell">R$ ${Number(p.preco || 0).toFixed(2)}</td>
            <td class="qtdcell">${p.quantidade || 0}</td>
            <td class="actions">
              <button data-id="${p.id}" class="edit btn small">Editar</button>
              <button data-id="${p.id}" class="del btn danger small">Excluir</button>
            </td>`;
          tbody.appendChild(tr);
        });

      if (tbody.children.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum produto encontrado.</td></tr>`;
      }

      tbody.querySelectorAll('.edit').forEach(btn =>
        btn.addEventListener('click', e => {
          const id = e.currentTarget.dataset.id;
          window.location.href = '/templates/cadastro_produtos.html?id=' + id;
        })
      );

      tbody.querySelectorAll('.del').forEach(btn =>
        btn.addEventListener('click', async e => {
          const id = e.currentTarget.dataset.id;
          if (!confirm('Tem certeza que deseja excluir este produto?')) return;

          try {
            const r = await fetch('/api/produtos/' + id, {
              method: 'DELETE',
              headers: { role: localStorage.getItem('userRole') || '' }
            });

            if (!r.ok) {
              const msg = await r.text();
              alert('Erro ao excluir: ' + msg);
            } else {
              alert('Produto excluído com sucesso!');
              carregar(busca.value);
            }
          } catch (delErr) {
            console.error(delErr);
            alert('Erro de conexão ao excluir o produto.');
          }
        })
      );

    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Erro ao carregar produtos.</td></tr>';
    }
  }

  busca.addEventListener('input', e => carregar(e.target.value));

  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', () => carregar(busca.value));
  }

  carregar();
});
