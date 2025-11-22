# Deployment Guide - Separate Backend & Frontend Hosting

This guide explains how to deploy the backend and frontend separately.

## 🔧 Backend Setup & Deployment

### Requirements
- Python 3.11+
- SQLite (included with Python)

### Installation Steps

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run the Backend**
   
   The backend runs on **port 8001** by default.
   
   **Option A: Using the Flask development server**
   ```bash
   cd backend
   python app.py
   ```
   
   **Option B: Using Uvicorn (Recommended for production)**
   ```bash
   cd backend
   uvicorn server:app --host 0.0.0.0 --port 8001
   ```
   
   **Option C: Using Gunicorn (Production)**
   ```bash
   cd backend
   gunicorn -w 4 -b 0.0.0.0:8001 server:app
   ```

3. **Verify Backend is Running**
   ```bash
   curl http://localhost:8001/api/health
   ```
   
   You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-22T09:00:00.937831"
   }
   ```

### Backend API Endpoints

All API endpoints are prefixed with `/api`:

**Authentication:**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

**Content:**
- `GET /api/content/trending` - Get trending content
- `GET /api/content/by-category/<category>` - Get content by category
- `GET /api/content/detail/<content_id>` - Get content details
- `GET /api/content/search?q=<query>` - Search content

**User:**
- `GET /api/user/watchlist` - Get user watchlist
- `POST /api/user/watchlist/add` - Add to watchlist
- `POST /api/user/watchlist/remove` - Remove from watchlist
- `POST /api/user/track-view` - Track content view
- `GET /api/user/history` - Get watch history
- `GET /api/user/recommendations` - Get personalized recommendations

**Health:**
- `GET /api/health` - Health check

### Environment Variables (Optional)

You can set the following environment variable:

```bash
export JWT_SECRET="your-secret-key-here"
```

If not set, a default secret will be used.

---

## 🎨 Frontend Setup & Deployment

### No Build Required!

The frontend is a **vanilla JavaScript** application - no Node.js, npm, or build tools required!

### Configuration

**⚠️ IMPORTANT: Configure Backend URL**

Before deploying, update the backend URL in `/frontend/js/config.js`:

```javascript
const CONFIG = {
    API_BASE_URL: 'http://your-backend-url.com',  // 👈 CHANGE THIS
    // ... rest of config
};
```

**Examples:**
- Local: `http://localhost:8001`
- Production: `https://api.yourdomain.com`
- Custom port: `http://your-server.com:8001`

### Deployment Options

**Option 1: Static File Server (Nginx, Apache, etc.)**

Simply copy the entire `/frontend` folder to your web server's document root.

Example with Nginx:
```bash
cp -r frontend /var/www/html/myapp
```

**Option 2: Python HTTP Server (For testing)**

```bash
cd frontend
python3 -m http.server 8080
```

Then access at: `http://localhost:8080`

**Option 3: Any Static Hosting Service**

Upload the frontend folder to:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- AWS S3 + CloudFront
- Any static hosting provider

### CORS Note

The backend has CORS enabled for all origins by default:
```python
CORS(app, resources={r"/*": {"origins": "*"}})
```

This allows the frontend to make requests from any domain. For production, you may want to restrict this to your specific frontend domain.

---

## 🚀 Production Deployment Checklist

### Backend

- [ ] Set custom JWT_SECRET environment variable
- [ ] Use production WSGI server (Gunicorn/Uvicorn)
- [ ] Configure CORS to allow only your frontend domain
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure firewall to allow port 8001 (or your chosen port)
- [ ] Set up monitoring and logging
- [ ] Regular database backups

### Frontend

- [ ] Update API_BASE_URL in config.js to your backend URL
- [ ] Deploy to static hosting service or web server
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure CDN (optional, for better performance)
- [ ] Test all features with production backend

---

## 🧪 Testing the Setup

### Test Backend Connectivity from Frontend

1. Open your browser's developer console (F12)
2. Navigate to your frontend URL
3. Check Network tab for API calls
4. Verify requests are going to the correct backend URL
5. Check for CORS errors

### Test Individual Endpoints

```bash
# Health check
curl http://your-backend-url:8001/api/health

# Get trending content
curl http://your-backend-url:8001/api/content/trending?limit=5

# Search
curl "http://your-backend-url:8001/api/content/search?q=action"
```

---

## 🐛 Troubleshooting

### CORS Errors

If you see CORS errors in browser console:
- Verify backend CORS is enabled
- Check that backend URL in frontend config.js is correct
- Ensure backend is actually running and accessible

### Backend Not Starting

- Check if port 8001 is already in use
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Check backend logs for error messages

### Frontend Can't Connect to Backend

- Verify API_BASE_URL in frontend/js/config.js
- Check if backend is running: `curl http://backend-url/api/health`
- Check browser console for network errors
- Verify firewall/security groups allow the connection

---

## 📝 Current Status

✅ **Backend**: Running on port 8001, all APIs tested and working  
✅ **Frontend**: Ready for deployment, just needs backend URL configuration  
✅ **Separation**: Complete - backend no longer serves frontend static files  

---

## 🔗 Quick Start Summary

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Frontend:**
1. Edit `frontend/js/config.js` - set your backend URL
2. Deploy the `/frontend` folder to any static hosting
3. Done!

---

Need help? Check the logs or test endpoints individually to isolate issues.
