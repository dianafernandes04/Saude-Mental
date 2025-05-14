from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from openai import OpenAI
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import time
from functools import wraps

# ========== CONFIGURAÇÕES ==========
app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

SECRET_KEY = '1234'
JWT_EXPIRATION_HOURS = 1

# OpenAI
client = OpenAI(api_key='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')

# Tentativas de login por utilizador
tentativas_login = {}

# ========== BASE DE DADOS ==========
def criar_base_dados():
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS utilizadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                primeiro_nome TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS mensagens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                utilizador TEXT NOT NULL,
                sessao_id TEXT NOT NULL,
                mensagem TEXT NOT NULL,
                resposta TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                emocao TEXT
            )
        ''')
        conn.commit()

criar_base_dados()

def gerar_recomendacoes_personalizadas(mensagem_usuario):
    try:
        resposta = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "És um assistente de saúde mental. Com base na mensagem do utilizador, gera 3 recomendações em JSON no formato: [{\"icone\": \"sun\", \"texto\": \"Vai apanhar sol\"}, ...]. Responde apenas com o JSON. Usa ícones como sun, smile, walk, book, heart, etc."},
                {"role": "user", "content": mensagem_usuario}
            ],
            temperature=0.7,
            max_tokens=300
        )

        import json
        conteudo = resposta.choices[0].message.content.strip()

        # ⚠️ Tenta extrair apenas o JSON válido (entre os colchetes)
        try:
            inicio = conteudo.find('[')
            fim = conteudo.rfind(']')
            conteudo_json = conteudo[inicio:fim+1]
            return json.loads(conteudo_json)
        except Exception as erro_json:
            print("⚠️ JSON inválido recebido:", conteudo)
            return []

    except Exception as e:
        print("❌ Erro nas recomendações personalizadas:", e)
        return []


# ========== FUNÇÕES AUXILIARES ==========

def gerar_token(username):
    payload = {
        'username': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verificar_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['username']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def guardar_conversa(utilizador, sessao_id, mensagem, resposta):
    emocao = analisar_emocao(mensagem)
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO mensagens (utilizador, sessao_id, mensagem, resposta, emocao) VALUES (?, ?, ?, ?, ?)',
            (utilizador, sessao_id, mensagem, resposta, emocao)
        )
        conn.commit()

def obter_primeiro_nome(username):
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT primeiro_nome FROM utilizadores WHERE username = ?', (username,))
        row = cursor.fetchone()
        return row[0] if row else ""

def obter_contexto(sessao_id, limite=5):
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT mensagem, resposta
            FROM mensagens
            WHERE sessao_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (sessao_id, limite))
        linhas = cursor.fetchall()
        return linhas[::-1]  # ordem cronológica correta

def analisar_nivel_depressao(mensagem_usuario):
    try:
        analise = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Avalia o nível de depressão desta mensagem do utilizador. Responde apenas com: Leve, Moderado ou Grave."},
                {"role": "user", "content": mensagem_usuario}
            ],
            max_tokens=10,
            temperature=0.0
        )
        return analise.choices[0].message.content.strip()
    except:
        return "Desconhecido"

def analisar_emocao(mensagem_usuario):
    try:
        resposta = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Classifica a emoção principal desta mensagem (tristeza, ansiedade, raiva, alegria, medo, confusão ou neutra). Responde apenas com uma palavra."},
                {"role": "user", "content": mensagem_usuario}
            ],
            max_tokens=5,
            temperature=0
        )
        return resposta.choices[0].message.content.strip().lower()
    except:
        return "neutra"

def adaptar_resposta_emocao(emocao, resposta_base, nome):
    prefixos = {
        "tristeza": f"Sinto muito que te sintas assim, {nome}. ",
        "ansiedade": f"Respira fundo, {nome}, estou aqui para te ajudar. ",
        "raiva": f"Compreendo que estejas frustrado, {nome}. ",
        "alegria": f"Fico feliz por estares a sentir-te bem, {nome}! ",
        "medo": f"Estás seguro aqui, {nome}. Vamos ultrapassar isto juntos. ",
        "confusão": f"Vamos tentar esclarecer as tuas dúvidas, {nome}. ",
        "neutra": f"{nome}, "
    }
    return prefixos.get(emocao, f"{nome}, ") + resposta_base

def recomendar_suporte(nivel):
    if nivel == "Grave":
        return {"mensagem": "🌧️ Situação grave. Contacta apoio profissional."}
    elif nivel == "Moderado":
        return {"mensagem": "⚖️ Cuida de ti. Estas técnicas podem ajudar."}
    else:
        return {"mensagem": "🌤️ Continua atento à tua saúde mental."}

# ========== DECORADORES ==========
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'erro': 'Token não fornecido'}), 401
            
        username = verificar_token(token)
        if not username:
            return jsonify({'erro': 'Token inválido'}), 401
            
        return f(username, *args, **kwargs)
    return decorated

# ========== ROTAS ==========
@app.route('/api/registar', methods=['POST'])
def registar():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    primeiro_nome = data.get('primeiro_nome', '')

    if not username or not password or not primeiro_nome:
        return jsonify({'mensagem': 'Preencha todos os campos!'}), 400

    hashed_password = generate_password_hash(password)
    try:
        with sqlite3.connect('conversas.db') as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO utilizadores (username, password, primeiro_nome) VALUES (?, ?, ?)', (username, hashed_password, primeiro_nome))
            conn.commit()
        return jsonify({'mensagem': 'Registo concluído!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'mensagem': 'Utilizador já existe!'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    tentativas = tentativas_login.get(username, [])
    tentativas = [t for t in tentativas if time.time() - t < 300]
    tentativas_login[username] = tentativas

    if len(tentativas) >= 5:
        return jsonify({'mensagem': 'Muitas tentativas. Tenta mais tarde.'}), 429

    if not username or not password:
        return jsonify({'mensagem': 'Preencha todos os campos!'}), 400

    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM utilizadores WHERE username = ?', (username,))
        row = cursor.fetchone()

    if row and check_password_hash(row[0], password):
        token = gerar_token(username)
        sessao_id = f"{username}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        return jsonify({'mensagem': 'Login feito!', 'token': token, 'sessao_id': sessao_id}), 200
    else:
        tentativas.append(time.time())
        tentativas_login[username] = tentativas
        return jsonify({'mensagem': 'Credenciais inválidas!'}), 401

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    mensagem_usuario = data.get('mensagem', '')
    token = data.get('token', '')
    sessao_id = data.get('sessao_id', '')
    anonimo = data.get('anonimo', False)

    if not mensagem_usuario:
        return jsonify({"resposta": "Mensagem vazia!"}), 400

    if anonimo:
        username = 'Anónimo'
    else:
        if not token:
            return jsonify({"resposta": "Token inválido!"}), 400
        username = verificar_token(token)
        if not username:
            return jsonify({"resposta": "Token expirado ou inválido!"}), 401

    try:
        contexto = [] if anonimo else obter_contexto(sessao_id)
        mensagens = [{
            "role": "system",
            "content": (
                "És um assistente de saúde mental. "
                "Só podes responder a perguntas relacionadas com saúde mental, emoções, bem-estar psicológico, ansiedade, depressão, stress, autocuidado, motivação, autoestima, relações interpessoais, técnicas de relaxamento, etc. "
                "Se a pergunta não for sobre saúde mental, responde apenas: 'Desculpa, só posso responder a questões relacionadas com saúde mental.' "
                "Responde sempre em português de Portugal."
            )
        }]

        for m, r in contexto:
            mensagens.append({"role": "user", "content": m})
            mensagens.append({"role": "assistant", "content": r})

        mensagens.append({"role": "user", "content": mensagem_usuario})

        resposta_modelo = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=mensagens,
            max_tokens=200,
            temperature=0.7
        )

        resposta_base = resposta_modelo.choices[0].message.content.strip()
        nivel = analisar_nivel_depressao(mensagem_usuario)
        emocao = analisar_emocao(mensagem_usuario)
        nome = obter_primeiro_nome(username) if not anonimo else 'Amigo'
        resposta = adaptar_resposta_emocao(emocao, resposta_base, nome)

        # Detectar resposta padrão de fora do tema (verificação flexível)
        if "só posso responder a perguntas relacionadas com saúde mental" in resposta_base.lower() or \
           "apenas posso falar sobre saúde mental" in resposta_base.lower() or \
           "como assistente de saúde mental" in resposta_base.lower():
            recomendacoes = []
        else:
            recomendacoes = gerar_recomendacoes_personalizadas(mensagem_usuario)

        if not anonimo:
            guardar_conversa(username, sessao_id, mensagem_usuario, resposta)

        return jsonify({
            "resposta": resposta,
            "nivel": nivel,
            "emocao": emocao,
            "recomendacoes": recomendacoes
        })
    except Exception as e:
        return jsonify({"resposta": f"Erro: {str(e)}"}), 500

@app.route('/api/historico', methods=['POST'])
def listar_conversas():
    data = request.get_json()
    token = data.get('token', '')
    username = verificar_token(token)
    if not username:
        return jsonify({'erro': 'Token inválido!'}), 401

    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT sessao_id, MAX(timestamp), MAX(resposta)
            FROM mensagens
            WHERE utilizador = ?
            GROUP BY sessao_id
            ORDER BY MAX(timestamp) DESC
        ''', (username,))
        historico = cursor.fetchall()

    return jsonify([
        {
            'sessao_id': h[0],
            'timestamp': h[1],
            'ultima_resposta': h[2]
        } for h in historico
    ])

