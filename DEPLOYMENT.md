# Deployment Guide

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=bhada-admin.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bhada-admin
VITE_FIREBASE_STORAGE_BUCKET=bhada-admin.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# API Configuration
VITE_API_BASE_URL=https://api.bhada.in/api/v1
```

## Build

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build
```

The production-ready files will be in the `dist/` directory.

## Deployment Options

### 1. Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard:
1. Go to Project Settings > Environment Variables
2. Add all variables from `.env`

### 2. Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Configure:
1. Build command: `pnpm build`
2. Publish directory: `dist`
3. Add environment variables in Site settings

### 3. AWS S3 + CloudFront

```bash
# Build
pnpm build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 4. Firebase Hosting

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Initialize (first time only)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

Configure `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 5. Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Build and run:

```bash
# Build image
docker build -t bhada-admin .

# Run container
docker run -p 80:80 bhada-admin
```

## Post-Deployment

### 1. Update Firebase Authorized Domains

1. Go to Firebase Console > Authentication > Settings
2. Add your production domain to "Authorized domains"
3. Example: `admin.bhada.in`

### 2. Configure CORS on API

Ensure your backend API allows requests from your admin domain:

```javascript
// Example for Express.js
app.use(cors({
  origin: ['https://admin.bhada.in', 'http://localhost:5173'],
  credentials: true
}));
```

### 3. Update API URL

If you hardcoded the API URL in `/src/lib/api.ts`, update it or use environment variables.

### 4. Test Authentication

1. Open your deployed admin panel
2. Try logging in with a test account
3. Verify all features work correctly

## Security Checklist

- [ ] Environment variables configured
- [ ] Firebase domain authorized
- [ ] API CORS configured
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled on API
- [ ] Admin password changed from default
- [ ] Firebase App Check enabled (optional)

## Monitoring

### Set up monitoring for:

1. **Firebase Authentication**
   - Monitor usage in Firebase Console
   - Set up alerts for unusual activity

2. **API Performance**
   - Monitor API response times
   - Track error rates

3. **Frontend Errors**
   - Use error tracking (Sentry, LogRocket)
   - Monitor console errors

## Troubleshooting

### "Authentication failed" after deployment

- Verify Firebase domain is authorized
- Check environment variables are set correctly
- Ensure API is accessible from production domain

### "API request failed"

- Check CORS configuration on backend
- Verify API_BASE_URL is correct
- Check API is running and accessible

### Static assets not loading

- Ensure build output is correct
- Check nginx/server configuration
- Verify asset paths are correct

## Performance Optimization

### 1. Enable Compression

For nginx:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 2. CDN

Use a CDN for static assets:
- CloudFlare
- AWS CloudFront
- Fastly

### 3. Cache Headers

Set appropriate cache headers for static assets (already in nginx config above).

## Rollback

If deployment fails:

### Vercel
```bash
vercel rollback
```

### Netlify
Use the Netlify dashboard to rollback to a previous deployment.

### AWS S3
Keep previous builds and restore from backup.

## Support

For issues during deployment, check:
- Build logs
- Browser console
- API logs
- Firebase Console

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        run: npm i -g pnpm
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
        run: pnpm build
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

Add secrets in GitHub repository settings.
