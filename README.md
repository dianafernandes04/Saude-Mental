# Aplicação de Saúde Mental

Esta é uma aplicação web desenvolvida em Python usando Flask para fornecer suporte e recursos relacionados à saúde mental.

## Requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

## Instalação

1. Extraia o arquivo ZIP para uma pasta de sua preferência

2. Abra um terminal na pasta do projeto

3. Crie um ambiente virtual (recomendado):
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

4. Instale as dependências:
```bash
pip install -r requeriments.txt
```

## Configuração

1. Certifique-se de que o arquivo `conversas.db` está presente na pasta raiz do projeto
2. Se necessário, configure as variáveis de ambiente para a API OpenAI (caso esteja usando)

## Executando a Aplicação

1. Com o ambiente virtual ativado, execute:
```bash
python app.py
```

2. A aplicação estará disponível em `http://localhost:5000`

## Estrutura do Projeto

- `app.py`: Arquivo principal da aplicação
- `database.py`: Configurações e funções do banco de dados
- `templates/`: Arquivos HTML
- `static/`: Arquivos estáticos (CSS, JavaScript, imagens)
- `routes/`: Rotas da aplicação
- `conversas.db`: Banco de dados SQLite

## Suporte

Em caso de problemas ou dúvidas, verifique se:
1. Todas as dependências foram instaladas corretamente
2. O ambiente virtual está ativado
3. O banco de dados está presente e acessível
4. A porta 5000 não está sendo usada por outra aplicação 

Conta Default para ver alguns das funcionalidades implementadas
Username: Diana Fernandes 5
Password: 1234