@app.route('/api/historico/<sessao_id>', methods=['GET'])
def obter_mensagens(sessao_id):
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT mensagem, resposta, timestamp
            FROM mensagens
            WHERE sessao_id = ?
            ORDER BY timestamp
        ''', (sessao_id,))
        linhas = cursor.fetchall()
    return jsonify([
        {
            'mensagem': l[0],
            'resposta': l[1],
            'timestamp': l[2],
            'emocao': analisar_emocao(l[0])
        } for l in linhas
    ])

@app.route('/api/historico/<sessao_id>', methods=['DELETE'])
def apagar_conversa(sessao_id):
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM mensagens WHERE sessao_id = ?', (sessao_id,))
        conn.commit()
    return jsonify({'mensagem': 'Conversa eliminada com sucesso!'}), 200

@app.route('/api/historico', methods=['DELETE'])
def apagar_historico():
    data = request.get_json()
    token = data.get('token', '')
    username = verificar_token(token)
    if not username:
        return jsonify({'erro': 'Token inválido!'}), 401
    with sqlite3.connect('conversas.db') as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM mensagens WHERE utilizador = ?', (username,))
        conn.commit()
    return jsonify({'mensagem': 'Histórico apagado com sucesso!'}), 200

@app.route('/calendario')
def calendario():
    return render_template('calendario.html')

@app.route('/api/emocoes', methods=['POST'])
def get_emocoes():
    try:
        data = request.get_json()
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'erro': 'Token não fornecido'}), 401

        # Decodificar o token para obter o username
        username = verificar_token(token)
        if not username:
            return jsonify({'erro': 'Token inválido'}), 401

        mes = data.get('mes')
        ano = data.get('ano')

        if not mes or not ano:
            return jsonify({'erro': 'Mês e ano são obrigatórios'}), 400

        conn = sqlite3.connect('conversas.db')
        cursor = conn.cursor()

        # Buscar todas as mensagens do mês/ano especificado com suas emoções
        cursor.execute('''
            SELECT m.timestamp, m.emocao
            FROM mensagens m
            WHERE m.utilizador = ? 
            AND strftime('%m', datetime(m.timestamp)) = ?
            AND strftime('%Y', datetime(m.timestamp)) = ?
            ORDER BY m.timestamp
        ''', (username, f"{mes:02d}", str(ano)))

        mensagens = cursor.fetchall()
        conn.close()

        # Agrupar emoções por dia
        emocoes_por_dia = {}
        for timestamp, emocao in mensagens:
            data = timestamp.split(' ')[0]  # Pega só a data (YYYY-MM-DD)
            if data not in emocoes_por_dia:
                emocoes_por_dia[data] = {'contagem': {}, 'total': 0}
            
            if emocao:
                emocoes_por_dia[data]['contagem'][emocao] = emocoes_por_dia[data]['contagem'].get(emocao, 0) + 1
                emocoes_por_dia[data]['total'] += 1

        # Determinar a emoção predominante para cada dia
        resultado = []
        for data, info in emocoes_por_dia.items():
            if info['total'] > 0:
                # Encontrar a emoção mais frequente
                emocao_predominante = max(info['contagem'].items(), key=lambda x: x[1])[0]
                resultado.append({
                    'data': data,
                    'emocao': emocao_predominante
                })

        return jsonify(resultado)

    except Exception as e:
        print("Erro ao buscar emoções:", e)
        return jsonify({'erro': 'Erro interno do servidor'}), 500

@app.route('/api/conversas', methods=['POST'])
@token_required
def get_conversas(username):
    data = request.get_json()
    dia = data.get('dia')
    mes = data.get('mes')
    ano = data.get('ano')
    
    if not all([dia, mes, ano]):
        return jsonify({'error': 'Data inválida'}), 400
        
    try:
        # Criar data inicial e final para o dia específico
        data_inicio = f"{ano}-{mes:02d}-{dia:02d} 00:00:00"
        data_fim = f"{ano}-{mes:02d}-{dia:02d} 23:59:59"
        
        # Buscar conversas do usuário para o dia específico
        with sqlite3.connect('conversas.db') as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT mensagem, resposta, timestamp, sessao_id, emocao
                FROM mensagens
                WHERE utilizador = ?
                AND timestamp BETWEEN ? AND ?
                ORDER BY timestamp DESC
            ''', (username, data_inicio, data_fim))
            
            conversas = cursor.fetchall()
            
        # Converter para JSON
        conversas_json = []
        for mensagem, resposta, timestamp, sessao_id, emocao in conversas:
            conversas_json.append({
                'data': timestamp,
                'texto': mensagem,
                'resposta': resposta,
                'emocao': emocao,
                'sessao_id': sessao_id
            })
        
        return jsonify(conversas_json)
        
    except Exception as e:
        print("Erro ao buscar conversas:", e)
        return jsonify({'erro': 'Erro interno do servidor'}), 500

