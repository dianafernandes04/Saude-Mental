    localStorage.clear();

    document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const anonBtn = document.getElementById('anon-btn');

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Check if token is valid by making a request to a protected endpoint
        fetch('/api/historico', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/chat';
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('sessionId');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('sessionId');
        });
    }

    // Toggle between login and register forms
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('sessionId', data.sessao_id);
                alert('Login efetuado com sucesso');
                window.location.href = '/chat';
            } else {
                alert(data.mensagem);
            }
        } catch (error) {
            alert('Erro ao fazer login. Tenta novamente.');
        }
    });

    // Handle register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const primeiroNome = document.getElementById('reg-firstname').value;

        // Validação de password segura
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
        if (!passwordRegex.test(password)) {
            alert('A palavra-passe deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos.');
            return;
        }

        try {
            const response = await fetch('/api/registar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, primeiro_nome: primeiroNome })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registo concluído! Podes fazer login agora.');
                registerContainer.style.display = 'none';
                loginContainer.style.display = 'block';
            } else {
                alert(data.mensagem);
            }
        } catch (error) {
            alert('Erro ao registar. Tenta novamente.');
        }
    });

    if (anonBtn) {
        anonBtn.addEventListener('click', () => {
            window.location.href = '/chat?anonimo=1';
        });
    }
}); 