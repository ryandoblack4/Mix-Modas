(function () {
  function placeholder() { return '/static/img/sem-foto.png'; }
  function safeLower(s){ return (s || '').toString().toLowerCase(); }

  const grids = Array.from(document.querySelectorAll('[id$="-grid"], .produtos-grid'));
  const idadeSelect = document.getElementById('idadeSelect');
  const generoSelect = document.getElementById('generoSelect');
  const tamanhoSelect = document.getElementById('tamanhoSelect');
  const corSelect = document.getElementById('corSelect');
  const tipoSelect = document.getElementById('tipoSelect');
  const ordenarSelect = document.getElementById('ordenarSelect');
  const searchInput = document.getElementById('searchInput');

  function atualizarCarrinhoVisual() {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const total = carrinho.reduce((t, p) => t + (p.quantidade || 0), 0);
    const link = document.getElementById('carrinhoLink');
    if (link) link.textContent = `🛒 Seu Carrinho (${total})`;
  }
  function atualizarFavoritosVisual() {
    const fav = JSON.parse(localStorage.getItem('favoritos')) || [];
    const link = document.getElementById('listaDesejosLink');
    if (link) link.textContent = `❤️ Lista de Desejos (${fav.length})`;
  }

  function adicionarAoCarrinho(prod) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const idx = carrinho.findIndex(p => String(p.id) === String(prod.id));
    if (idx >= 0) carrinho[idx].quantidade = (carrinho[idx].quantidade || 0) + 1;
    else carrinho.push({ ...prod, quantidade: 1 });
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinhoVisual();
    alert(`${prod.nome} adicionado ao carrinho!`);
  }

  function adicionarFavorito(prod, btn) {
    let fav = JSON.parse(localStorage.getItem('favoritos')) || [];
    if (!fav.find(p => String(p.id) === String(prod.id))) {
      fav.push(prod);
      localStorage.setItem('favoritos', JSON.stringify(fav));
      if (btn) btn.textContent = '❤️';
      atualizarFavoritosVisual();
      alert(`${prod.nome} adicionado aos favoritos!`);
    } else {
      alert(`${prod.nome} já está nos favoritos.`);
    }
  }
  const produtosMasculinos = [
    { id: 1, nome: "Camisa Polo", preco: 99.9, tamanho: "M", cor: "Azul", categoria: "masculino", imagem: "https://www.lojamirante.com.br/uploads/produtos/camisa-polo-pa-azul-royal-617cb70f9d839.jpg" },
    { id: 2, nome: "Camiseta", preco: 49.9, tamanho: "G", cor: "Branco", categoria: "masculino", imagem: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop" },
    { id: 4, nome: "Jaqueta", preco: 199.9, tamanho: "G", cor: "Preto", categoria: "masculino", imagem: "https://cdn.awsli.com.br/1274/1274265/produto/257909785/15999-jaqueta-black-jeans-preta-frente1-wwk0o7023k.png" },
    { id: 5, nome: "Camiseta", preco: 59.9, tamanho: "P", cor: "Cinza", categoria: "masculino", imagem: "https://static.riachuelo.com.br/RCHLO/KIT800488/portrait/a965f8fc74db3dc29e07619053b5707f5eb2c189.jpg?imwidth=700" },
    { id: 6, nome: "Camisa Social", preco: 149.9, tamanho: "M", cor: "Branco", categoria: "masculino", imagem: "https://static.dafiti.com.br/p/Olimpo-Camisaria-Camisa-Social-Slim-Masculina-Olimpo-Lisa-Manga-Longa-Branca-3621-7700956-1-zoom.jpg" }
  ];

  const produtosFemininos = [
    { id: 7, nome: "Vestido Floral Verão", preco: 89.9, tamanho: "M", cor: "Azul", categoria: "feminino", imagem: "https://s.emporionm.com.br/import/zip.zip/NM003311_1.jpg?format=webp" },
    { id: 8, nome: "Blusa Manga Longa", preco: 69.9, tamanho: "P", cor: "Rosa", categoria: "feminino", imagem: "https://acdn-us.mitiendanube.com/stores/874/674/products/blusa_bata_feminina_laise_rosa-e8b4fa50ff91d46c5c17135614308574-1024-1024.jpg" },
    { id: 9, nome: "Calça Jeans Skinny", preco: 119.9, tamanho: "G", cor: "Azul", categoria: "feminino", imagem: "https://adaptive-images.uooucdn.com.br/tr:w-1100,h-1594,c-at_max,pr-true,q-90/a22469-ogxytnlhdz0/pv/3d/b4/5e/184de1bee731a6ee7fc8e420c6.jpg" }
  ];

  const produtosInfantis = [
    { id: 13, nome: "Conjunto Esportivo Menino", preco: 59.9, idade: "3-6 anos", genero: "Menino", categoria: "infantil", imagem: "https://static.ecosweb.com.br/public/produtos/roupa-para-menino/conjunto-inverno/conjunto-esportivo-basquete-menino-marrom_790742_600_1.webp" },
    { id: 14, nome: "Vestido Infantil Florido", preco: 49.9, idade: "3-6 anos", genero: "Menina", categoria: "infantil", imagem: "https://images.tcdn.com.br/img/img_prod/754301/vestido_infantil_festa_floral_rosas_797_1_c1cf011adbc6d831f3772288d7bce660.jpg" }
  ];

  const produtosAcessorios = [
    { id: 19, nome: "Bolsa de Couro", preco: 129.9, tipo: "Bolsa", cor: "Marrom", categoria: "acessorios", imagem: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" },
    { id: 20, nome: "Óculos de Sol", preco: 79.9, tipo: "Óculos", cor: "Preto", categoria: "acessorios", imagem: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop" }
  ];

  async function carregarGrid(gridEl) {
    try {
      const categoria = (gridEl.dataset.categoria || '').toString().trim();
      console.log('Carregando categoria:', categoria || '(todas)');

      let list = [];

      try {
        const url = categoria ? `/api/produtos?categoria=${encodeURIComponent(categoria)}` : '/api/produtos';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          list = data;
          console.log('Produtos carregados do backend:', list.length);
        } else {
          console.warn('Resposta do backend não é array, fallback para listas locais');
          list = [];
        }
      } catch (e) {
        console.warn('Falha ao buscar do backend:', e.message);
        list = [];
      }

      if (!list || list.length === 0) {
        const catLower = safeLower(categoria);
        if (catLower === 'masculino') list = produtosMasculinos.slice();
        else if (catLower === 'feminino') list = produtosFemininos.slice();
        else if (catLower === 'infantil') list = produtosInfantis.slice();
        else if (catLower === 'acessorios') list = produtosAcessorios.slice();
        else {
          if (list.length === 0) {
            list = [].concat(produtosMasculinos, produtosFemininos, produtosInfantis, produtosAcessorios);
          }
        }
      }

      let idadeFilter = 'Todas', generoFilter = 'Todos', tamanhoFilter = 'Todos', corFilter = 'Todas', tipoFilter = 'Todos';
      if (safeLower(categoria) === 'infantil') {
        idadeFilter = document.getElementById('idadeSelect')?.value || 'Todas';
        generoFilter = document.getElementById('generoSelect')?.value || 'Todos';
      } else if (safeLower(categoria) === 'acessorios') {
        tipoFilter = document.getElementById('tipoSelect')?.value || 'Todos';
        corFilter = document.getElementById('corSelect')?.value || 'Todas';
      } else {
        tamanhoFilter = document.getElementById('tamanhoSelect')?.value || 'Todos';
        corFilter = document.getElementById('corSelect')?.value || 'Todas';
      }
      const ordenar = document.getElementById('ordenarSelect')?.value || 'Mais vendidos';

      const termoSearch = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

      let produtos = list.filter(p => {
        const passaCategoria = categoria ? safeLower(p.categoria || '') === safeLower(categoria) : true;

        const passaSearch = !termoSearch || (p.nome && p.nome.toString().toLowerCase().includes(termoSearch)) || (p.descricao && p.descricao.toString().toLowerCase().includes(termoSearch));

        let passaFiltros = true;
        if (safeLower(categoria) === 'infantil') {
          passaFiltros = (idadeFilter === 'Todas' || p.idade === idadeFilter) && (generoFilter === 'Todos' || p.genero === generoFilter);
        } else if (safeLower(categoria) === 'acessorios') {
          passaFiltros = (tipoFilter === 'Todos' || p.tipo === tipoFilter) && (corFilter === 'Todas' || (p.cor || '').toString() === corFilter);
        } else {
          passaFiltros = (tamanhoFilter === 'Todos' || (p.tamanho || '') === tamanhoFilter) && (corFilter === 'Todas' || (p.cor || '') === corFilter);
        }

        return passaCategoria && passaSearch && passaFiltros;
      });

      console.log('Produtos após filtro:', produtos.map(x => x.nome).slice(0, 10));

      if (ordenar === 'Menor preço') produtos.sort((a, b) => (a.preco || 0) - (b.preco || 0));
      else if (ordenar === 'Maior preço') produtos.sort((a, b) => (b.preco || 0) - (a.preco || 0));
      else if (ordenar === 'Mais vendidos') produtos.sort((a, b) => (a.id || 0) - (b.id || 0));
      else if (ordenar === 'Lançamentos') produtos.sort((a, b) => (b.id || 0) - (a.id || 0));

      gridEl.innerHTML = '';
      if (!produtos || produtos.length === 0) {
        gridEl.innerHTML = '<p>Nenhum produto encontrado com esses filtros.</p>';
        return;
      }

      produtos.forEach(p => {
        const card = document.createElement('article');
        card.className = 'produto-card';

        let infoExtra = '';
        if (safeLower(categoria) === 'infantil') {
          infoExtra = `<p class="produto-idade">Idade: ${p.idade || ''}</p><p class="produto-genero">Gênero: ${p.genero || ''}</p>`;
        } else if (safeLower(categoria) === 'acessorios') {
          infoExtra = `<p class="produto-tipo">Tipo: ${p.tipo || ''}</p><p class="produto-cor">Cor: ${p.cor || ''}</p>`;
        } else {
          infoExtra = `<p class="produto-tamanho">Tamanho: ${p.tamanho || ''}</p><p class="produto-cor">Cor: ${p.cor || ''}</p>`;
        }

        card.innerHTML = `
          ${p.preco ? `<div class="produto-tag"></div>` : ''}
          <img src="${p.imagem && p.imagem.trim() !== '' ? p.imagem : placeholder()}" alt="${p.nome || ''}" class="produto-imagem">
          <div class="produto-info">
            <h3 class="produto-titulo">${p.nome || ''}</h3>
            <p class="produto-preco">R$ ${Number(p.preco || 0).toFixed(2)}</p>
            ${infoExtra}
            <div class="produto-acoes">
              <button class="btn-carrinho">Adicionar</button>
              <button class="btn-favorito">🤍</button>
            </div>
          </div>
        `;
        const btnCarrinho = card.querySelector('.btn-carrinho');
        if (btnCarrinho) btnCarrinho.addEventListener('click', () => adicionarAoCarrinho(p));
        const btnFav = card.querySelector('.btn-favorito');
        if (btnFav) btnFav.addEventListener('click', (e) => adicionarFavorito(p, e.currentTarget));

        gridEl.appendChild(card);
      });

      atualizarCarrinhoVisual();
      atualizarFavoritosVisual();

    } catch (err) {
      console.error('Erro ao carregar produtos por categoria:', err);
      gridEl.innerHTML = '<p>Erro ao carregar produtos.</p>';
    }
  }

  grids.forEach(g => {
    if (g && g.classList && g.classList.contains('produtos-grid')) {
      carregarGrid(g);
    }
  });
  [idadeSelect, generoSelect, tamanhoSelect, corSelect, tipoSelect, ordenarSelect].forEach(sel => {
    if (sel) {
      sel.addEventListener('change', () => {
        grids.forEach(g => { if (g && g.classList && g.classList.contains('produtos-grid')) carregarGrid(g); });
      });
    }
  });

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        grids.forEach(g => { if (g && g.classList && g.classList.contains('produtos-grid')) carregarGrid(g); });
      }
    });
  }

  window.refreshCategoriaGrids = function() {
    grids.forEach(g => { if (g && g.classList && g.classList.contains('produtos-grid')) carregarGrid(g); });
  };

})();
