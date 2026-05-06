from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from dotenv import load_dotenv
from groq import Groq
import pandas as pd
import sqlite3
import os
import json
import re
import bcrypt

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs('uploads', exist_ok=True)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

USERS_DB = 'users.db'


# ── User Model ──
class User(UserMixin):
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email


@login_manager.user_loader
def load_user(user_id):
    conn = sqlite3.connect(USERS_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return User(row[0], row[1], row[2])
    return None


# ── Initialize users database ──
def init_users_db():
    conn = sqlite3.connect(USERS_DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


init_users_db()


# ── Get user-specific database ──
def get_user_db_path():
    if current_user.is_authenticated:
        return f'chatbot_user_{current_user.id}.db'
    return 'chatbot.db'


def get_db():
    return sqlite3.connect(get_user_db_path())


def get_schema():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    db_schema = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info('{table}')")
        cols = [{'name': r[1], 'type': r[2]} for r in cursor.fetchall()]
        cursor.execute(f"SELECT COUNT(*) FROM '{table}'")
        count = cursor.fetchone()[0]
        db_schema[table] = {'columns': cols, 'row_count': count}
    conn.close()
    return db_schema


# ── Password validation ──
def is_password_strong(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, ""


# ── Authentication Routes ──
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        # Validation
        if not name or not email or not password:
            return render_template('register.html', error='All fields are required')
        
        if password != confirm_password:
            return render_template('register.html', error='Passwords do not match')
        
        is_strong, msg = is_password_strong(password)
        if not is_strong:
            return render_template('register.html', error=msg)
        
        # Check if email exists
        conn = sqlite3.connect(USERS_DB)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            conn.close()
            return render_template('register.html', error='Email already registered')
        
        # Hash password and create user
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                      (name, email, hashed))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()

        # Log them in
        user = User(user_id, name, email)
        login_user(user)
        return redirect(url_for('index'))
    
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember = request.form.get('remember') == 'on'

        conn = sqlite3.connect(USERS_DB)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()

        if not row or not bcrypt.checkpw(password.encode('utf-8'), row[3]):
            return render_template('login.html', error='Invalid email or password')
        
        user = User(row[0], row[1], row[2])
        login_user(user, remember=remember)
        return redirect(url_for('index'))
    
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ── Main App Routes ──
@app.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user)


@app.route('/upload', methods=['POST'])
@login_required
def upload():
    file = request.files.get('file')
    table_name = request.form.get('table_name', 'data').strip()
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    try:
        filename = file.filename.lower()
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(file)
        elif filename.endswith('.json'):
            df = pd.read_json(file)
        else:
            return jsonify({'error': 'Only CSV, Excel and JSON files supported'}), 400

        df.columns = [c.strip().replace(' ', '_') for c in df.columns]

        conn = get_db()
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        conn.close()

        return jsonify({
            'success': True,
            'table': table_name,
            'rows': len(df),
            'columns': list(df.columns)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/schema', methods=['GET'])
@login_required
def schema():
    return jsonify(get_schema())


@app.route('/preview', methods=['POST'])
@login_required
def preview():
    try:
        table_name = request.json.get('table', '')
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 5")
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn.close()
        return jsonify({'columns': columns, 'rows': rows})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/ask', methods=['POST'])
@login_required
def ask():
    data = request.json
    question = data.get('question', '').strip()
    if not question:
        return jsonify({'error': 'No question provided'}), 400

    db_schema = get_schema()
    if not db_schema:
        return jsonify({'error': 'No tables loaded. Upload data first.'}), 400

    schema_text = ''
    for table, info in db_schema.items():
        cols = ', '.join([f"{c['name']} ({c['type']})" for c in info['columns']])
        schema_text += f"Table: {table}\nColumns: {cols}\nRows: {info['row_count']}\n\n"

    prompt = f"""You are a SQL expert. Convert natural language to SQLite SQL.

Database schema:
{schema_text}

Return ONLY a JSON object like this:
{{"sql": "SELECT ...", "explanation": "This query does..."}}

Rules:
- Use valid SQLite syntax only
- Table and column names are case sensitive
- No markdown, no code fences, just raw JSON
- No explanation outside the JSON object

Question: {question}"""

    try:
        response = groq_client.chat.completions.create(
            model='llama-3.1-8b-instant',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=1000
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r'```json|```', '', text).strip()

        try:
            parsed = json.loads(text)
        except Exception:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            parsed = json.loads(match.group()) if match else {'sql': text, 'explanation': ''}

        sql = parsed.get('sql', '').strip()

        conn = get_db()
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
        finally:
            conn.close()

        return jsonify({
            'sql': sql,
            'explanation': parsed.get('explanation', ''),
            'columns': columns,
            'rows': rows,
            'count': len(rows)
        })

    except Exception as e:
        return jsonify({'sql': '', 'error': str(e)}), 200


@app.route('/clear', methods=['POST'])
@login_required
def clear():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        for table in tables:
            cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)