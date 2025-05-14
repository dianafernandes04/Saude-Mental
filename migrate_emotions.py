import sqlite3
from app import analisar_emocao

def migrate_emotions():
    print("Iniciando migração de emoções...")
    
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        
        # Verificar se a coluna emocao existe
        cursor.execute("PRAGMA table_info(mensagens)")
        colunas = cursor.fetchall()
        tem_coluna_emocao = any(coluna[1] == 'emocao' for coluna in colunas)
        
        # Adicionar coluna emocao se não existir
        if not tem_coluna_emocao:
            print("Adicionando coluna emocao à tabela mensagens...")
            cursor.execute("ALTER TABLE mensagens ADD COLUMN emocao TEXT")
            conn.commit()
        
        # Buscar mensagens sem emoção
        cursor.execute("SELECT id, mensagem FROM mensagens WHERE emocao IS NULL")
        mensagens = cursor.fetchall()
        
        total = len(mensagens)
        print(f"Encontradas {total} mensagens para processar...")
        
        # Atualizar emoções
        for i, (msg_id, mensagem) in enumerate(mensagens, 1):
            try:
                emocao = analisar_emocao(mensagem)
                cursor.execute(
                    "UPDATE mensagens SET emocao = ? WHERE id = ?",
                    (emocao, msg_id)
                )
                if i % 10 == 0:
                    print(f"Processadas {i}/{total} mensagens...")
                conn.commit()
            except Exception as e:
                print(f"Erro ao processar mensagem {msg_id}: {e}")
                continue
        
        print("Migração concluída!")

if __name__ == "__main__":
    migrate_emotions() 