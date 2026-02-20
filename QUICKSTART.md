# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PNPM package manager
- Firebase account
- BHADA API backend running

## Installation

```bash
# Install dependencies
pnpm install
```

## Configuration

### 1. Firebase Setup

Edit `/src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed Firebase configuration.

### 2. API Configuration (Optional)

If your API is not at `https://api.bhada.in`, edit `/src/lib/api.ts`:

```typescript
const API_BASE_URL = 'https://your-api-domain.com/api/v1';
```

## Initial Setup

### 1. Create Firebase User

1. Go to Firebase Console > Authentication > Users
2. Click "Add user"
3. Add phone number: `+911234567890`
4. Copy the User UID

### 2. Seed Super Admin

```bash
curl -X POST https://api.bhada.in/api/v1/admins/seed-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "YOUR_FIREBASE_UID",
    "email": "admin@bhada.in",
    "firstName": "Super",
    "lastName": "Admin",
    "phoneNumber": "+911234567890"
  }'
```

## Running the App

```bash
# Development mode
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

## First Login

1. Navigate to `/login`
2. Enter phone: `+911234567890`
3. Click "Send OTP"
4. Enter OTP from SMS
5. Enter password: `admin@123`
6. Click "Verify & Login"

## Build for Production

```bash
pnpm build
```

The build output will be in the `dist` folder.

## Common Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Default Credentials

- **Admin Password**: `admin@123`
- **Test Phone**: Configure in Firebase Console

## Next Steps

1. ✅ Set up Firebase (see FIREBASE_SETUP.md)
2. ✅ Create super admin
3. ✅ Login to dashboard
4. ✅ Create additional admins via Admin Management
5. ✅ Configure pricing and offers
6. ✅ Start managing orders and riders

## Features Overview

- **Dashboard**: Overview of orders, riders, and revenue
- **Orders**: Manage all delivery orders
- **Riders**: Approve KYC and onboarding
- **Disputes**: Resolve customer disputes
- **Offers**: Create promotional offers
- **Pricing**: Configure delivery pricing
- **Admin Management**: Create and manage admin accounts (Super Admin only)

## Support

For detailed documentation, see [README.md](./README.md)

For Firebase setup help, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
