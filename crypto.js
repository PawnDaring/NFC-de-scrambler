// Advanced Crypto Engine with Time-Based Security
class CryptoEngine {
    constructor() {
        this.masterKey = this.generateMasterKey();
        this.timeWindow = 300000; // 5 minutes in milliseconds
        this.matrixChars = ['█', '▓', '░', '▒', '▀', '▄', '▌', '▐', '■', '□', '▪', '▫'];
        this.hexChars = '0123456789ABCDEF';
    }

    // Generate a master key based on device fingerprint and secret
    generateMasterKey() {
        const deviceFingerprint = this.getDeviceFingerprint();
        const secret = 'NFC_AUTH_2025_SECURE'; // This should be obfuscated in production
        return this.simpleHash(deviceFingerprint + secret);
    }

    // Create a device fingerprint for additional security
    getDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        return [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
    }

    // Get current time seed (changes every 5 minutes)
    getTimeSeed() {
        const now = Date.now();
        const timeSlot = Math.floor(now / this.timeWindow);
        return timeSlot;
    }

    // Generate time-based encryption key
    generateTimeKey(timeSeed = null) {
        const seed = timeSeed || this.getTimeSeed();
        const keyMaterial = this.masterKey + seed.toString();
        return this.simpleHash(keyMaterial);
    }

    // Simple but effective hash function
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString(16).padStart(8, '0');
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Ensure positive and convert to hex
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    // XOR cipher with key expansion
    xorCipher(data, key) {
        const expandedKey = this.expandKey(key, data.length);
        let result = '';
        
        for (let i = 0; i < data.length; i++) {
            const dataChar = data.charCodeAt(i);
            const keyChar = expandedKey.charCodeAt(i % expandedKey.length);
            const xored = dataChar ^ keyChar;
            result += String.fromCharCode(xored);
        }
        
        return result;
    }

    // Expand key to match data length with additional entropy
    expandKey(key, length) {
        let expandedKey = key;
        let counter = 0;
        
        while (expandedKey.length < length) {
            // Add entropy by mixing key with counter and position
            const entropy = this.simpleHash(key + counter.toString());
            expandedKey += entropy;
            counter++;
        }
        
        return expandedKey.substring(0, length);
    }

    // Encrypt message with time-based key
    encrypt(message, customTimeSeed = null) {
        try {
            const timeSeed = customTimeSeed || this.getTimeSeed();
            const timeKey = this.generateTimeKey(timeSeed);
            
            // Add timestamp and checksum to message
            const timestamp = Date.now();
            const messageWithMeta = JSON.stringify({
                msg: message,
                ts: timestamp,
                seed: timeSeed,
                checksum: this.simpleHash(message + timestamp)
            });
            
            // Encrypt the message
            const encrypted = this.xorCipher(messageWithMeta, timeKey);
            
            // Convert to base64 and add prefix for identification
            const base64Encrypted = btoa(encrypted);
            return 'NFC_' + base64Encrypted;
            
        } catch (error) {
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    // Decrypt message with time-based key validation
    decrypt(encryptedData) {
        try {
            // Remove prefix and decode base64
            if (!encryptedData.startsWith('NFC_')) {
                throw new Error('Invalid encrypted format');
            }
            
            const base64Data = encryptedData.substring(4);
            const encrypted = atob(base64Data);
            
            // Try current time window first
            let decrypted = this.attemptDecrypt(encrypted);
            
            // If current time fails, try previous time windows (up to 3 windows back)
            if (!decrypted) {
                for (let i = 1; i <= 3; i++) {
                    const pastTimeSeed = this.getTimeSeed() - i;
                    decrypted = this.attemptDecrypt(encrypted, pastTimeSeed);
                    if (decrypted) break;
                }
            }
            
            if (!decrypted) {
                throw new Error('Decryption failed - invalid key or expired data');
            }
            
            return decrypted;
            
        } catch (error) {
            throw new Error('Decryption failed: ' + error.message);
        }
    }

    // Attempt to decrypt with specific time seed
    attemptDecrypt(encrypted, timeSeed = null) {
        try {
            const useTimeSeed = timeSeed || this.getTimeSeed();
            const timeKey = this.generateTimeKey(useTimeSeed);
            
            // Decrypt
            const decrypted = this.xorCipher(encrypted, timeKey);
            const messageData = JSON.parse(decrypted);
            
            // Validate structure and checksum
            if (!messageData.msg || !messageData.ts || !messageData.checksum) {
                return null;
            }
            
            // Verify checksum
            const expectedChecksum = this.simpleHash(messageData.msg + messageData.ts);
            if (messageData.checksum !== expectedChecksum) {
                return null;
            }
            
            // Check if message is not too old (24 hours max)
            const age = Date.now() - messageData.ts;
            if (age > 86400000) { // 24 hours
                throw new Error('Message expired');
            }
            
            return messageData.msg;
            
        } catch (error) {
            return null;
        }
    }

    // Generate animated matrix characters for display
    generateMatrixChars() {
        return Array.from({ length: 8 }, () => {
            return this.matrixChars[Math.floor(Math.random() * this.matrixChars.length)];
        });
    }

    // Get formatted time seed for display
    getFormattedTimeSeed() {
        const seed = this.getTimeSeed();
        return '0x' + seed.toString(16).toUpperCase().padStart(8, '0');
    }

    // Validate if a string looks like encrypted data
    isValidEncryptedFormat(data) {
        return typeof data === 'string' && 
               data.startsWith('NFC_') && 
               data.length > 10 &&
               /^NFC_[A-Za-z0-9+/=]+$/.test(data);
    }

    // Generate random secure code for testing
    generateTestCode(message = 'TEST MESSAGE') {
        return this.encrypt(message);
    }
}

// Export for use in other files
window.CryptoEngine = CryptoEngine;