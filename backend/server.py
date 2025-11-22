# ASGI wrapper for Flask app to work with uvicorn
from app import app as flask_app
from werkzeug.middleware.proxy_fix import ProxyFix

# Wrap Flask app for ASGI
flask_app.wsgi_app = ProxyFix(flask_app.wsgi_app, x_proto=1, x_host=1)

# Import ASGI adapter
try:
    from asgiref.wsgi import WsgiToAsgi
    app = WsgiToAsgi(flask_app)
except ImportError:
    # If asgiref not available, just use Flask directly
    # Uvicorn can handle WSGI apps
    app = flask_app

# Initialize database and sync content on startup
if __name__ != '__main__':
    from app import init_database, sync_content_from_json, DATABASE_PATH, JSON_DATA_PATH
    import os
    
    if not os.path.exists(DATABASE_PATH):
        print("🔨 Initializing database...")
        init_database()
    
    if os.path.exists(JSON_DATA_PATH):
        sync_content_from_json()
