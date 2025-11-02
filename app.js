// Main Application Controller
class AuthenticatorApp {
    constructor() {
        this.crypto = new CryptoEngine();
        this.nfcHandler = null;
        this.currentMode = 'decrypt';
        this.isScanning = false;
        
        this.initializeElements();
        this.initializeNFC();
        this.startAnimations();
        this.setupEventListeners();
        
        console.log('NFC Authenticator initialized');
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            // Mode controls
            decryptBtn: document.getElementById('decryptBtn'),
            encryptBtn: document.getElementById('encryptBtn'),
            decryptMode: document.getElementById('decryptMode'),
            encryptMode: document.getElementById('encryptMode'),
            
            // Status and display
            statusIndicator: document.getElementById('statusIndicator'),
            characterDisplay: document.getElementById('characterDisplay'),
            seedValue: document.getElementById('seedValue'),
            
            // NFC Scanner
            nfcScanner: document.getElementById('nfcScanner'),
            
            // Decryption animation overlay
            decryptionOverlay: document.getElementById('decryptionOverlay'),
            decryptionStages: document.getElementById('decryptionStages'),
            decryptionCode: document.getElementById('decryptionCode'),
            decryptionResult: document.getElementById('decryptionResult'),
            closeDecryptBtn: document.getElementById('closeDecryptBtn'),
            
            // Decrypt mode elements
            encryptedInput: document.getElementById('encryptedInput'),
            decryptBtn2: document.getElementById('decryptBtn2'),
            outputSection: document.getElementById('outputSection'),
            outputBox: document.getElementById('outputBox'),
            
            // Encrypt mode elements
            messageInput: document.getElementById('messageInput'),
            encryptBtn2: document.getElementById('encryptBtn2'),
            encryptOutputSection: document.getElementById('encryptOutputSection'),
            encryptOutputBox: document.getElementById('encryptOutputBox'),
            copyBtn: document.getElementById('copyBtn')
        };
    }

    // Initialize NFC handler
    async initializeNFC() {
        this.nfcHandler = new NFCHandler(
            this.crypto,
            (data) => this.handleNFCData(data),
            (status, type) => this.updateStatus(status, type)
        );

        // Check NFC availability
        const nfcInfo = this.nfcHandler.getSupportInfo();
        if (!nfcInfo.isSupported) {
            this.updateStatus('NFC Not Available (Test Mode)', 'warning');
            this.enableTestMode();
        }
    }

    // Start UI animations
    startAnimations() {
        // Matrix character animation
        this.startMatrixAnimation();
        
        // Time seed animation
        this.startTimeSeedAnimation();
    }

    // Setup event listeners
    setupEventListeners() {
        // Mode switching
        this.elements.decryptBtn.addEventListener('click', () => this.switchMode('decrypt'));
        this.elements.encryptBtn.addEventListener('click', () => this.switchMode('encrypt'));
        
        // NFC Scanner
        this.elements.nfcScanner.addEventListener('click', () => this.toggleNFCScanning());
        
        // Decrypt actions
        this.elements.decryptBtn2.addEventListener('click', () => this.decryptManualInput());
        this.elements.encryptedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.decryptManualInput();
        });
        
        // Encrypt actions
        this.elements.encryptBtn2.addEventListener('click', () => this.encryptMessage());
        this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
        
        // Input validation
        this.elements.encryptedInput.addEventListener('input', () => this.validateEncryptedInput());
        
        // Decryption animation overlay
        this.elements.closeDecryptBtn.addEventListener('click', () => this.closeDecryptionOverlay());
    }

    // Switch between decrypt and encrypt modes
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update button states
        this.elements.decryptBtn.classList.toggle('active', mode === 'decrypt');
        this.elements.encryptBtn.classList.toggle('active', mode === 'encrypt');
        
        // Show/hide mode panels
        this.elements.decryptMode.style.display = mode === 'decrypt' ? 'block' : 'none';
        this.elements.encryptMode.style.display = mode === 'encrypt' ? 'block' : 'none';
        
        // Stop scanning if switching modes
        if (this.isScanning) {
            this.stopNFCScanning();
        }
    }

    // Toggle NFC scanning
    async toggleNFCScanning() {
        if (this.isScanning) {
            this.stopNFCScanning();
        } else {
            this.startNFCScanning();
        }
    }

    // Start NFC scanning
    async startNFCScanning() {
        try {
            this.isScanning = true;
            this.elements.nfcScanner.classList.add('scanning');
            
            if (this.nfcHandler.isSupported) {
                await this.nfcHandler.startScanning();
            } else {
                // Test mode - simulate scanning
                this.updateStatus('Test Mode - Click to simulate scan', 'scanning');
                this.elements.nfcScanner.onclick = () => this.simulateNFCScan();
            }
        } catch (error) {
            this.updateStatus('Scan Error: ' + error.message, 'error');
            this.stopNFCScanning();
        }
    }

    // Stop NFC scanning
    async stopNFCScanning() {
        this.isScanning = false;
        this.elements.nfcScanner.classList.remove('scanning');
        
        if (this.nfcHandler.isSupported) {
            await this.nfcHandler.stopScanning();
        }
        
        // Restore normal click handler
        this.elements.nfcScanner.onclick = () => this.toggleNFCScanning();
    }

    // Handle data received from NFC
    handleNFCData(data) {
        console.log('Received NFC data:', data);
        
        if (this.currentMode === 'decrypt') {
            this.processEncryptedData(data);
        }
        
        this.stopNFCScanning();
    }

    // Process encrypted data (from NFC or manual input)
    async processEncryptedData(data) {
        // Show animated decryption overlay
        this.showDecryptionAnimation(data);
    }

    // Display decrypted message
    displayDecryptedMessage(message) {
        this.elements.outputBox.textContent = message;
        this.elements.outputSection.style.display = 'block';
        
        // Check if message is a URL and make it clickable
        if (this.isValidURL(message)) {
            this.elements.outputBox.innerHTML = `<a href="${message}" target="_blank" style="color: #00ff88; text-decoration: underline;">${message}</a>`;
        }
    }

    // Decrypt manual input
    decryptManualInput() {
        const inputData = this.elements.encryptedInput.value.trim();
        
        if (!inputData) {
            this.updateStatus('Please enter encrypted code', 'warning');
            return;
        }
        
        this.processEncryptedData(inputData);
    }

    // Encrypt message
    encryptMessage() {
        const message = this.elements.messageInput.value.trim();
        
        if (!message) {
            this.updateStatus('Please enter a message to encrypt', 'warning');
            return;
        }
        
        try {
            this.updateStatus('Encrypting...', 'processing');
            
            const encryptedData = this.crypto.encrypt(message);
            
            this.elements.encryptOutputBox.textContent = encryptedData;
            this.elements.encryptOutputSection.style.display = 'block';
            
            this.updateStatus('Encryption Successful', 'success');
            
        } catch (error) {
            this.updateStatus('Encryption Failed: ' + error.message, 'error');
        }
    }

    // Copy encrypted data to clipboard
    async copyToClipboard() {
        const encryptedData = this.elements.encryptOutputBox.textContent;
        
        try {
            await navigator.clipboard.writeText(encryptedData);
            this.updateStatus('Copied to Clipboard!', 'success');
            
            // Temporarily change button text
            const originalText = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = 'COPIED!';
            setTimeout(() => {
                this.elements.copyBtn.textContent = originalText;
            }, 2000);
            
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            this.fallbackCopyToClipboard(encryptedData);
        }
    }

    // Fallback copy method
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.updateStatus('Copied to Clipboard!', 'success');
        } catch (error) {
            this.updateStatus('Copy Failed', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    // Validate encrypted input format
    validateEncryptedInput() {
        const input = this.elements.encryptedInput.value;
        const isValid = this.crypto.isValidEncryptedFormat(input);
        
        this.elements.encryptedInput.style.borderColor = isValid || !input ? 
            'rgba(0, 212, 255, 0.3)' : 'rgba(255, 100, 100, 0.5)';
    }

    // Update status indicator
    updateStatus(message, type) {
        const statusSpan = this.elements.statusIndicator.querySelector('span');
        statusSpan.textContent = message;
        
        // Update pulse color based on type
        const pulse = this.elements.statusIndicator.querySelector('.pulse');
        pulse.className = 'pulse';
        
        switch (type) {
            case 'ready':
                pulse.style.background = '#00ff88';
                pulse.style.boxShadow = '0 0 20px #00ff88';
                break;
            case 'scanning':
                pulse.style.background = '#00d4ff';
                pulse.style.boxShadow = '0 0 20px #00d4ff';
                break;
            case 'processing':
                pulse.style.background = '#ffaa00';
                pulse.style.boxShadow = '0 0 20px #ffaa00';
                break;
            case 'success':
                pulse.style.background = '#00ff88';
                pulse.style.boxShadow = '0 0 20px #00ff88';
                break;
            case 'error':
                pulse.style.background = '#ff4444';
                pulse.style.boxShadow = '0 0 20px #ff4444';
                break;
            case 'warning':
                pulse.style.background = '#ffaa00';
                pulse.style.boxShadow = '0 0 20px #ffaa00';
                break;
        }
    }

    // Start matrix character animation
    startMatrixAnimation() {
        const chars = this.elements.characterDisplay.querySelectorAll('.char');
        
        setInterval(() => {
            const newChars = this.crypto.generateMatrixChars();
            chars.forEach((char, index) => {
                char.textContent = newChars[index];
            });
        }, 100); // Change every 100ms
    }

    // Start time seed animation
    startTimeSeedAnimation() {
        const updateTimeSeed = () => {
            this.elements.seedValue.textContent = this.crypto.getFormattedTimeSeed();
        };
        
        updateTimeSeed();
        setInterval(updateTimeSeed, 1000); // Update every second
    }

    // Enable test mode for devices without NFC
    enableTestMode() {
        // Add test button to NFC scanner
        const testBtn = document.createElement('button');
        testBtn.textContent = 'SIMULATE NFC SCAN';
        testBtn.className = 'action-btn';
        testBtn.style.marginTop = '10px';
        testBtn.onclick = () => this.simulateNFCScan();
        
        this.elements.nfcScanner.appendChild(testBtn);
    }

    // Simulate NFC scan for testing
    simulateNFCScan() {
        const testMessage = 'Hello from simulated NFC tag! This is a test message.';
        const encryptedData = this.crypto.generateTestCode(testMessage);
        
        this.updateStatus('Simulating NFC scan...', 'scanning');
        
        setTimeout(() => {
            this.handleNFCData(encryptedData);
        }, 1000);
    }

    // Show animated decryption overlay
    async showDecryptionAnimation(data) {
        // Show overlay
        this.elements.decryptionOverlay.classList.add('active');
        this.elements.decryptionCode.textContent = data;
        this.elements.decryptionResult.classList.remove('show');
        this.elements.closeDecryptBtn.style.display = 'none';
        
        // Activate character display processing state
        this.elements.characterDisplay.classList.add('processing');
        
        // Reset all stages
        const stages = this.elements.decryptionStages.querySelectorAll('.decryption-stage');
        stages.forEach(stage => {
            stage.classList.remove('active', 'completed', 'failed');
            const status = stage.querySelector('.stage-status');
            status.innerHTML = 'Standby';
        });
        
        try {
            // Stage 1: Format validation
            await this.animateStage('stage1', 'Checking format...', async () => {
                if (!this.crypto.isValidEncryptedFormat(data)) {
                    throw new Error('Invalid encrypted data format');
                }
                await this.delay(800);
            });
            
            // Stage 2: Generate time keys
            await this.animateStage('stage2', 'Generating keys...', async () => {
                // Simulate key generation time
                await this.delay(1000);
            });
            
            // Stage 3: Attempt decryption
            let decryptedMessage;
            await this.animateStage('stage3', 'Decrypting...', async () => {
                decryptedMessage = this.crypto.decrypt(data);
                await this.delay(1200);
            });
            
            // Stage 4: Verify checksum
            await this.animateStage('stage4', 'Verifying integrity...', async () => {
                // Checksum verification is already done in decrypt()
                await this.delay(600);
            });
            
            // Stage 5: Extract message
            await this.animateStage('stage5', 'Extracting message...', async () => {
                await this.delay(400);
            });
            
            // Show result with matrix decryption effect
            await this.showDecryptionResult(decryptedMessage);
            
            // Update main app state
            this.displayDecryptedMessage(decryptedMessage);
            this.updateStatus('Decryption Successful', 'success');
            
        } catch (error) {
            // Show error on current stage
            const activeStage = document.querySelector('.decryption-stage.active');
            if (activeStage) {
                activeStage.classList.remove('active');
                activeStage.classList.add('failed');
                const status = activeStage.querySelector('.stage-status');
                status.innerHTML = `● ${error.message}`;
            }
            
            this.updateStatus('Decryption Failed: ' + error.message, 'error');
            this.elements.outputSection.style.display = 'none';
            
            // Show close button after error
            await this.delay(2000);
            this.elements.closeDecryptBtn.style.display = 'block';
        }
        
        // Remove processing state
        this.elements.characterDisplay.classList.remove('processing');
    }
    
    // Animate individual decryption stage
    async animateStage(stageId, message, asyncFunction) {
        const stage = document.getElementById(stageId);
        const status = stage.querySelector('.stage-status');
        
        // Activate stage
        stage.classList.add('active');
        status.innerHTML = `<span class="stage-spinner"></span>${message}`;
        
        // Execute the function
        await asyncFunction();
        
        // Complete stage
        stage.classList.remove('active');
        stage.classList.add('completed');
        status.innerHTML = '▣ Complete';
    }
    
    // Show decryption result with matrix effect
    async showDecryptionResult(message) {
        const resultEl = this.elements.decryptionResult;
        
        // First show scrambled text
        const scrambledChars = '█▓░▒▀▄▌▐■□▪▫0123456789ABCDEFabcdef!@#$%^&*';
        let scrambledText = '';
        for (let i = 0; i < message.length; i++) {
            scrambledText += scrambledChars[Math.floor(Math.random() * scrambledChars.length)];
        }
        
        resultEl.innerHTML = `<span class="matrix-decrypt">${scrambledText}</span>`;
        resultEl.classList.add('show');
        
        // Gradually reveal the real message
        for (let i = 0; i < message.length; i++) {
            await this.delay(50 + Math.random() * 100); // Random delay for more realistic effect
            
            let currentText = '';
            for (let j = 0; j < message.length; j++) {
                if (j <= i) {
                    currentText += message[j];
                } else {
                    currentText += scrambledChars[Math.floor(Math.random() * scrambledChars.length)];
                }
            }
            resultEl.innerHTML = `<span class="matrix-decrypt">${currentText}</span>`;
        }
        
        // Final reveal - check if it's a URL
        await this.delay(300);
        if (this.isValidURL(message)) {
            resultEl.innerHTML = `<a href="${message}" target="_blank" style="color: #00ff88; text-decoration: underline;">${message}</a>`;
        } else {
            resultEl.textContent = message;
        }
        
        // Show close button
        await this.delay(1000);
        this.elements.closeDecryptBtn.style.display = 'block';
    }
    
    // Close decryption overlay
    closeDecryptionOverlay() {
        this.elements.decryptionOverlay.classList.remove('active');
    }
    
    // Delay helper function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility function to check if string is valid URL
    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authenticatorApp = new AuthenticatorApp();
});