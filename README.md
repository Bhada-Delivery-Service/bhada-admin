# BHADA Admin Panel

A comprehensive admin dashboard for the BHADA Parcel Delivery System. Built with React, TypeScript, Tailwind CSS, and Firebase Authentication.

## Features

### Authentication
- Firebase Phone Authentication
- OTP-based login
- Admin password verification
- JWT token management
- Auto token refresh

### Dashboard
- Real-time statistics
- Order status visualization
- Active riders count
- Revenue tracking
- Interactive charts

### Order Management
- View all orders
- Filter by status
- Search by order ID or phone
- Order details modal
- Cancel orders
- Real-time status updates

### Rider Management
- View all riders
- Rider onboarding approval
- KYC verification
- Availability tracking
- Performance metrics
- Approve/reject applications

### Dispute Resolution
- View all disputes
- Filter by status
- Mark as under review
- Resolve with notes
- Issue refunds
- Track resolution history

### Offers Management
- Create promotional offers
- Multiple offer types (FLAT, PERCENTAGE, CASHBACK, FREE_DELIVERY)
- Set validity periods
- Usage limits
- Deactivate offers

### Pricing Configuration
- View active pricing
- Create new pricing configs
- Base fare and distance
- Per-km rates
- Commission settings
- Category multipliers

### Admin Management (Super Admin Only)
- Create new admins
- Assign admin levels
- Set permissions
- View admin details
- Delete admins
- Super admin cannot be deleted

## Admin Roles

### Super Admin
- Full system access
- Create/manage all other admins
- Cannot be created via API (singleton)
- All permissions enabled

### Operation Admin
- Manage orders
- Manage riders
- Approve KYC and onboarding

### Finance Admin
- Manage payments
- Issue refunds
- View financial reports

### Customer Support
- Handle disputes
- Support tickets
- User communication

## Setup Instructions

### 1. Firebase Configuration

Update `/src/lib/firebase.ts` with your Firebase project credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Enable Firebase Phone Authentication

1. Go to Firebase Console
2. Navigate to Authentication > Sign-in method
3. Enable Phone authentication
4. Add your domain to authorized domains

### 3. Admin Account Setup

**Important**: Before logging in, you need to create admin accounts:

#### For Super Admin (First Time Only):

1. Create a user in Firebase Auth with phone number
2. Note the Firebase UID
3. Call the seed endpoint (one-time):

```bash
curl -X POST https://api.bhada.in/api/v1/admins/seed-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "firebase-uid-here",
    "email": "admin@bhada.in",
    "firstName": "Super",
    "lastName": "Admin",
    "phoneNumber": "+911234567890",
    "notes": "System super admin"
  }'
```

#### For Other Admins:

Use the Admin Management page (only accessible to Super Admin) or API:

```bash
curl -X POST https://api.bhada.in/api/v1/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer super-admin-token" \
  -d '{
    "uid": "firebase-uid-here",
    "email": "ops@bhada.in",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+911234567890",
    "adminLevel": "OPERATION_ADMIN",
    "permissions": ["MANAGE_ORDERS", "MANAGE_RIDERS"]
  }'
```

### 4. Login Flow

1. Open the application at `/login`
2. Enter your phone number with country code (e.g., +91 1234567890)
3. Click "Send OTP"
4. Enter the 6-digit OTP received
5. Enter admin password (default: `admin@123`)
6. Click "Verify & Login"

### 5. Environment Variables

The API base URL is set in `/src/lib/api.ts`:

```typescript
const API_BASE_URL = 'https://api.bhada.in/api/v1';
```

Update this if your API is hosted elsewhere.

## Default Credentials

- **Admin Password**: `admin@123` (can be changed via ADMIN_PASSWORD env var on backend)
- **Firebase**: Configure your own Firebase project

## Security Notes

- All API requests require JWT authentication
- Super Admin has elevated privileges
- Admin password required for login
- Firebase UID must exist before creating admin
- Tokens are stored in localStorage
- Auto token refresh on expiry

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **React Router v7** - Navigation
- **Firebase** - Authentication
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Orders.tsx
│   │   ├── Riders.tsx
│   │   ├── Disputes.tsx
│   │   ├── Offers.tsx
│   │   ├── Pricing.tsx
│   │   └── AdminManagement.tsx
│   ├── routes.ts
│   └── App.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── firebase.ts
│   └── api.ts
└── styles/
    └── ...
```

## API Integration

All API endpoints are integrated through the `apiClient` class in `/src/lib/api.ts`. The client automatically:

- Adds authentication headers
- Handles token refresh
- Manages error responses
- Stores tokens in localStorage

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Troubleshooting

### "No admin record found"
- Ensure the admin account exists in the backend
- Verify Firebase UID matches the one in admin database

### "Invalid admin password"
- Check the ADMIN_PASSWORD env var on backend
- Default is `admin@123`

### reCAPTCHA issues
- Ensure your domain is added to Firebase authorized domains
- Check browser console for specific reCAPTCHA errors

### Phone authentication not working
- Verify phone number format (must include country code with +)
- Check Firebase phone auth is enabled
- Ensure quota limits not exceeded

## Support

For API documentation, refer to the BHADA API Documentation v2.1.0

## License

Proprietary - BHADA Parcel Delivery System
