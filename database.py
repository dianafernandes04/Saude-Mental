import os
import sqlite3

def criar_base_dados():
    # Conexão/criação do arquivo de base de dados na raiz do projeto
    conn = sqlite3.connect('conversas.db')
    cursor = conn.cursor()

    # Tabela de mensagens
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessao_id TEXT NOT NULL,
        utilizador TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        resposta TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')


    # Tabela de utilizadores
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS utilizadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    print("✅ Base de dados criada ou já existente!")

# ===========================
# OPCIONAL: Resetar a BD ao iniciar (apaga e recria)
# ===========================
def resetar_base_dados():
    if os.path.exists('conversas.db'):
        os.remove('conversas.db')
        print("🚮 Base de dados apagada!")
    criar_base_dados()

# Se quiseres só criar (sem apagar), usa:
# criar_base_dados()

# Se quiseres apagar e começar de novo, usa:
resetar_base_dados()
