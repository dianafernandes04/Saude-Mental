document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();

    // Initialize Lucide icons
    lucide.createIcons();

    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-btn');
    const historicoLista = document.getElementById('historico-lista');
    const token = localStorage.getItem('token');
    const sessionId = localStorage.getItem('sessionId');
    const novaConversaBtn = document.getElementById('nova-conversa-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const musicToggle = document.getElementById('music-toggle');
    const backgroundMusic = document.getElementById('background-music');
    const micBtn = document.getElementById('mic-btn');
    const anonModeBtn = document.getElementById('anon-mode-btn');
    const apagarHistoricoBtn = document.getElementById('apagar-historico-btn');
    let anonModeActive = false;
    let previousTheme = null;

    // Detectar modo anónimo
    const urlParams = new URLSearchParams(window.location.search);
    const isAnon = urlParams.get('anonimo') === '1';

    if (isAnon) {
        document.querySelector('.historico-lateral').style.display = 'none';
        // Aviso de modo anónimo
        const aviso = document.createElement('div');
        aviso.textContent = 'Você está em modo anónimo. Nenhuma conversa será guardada.';
        aviso.style.background = '#ffe8d4';
        aviso.style.color = '#333';
        aviso.style.padding = '12px';
        aviso.style.textAlign = 'center';
        aviso.style.borderRadius = '8px';
        aviso.style.marginBottom = '18px';
        document.querySelector('.conteudo-central').prepend(aviso);
    }

    // Load chat history
    loadChatHistory();

    // Handle send message
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Always get the latest sessionId
        const currentSessionId = localStorage.getItem('sessionId');

        // Add user message to chat
        addMessageToChat(message, 'user');
        messageInput.value = '';

        try {
            const body = {
                mensagem: message,
                token: token,
                sessao_id: currentSessionId
            };
            if (anonModeActive) {
                body.anonimo = true;
            }
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                // Add bot message to chat
                addMessageToChat(data.resposta, 'bot');

                // Add recommendations if available
                if (data.recomendacoes && data.recomendacoes.length > 0) {
                    const recomendacoesHtml = data.recomendacoes.map(rec => `
                        <div class="recomendacao">
                            <i data-lucide="${rec.icone}"></i>
                            <span>${rec.texto}</span>
                        </div>
                    `).join('');
                    addMessageToChat(`<div class="recomendacoes">${recomendacoesHtml}</div>`, 'bot');
                    lucide.createIcons();
                }

                // Reload chat history
                loadChatHistory();
            } else {
                alert(data.resposta);
            }
        } catch (error) {
            alert('Erro ao enviar mensagem. Tenta novamente.');
        }
    }

    // Speech to Text (Reconhecimento de voz)
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-PT';
        recognition.continuous = false;
        recognition.interimResults = false;

        micBtn.addEventListener('click', () => {
            recognition.start();
            micBtn.classList.add('active');
        });

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
            micBtn.classList.remove('active');
        };
        recognition.onend = function() {
            micBtn.classList.remove('active');
        };
    } else {
        micBtn.style.display = 'none';
    }

    // Text to Speech (Síntese de voz)
    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'pt-PT';
            window.speechSynthesis.speak(utter);
        }
    }

    // Add message to chat
    function addMessageToChat(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        // Cores especiais no modo anónimo
        if (anonModeActive) {
            if (type === 'user') {
                messageDiv.style.background = '#4a6072';
                messageDiv.style.color = '#fff';
            } else if (type === 'bot') {
                messageDiv.style.background = '#ffe8d4';
                messageDiv.style.color = '#333';
            }
        }
        if (type === 'bot') {
            messageDiv.innerHTML = `<span>${message}</span> <button class="tts-btn" title="Ouvir"><i data-lucide="volume-2"></i></button>`;
        } else {
            messageDiv.innerHTML = message;
        }
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (type === 'bot') {
            const ttsBtn = messageDiv.querySelector('.tts-btn');
            ttsBtn.onclick = () => speakText(messageDiv.querySelector('span').innerText);
            lucide.createIcons();
        }
    }

    // Load chat history
    async function loadChatHistory() {
        try {
            const response = await fetch('/api/historico', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (response.ok) {
                historicoLista.innerHTML = '';
                data.forEach(sessao => {
                    const item = document.createElement('div');
                    item.className = 'historico-item';
                    // Format timestamp
                    const date = new Date(sessao.timestamp);
                    const formattedDate = date.toLocaleString('pt-PT', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                    // Show beginning of last bot response
                    let preview = sessao.ultima_resposta ? sessao.ultima_resposta.substring(0, 60) : '';
                    if (sessao.ultima_resposta && sessao.ultima_resposta.length > 60) preview += '...';
                    item.innerHTML = `<strong>${formattedDate}</strong><br>${preview}`;

                    // Botão de apagar conversa
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '🗑️';
                    deleteBtn.title = 'Apagar conversa';
                    deleteBtn.style.marginLeft = '10px';
                    deleteBtn.style.background = 'transparent';
                    deleteBtn.style.border = 'none';
                    deleteBtn.style.cursor = 'pointer';
                    deleteBtn.onclick = async (e) => {
                        e.stopPropagation();
                        if (confirm('Tem a certeza que deseja apagar esta conversa?')) {
                            try {
                                const resp = await fetch(`/api/historico/${sessao.sessao_id}`, {
                                    method: 'DELETE'
                                });
                                if (resp.ok) {
                                    item.remove();
                                    chatMessages.innerHTML = '';
                                } else {
                                    alert('Erro ao apagar conversa.');
                                }
                            } catch (err) {
                                alert('Erro ao apagar conversa.');
                            }
                        }
                    };
                    item.appendChild(deleteBtn);

                    item.addEventListener('click', () => loadSession(sessao.sessao_id));
                    historicoLista.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    // Load specific session
    async function loadSession(sessaoId) {
        try {
            const response = await fetch(`/api/historico/${sessaoId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                chatMessages.innerHTML = '';
                data.forEach(msg => {
                    addMessageToChat(msg.mensagem, 'user');
                    addMessageToChat(msg.resposta, 'bot');
                });
            }
        } catch (error) {
            console.error('Erro ao carregar sessão:', error);
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // New Conversation
    novaConversaBtn.addEventListener('click', () => {
        // Generate a new sessionId
        const newSessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionId', newSessionId);
        chatMessages.innerHTML = '';
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('sessionId');
        window.location.href = '/';
    });

    // Music play/pause
    let isMusicPlaying = false;
    musicToggle.addEventListener('click', () => {
        if (isMusicPlaying) {
            backgroundMusic.pause();
        } else {
            backgroundMusic.play();
        }
        isMusicPlaying = !isMusicPlaying;
    });

    function activateAnonMode() {
        anonModeActive = true;
        previousTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
        document.body.classList.add('dark');
        document.querySelector('.historico-lateral').style.display = 'none';
        chatMessages.innerHTML = '';
        // Aviso de modo anónimo (menor e com botão)
        let aviso = document.getElementById('anon-aviso');
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.id = 'anon-aviso';
            aviso.style.background = '#ffe8d4';
            aviso.style.color = '#333';
            aviso.style.padding = '8px 16px';
            aviso.style.textAlign = 'center';
            aviso.style.borderRadius = '8px';
            aviso.style.margin = '0 auto 10px auto';
            aviso.style.maxWidth = '350px';
            aviso.style.position = 'relative';
            aviso.style.fontSize = '1em';
            aviso.style.display = 'flex';
            aviso.style.alignItems = 'center';
            aviso.style.justifyContent = 'space-between';
        }
        aviso.innerHTML = 'Você está em modo anónimo. Nenhuma conversa será guardada.' +
            '<button id="exit-anon-btn" style="margin-left: 16px; background: #333; color: #fff; border: none; border-radius: 6px; padding: 8px 22px; min-width: 110px; cursor: pointer; font-size: 1.08em; font-weight: 600;">Sair</button>';
        document.querySelector('.conteudo-central').prepend(aviso);
        anonModeBtn.textContent = 'Sair do Modo Anónimo';
        // Botão de sair do modo anónimo
        document.getElementById('exit-anon-btn').onclick = deactivateAnonMode;
    }

    function deactivateAnonMode() {
        anonModeActive = false;
        if (previousTheme === 'light') {
            document.body.classList.remove('dark');
        }
        document.querySelector('.historico-lateral').style.display = '';
        chatMessages.innerHTML = '';
        const aviso = document.getElementById('anon-aviso');
        if (aviso) aviso.remove();
        anonModeBtn.textContent = 'Modo Anónimo';
    }

    anonModeBtn.addEventListener('click', () => {
        if (!anonModeActive) {
            activateAnonMode();
        } else {
            deactivateAnonMode();
        }
    });

    if (apagarHistoricoBtn) {
        apagarHistoricoBtn.addEventListener('click', async () => {
            if (confirm('Tem a certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.')) {
                try {
                    const response = await fetch('/api/historico', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });
                    if (response.ok) {
                        historicoLista.innerHTML = '';
                        chatMessages.innerHTML = '';
                        alert('Histórico apagado com sucesso!');
                    } else {
                        alert('Erro ao apagar histórico.');
                    }
                } catch (e) {
                    alert('Erro ao apagar histórico.');
                }
            }
        });
    }

    document.getElementById('play-meditacao').onclick = function() {
        const audio = document.getElementById('audio-meditacao');
        if(audio.paused) {
            audio.play();
            this.textContent = 'Pausar Meditação';
        } else {
            audio.pause();
            this.textContent = 'Tocar Meditação';
        }
    };

    // --- Modal de Perfil ---
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileOverlay = document.getElementById('profile-modal-overlay');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const profileNameInput = document.getElementById('profile-name');
    const avatarList = document.getElementById('avatar-list');
    let selectedAvatar = localStorage.getItem('avatar') || 'avatar1.png';

    // Ensure profile button is properly styled and initialized
    if (profileBtn) {
        profileBtn.style.zIndex = '1500';
        profileBtn.style.position = 'relative';
        
        // Add click event listener directly
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            // Preencher nome e avatar atuais
            profileNameInput.value = localStorage.getItem('profileName') || '';
            Array.from(avatarList.children).forEach(img => {
                if(img.dataset.avatar === selectedAvatar) {
                    img.style.borderColor = '#475866';
                    img.style.boxShadow = '0 0 0 3px #b8d8e3';
                } else {
                    img.style.borderColor = '#b8d8e3';
                    img.style.boxShadow = 'none';
                }
            });
            profileModal.style.display = 'block';
            profileOverlay.style.display = 'block';
            // Re-initialize icons after showing modal
            lucide.createIcons();
        });
    }

    // Fechar modal ao clicar fora
    if (profileOverlay) {
        profileOverlay.addEventListener('click', function() {
            profileModal.style.display = 'none';
            profileOverlay.style.display = 'none';
        });
    }

    // Selecionar avatar
    if (avatarList) {
        Array.from(avatarList.children).forEach(img => {
            img.addEventListener('click', function() {
                selectedAvatar = this.dataset.avatar;
                Array.from(avatarList.children).forEach(i => {
                    i.style.borderColor = '#b8d8e3';
                    i.style.boxShadow = 'none';
                });
                this.style.borderColor = '#475866';
                this.style.boxShadow = '0 0 0 3px #b8d8e3';
            });
        });
    }

    // Guardar perfil
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            localStorage.setItem('profileName', profileNameInput.value);
            localStorage.setItem('avatar', selectedAvatar);
            profileModal.style.display = 'none';
            profileOverlay.style.display = 'none';
            // (Opcional: atualizar avatar/nome no topo do chat)
        });
    }
}); 