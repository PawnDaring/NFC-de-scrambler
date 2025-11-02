// GPS Integration for Main NFC Authenticator App
class GPSIntegration {
    constructor() {
        this.gpsWindow = null;
        this.isEnabled = true;
        
        // Initialize coordinate detection
        this.initializeCoordinateDetection();
    }
    
    // Initialize coordinate detection in decrypted messages
    initializeCoordinateDetection() {
        // Hook into the main app's message display function
        const originalDisplayFunction = window.authenticatorApp?.displayDecryptedMessage;
        
        if (originalDisplayFunction) {
            window.authenticatorApp.displayDecryptedMessage = (message) => {
                // Call original function first
                originalDisplayFunction.call(window.authenticatorApp, message);
                
                // Then check for coordinates
                this.checkForCoordinates(message);
            };
        }
        
        // Also check manual input
        this.monitorInputFields();
    }
    
    // Monitor input fields for coordinate detection
    monitorInputFields() {
        const encryptedInput = document.getElementById('encryptedInput');
        const messageInput = document.getElementById('messageInput');
        
        if (encryptedInput) {
            encryptedInput.addEventListener('paste', (e) => {
                setTimeout(() => this.checkForCoordinates(e.target.value), 100);
            });
        }
        
        if (messageInput) {
            messageInput.addEventListener('paste', (e) => {
                setTimeout(() => this.checkForCoordinates(e.target.value), 100);
            });
        }
    }
    
    // Check text for GPS coordinates
    checkForCoordinates(text) {
        if (!this.isEnabled || !text) return;
        
        const coordinates = this.detectCoordinates(text);
        
        if (coordinates.length > 0) {
            // Show GPS popup for the first detected coordinate
            this.showGPSPopup(coordinates[0]);
        }
    }
    
    // Detect coordinates in text using multiple patterns
    detectCoordinates(text) {
        const patterns = [
            // Decimal degrees: 40.7128, -74.0060
            /(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/g,
            
            // Degrees with directions: 40.7128°N, 74.0060°W
            /(\d{1,3}\.\d{4,})°?\s*[NS],?\s*(\d{1,3}\.\d{4,})°?\s*[EW]/gi,
            
            // GPS format: N40.7128 W74.0060
            /[NS](\d{1,3}\.\d{4,})\s*[EW](\d{1,3}\.\d{4,})/gi,
            
            // Coordinate pairs with labels
            /(?:lat|latitude)[\s:]*(-?\d{1,3}\.\d{4,})[\s,]*(?:lon|lng|longitude)[\s:]*(-?\d{1,3}\.\d{4,})/gi
        ];
        
        const found = [];
        
        for (let pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                let lat = parseFloat(match[1]);
                let lng = parseFloat(match[2]);
                
                // Validate coordinate ranges
                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    found.push(`${lat}, ${lng}`);
                }
            });
        }
        
        return [...new Set(found)]; // Remove duplicates
    }
    
    // Show GPS popup in a new window/iframe
    showGPSPopup(coordinates) {
        // Create popup window
        const popupFeatures = 'width=450,height=600,scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no';
        
        try {
            this.gpsWindow = window.open(
                './gps-module/gps-popup.html', 
                'GPSLocator', 
                popupFeatures
            );
            
            // Wait for popup to load, then send coordinates
            if (this.gpsWindow) {
                this.gpsWindow.addEventListener('load', () => {
                    this.gpsWindow.postMessage({
                        type: 'GPS_COORDINATES',
                        coordinates: coordinates
                    }, '*');
                });
                
                // Fallback - try to send message after a delay
                setTimeout(() => {
                    if (this.gpsWindow && !this.gpsWindow.closed) {
                        this.gpsWindow.postMessage({
                            type: 'GPS_COORDINATES',
                            coordinates: coordinates
                        }, '*');
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Could not open GPS popup:', error);
            // Fallback - show inline popup
            this.showInlineGPSPopup(coordinates);
        }
    }
    
    // Alternative: Show GPS popup as inline overlay
    showInlineGPSPopup(coordinates) {
        // Create inline GPS overlay
        const overlay = document.createElement('div');
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Share Tech Mono', monospace;
            ">
                <div style="
                    background: #d4d4d4;
                    border: 3px solid #404040;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 350px;
                    text-align: center;
                ">
                    <h3 style="color: #000; margin-bottom: 15px;">GPS COORDINATES DETECTED</h3>
                    <div style="
                        background: #ff6600;
                        padding: 10px;
                        border: 2px solid #404040;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        font-weight: bold;
                        color: #000;
                    ">${coordinates}</div>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: #808080;
                        border: 2px solid #404040;
                        border-radius: 3px;
                        color: #000;
                        padding: 10px 20px;
                        cursor: pointer;
                        font-weight: bold;
                        margin-right: 10px;
                    ">CLOSE</button>
                    <button onclick="window.open('https://www.google.com/maps?q=${coordinates}','_blank')" style="
                        background: #808080;
                        border: 2px solid #404040;
                        border-radius: 3px;
                        color: #000;
                        padding: 10px 20px;
                        cursor: pointer;
                        font-weight: bold;
                    ">OPEN MAPS</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.remove();
            }
        }, 10000);
    }
    
    // Enable/disable coordinate detection
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    // Close GPS popup if open
    closeGPSPopup() {
        if (this.gpsWindow && !this.gpsWindow.closed) {
            this.gpsWindow.close();
        }
    }
}

// Auto-initialize when main app is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main app to initialize
    setTimeout(() => {
        if (window.authenticatorApp) {
            window.gpsIntegration = new GPSIntegration();
            console.log('GPS coordinate detection enabled');
        }
    }, 1000);
});

// Handle messages from GPS popup
window.addEventListener('message', (event) => {
    if (event.data.type === 'GPS_READY') {
        // GPS popup is ready to receive coordinates
        if (window.gpsIntegration && window.gpsIntegration.gpsWindow) {
            // Resend coordinates if needed
        }
    }
});

// Export for manual testing
window.GPSIntegration = GPSIntegration;