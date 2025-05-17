document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();

    // Initialize variables
    const token = localStorage.getItem('token');
    const novaPublicacaoBtn = document.getElementById('nova-publicacao');
    const novaPublicacaoModal = document.getElementById('nova-publicacao-modal');
    const visualizarPostModal = document.getElementById('visualizar-post-modal');
    const publicacoesLista = document.getElementById('publicacoes-lista');
    const filtroTodos = document.getElementById('filtro-todos');
    const filtroMeus = document.getElementById('filtro-meus');
    const filtroAnonimos = document.getElementById('filtro-anonimos');
    let currentFilter = 'todos';

    // Initialize Lucide icons
    lucide.createIcons();

    // Load initial posts
    carregarPublicacoes();

    // Event Listeners
    novaPublicacaoBtn.addEventListener('click', () => {
        novaPublicacaoModal.style.display = 'block';
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            novaPublicacaoModal.style.display = 'none';
            visualizarPostModal.style.display = 'none';
        });
    });

    document.getElementById('publicar-btn').addEventListener('click', publicarPost);

    // Filter buttons
    filtroTodos.addEventListener('click', () => mudarFiltro('todos'));
    filtroMeus.addEventListener('click', () => mudarFiltro('meus'));
    filtroAnonimos.addEventListener('click', () => mudarFiltro('anonimos'));

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === novaPublicacaoModal || e.target === visualizarPostModal) {
            novaPublicacaoModal.style.display = 'none';
            visualizarPostModal.style.display = 'none';
        }
    });

    // Functions
    async function carregarPublicacoes() {
        try {
            const response = await fetch(`/api/forum/posts?filtro=${currentFilter}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                renderizarPublicacoes(data);
            } else {
                alert('Erro ao carregar publicações.');
            }
        } catch (error) {
            console.error('Erro ao carregar publicações:', error);
        }
    }

    function renderizarPublicacoes(publicacoes) {
        publicacoesLista.innerHTML = '';
        
        if (publicacoes.length === 0) {
            publicacoesLista.innerHTML = `
                <div class="no-posts">
                    <i data-lucide="message-square"></i>
                    <p>Nenhuma publicação encontrada.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const currentUsername = getUserId();
        console.log('Current username:', currentUsername);

        publicacoes.forEach(post => {
            console.log('Post autor_id:', post.autor_id, 'Current user:', currentUsername, 'Should show delete:', post.autor_id === currentUsername);
            
            const postElement = document.createElement('div');
            postElement.className = 'post-item';
            postElement.innerHTML = `
                <div class="post-header">
                    <div class="post-author">
                        ${post.anonimo ? 
                            '<i data-lucide="user-x"></i> Anónimo' : 
                            `<span>${post.autor_nome}</span>`
                        }
                    </div>
                    <div class="post-date">${formatarData(new Date(post.data_criacao))}</div>
                </div>
                <h3 class="post-title">${post.titulo}</h3>
                <p class="post-preview">${post.conteudo.substring(0, 200)}${post.conteudo.length > 200 ? '...' : ''}</p>
                <div class="post-footer">
                    <span class="comentarios-count">
                        <i data-lucide="message-circle"></i>
                        ${post.num_comentarios} comentários
                    </span>
                    ${post.autor_id === currentUsername ? `
                        <button class="delete-btn delete-post" data-post-id="${post.id}" title="Apagar publicação">
                            <i data-lucide="trash-2"></i>
                            Apagar
                        </button>
                    ` : ''}
                </div>
            `;

            const deleteBtn = postElement.querySelector('.delete-post');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja apagar esta publicação? Esta ação não pode ser desfeita.')) {
                        await apagarPost(post.id);
                    }
                });
            }

            postElement.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) {
                    abrirPost(post.id);
                }
            });

            publicacoesLista.appendChild(postElement);
        });

        lucide.createIcons();
    }

    async function publicarPost() {
        const titulo = document.getElementById('titulo-post').value.trim();
        const conteudo = document.getElementById('conteudo-post').value.trim();
        const anonimo = document.getElementById('post-anonimo').checked;

        if (!titulo || !conteudo) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            const response = await fetch('/api/forum/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    titulo,
                    conteudo,
                    anonimo
                })
            });

            if (response.ok) {
                novaPublicacaoModal.style.display = 'none';
                document.getElementById('titulo-post').value = '';
                document.getElementById('conteudo-post').value = '';
                document.getElementById('post-anonimo').checked = false;
                await carregarPublicacoes();
            } else {
                const data = await response.json();
                alert(data.error || 'Erro ao publicar. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao publicar:', error);
            alert('Erro ao publicar. Tente novamente.');
        }
    }

    async function abrirPost(postId) {
        try {
            const response = await fetch(`/api/forum/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const post = await response.json();

            if (response.ok) {
                const postModal = document.getElementById('visualizar-post-modal');
                postModal.dataset.postId = postId;
                document.getElementById('post-titulo').textContent = post.titulo;
                document.getElementById('post-detalhes').innerHTML = `
                    <div class="post-header">
                        <div class="post-author">
                            ${post.anonimo ? 
                                '<i data-lucide="user-x"></i> Anónimo' : 
                                `<span>${post.autor_nome}</span>`
                            }
                        </div>
                        <div class="post-date">${formatarData(new Date(post.data_criacao))}</div>
                    </div>
                    <div class="post-content">${post.conteudo}</div>
                `;

                renderizarComentarios(post.comentarios);
                postModal.style.display = 'block';
                lucide.createIcons();

                // Setup comment submission
                const enviarComentarioBtn = document.getElementById('enviar-comentario');
                enviarComentarioBtn.onclick = () => enviarComentario(postId);
            }
        } catch (error) {
            console.error('Erro ao abrir post:', error);
        }
    }

    function renderizarComentarios(comentarios) {
        const comentariosDiv = document.getElementById('post-comentarios');
        comentariosDiv.innerHTML = `<h3>${comentarios.length} Comentários</h3>`;

        const currentUsername = getUserId();
        console.log('Current username for comments:', currentUsername);

        comentarios.forEach(comentario => {
            console.log('Comment autor_id:', comentario.autor_id, 'Current user:', currentUsername, 'Should show delete:', comentario.autor_id === currentUsername);
            
            const comentarioElement = document.createElement('div');
            comentarioElement.className = 'comentario';
            comentarioElement.innerHTML = `
                <div class="comentario-header">
                    <div class="comentario-author">
                        ${comentario.anonimo ? 
                            '<i data-lucide="user-x"></i> Anónimo' : 
                            `<span>${comentario.autor_nome}</span>`
                        }
                        <span class="comentario-date">${formatarData(new Date(comentario.data_criacao))}</span>
                    </div>
                    ${comentario.autor_id === currentUsername ? `
                        <button class="delete-btn delete-comment" data-comentario-id="${comentario.id}" title="Apagar comentário">
                            <i data-lucide="trash-2"></i>
                            Apagar
                        </button>
                    ` : ''}
                </div>
                <div class="comentario-content">${comentario.conteudo}</div>
            `;

            const deleteBtn = comentarioElement.querySelector('.delete-comment');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const comentarioId = e.currentTarget.dataset.comentarioId;
                    if (confirm('Tem certeza que deseja apagar este comentário? Esta ação não pode ser desfeita.')) {
                        await apagarComentario(comentarioId);
                        const postId = document.getElementById('visualizar-post-modal').dataset.postId;
                        await abrirPost(postId);
                    }
                });
            }

            comentariosDiv.appendChild(comentarioElement);
        });

        lucide.createIcons();
    }

    async function enviarComentario(postId) {
        const conteudo = document.getElementById('novo-comentario').value.trim();
        const anonimo = document.getElementById('comentario-anonimo').checked;

        if (!conteudo) {
            alert('Por favor, escreva um comentário.');
            return;
        }

        try {
            const response = await fetch(`/api/forum/posts/${postId}/comentarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    conteudo,
                    anonimo
                })
            });

            if (response.ok) {
                document.getElementById('novo-comentario').value = '';
                document.getElementById('comentario-anonimo').checked = false;
                await abrirPost(postId); // Recarrega o post com os novos comentários
            } else {
                alert('Erro ao enviar comentário. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao enviar comentário:', error);
            alert('Erro ao enviar comentário. Tente novamente.');
        }
    }

    async function apagarPost(postId) {
        try {
            const response = await fetch(`/api/forum/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                await carregarPublicacoes();
                const postModal = document.getElementById('visualizar-post-modal');
                if (postModal.style.display === 'block') {
                    postModal.style.display = 'none';
                }
            } else {
                const data = await response.json();
                alert(data.error || 'Erro ao apagar publicação.');
            }
        } catch (error) {
            console.error('Erro ao apagar publicação:', error);
            alert('Erro ao apagar publicação.');
        }
    }

    async function apagarComentario(comentarioId) {
        try {
            const response = await fetch(`/api/forum/comentarios/${comentarioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || 'Erro ao apagar comentário.');
            }
        } catch (error) {
            console.error('Erro ao apagar comentário:', error);
            alert('Erro ao apagar comentário.');
        }
    }

    function mudarFiltro(filtro) {
        currentFilter = filtro;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`filtro-${filtro}`).classList.add('active');
        carregarPublicacoes();
    }

    // Helper functions
    function formatarData(data) {
        return data.toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getUserId() {
        const username = localStorage.getItem('username');
        console.log('getUserId called, username:', username);
        return username;
    }
}); 