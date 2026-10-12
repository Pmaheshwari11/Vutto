# Production Deployment Guide

This guide covers deploying the **MotoBid** platform to local, containerized, and cloud environments.

---

## 1. Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Environment mode (`development` / `production` / `test`) |
| `PORT` | `5000` | HTTP and WebSocket port |
| `JWT_SECRET` | *(Random string)* | Cryptographic signing secret for JWT tokens |
| `DB_PATH` | `./data/motobid.sqlite` | Absolute or relative path to SQLite database |
| `ANTI_SNIPE_WINDOW_MS` | `30000` | Threshold window in milliseconds to trigger soft close (30s) |
| `EXTENSION_DURATION_MS` | `60000` | Time added when soft close is triggered (60s) |
| `MAX_EXTENSIONS` | `15` | Maximum number of soft-close extensions permitted per auction |
| `CORS_ORIGIN` | `*` | Allowed CORS origins for external API access |

---

## 2. Option A: Local Quickstart (Zero-Docker)

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Steps
```bash
# 1. Clone repository & enter project directory
cd bike-auction-platform

# 2. Install all dependencies across workspaces
npm run install:all

# 3. Build client and server bundles
npm run build

# 4. Start production server
npm start
```
The application will launch on **http://localhost:5000** with:
- Web App UI: `http://localhost:5000/`
- Prometheus Metrics: `http://localhost:5000/metrics`
- Health Checks: `http://localhost:5000/health`
- WebSocket Gateway: `ws://localhost:5000/ws`

---

## 3. Option B: Docker Compose (Single Command)

### Prerequisites
- Docker Engine & Docker Compose installed

### Steps
```bash
# Build and launch container in background
docker compose up --build -d

# Check running status and health probe
docker compose ps

# View live structured JSON logs
docker compose logs -f
```

---

## 4. Option C: Cloud Deployment (Render / Railway / Fly.io)

### Deploying on Render (Free / Pro)
1. Fork or push the `bike-auction-platform` repository to your GitHub account.
2. In the Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
3. Connect your repository.
4. Configure the build parameters:
   - **Environment**: `Node`
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health/live`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(Generate a secure 64-character secret)*
6. Click **Create Web Service**. Render will build and deploy the app on a public URL (`https://your-app.onrender.com`).

---

## 5. Option D: Production Nginx Reverse Proxy with SSL

For dedicated VPS / EC2 / Cloud VM deployments:

```nginx
# /etc/nginx/sites-available/motobid.conf
server {
    server_name motobid.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # WebSocket Upgrade Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Request Tracing & Forwarding
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable SSL via Let's Encrypt:
```bash
sudo certbot --nginx -d motobid.yourdomain.com
```

---

## 6. Prometheus Scrape Configuration

To connect MotoBid to your organization's Prometheus server, add this target to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'motobid_platform'
    scrape_interval: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:5000']
```
