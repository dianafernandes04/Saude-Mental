import sqlite3

# Conecta à base de dados existente
conn = sqlite3.connect('conversas.db')
cursor = conn.cursor()

# Seleciona tudo o que está guardado na tabela mensagens
cursor.execute("SELECT * FROM mensagens")
dados = cursor.fetchall()

# Imprime cada linha (mensagem e resposta)
for linha in dados:
    id, utilizador, mensagem, resposta, timestamp = linha
    print(f"[{timestamp}] {utilizador}: {mensagem}")
    print(f"Assistente: {resposta}\n")

conn.close()
