from flask import Flask, request, jsonify
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

app = Flask(__name__)
# CORS enabled for all origins - frontend will be hosted separately
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
    
    # Weekly assignments table for day-wise recommendations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS weekly_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week TEXT NOT NULL,
            day TEXT NOT NULL,
            content_id TEXT,
            content_type TEXT DEFAULT 'movie',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Hero carousel IDs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hero_carousel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_id TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_weekly_assignments_week_day ON weekly_assignments(week, day)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_hero_carousel_active ON hero_carousel(is_active)')
    
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

# ============= API ROUTES =============
# Note: Frontend will be hosted separately and call these APIs

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
            SELECT id FROM content 
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
    """Get user watchlist IDs"""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT watchlist FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify([]), 200
        
        watchlist_ids = parse_json_field(user['watchlist'], [])
        
        return jsonify(watchlist_ids), 200
        
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
    """Get personalized recommendation IDs based on watch history"""
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
            SELECT id FROM content 
            WHERE ({genre_conditions}) {exclude_conditions}
            ORDER BY CAST(rating AS REAL) DESC, watch_count DESC 
            LIMIT 20
        ''', genre_params + watched_ids)
        
        recommendation_ids = [row['id'] for row in cursor.fetchall()]
        
        return jsonify(recommendation_ids), 200
        
    except Exception as e:
        app.logger.error(f"Recommendations error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/history', methods=['GET'])
@auth_required
def get_history():
    """Get user watch history with IDs and progress"""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT history FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify([]), 200
        
        history = parse_json_field(user['history'], [])
        
        return jsonify(history), 200
        
    except Exception as e:
        app.logger.error(f"History error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

# ============= WEEKLY ASSIGNMENTS ROUTES =============

# Cache for weekly assignments
weekly_cache = {
    'week': None,
    'assignments': {}
}

def get_current_week():
    """Get current ISO week number"""
    return datetime.utcnow().strftime('%Y-%W')

def get_current_day():
    """Get current day name (lowercase)"""
    return datetime.utcnow().strftime('%A').lower()

@app.route('/api/content/weekly/<day>', methods=['GET'])
def get_weekly_content(day):
    """Get content IDs for a specific day of the week"""
    try:
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'series']
        if day.lower() not in valid_days:
            return jsonify({'error': 'Invalid day'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        current_week = get_current_week()
        
        cursor.execute('''
            SELECT content_id FROM weekly_assignments 
            WHERE week = ? AND day = ?
            ORDER BY id ASC
        ''', (current_week, day.lower()))
        
        content_ids = [row['content_id'] for row in cursor.fetchall() if row['content_id']]
        
        return jsonify(content_ids), 200
        
    except Exception as e:
        app.logger.error(f"Weekly content error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/content/weekly/today', methods=['GET'])
def get_today_content():
    """Get content IDs for today"""
    try:
        current_day = get_current_day()
        return get_weekly_content(current_day)
    except Exception as e:
        app.logger.error(f"Today content error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/content/weekly/all', methods=['GET'])
def get_all_weekly_content():
    """Get all weekly assignments"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        current_week = get_current_week()
        
        cursor.execute('''
            SELECT day, content_id FROM weekly_assignments 
            WHERE week = ?
            ORDER BY id ASC
        ''', (current_week,))
        
        result = {
            'monday': [],
            'tuesday': [],
            'wednesday': [],
            'thursday': [],
            'friday': [],
            'saturday': [],
            'sunday': [],
            'series': []
        }
        
        for row in cursor.fetchall():
            day = row['day']
            content_id = row['content_id']
            if day in result and content_id:
                result[day].append(content_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"All weekly content error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# ============= HERO CAROUSEL ROUTES =============

@app.route('/api/hero/carousel', methods=['GET'])
def get_hero_carousel():
    """Get hero carousel content IDs"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT content_id FROM hero_carousel 
            WHERE is_active = 1
            ORDER BY position ASC
        ''')
        
        content_ids = [row['content_id'] for row in cursor.fetchall() if row['content_id']]
        
        return jsonify(content_ids), 200
        
    except Exception as e:
        app.logger.error(f"Hero carousel error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/hero/carousel', methods=['POST'])
def update_hero_carousel():
    """Update hero carousel content IDs"""
    try:
        data = request.get_json()
        content_ids = data.get('content_ids', [])
        
        db = get_db()
        cursor = db.cursor()
        
        # Clear existing
        cursor.execute('DELETE FROM hero_carousel')
        
        # Insert new
        for position, content_id in enumerate(content_ids):
            if content_id:
                cursor.execute('''
                    INSERT INTO hero_carousel (content_id, position, is_active)
                    VALUES (?, ?, 1)
                ''', (content_id, position))
        
        db.commit()
        return jsonify({'success': True}), 200
        
    except Exception as e:
        app.logger.error(f"Update hero carousel error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# ============= ADMIN ROUTES =============

@app.route('/api/admin/weekly-assignments', methods=['GET'])
def get_admin_weekly_assignments():
    """Get all weekly assignments for admin"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        current_week = get_current_week()
        
        cursor.execute('''
            SELECT * FROM weekly_assignments WHERE week = ?
        ''', (current_week,))
        
        result = {
            'monday': [],
            'tuesday': [],
            'wednesday': [],
            'thursday': [],
            'friday': [],
            'saturday': [],
            'sunday': [],
            'series': []
        }
        
        for row in cursor.fetchall():
            day = row['day']
            content_id = row['content_id']
            if day in result and content_id:
                result[day].append(content_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"Admin weekly error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/weekly-assignments', methods=['POST'])
def post_admin_weekly_assignments():
    """Update weekly assignments for a specific day"""
    try:
        data = request.get_json()
        day = data.get('day')
        content_ids = data.get('content_ids', [])
        
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'series']
        if day not in valid_days:
            return jsonify({'error': 'Invalid day'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        current_week = get_current_week()
        
        # Clear existing assignments for this day and week
        cursor.execute('''
            DELETE FROM weekly_assignments 
            WHERE week = ? AND day = ?
        ''', (current_week, day))
        
        # Insert new assignments
        for content_id in content_ids:
            if content_id and content_id.strip():
                cursor.execute('''
                    INSERT INTO weekly_assignments (week, day, content_id)
                    VALUES (?, ?, ?)
                ''', (current_week, day, content_id.strip()))
        
        db.commit()
        
        # Update cache
        weekly_cache['week'] = current_week
        if 'assignments' not in weekly_cache:
            weekly_cache['assignments'] = {}
        weekly_cache['assignments'][day] = content_ids
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        app.logger.error(f"Post weekly error: {e}")
        return jsonify({'error': str(e)}), 500

# Admin Weekly Editor Page
@app.route('/admin/weekly-editor', methods=['GET'])
def admin_weekly_editor():
    """Admin page to edit weekly suggestions"""
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Suggestions Editor - Chadcinema Admin</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                background: #0f0a0a; 
                color: #fff;
                min-height: 100vh;
                padding: 2rem;
            }
            h2 { 
                font-size: 2rem;
                margin-bottom: 1.5rem;
                background: linear-gradient(135deg, #ff3333, #ff6b35);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            h3 {
                font-size: 1.25rem;
                margin: 2rem 0 1rem;
                color: #ff6b35;
            }
            .container { max-width: 1000px; margin: 0 auto; }
            .assignment-row { 
                margin-bottom: 1.5rem; 
                padding: 1.5rem;
                background: #1a1212;
                border-radius: 12px;
                border: 1px solid #4a3030;
            }
            .assignment-row b { 
                color: #ff3333; 
                font-size: 1.1rem;
                display: block;
                margin-bottom: 0.75rem;
            }
            label { 
                color: #d4b4b4; 
                display: block;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            input[type="text"] { 
                width: 100%;
                padding: 0.75rem 1rem;
                background: #2a1f1f;
                border: 1px solid #4a3030;
                border-radius: 8px;
                color: #fff;
                font-size: 1rem;
                margin-bottom: 0.75rem;
                transition: border-color 0.3s;
            }
            input[type="text"]:focus {
                outline: none;
                border-color: #ff3333;
            }
            button { 
                padding: 0.75rem 1.5rem;
                background: linear-gradient(135deg, #ff3333, #ff6b35);
                color: #0f0a0a;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.9rem;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(255, 51, 51, 0.3);
            }
            .success { color: #10b981; margin-left: 1rem; }
            .error { color: #ef4444; margin-left: 1rem; }
            #assignments { 
                background: #1a1212; 
                padding: 1.5rem;
                border-radius: 12px;
                border: 1px solid #4a3030;
                line-height: 1.8;
            }
            #assignments b { color: #ff6b35; }
            .hero-section {
                background: linear-gradient(135deg, #2a1f1f, #1a1212);
                padding: 1.5rem;
                border-radius: 12px;
                border: 1px solid #ff3333;
                margin-bottom: 2rem;
            }
            .hero-section h3 {
                margin-top: 0;
                color: #ff3333;
            }
            .back-link {
                display: inline-block;
                color: #ff6b35;
                text-decoration: none;
                margin-bottom: 1.5rem;
            }
            .back-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/" class="back-link">← Back to Chadcinema</a>
            <h2>Weekly Suggestions Editor</h2>
            
            <div class="hero-section">
                <h3>Hero Carousel IDs</h3>
                <label>Content IDs for hero carousel (comma separated):</label>
                <input id="hero_ids" type="text" placeholder="tt1659337, tt27543578, tt1312221">
                <button onclick="updateHeroCarousel()">Update Hero Carousel</button>
                <span id="msg_hero"></span>
            </div>
            
            <h3>Day-wise Recommendations</h3>
            ''' + '\n'.join([f'''
            <div class="assignment-row">
                <b>{d.title()}</b>
                <label>Content IDs (comma separated):</label>
                <input id="{d}_ids" type="text" placeholder="tt1234567, tt7654321">
                <button onclick="updateAssignment('{d}')">Update {d.title()}</button>
                <span id="msg_{d}"></span>
            </div>
            ''' for d in days]) + '''
            <div class="assignment-row">
                <b>Series (for the week)</b>
                <label>Series IDs (comma separated):</label>
                <input id="series_ids" type="text" placeholder="tt1234567, tt7654321">
                <button onclick="updateAssignment('series')">Update Series</button>
                <span id="msg_series"></span>
            </div>
            
            <h3>Current Assignments</h3>
            <div id="assignments">Loading...</div>
        </div>
        
        <script>
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        // Determine API base URL - handles both local and preview environments
        function getApiBaseUrl() {
            const currentUrl = window.location.href;
            // If we're on the preview URL, use the configured backend URL
            if (currentUrl.includes('preview.emergentagent.com')) {
                // Extract the backend URL from the preview pattern
                // or use a hardcoded preview backend URL
                return 'https://dynamic-hero-slides.preview.emergentagent.com';
            }
            // Local development - use relative URLs
            return '';
        }
        
        const API_BASE = getApiBaseUrl();
        
        async function loadAssignments() {
            try {
                // Load weekly assignments
                const res = await fetch(API_BASE + '/api/admin/weekly-assignments');
                const assignments = await res.json();
                
                // Fill inputs
                for (const day of days) {
                    const input = document.getElementById(day + '_ids');
                    if (input) {
                        input.value = (assignments[day] || []).join(', ');
                    }
                }
                document.getElementById('series_ids').value = (assignments['series'] || []).join(', ');
                
                // Display assignments
                let html = '';
                for (const day of days) {
                    const ids = assignments[day] || [];
                    html += `<b>${day.charAt(0).toUpperCase() + day.slice(1)}:</b> ${ids.length > 0 ? ids.join(', ') : '<em style="color:#8b7070">Not set</em>'}<br>`;
                }
                html += `<b>Series:</b> ${(assignments['series'] || []).length > 0 ? assignments['series'].join(', ') : '<em style="color:#8b7070">Not set</em>'}`;
                document.getElementById('assignments').innerHTML = html;
                
                // Load hero carousel
                const heroRes = await fetch(API_BASE + '/api/hero/carousel');
                const heroIds = await heroRes.json();
                document.getElementById('hero_ids').value = heroIds.join(', ');
            } catch (error) {
                console.error('Load error:', error);
                document.getElementById('assignments').innerHTML = '<span class="error">Failed to load assignments</span>';
            }
        }
        
        async function updateAssignment(day) {
            const inputId = day === 'series' ? 'series_ids' : day + '_ids';
            const content_ids = document.getElementById(inputId)?.value.split(',').map(x => x.trim()).filter(x => x);
            
            try {
                const res = await fetch(API_BASE + '/api/admin/weekly-assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ day, content_ids })
                });
                
                const result = await res.json();
                const msgEl = document.getElementById('msg_' + day);
                
                if (result.success) {
                    msgEl.textContent = 'Updated!';
                    msgEl.className = 'success';
                    loadAssignments();
                } else {
                    msgEl.textContent = 'Error: ' + (result.error || 'Unknown');
                    msgEl.className = 'error';
                }
                
                setTimeout(() => { msgEl.textContent = ''; }, 3000);
            } catch (error) {
                console.error('Update error:', error);
            }
        }
        
        async function updateHeroCarousel() {
            const content_ids = document.getElementById('hero_ids')?.value.split(',').map(x => x.trim()).filter(x => x);
            
            try {
                const res = await fetch(API_BASE + '/api/admin/hero/carousel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content_ids })
                });
                
                const result = await res.json();
                const msgEl = document.getElementById('msg_hero');
                
                if (result.success) {
                    msgEl.textContent = 'Updated!';
                    msgEl.className = 'success';
                } else {
                    msgEl.textContent = 'Error: ' + (result.error || 'Unknown');
                    msgEl.className = 'error';
                }
                
                setTimeout(() => { msgEl.textContent = ''; }, 3000);
            } catch (error) {
                console.error('Update error:', error);
            }
        }
        
        window.onload = loadAssignments;
        </script>
    </body>
    </html>
    '''

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
