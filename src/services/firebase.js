import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, 
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 
  appId: import.meta.env.VITE_FIREBASE_APP_ID ,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Clear any existing verifier
const clearRecaptcha = () => {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (_) {}
    window.recaptchaVerifier = null;
  }
};

// Send OTP — containerId must be an existing div in the DOM
export const sendOTP = async (phoneNumber, containerId = 'recaptcha-container') => {
  clearRecaptcha();

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA container #${containerId} not found in DOM`);
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': clearRecaptcha,
  });

  await window.recaptchaVerifier.render();
  return signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
};

// Verify OTP and return idToken (login flow)
export const verifyOTP = async (confirmationResult, otp) => {
  const result = await confirmationResult.confirm(otp);
  return result.user.getIdToken();
};

export { clearRecaptcha };
export default app;
