// NFC Handler with Web NFC API Integration
class NFCHandler {
    constructor(cryptoEngine, onDataReceived, onStatusChange) {
        this.crypto = cryptoEngine;
        this.onDataReceived = onDataReceived;
        this.onStatusChange = onStatusChange;
        this.isScanning = false;
        this.reader = null;
        this.writer = null;
        this.isSupported = false;
        
        this.init();
    }

    async init() {
        // Check if NFC is supported
        if ('NDEFReader' in window) {
            this.isSupported = true;
            this.reader = new NDEFReader();
            this.writer = new NDEFWriter();
            this.onStatusChange('NFC Ready', 'ready');
        } else {
            this.isSupported = false;
            this.onStatusChange('NFC Not Supported', 'error');
            console.warn('Web NFC is not supported in this browser/device');
        }
    }

    // Check if NFC is available and permissions are granted
    async checkPermissions() {
        if (!this.isSupported) {
            throw new Error('NFC is not supported on this device/browser');
        }

        try {
            // Request permission by trying to scan (will prompt user)
            await this.reader.scan();
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('NFC permission denied. Please enable NFC access.');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('NFC is not supported on this device.');
            } else {
                throw new Error('NFC error: ' + error.message);
            }
        }
    }

    // Start scanning for NFC tags
    async startScanning() {
        if (this.isScanning) {
            return;
        }

        try {
            await this.checkPermissions();
            
            this.isScanning = true;
            this.onStatusChange('Scanning...', 'scanning');

            // Set up reading event listener
            this.reader.addEventListener('reading', (event) => {
                this.handleNFCRead(event);
            });

            this.reader.addEventListener('readingerror', (event) => {
                console.error('NFC Read Error:', event);
                this.onStatusChange('Read Error', 'error');
                this.stopScanning();
            });

            // Start scanning
            await this.reader.scan({
                signal: new AbortController().signal
            });

        } catch (error) {
            this.isScanning = false;
            this.onStatusChange('Error: ' + error.message, 'error');
            throw error;
        }
    }

    // Stop scanning for NFC tags
    async stopScanning() {
        if (!this.isScanning) {
            return;
        }

        try {
            // Abort scanning
            if (this.reader && this.reader.scan) {
                // Create new reader instance to stop scanning
                this.reader = new NDEFReader();
            }
            
            this.isScanning = false;
            this.onStatusChange('Ready', 'ready');
            
        } catch (error) {
            console.error('Error stopping NFC scan:', error);
        }
    }

    // Handle NFC tag read
    handleNFCRead(event) {
        try {
            console.log('NFC Tag detected:', event);
            this.onStatusChange('Tag Detected!', 'success');

            // Process NDEF records
            for (const record of event.message.records) {
                if (record.recordType === 'text') {
                    const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                    const data = textDecoder.decode(record.data);
                    
                    console.log('NFC Data received:', data);
                    
                    // Pass the data to the callback
                    if (this.onDataReceived) {
                        this.onDataReceived(data);
                    }
                    
                } else if (record.recordType === 'url') {
                    const url = new TextDecoder().decode(record.data);
                    console.log('NFC URL received:', url);
                    
                    if (this.onDataReceived) {
                        this.onDataReceived(url);
                    }
                }
            }

        } catch (error) {
            console.error('Error processing NFC data:', error);
            this.onStatusChange('Processing Error', 'error');
        }
    }

    // Write data to NFC tag
    async writeToTag(data, format = 'text') {
        if (!this.isSupported) {
            throw new Error('NFC writing is not supported on this device/browser');
        }

        try {
            this.onStatusChange('Ready to Write - Tap Tag', 'writing');

            let message;
            if (format === 'text') {
                message = {
                    records: [{
                        recordType: 'text',
                        data: data
                    }]
                };
            } else if (format === 'url') {
                message = {
                    records: [{
                        recordType: 'url',
                        data: data
                    }]
                };
            } else {
                throw new Error('Unsupported format: ' + format);
            }

            await this.writer.write(message);
            this.onStatusChange('Write Successful!', 'success');
            
            return true;

        } catch (error) {
            this.onStatusChange('Write Error: ' + error.message, 'error');
            throw error;
        }
    }

    // Get NFC support information
    getSupportInfo() {
        return {
            isSupported: this.isSupported,
            canRead: this.isSupported && 'NDEFReader' in window,
            canWrite: this.isSupported && 'NDEFWriter' in window,
            userAgent: navigator.userAgent
        };
    }

    // Simulate NFC read for testing (when NFC is not available)
    simulateNFCRead(data) {
        console.log('Simulating NFC read with data:', data);
        
        // Simulate the delay of a real NFC read
        setTimeout(() => {
            this.onStatusChange('Simulated Tag Detected!', 'success');
            
            if (this.onDataReceived) {
                this.onDataReceived(data);
            }
        }, 1000);
    }

    // Generate a test encrypted NFC payload
    generateTestPayload(message = 'Hello from NFC!') {
        return this.crypto.encrypt(message);
    }

    // Check if device has NFC capability
    static async checkNFCAvailability() {
        if (!('NDEFReader' in window)) {
            return {
                available: false,
                reason: 'Web NFC API not supported in this browser'
            };
        }

        try {
            const reader = new NDEFReader();
            await reader.scan();
            return {
                available: true,
                reason: 'NFC is available and ready'
            };
        } catch (error) {
            return {
                available: false,
                reason: error.message
            };
        }
    }
}

// Export for use in other files
window.NFCHandler = NFCHandler;