# ========== ROTAS DE PÁGINAS ==========
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/chat')
def chat_page():
    return render_template('chat.html')

@app.route('/minijogos')
def minijogos_page():
    return render_template('minijogos.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/profile')
def profile_page():
    return render_template('profile.html')

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(username):
    try:
        with sqlite3.connect('conversas.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT primeiro_nome, username FROM utilizadores WHERE username = ?', (username,))
            user = cursor.fetchone()
            
            if user:
                return jsonify({
                    'primeiro_nome': user[0],
                    'username': user[1]
                })
            return jsonify({'erro': 'Utilizador não encontrado'}), 404
    except Exception as e:
        print(f"Erro ao obter perfil: {e}")
        return jsonify({'erro': 'Erro ao obter informações do perfil'}), 500

@app.route('/api/profile/update', methods=['POST'])
@token_required
def update_profile(username):
    try:
        data = request.get_json()
        novo_primeiro_nome = data.get('primeiro_nome')
        novo_username = data.get('username')

        if not novo_primeiro_nome or not novo_username:
            return jsonify({'erro': 'Dados incompletos'}), 400

        with sqlite3.connect('conversas.db') as conn:
            cursor = conn.cursor()
            
            # Verificar se o novo username já existe (se for diferente do atual)
            if novo_username != username:
                cursor.execute('SELECT id FROM utilizadores WHERE username = ?', (novo_username,))
                if cursor.fetchone():
                    return jsonify({'erro': 'Nome de utilizador já existe'}), 400

            # Atualizar informações
            cursor.execute('''
                UPDATE utilizadores 
                SET primeiro_nome = ?, username = ?
                WHERE username = ?
            ''', (novo_primeiro_nome, novo_username, username))
            
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Utilizador não encontrado'}), 404
                
            conn.commit()
            return jsonify({'mensagem': 'Perfil atualizado com sucesso'})
    except Exception as e:
        print(f"Erro ao atualizar perfil: {e}")
        return jsonify({'erro': 'Erro ao atualizar perfil'}), 500

