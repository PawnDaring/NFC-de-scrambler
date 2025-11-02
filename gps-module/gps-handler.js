// GPS Handler for Coordinate Detection and Radar Display
class GPSHandler {
    constructor() {
        this.currentPosition = null;
        this.targetCoordinates = null;
        this.watchId = null;
        this.isActive = false;
        this.scale = 1000; // meters
        
        this.elements = {
            overlay: document.getElementById('gpsOverlay'),
            close: document.getElementById('gpsClose'),
            targetCoords: document.getElementById('targetCoords'),
            currentCoords: document.getElementById('currentCoords'),
            distanceValue: document.getElementById('distanceValue'),
            bearingValue: document.getElementById('bearingValue'),
            targetDot: document.getElementById('targetDot'),
            scaleValue: document.getElementById('scaleValue'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            refreshGPS: document.getElementById('refreshGPS'),
            openMaps: document.getElementById('openMaps'),
            copyCoords: document.getElementById('copyCoords')
        };
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Close button
        this.elements.close.addEventListener('click', () => this.hide());
        
        // Control buttons
        this.elements.refreshGPS.addEventListener('click', () => this.refreshGPS());
        this.elements.openMaps.addEventListener('click', () => this.openInMaps());
        this.elements.copyCoords.addEventListener('click', () => this.copyCoordinates());
        
        // Close on overlay click (outside panel)
        this.elements.overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) {
                this.hide();
            }
        });
    }
    
    // Show GPS popup with target coordinates
    show(coordinates) {
        this.targetCoordinates = this.parseCoordinates(coordinates);
        
        if (!this.targetCoordinates) {
            console.error('Invalid coordinates format');
            return false;
        }
        
        this.elements.overlay.style.display = 'flex';
        this.elements.targetCoords.textContent = this.formatCoordinates(this.targetCoordinates);
        this.elements.scaleValue.textContent = this.formatScale();
        
        this.isActive = true;
        this.startGPSTracking();
        
        return true;
    }
    
    // Hide GPS popup
    hide() {
        this.elements.overlay.style.display = 'none';
        this.isActive = false;
        this.stopGPSTracking();
    }
    
    // Parse coordinate string into lat/lng object
    parseCoordinates(coordString) {
        // Handle various coordinate formats
        const patterns = [
            // Decimal degrees: 40.7128, -74.0060
            /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,
            // Degrees with labels: 40.7128°N, 74.0060°W
            /^(-?\d+\.?\d*)°?[NS]?,?\s*(-?\d+\.?\d*)°?[EW]?$/i,
            // DMS format: 40°42'46"N 74°00'22"W (simplified detection)
            /(-?\d+\.?\d*)/g
        ];
        
        for (let pattern of patterns) {
            const match = coordString.match(pattern);
            if (match) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                
                if (!isNaN(lat) && !isNaN(lng) && 
                    lat >= -90 && lat <= 90 && 
                    lng >= -180 && lng <= 180) {
                    return { lat, lng };
                }
            }
        }
        
        return null;
    }
    
    // Start GPS tracking
    startGPSTracking() {
        if (!navigator.geolocation) {
            this.updateStatus('GPS not supported', 'error');
            return;
        }
        
        this.updateStatus('Acquiring GPS...', 'acquiring');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };
        
        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => this.onPositionUpdate(position),
            (error) => this.onPositionError(error),
            options
        );
        
        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onPositionUpdate(position),
            (error) => this.onPositionError(error),
            options
        );
    }
    
    // Stop GPS tracking
    stopGPSTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }
    
    // Handle position updates
    onPositionUpdate(position) {
        this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        
        this.updateStatus('GPS locked', 'active');
        this.updateDisplay();
        this.updateRadar();
    }
    
    // Handle position errors
    onPositionError(error) {
        let message = 'GPS error';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS access denied';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'GPS unavailable';
                break;
            case error.TIMEOUT:
                message = 'GPS timeout';
                break;
        }
        
        this.updateStatus(message, 'error');
    }
    
    // Update coordinate display
    updateDisplay() {
        if (!this.currentPosition) return;
        
        // Update current coordinates
        this.elements.currentCoords.textContent = this.formatCoordinates(this.currentPosition);
        
        // Calculate distance and bearing
        if (this.targetCoordinates) {
            const distance = this.calculateDistance(this.currentPosition, this.targetCoordinates);
            const bearing = this.calculateBearing(this.currentPosition, this.targetCoordinates);
            
            this.elements.distanceValue.textContent = this.formatDistance(distance);
            this.elements.bearingValue.textContent = `${Math.round(bearing)}°`;
        }
    }
    
    // Update radar display
    updateRadar() {
        if (!this.currentPosition || !this.targetCoordinates) return;
        
        const distance = this.calculateDistance(this.currentPosition, this.targetCoordinates);
        const bearing = this.calculateBearing(this.currentPosition, this.targetCoordinates);
        
        // Adjust scale based on distance
        this.adjustScale(distance);
        
        // Calculate position on radar (0,0 is center, user position)
        const radarRange = 125; // pixels from center to edge
        const scaledDistance = Math.min(distance / this.scale, 1) * radarRange;
        
        // Convert bearing to radar coordinates (North = 0°, clockwise)
        const radarAngle = (bearing - 90) * (Math.PI / 180); // Convert to radians, adjust for CSS coordinates
        
        const x = Math.cos(radarAngle) * scaledDistance;
        const y = Math.sin(radarAngle) * scaledDistance;
        
        // Position target dot
        this.elements.targetDot.style.left = `calc(50% + ${x}px)`;
        this.elements.targetDot.style.top = `calc(50% + ${y}px)`;
        this.elements.targetDot.style.display = 'block';
        
        // Update scale display
        this.elements.scaleValue.textContent = this.formatScale();
    }
    
    // Adjust radar scale based on distance
    adjustScale(distance) {
        if (distance > this.scale * 0.8) {
            // Increase scale if target is near edge
            if (distance < 5000) {
                this.scale = 5000;
            } else if (distance < 20000) {
                this.scale = 20000;
            } else {
                this.scale = 100000;
            }
        } else if (distance < this.scale * 0.2) {
            // Decrease scale if target is too close to center
            if (distance > 200) {
                this.scale = 1000;
            } else if (distance > 50) {
                this.scale = 200;
            } else {
                this.scale = 100;
            }
        }
    }
    
    // Calculate distance between two coordinates (Haversine formula)
    calculateDistance(pos1, pos2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = pos1.lat * Math.PI / 180;
        const φ2 = pos2.lat * Math.PI / 180;
        const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
        const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c; // Distance in meters
    }
    
    // Calculate bearing between two coordinates
    calculateBearing(pos1, pos2) {
        const φ1 = pos1.lat * Math.PI / 180;
        const φ2 = pos2.lat * Math.PI / 180;
        const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
        
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360; // Normalize to 0-360°
    }
    
    // Format coordinates for display
    formatCoordinates(coords) {
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    }
    
    // Format distance for display
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}M`;
        } else if (meters < 10000) {
            return `${(meters / 1000).toFixed(1)}KM`;
        } else {
            return `${Math.round(meters / 1000)}KM`;
        }
    }
    
    // Format scale for display
    formatScale() {
        if (this.scale < 1000) {
            return `${this.scale}M`;
        } else {
            return `${Math.round(this.scale / 1000)}KM`;
        }
    }
    
    // Update status indicator
    updateStatus(message, type) {
        this.elements.statusText.textContent = message.toUpperCase();
        
        this.elements.statusDot.className = 'status-dot';
        if (type === 'active') {
            this.elements.statusDot.classList.add('active');
        } else if (type === 'error') {
            this.elements.statusDot.classList.add('error');
        }
    }
    
    // Refresh GPS position
    refreshGPS() {
        this.updateStatus('Refreshing GPS...', 'acquiring');
        this.startGPSTracking();
    }
    
    // Open coordinates in maps app
    openInMaps() {
        if (!this.targetCoordinates) return;
        
        const { lat, lng } = this.targetCoordinates;
        
        // Try different map URLs for different platforms
        const mapUrls = [
            `geo:${lat},${lng}`, // Android
            `maps://maps.apple.com/?q=${lat},${lng}`, // iOS
            `https://www.google.com/maps?q=${lat},${lng}` // Web fallback
        ];
        
        // Try to open native app first, fallback to web
        const mapUrl = /iPhone|iPad|iPod/.test(navigator.userAgent) ? mapUrls[1] : mapUrls[0];
        
        try {
            window.open(mapUrl, '_blank');
        } catch (error) {
            // Fallback to Google Maps web
            window.open(mapUrls[2], '_blank');
        }
    }
    
    // Copy coordinates to clipboard
    async copyCoordinates() {
        if (!this.targetCoordinates) return;
        
        const coordsText = this.formatCoordinates(this.targetCoordinates);
        
        try {
            await navigator.clipboard.writeText(coordsText);
            
            // Visual feedback
            const originalText = this.elements.copyCoords.textContent;
            this.elements.copyCoords.textContent = 'COPIED!';
            setTimeout(() => {
                this.elements.copyCoords.textContent = originalText;
            }, 2000);
            
        } catch (error) {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = coordsText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.elements.copyCoords.textContent = 'COPIED!';
            setTimeout(() => {
                this.elements.copyCoords.textContent = 'COPY COORDS';
            }, 2000);
        }
    }
    
    // Static method to detect coordinates in text
    static detectCoordinates(text) {
        const patterns = [
            // Decimal degrees: 40.7128, -74.0060 or 40.7128,-74.0060
            /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/g,
            // Degrees with directions: 40.7128°N, 74.0060°W
            /(-?\d+\.?\d*)°?\s*[NS],?\s*(-?\d+\.?\d*)°?\s*[EW]/gi
        ];
        
        for (let pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            if (matches.length > 0) {
                return matches.map(match => `${match[1]}, ${match[2]}`);
            }
        }
        
        return [];
    }
}

// Initialize GPS handler when page loads
let gpsHandler;
document.addEventListener('DOMContentLoaded', () => {
    gpsHandler = new GPSHandler();
});

// Export for use in main app
window.GPSHandler = GPSHandler;