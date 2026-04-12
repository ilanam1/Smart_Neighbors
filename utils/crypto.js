import CryptoJS from 'crypto-js';

// An environment variable or hardcoded string to encrypt all chats seamlessly.
// For production, this could be stored in a `.env` file!
const MASTER_CHAT_KEY = "SmartNeighbors_AES_Secure_Master_Key_2026!";

/**
 * Encrypts a plaintext message into secure AES ciphertext
 */
export const encryptMessage = (plaintext) => {
    if (!plaintext) return plaintext;
    try {
        return CryptoJS.AES.encrypt(plaintext, MASTER_CHAT_KEY).toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        return plaintext; // Fallback so we don't drop the msg
    }
};

/**
 * Decrypts AES ciphertext back to readable plaintext.
 * Safely handles unencrypted classic messages by catching the decrypt error.
 */
export const decryptMessage = (ciphertext) => {
    if (!ciphertext) return ciphertext;
    try {
        // Crypto JS AES decrypt
        const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_CHAT_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        
        // If decryption successful, it should have a length. 
        // If not, it means the string was unencrypted plain text (a legacy message).
        if (originalText.length > 0) {
            return originalText;
        } else {
            return ciphertext; // Return raw legacy message
        }
    } catch (error) {
        // Any error implies it's not a valid AES string, so it's a legacy plain text message
        return ciphertext;
    }
};
