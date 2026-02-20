import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAe-PAuB9GlFX4YlJoFPrfJ9m-NPTW4Ejs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'bhada-api.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bhada-api',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'bhada-api.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '478743960698',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:478743960698:web:f20eee2387d9aa81e0efc3',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ZN80LXX0MP',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Setup invisible reCAPTCHA
export const setupRecaptcha = (buttonId) => {
  // Clear any existing verifier
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {
      window.recaptchaVerifier = null;
    },
  });

  return window.recaptchaVerifier;
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  const verifier = setupRecaptcha('send-otp-btn');
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmation;
};

// Verify OTP and get idToken
export const verifyOTP = async (confirmationResult, otp) => {
  const result = await confirmationResult.confirm(otp);
  const idToken = await result.user.getIdToken();
  return idToken;
};

export default app;
