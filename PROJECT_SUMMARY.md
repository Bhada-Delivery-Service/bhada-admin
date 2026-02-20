# BHADA Admin Panel - Project Summary

## Overview

A comprehensive admin dashboard for the BHADA Parcel Delivery System with full API integration, Firebase phone authentication, and role-based access control.

## Key Features

### ✅ Authentication & Authorization
- Firebase Phone Authentication with OTP
- Admin password verification
- JWT token management with auto-refresh
- Role-based access control (Super Admin, Operation Admin, Finance Admin, Customer Support)
- Protected routes and Super Admin-only features

### ✅ Dashboard
- Real-time statistics and metrics
- Order status distribution (Pie & Bar charts)
- Active riders count
- Revenue tracking
- Quick action buttons

### ✅ Order Management
- View all orders with pagination
- Filter by status (PLACED, READY, DISPATCHED, DELIVERED, CANCELLED)
- Search by order ID or phone number
- Detailed order view with items
- Cancel orders functionality
- Order status tracking

### ✅ Rider Management
- View all riders with details
- Approve/reject KYC documents
- Approve/reject onboarding applications
- Track rider availability (ONLINE, OFFLINE, ON_BREAK, BUSY)
- View performance metrics (total deliveries, success rate)
- Search riders by name, phone, or vehicle

### ✅ Dispute Resolution
- View all disputes with filtering
- Filter by status (OPEN, UNDER_REVIEW, RESOLVED, REJECTED, CLOSED)
- Mark disputes under review
- Resolve disputes with admin notes
- Issue refunds directly
- Reject disputes with reasons

### ✅ Offers Management
- Create promotional offers
- Multiple offer types (FLAT, PERCENTAGE, CASHBACK, FREE_DELIVERY)
- Set validity periods and usage limits
- View all active and inactive offers
- Deactivate offers

### ✅ Pricing Configuration
- View active pricing configuration
- Create new pricing configs
- Set base fare, base distance, per-km rates
- Configure platform commission
- View pricing history

### ✅ Admin Management (Super Admin Only)
- Create new admin accounts
- Assign admin levels
- Set granular permissions
- View all admins
- Delete admins (except super admin)
- View super admin details

## Technical Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7 (Data mode)
- **Authentication**: Firebase Auth (Phone)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API

## Project Structure

```
bhada-admin/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx       # Route protection wrapper
│   │   ├── pages/
│   │   │   ├── Login.tsx                # Phone auth login
│   │   │   ├── DashboardLayout.tsx      # Main layout with sidebar
│   │   │   ├── Dashboard.tsx            # Overview page
│   │   │   ├── Orders.tsx               # Order management
│   │   │   ├── Riders.tsx               # Rider management
│   │   │   ├── Disputes.tsx             # Dispute resolution
│   │   │   ├── Offers.tsx               # Offers management
│   │   │   ├── Pricing.tsx              # Pricing configuration
│   │   │   └── AdminManagement.tsx      # Admin CRUD (Super Admin)
│   │   ├── routes.ts                    # Route configuration
│   │   └── App.tsx                      # Root component
│   ├── contexts/
│   │   └── AuthContext.tsx              # Auth state management
│   ├── lib/
│   │   ├── firebase.ts                  # Firebase initialization
│   │   ├── api.ts                       # API client
│   │   └── types.ts                     # TypeScript types
│   └── styles/
│       └── ...                          # CSS files
├── .env.example                         # Environment template
├── .gitignore                          # Git ignore rules
├── README.md                           # Main documentation
├── QUICKSTART.md                       # Quick start guide
├── FIREBASE_SETUP.md                   # Firebase setup guide
├── DEPLOYMENT.md                       # Deployment guide
└── package.json                        # Dependencies
```

## API Integration

Fully integrated with BHADA API v2.1.0:

- ✅ Admin authentication endpoints
- ✅ Admin CRUD operations
- ✅ Order management endpoints
- ✅ Rider management endpoints
- ✅ Dispute resolution endpoints
- ✅ Offers management endpoints
- ✅ Pricing configuration endpoints
- ✅ Automatic JWT token handling
- ✅ Error handling and validation

## Admin Roles & Permissions

### Super Admin
- Full system access
- Create/manage all other admins
- Access to Admin Management page
- Cannot be created via API (singleton)
- Cannot be deleted

### Operation Admin
- Manage orders
- Manage riders
- Approve KYC and onboarding
- Assign orders to riders

### Finance Admin
- Manage payments
- Issue refunds
- View financial reports
- Manage pricing

### Customer Support
- Handle disputes
- Resolve customer issues
- View orders and riders (read-only)

## Security Features

- JWT token-based authentication
- Protected routes with role checking
- Super Admin-only features
- Token auto-refresh
- Secure token storage
- Firebase reCAPTCHA verification
- HTTPS enforcement (in production)

## Responsive Design

- Mobile-friendly sidebar
- Responsive tables
- Touch-friendly buttons
- Adaptive layouts
- Mobile-optimized modals

## Documentation

1. **README.md** - Main documentation with features and setup
2. **QUICKSTART.md** - Quick start guide for developers
3. **FIREBASE_SETUP.md** - Detailed Firebase configuration
4. **DEPLOYMENT.md** - Production deployment guide

## Setup Summary

### 1. Clone & Install
```bash
git clone <repository>
cd bhada-admin
pnpm install
```

### 2. Configure Firebase
- Create Firebase project
- Enable Phone Authentication
- Copy config to `/src/lib/firebase.ts`

### 3. Seed Super Admin
```bash
curl -X POST https://api.bhada.in/api/v1/admins/seed-super-admin \
  -H "Content-Type: application/json" \
  -d '{ "uid": "...", "email": "...", ... }'
```

### 4. Run Development Server
```bash
pnpm dev
```

### 5. Login
- Phone: `+911234567890`
- Password: `admin@123`

## Default Credentials

- **Admin Password**: `admin@123`
- **Test Phone**: Configure in Firebase Console

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Performance

- Lazy loading components
- Optimized bundle size
- Efficient re-renders
- Cached API responses
- Image optimization

## Future Enhancements (Optional)

- [ ] Real-time updates with WebSocket
- [ ] Advanced analytics dashboard
- [ ] Export reports (PDF/Excel)
- [ ] Bulk operations
- [ ] Email notifications
- [ ] Advanced filtering
- [ ] Dark mode
- [ ] Multi-language support

## Support & Maintenance

- Regular dependency updates
- Security patches
- Bug fixes
- Feature additions
- API version compatibility

## License

Proprietary - BHADA Parcel Delivery System

## Contact

For support or questions about the admin panel, refer to the API documentation or contact the development team.

---

Built with ❤️ using React, TypeScript, and Tailwind CSS
