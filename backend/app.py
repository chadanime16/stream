from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import jwt
import hashlib
import secrets
import json
from datetime import datetime, timedelta
import os
from functools import wraps
import threading
import glob

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
BASE_DIR = os.path.dirname(__file__)
DATABASE_PATH = os.path.join(BASE_DIR, 'streaming.db')
JSON_DATA_PATH = os.path.join(BASE_DIR, 'jsons')
JWT_SECRET = os.getenv('JWT_SECRET', 'kabhinakabhi892828u8u8uhhjsnjnuwhsuhsu2hiuwhkjb')

# Thread-local storage for database connections
local = threading.local()

def get_db():
    """Get database connection for current thread"""
    if not hasattr(local, 'db'):
        local.db = sqlite3.connect(DATABASE_PATH)
        local.db.row_factory = sqlite3.Row
    return local.db

def init_database():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            pin TEXT NOT NULL,
            profile_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            watchlist TEXT DEFAULT '[]',
            history TEXT DEFAULT '[]',
            preferences TEXT DEFAULT '{}'
        )
    ''')
    
    # Content table with watch_count for trending
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS content (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            year TEXT,
            image TEXT,
            description TEXT,
            genres TEXT,
            cast TEXT,
            director TEXT,
            rating TEXT,
            duration TEXT,
            type TEXT DEFAULT 'movie',
            industry TEXT,
            episodes TEXT,
            urls TEXT,
            download_links TEXT,
            watch_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # User watch tracking for personalized recommendations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_watches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content_id TEXT NOT NULL,
            watch_time INTEGER DEFAULT 0,
            progress INTEGER DEFAULT 0,
            watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (content_id) REFERENCES content (id)
        )
    ''')
    
    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_title ON content(title)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_watch_count ON content(watch_count DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_type ON content(type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_industry ON content(industry)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_watches_user_id ON user_watches(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_watches_content_id ON user_watches(content_id)')
    
    conn.commit()
    conn.close()

def sync_content_from_json():
    """Sync content from JSON files to database"""
    print("🔄 Syncing content from JSON files...")
    
    db = get_db()
    cursor = db.cursor()
    
    # Load all JSON files from jsons folder
    json_files = glob.glob(os.path.join(JSON_DATA_PATH, '*.json'))
    
    total_synced = 0
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Handle both array and object formats
                content_list = data if isinstance(data, list) else data.get('movies', [])
                
                for item in content_list:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO content 
                            (id, title, year, image, description, genres, cast, director, 
                             rating, duration, type, industry, episodes, urls, download_links, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            item.get('id'),
                            item.get('title'),
                            item.get('year'),
                            item.get('image'),
                            item.get('description'),
                            json.dumps(item.get('genres', [])),
                            json.dumps(item.get('cast', [])),
                            item.get('director'),
                            item.get('rating'),
                            item.get('duration'),
                            item.get('type', 'movie'),
                            item.get('industry', 'Unknown'),
                            json.dumps(item.get('episodes', [])),
                            json.dumps(item.get('urls', {})),
                            json.dumps(item.get('download_links', {})),
                            datetime.utcnow().isoformat()
                        ))
                        total_synced += 1
                    except Exception as e:
                        print(f"Error syncing item {item.get('id', 'unknown')}: {e}")
                        continue
                        
        except Exception as e:
            print(f"Error loading JSON file {json_file}: {e}")
            continue
    
    db.commit()
    print(f"✅ Synced {total_synced} content items to database")

def hash_pin(pin):
    """Hash a PIN for secure storage"""
    salt = secrets.token_hex(8)
    hashed_pin = hashlib.sha256((pin + salt).encode()).hexdigest()
    return f"{salt}${hashed_pin}"

def verify_pin(stored_pin, provided_pin):
    """Verify a provided PIN against a stored PIN"""
    try:
        salt, hashed_pin = stored_pin.split('$')
        return hashed_pin == hashlib.sha256((provided_pin + salt).encode()).hexdigest()
    except ValueError:
        return False

def generate_jwt(payload):
    """Generate a JWT token"""
    payload['exp'] = datetime.utcnow() + timedelta(days=30)
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_jwt(token):
    """Verify a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")

def auth_required(f):
    """Decorator for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            token = auth_header.split(' ')[1]
            payload = verify_jwt(token)
            request.user_id = payload['userId']
            request.username = payload['username']
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401
    
    return decorated_function

def dict_from_row(row):
    """Convert sqlite3.Row to dict"""
    return dict(row) if row else None

def parse_json_field(value, default=None):
    """Safely parse JSON field"""
    if not value:
        return default or []
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default or []

# ============= ROUTES =============

# Serve frontend
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# Auth Routes
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """User registration"""
    try:
        data = request.get_json()
        email = data.get('email')
        username = data.get('username')
        pin = data.get('pin')
        
        if not email or not username or not pin:
            return jsonify({'error': 'Email, username and PIN required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('SELECT id FROM users WHERE email = ? OR username = ?', (email, username))
        if cursor.fetchone():
            return jsonify({'error': 'User already exists'}), 409
        
        hashed_pin = hash_pin(pin)
        cursor.execute('''
            INSERT INTO users (email, username, pin)
            VALUES (?, ?, ?)
        ''', (email, username, hashed_pin))
        
        db.commit()
        return jsonify({'success': True}), 201
        
    except Exception as e:
        app.logger.error(f"Signup error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.get_json()
        email = data.get('email')
        pin = data.get('pin')
        
        if not email or not pin:
            return jsonify({'error': 'Email and PIN required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user or not verify_pin(user['pin'], pin):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user_dict = dict_from_row(user)
        token = generate_jwt({
            'userId': str(user_dict['id']),
            'username': user_dict['username']
        })
        
        return jsonify({
            'user': {
                'id': str(user_dict['id']),
                'username': user_dict['username'],
                'email': user_dict['email']
            },
            'token': token
        }), 200
        
    except Exception as e:
        app.logger.error(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@auth_required
def verify_auth():
    """Verify authentication"""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_dict = dict_from_row(user)
        return jsonify({
            'id': str(user_dict['id']),
            'username': user_dict['username'],
            'email': user_dict['email']
        }), 200
        
    except Exception as e:
        app.logger.error(f"Auth verification error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Content Routes
@app.route('/api/content/trending', methods=['GET'])
def get_trending():
    """Get trending content IDs based on watch count"""
    try:
        db = get_db()
        cursor = db.cursor()
        limit = request.args.get('limit', 20)
        
        cursor.execute('''
            SELECT id, watch_count FROM content 
            ORDER BY watch_count DESC, created_at DESC 
            LIMIT ?
        ''', (limit,))
        
        trending_ids = [row['id'] for row in cursor.fetchall()]
        
        return jsonify(trending_ids), 200
        
    except Exception as e:
        app.logger.error(f"Trending error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/content/by-category/<category>', methods=['GET'])
def get_by_category(category):
    """Get content by category (industry or type)"""
    try:
        db = get_db()
        cursor = db.cursor()
        limit = request.args.get('limit', 50)
        
        cursor.execute('''
            SELECT * FROM content 
            WHERE industry = ? OR type = ?
            ORDER BY watch_count DESC, created_at DESC 
            LIMIT ?
        ''', (category, category, limit))
        
        content = []
        for row in cursor.fetchall():
            item = dict_from_row(row)
            item['genres'] = parse_json_field(item['genres'], [])
            content.append(item)
        
        return jsonify(content), 200
        
    except Exception as e:
        app.logger.error(f"Category error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/content/detail/<content_id>', methods=['GET'])
def get_content_detail(content_id):
    """Get detailed content information"""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM content WHERE id = ?', (content_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'error': 'Content not found'}), 404
        
        item = dict_from_row(row)
        item['genres'] = parse_json_field(item['genres'], [])
        item['cast'] = parse_json_field(item['cast'], [])
        item['episodes'] = parse_json_field(item['episodes'], [])
        item['urls'] = parse_json_field(item['urls'], {})
        item['download_links'] = parse_json_field(item['download_links'], {})
        
        return jsonify(item), 200
        
    except Exception as e:
        app.logger.error(f"Content detail error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/content/search', methods=['GET'])
def search_content():
    """Search content"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify([]), 200
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            SELECT * FROM content 
            WHERE title LIKE ? OR genres LIKE ? OR description LIKE ?
            ORDER BY watch_count DESC
            LIMIT 50
        ''', (f'%{query}%', f'%{query}%', f'%{query}%'))
        
        results = []
        for row in cursor.fetchall():
            item = dict_from_row(row)
            item['genres'] = parse_json_field(item['genres'], [])
            results.append(item)
        
        return jsonify(results), 200
        
    except Exception as e:
        app.logger.error(f"Search error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# User Routes
@app.route('/api/user/watchlist', methods=['GET'])
@auth_required
def get_watchlist():
    """Get user watchlist"""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT watchlist FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify([]), 200
        
        watchlist_ids = parse_json_field(user['watchlist'], [])
        
        if not watchlist_ids:
            return jsonify([]), 200
        
        placeholders = ','.join(['?' for _ in watchlist_ids])
        cursor.execute(f'SELECT * FROM content WHERE id IN ({placeholders})', watchlist_ids)
        
        watchlist = []
        for row in cursor.fetchall():
            item = dict_from_row(row)
            item['genres'] = parse_json_field(item['genres'], [])
            watchlist.append(item)
        
        return jsonify(watchlist), 200
        
    except Exception as e:
        app.logger.error(f"Watchlist error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/watchlist/add', methods=['POST'])
@auth_required
def add_to_watchlist():
    """Add content to watchlist"""
    try:
        data = request.get_json()
        content_id = data.get('contentId')
        
        if not content_id:
            return jsonify({'error': 'contentId required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT watchlist FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if user:
            watchlist = parse_json_field(user['watchlist'], [])
            if content_id not in watchlist:
                watchlist.append(content_id)
                cursor.execute('UPDATE users SET watchlist = ? WHERE id = ?', 
                             (json.dumps(watchlist), request.user_id))
                db.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        app.logger.error(f"Add watchlist error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/watchlist/remove', methods=['POST'])
@auth_required
def remove_from_watchlist():
    """Remove content from watchlist"""
    try:
        data = request.get_json()
        content_id = data.get('contentId')
        
        if not content_id:
            return jsonify({'error': 'contentId required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT watchlist FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if user:
            watchlist = parse_json_field(user['watchlist'], [])
            if content_id in watchlist:
                watchlist.remove(content_id)
                cursor.execute('UPDATE users SET watchlist = ? WHERE id = ?', 
                             (json.dumps(watchlist), request.user_id))
                db.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        app.logger.error(f"Remove watchlist error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/track-view', methods=['POST'])
@auth_required
def track_view():
    """Track content view and update watch count"""
    try:
        data = request.get_json()
        content_id = data.get('contentId')
        watch_time = data.get('watchTime', 0)
        progress = data.get('progress', 0)
        
        if not content_id:
            return jsonify({'error': 'contentId required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Update content watch count
        cursor.execute('UPDATE content SET watch_count = watch_count + 1 WHERE id = ?', (content_id,))
        
        # Track user watch
        cursor.execute('''
            INSERT INTO user_watches (user_id, content_id, watch_time, progress)
            VALUES (?, ?, ?, ?)
        ''', (request.user_id, content_id, watch_time, progress))
        
        # Update user history
        cursor.execute('SELECT history FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if user:
            history = parse_json_field(user['history'], [])
            
            # Update or add history entry
            found = False
            for item in history:
                if item.get('contentId') == content_id:
                    item['progress'] = progress
                    item['timestamp'] = datetime.utcnow().isoformat()
                    found = True
                    break
            
            if not found:
                history.append({
                    'contentId': content_id,
                    'progress': progress,
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # Keep last 100 entries
            history = history[-100:]
            
            cursor.execute('UPDATE users SET history = ? WHERE id = ?', 
                         (json.dumps(history), request.user_id))
        
        db.commit()
        return jsonify({'success': True}), 200
        
    except Exception as e:
        app.logger.error(f"Track view error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/recommendations', methods=['GET'])
@auth_required
def get_recommendations():
    """Get personalized recommendations based on watch history"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Get user's watch history
        cursor.execute('''
            SELECT content_id FROM user_watches 
            WHERE user_id = ? 
            ORDER BY watched_at DESC 
            LIMIT 20
        ''', (request.user_id,))
        
        watched_ids = [row['content_id'] for row in cursor.fetchall()]
        
        if not watched_ids:
            # Return trending if no history
            return get_trending()
        
        # Get genres from watched content
        placeholders = ','.join(['?' for _ in watched_ids])
        cursor.execute(f'SELECT genres FROM content WHERE id IN ({placeholders})', watched_ids)
        
        genre_counts = {}
        for row in cursor.fetchall():
            genres = parse_json_field(row['genres'], [])
            for genre in genres:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        # Get top 3 genres
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        preferred_genres = [genre for genre, _ in top_genres]
        
        if not preferred_genres:
            return get_trending()
        
        # Find similar content
        genre_conditions = ' OR '.join(['genres LIKE ?' for _ in preferred_genres])
        genre_params = [f'%"{genre}"%' for genre in preferred_genres]
        
        # Exclude already watched
        exclude_conditions = ' AND ' + ' AND '.join(['id != ?' for _ in watched_ids])
        
        cursor.execute(f'''
            SELECT * FROM content 
            WHERE ({genre_conditions}) {exclude_conditions}
            ORDER BY CAST(rating AS REAL) DESC, watch_count DESC 
            LIMIT 20
        ''', genre_params + watched_ids)
        
        recommendations = []
        for row in cursor.fetchall():
            item = dict_from_row(row)
            item['genres'] = parse_json_field(item['genres'], [])
            recommendations.append(item)
        
        return jsonify(recommendations), 200
        
    except Exception as e:
        app.logger.error(f"Recommendations error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/history', methods=['GET'])
@auth_required
def get_history():
    """Get user watch history"""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT history FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify([]), 200
        
        history = parse_json_field(user['history'], [])
        
        if not history:
            return jsonify([]), 200
        
        content_ids = [h['contentId'] for h in history if h.get('contentId')]
        
        if not content_ids:
            return jsonify([]), 200
        
        placeholders = ','.join(['?' for _ in content_ids])
        cursor.execute(f'SELECT * FROM content WHERE id IN ({placeholders})', content_ids)
        
        content_map = {}
        for row in cursor.fetchall():
            item = dict_from_row(row)
            item['genres'] = parse_json_field(item['genres'], [])
            content_map[item['id']] = item
        
        history_with_details = []
        for h in history:
            content_id = h['contentId']
            if content_id in content_map:
                item = content_map[content_id].copy()
                item['progress'] = h.get('progress', 0)
                item['lastWatched'] = h.get('timestamp')
                history_with_details.append(item)
        
        return jsonify(history_with_details), 200
        
    except Exception as e:
        app.logger.error(f"History error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

if __name__ == '__main__':
    # Initialize database
    if not os.path.exists(DATABASE_PATH):
        print("🔨 Initializing database...")
        init_database()
    
    # Sync content
    if os.path.exists(JSON_DATA_PATH):
        sync_content_from_json()
    
    print("🚀 Starting Flask server on http://0.0.0.0:8001")
    print("📁 Serving frontend from:", app.static_folder)
    app.run(debug=True, host='0.0.0.0', port=8001, use_reloader=False)