@app.route('/api/profile/password', methods=['POST'])
@token_required
def change_password(username):
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'erro': 'Dados incompletos'}), 400

        with sqlite3.connect('conversas.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT password FROM utilizadores WHERE username = ?', (username,))
            user = cursor.fetchone()

            if not user or not check_password_hash(user[0], current_password):
                return jsonify({'erro': 'Palavra-passe atual incorreta'}), 400

            hashed_password = generate_password_hash(new_password)
            cursor.execute('''
                UPDATE utilizadores 
                SET password = ?
                WHERE username = ?
            ''', (hashed_password, username))
            conn.commit()
            
            return jsonify({'mensagem': 'Palavra-passe alterada com sucesso'})
    except Exception as e:
        print(f"Erro ao alterar palavra-passe: {e}")
        return jsonify({'erro': 'Erro ao alterar palavra-passe'}), 500

@app.route('/api/profile/delete', methods=['DELETE'])
@token_required
def delete_account(username):
    try:
        with sqlite3.connect('conversas.db') as conn:
            cursor = conn.cursor()
            
            # Apagar todas as mensagens do utilizador
            cursor.execute('DELETE FROM mensagens WHERE utilizador = ?', (username,))
            
            # Apagar o utilizador
            cursor.execute('DELETE FROM utilizadores WHERE username = ?', (username,))
            
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Utilizador não encontrado'}), 404
                
            conn.commit()
            return jsonify({'mensagem': 'Conta apagada com sucesso'})
    except Exception as e:
        print(f"Erro ao apagar conta: {e}")
        return jsonify({'erro': 'Erro ao apagar conta'}), 500

# ========== START ==========
if __name__ == '__main__':
    app.run(debug=True, port=5000)
