const OTP_EXPIRY = 2 * 60 * 1000; // 2 minutes
const MAX_OTP_ATTEMPTS = 3;
const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

// Store OTPs in memory (in production, use Redis or similar)
const otpStore = new Map();
const otpAttempts = new Map();
const lockedAccounts = new Map();

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(email, otp) {
  otpStore.set(email, {
    code: otp,
    createdAt: Date.now()
  });
  otpAttempts.set(email, 0);
}

export function verifyOTP(email, submittedOTP) {
  const storedData = otpStore.get(email);
  const attempts = otpAttempts.get(email) || 0;
  
  // Check if account is locked
  if (lockedAccounts.has(email)) {
    const lockExpiry = lockedAccounts.get(email);
    if (Date.now() < lockExpiry) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }
    lockedAccounts.delete(email);
  }

  // Validate OTP
  if (!storedData) {
    throw new Error('No OTP found for this email');
  }

  if (Date.now() - storedData.createdAt > OTP_EXPIRY) {
    otpStore.delete(email);
    throw new Error('OTP has expired');
  }

  if (storedData.code !== submittedOTP) {
    otpAttempts.set(email, attempts + 1);
    
    if (attempts + 1 >= MAX_OTP_ATTEMPTS) {
      lockedAccounts.set(email, Date.now() + LOCK_DURATION);
      otpAttempts.delete(email);
      throw new Error('Too many failed attempts. Account locked for 5 minutes.');
    }
    
    throw new Error(`Invalid OTP. ${MAX_OTP_ATTEMPTS - (attempts + 1)} attempts remaining`);
  }

  // Clear OTP data after successful verification
  otpStore.delete(email);
  otpAttempts.delete(email);
  return true;
}

export function canResendOTP(email) {
  const storedData = otpStore.get(email);
  if (!storedData) return true;
  
  return Date.now() - storedData.createdAt > OTP_EXPIRY;
}