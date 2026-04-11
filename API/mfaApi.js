import { getSupabase } from '../DataBase/supabase';

const supabase = getSupabase();

/**
 * Initializes the MFA enrollment process for an Authenticator App (TOTP).
 * Returns the QR code (SVG string), the secret (for manual entry), and the factor ID.
 */
export async function enrollMfa() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });
  if (error) throw error;
  return data;
}

/**
 * Initiates an MFA challenge for the enrolled factor.
 */
export async function challengeMfa(factorId) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data;
}

/**
 * Verifies the code from the Authenticator App to complete enrollment or login.
 */
export async function verifyMfa(factorId, challengeId, code) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;
  return data;
}

/**
 * Lists all active MFA factors for the logged-in user.
 */
export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}

/**
 * Unenrolls/disables MFA for a specific factor.
 */
export async function unenrollMfa(factorId) {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  return data;
}

/**
 * Checks the current authenticator assurance level (AAL)
 * and whether the user's next level is AAL2 (meaning MFA is required).
 */
export async function getAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}
