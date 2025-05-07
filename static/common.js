// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark')) {
            icon.setAttribute('data-lucide', 'sun');
        } else {
            icon.setAttribute('data-lucide', 'moon');
        }
        lucide.createIcons();
    });
}

// Music toggle functionality
const musicToggle = document.getElementById('music-toggle');
const backgroundMusic = document.getElementById('background-music');
if (musicToggle && backgroundMusic) {
    musicToggle.addEventListener('click', () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
            musicToggle.querySelector('i').setAttribute('data-lucide', 'volume-2');
        } else {
            backgroundMusic.pause();
            musicToggle.querySelector('i').setAttribute('data-lucide', 'music');
        }
        lucide.createIcons();
    });
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('sessionId');
        window.location.href = 'login.html';
    });
} 