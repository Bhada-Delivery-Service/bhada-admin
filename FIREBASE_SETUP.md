# Firebase Setup Guide for BHADA Admin Panel

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "BHADA Admin" (or your preferred name)
4. Enable Google Analytics (optional)
5. Create project

## Step 2: Register Web App

1. In your Firebase project, click the Web icon (</>)
2. Register app name: "BHADA Admin Panel"
3. Copy the Firebase configuration object
4. Click "Continue to console"

## Step 3: Enable Phone Authentication

1. Go to **Authentication** > **Sign-in method**
2. Click **Phone** provider
3. Click **Enable** toggle
4. Click **Save**

### Configure Phone Auth Settings:

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `admin.bhada.in`)

### Test Phone Numbers (Optional for Development):

1. Go to **Authentication** > **Sign-in method** > **Phone**
2. Scroll to "Phone numbers for testing"
3. Add test numbers:
   - Phone: `+911234567890`
   - Code: `123456`

## Step 4: Configure Firebase in Your App

1. Open `/src/lib/firebase.ts`
2. Replace the configuration with your values:

```typescript
const firebaseConfig = {
  apiKey: "AIza...",                    // From Firebase Console
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 5: Set Up reCAPTCHA (Required for Phone Auth)

Firebase Phone Authentication uses reCAPTCHA for verification.

### Invisible reCAPTCHA (Recommended):

The app is already configured with invisible reCAPTCHA. It will work automatically once you:

1. Deploy to a proper domain (not just localhost)
2. Add the domain to Firebase authorized domains

### For Development (localhost):

Firebase provides a test mode for localhost automatically. You can:

1. Use test phone numbers (added in Step 3)
2. Or use real phone numbers (SMS will be sent)

## Step 6: Create Your First Admin User

### Option A: Using Firebase Console

1. Go to **Authentication** > **Users**
2. Click **Add user**
3. Choose **Phone** as sign-in method
4. Enter phone number: `+911234567890`
5. Click **Add user**
6. Copy the **User UID** (you'll need this)

### Option B: Let User Sign Up

1. The phone auth will automatically create the user
2. You'll get the UID after first login

## Step 7: Seed Super Admin

After creating the Firebase user, create the super admin record:

```bash
curl -X POST https://api.bhada.in/api/v1/admins/seed-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "PASTE_FIREBASE_UID_HERE",
    "email": "admin@bhada.in",
    "firstName": "Super",
    "lastName": "Admin",
    "phoneNumber": "+911234567890",
    "notes": "System super administrator"
  }'
```

Replace:
- `uid`: The Firebase UID from Step 6
- `phoneNumber`: The same phone number used in Firebase

## Step 8: Test Login

1. Open the admin panel
2. Enter phone number with country code: `+911234567890`
3. Click "Send OTP"
4. Enter the OTP received via SMS (or test code: `123456`)
5. Enter admin password: `admin@123`
6. Click "Verify & Login"

## Troubleshooting

### "reCAPTCHA verification failed"

**Solution:**
- Ensure your domain is in Firebase authorized domains
- For localhost, use test phone numbers
- Check browser console for specific errors

### "Invalid phone number"

**Solution:**
- Always include country code with + (e.g., `+911234567890`)
- Format: `+[country code][number]` (no spaces)

### "Too many requests"

**Solution:**
- Firebase has rate limits on phone auth
- Wait a few minutes and try again
- Consider using test phone numbers for development

### "No admin record found"

**Solution:**
- Ensure you ran the seed super admin API call
- Verify the Firebase UID matches exactly
- Check the backend logs for errors

### SMS not received

**Solution:**
- Check phone number format
- Verify Firebase billing is enabled (required for production)
- Use test phone numbers for development

## Firebase Billing

### Free Tier Includes:
- Phone Auth: 10,000 verifications/month
- Database: 50,000 reads, 20,000 writes/day
- Storage: 1 GB

### For Production:
1. Upgrade to Blaze plan (pay as you go)
2. Set up billing alerts
3. Enable authentication rate limits

## Security Best Practices

1. **Enable App Check** (recommended):
   - Go to **Build** > **App Check**
   - Register your app
   - Enable enforcement

2. **Set up Firebase Security Rules**:
   - Restrict database access
   - Set up role-based rules

3. **Enable MFA** (optional):
   - Go to **Authentication** > **Settings**
   - Enable multi-factor authentication

4. **Monitor Usage**:
   - Check **Authentication** > **Usage**
   - Set up alerts for unusual activity

## Production Checklist

- [ ] Domain added to authorized domains
- [ ] reCAPTCHA configured for production domain
- [ ] Billing enabled (Blaze plan)
- [ ] App Check enabled
- [ ] Security rules configured
- [ ] Rate limits set
- [ ] Usage alerts configured
- [ ] Test phone numbers removed
- [ ] Super admin created
- [ ] Admin password changed from default

## Need Help?

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Support](https://firebase.google.com/support)
