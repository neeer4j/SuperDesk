/**
 * SuperDesk File Transfer Module
 * Handles peer-to-peer file transfer via WebRTC DataChannel
 * 
 * Features:
 * - Chunk-based file transfer (16KB chunks)
 * - Progress tracking for both sender and receiver
 * - Accept/Reject handshake before transfer
 * - Works Electron-to-Electron
 */

// ==================== FILE TRANSFER STATE ====================
window.fileTransferState = {
    dataChannel: null,
    isEnabled: true,           // Local file transfer enabled
    peerEnabled: true,         // Remote peer's file transfer enabled
    autoAccept: false,         // Auto-accept incoming file transfers
    
    // Sending state
    currentFile: null,
    sendingInProgress: false,
    bytesSent: 0,
    totalBytesToSend: 0,
    
    // Receiving state
    receivingInProgress: false,
    receivedChunks: [],
    bytesReceived: 0,
    expectedFileSize: 0,
    expectedFileName: '',
    
    // Pending offer (waiting for accept/reject)
    pendingOffer: null,
    
    // Callbacks
    onProgress: null,
    onFileReceived: null,
    onOfferReceived: null
};

// ==================== CONSTANTS ====================
const CHUNK_SIZE = 16 * 1024; // 16KB chunks
const MESSAGE_TYPES = {
    FILE_OFFER: 'file-offer',
    FILE_ACCEPT: 'file-accept',
    FILE_REJECT: 'file-reject',
    FILE_CHUNK: 'file-chunk',
    FILE_EOF: 'file-eof',
    FILE_CANCEL: 'file-cancel',
    TOGGLE_ENABLED: 'toggle-enabled'
};

// ==================== DATA CHANNEL SETUP ====================

/**
 * Create and setup the file transfer DataChannel
 * Called by the host (offerer) after creating peer connection
 * @param {RTCPeerConnection} peerConnection - The WebRTC peer connection
 */
function createFileTransferChannel(peerConnection) {
    console.log('📁 Creating fileTransfer DataChannel...');
    
    const dataChannel = peerConnection.createDataChannel('fileTransfer', {
        ordered: true,  // Ensure chunks arrive in order
        maxRetransmits: 10  // Allow retransmits for reliability
    });
    
    setupDataChannelHandlers(dataChannel);
    window.fileTransferState.dataChannel = dataChannel;
    
    console.log('✅ fileTransfer DataChannel created');
    return dataChannel;
}

/**
 * Setup handler for incoming DataChannel (for guest/answerer)
 * @param {RTCPeerConnection} peerConnection - The WebRTC peer connection
 */
function setupDataChannelReceiver(peerConnection) {
    console.log('📁 Setting up DataChannel receiver...');
    
    peerConnection.ondatachannel = (event) => {
        console.log('📁 Received DataChannel:', event.channel.label);
        
        if (event.channel.label === 'fileTransfer') {
            setupDataChannelHandlers(event.channel);
            window.fileTransferState.dataChannel = event.channel;
            console.log('✅ fileTransfer DataChannel connected');
            
            // Show file transfer UI when channel is ready
            showFileTransferUI();
        }
    };
}

/**
 * Setup event handlers for the DataChannel
 * @param {RTCDataChannel} dataChannel - The data channel to setup
 */
function setupDataChannelHandlers(dataChannel) {
    dataChannel.onopen = () => {
        console.log('📁 DataChannel OPEN - ready for file transfer');
        showFileTransferUI();
    };
    
    dataChannel.onclose = () => {
        console.log('📁 DataChannel CLOSED');
        hideFileTransferUI();
    };
    
    dataChannel.onerror = (error) => {
        console.error('📁 DataChannel error:', error);
    };
    
    dataChannel.onmessage = (event) => {
        handleDataChannelMessage(event.data);
    };
}

// ==================== MESSAGE HANDLING ====================

/**
 * Handle incoming DataChannel messages
 * @param {string|ArrayBuffer} data - The received data
 */
function handleDataChannelMessage(data) {
    // Check if it's a binary chunk or a JSON message
    if (data instanceof ArrayBuffer) {
        // Binary data = file chunk
        handleFileChunk(data);
        return;
    }
    
    // Parse JSON message
    try {
        const message = JSON.parse(data);
        
        switch (message.type) {
            case MESSAGE_TYPES.FILE_OFFER:
                handleFileOffer(message);
                break;
            case MESSAGE_TYPES.FILE_ACCEPT:
                handleFileAccept();
                break;
            case MESSAGE_TYPES.FILE_REJECT:
                handleFileReject();
                break;
            case MESSAGE_TYPES.FILE_EOF:
                handleFileEOF(message);
                break;
            case MESSAGE_TYPES.FILE_CANCEL:
                handleFileCancel();
                break;
            case MESSAGE_TYPES.TOGGLE_ENABLED:
                handleToggleEnabled(message);
                break;
            default:
                console.warn('📁 Unknown message type:', message.type);
        }
    } catch (e) {
        console.error('📁 Failed to parse message:', e);
    }
}

// ==================== SENDING FILES ====================

/**
 * Send a file to the remote peer
 * @param {File} file - The file to send
 */
async function sendFile(file) {
    const state = window.fileTransferState;
    
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
        console.error('📁 Cannot send file: DataChannel not open');
        showFileTransferError('Connection not ready. Please wait for peer to connect.');
        return;
    }
    
    if (!state.isEnabled) {
        showFileTransferError('File transfer is disabled.');
        return;
    }
    
    if (state.sendingInProgress) {
        showFileTransferError('A file transfer is already in progress.');
        return;
    }
    
    console.log('📁 Preparing to send file:', file.name, 'Size:', file.size);
    
    // Store file info
    state.currentFile = file;
    state.totalBytesToSend = file.size;
    state.bytesSent = 0;
    
    // Send file offer and wait for accept/reject
    const offer = {
        type: MESSAGE_TYPES.FILE_OFFER,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream'
    };
    
    state.dataChannel.send(JSON.stringify(offer));
    console.log('📁 File offer sent, waiting for response...');
    
    // Show pending state in UI
    updateSendProgress(0, 'Waiting for peer to accept...');
}

/**
 * Actually start sending file chunks (called after peer accepts)
 */
async function startSendingChunks() {
    const state = window.fileTransferState;
    const file = state.currentFile;
    
    if (!file) {
        console.error('📁 No file to send');
        return;
    }
    
    state.sendingInProgress = true;
    state.bytesSent = 0;
    
    console.log('📁 Starting chunk transfer...');
    updateSendProgress(0, 'Sending...');
    
    const reader = file.stream().getReader();
    let buffer = new Uint8Array(0);
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Append to buffer
            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;
            
            // Send complete chunks
            while (buffer.length >= CHUNK_SIZE) {
                const chunk = buffer.slice(0, CHUNK_SIZE);
                buffer = buffer.slice(CHUNK_SIZE);
                
                // Wait for buffer to clear if needed
                while (state.dataChannel.bufferedAmount > 1024 * 1024) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
                state.dataChannel.send(chunk.buffer);
                state.bytesSent += chunk.length;
                
                const progress = (state.bytesSent / state.totalBytesToSend) * 100;
                updateSendProgress(progress, 'Sending...');
            }
        }
        
        // Send remaining data
        if (buffer.length > 0) {
            state.dataChannel.send(buffer.buffer);
            state.bytesSent += buffer.length;
        }
        
        // Send EOF marker
        const eofMessage = {
            type: MESSAGE_TYPES.FILE_EOF,
            name: file.name,
            size: file.size,
            totalBytes: state.bytesSent
        };
        state.dataChannel.send(JSON.stringify(eofMessage));
        
        console.log('✅ File transfer complete:', state.bytesSent, 'bytes sent');
        updateSendProgress(100, 'Complete!');
        
        // Reset state after a delay
        setTimeout(() => {
            state.sendingInProgress = false;
            state.currentFile = null;
            state.bytesSent = 0;
            hideSendProgress();
        }, 2000);
        
    } catch (error) {
        console.error('📁 Error sending file:', error);
        state.sendingInProgress = false;
        showFileTransferError('Failed to send file: ' + error.message);
    }
}

// ==================== RECEIVING FILES ====================

/**
 * Handle incoming file offer
 * @param {Object} offer - The file offer message
 */
function handleFileOffer(offer) {
    console.log('📁 Received file offer:', offer.name, 'Size:', offer.size);
    
    const state = window.fileTransferState;
    
    if (!state.isEnabled) {
        // Auto-reject if disabled
        rejectFileOffer();
        return;
    }
    
    // Store pending offer
    state.pendingOffer = offer;
    
    // Check if auto-accept is enabled
    if (state.autoAccept) {
        console.log('📁 Auto-accepting file offer');
        acceptFileOffer();
        return;
    }
    
    // Show accept/reject dialog
    showFileOfferDialog(offer);
}

/**
 * Accept the pending file offer
 */
function acceptFileOffer() {
    const state = window.fileTransferState;
    
    if (!state.pendingOffer) {
        console.warn('📁 No pending offer to accept');
        return;
    }
    
    console.log('📁 Accepting file offer:', state.pendingOffer.name);
    
    // Initialize receiving state
    state.receivingInProgress = true;
    state.receivedChunks = [];
    state.bytesReceived = 0;
    state.expectedFileSize = state.pendingOffer.size;
    state.expectedFileName = state.pendingOffer.name;
    
    // Send accept message
    state.dataChannel.send(JSON.stringify({
        type: MESSAGE_TYPES.FILE_ACCEPT
    }));
    
    // Hide dialog and show progress
    hideFileOfferDialog();
    updateReceiveProgress(0, 'Receiving...');
    
    state.pendingOffer = null;
}

/**
 * Reject the pending file offer
 */
function rejectFileOffer() {
    const state = window.fileTransferState;
    
    console.log('📁 Rejecting file offer');
    
    if (state.dataChannel && state.dataChannel.readyState === 'open') {
        state.dataChannel.send(JSON.stringify({
            type: MESSAGE_TYPES.FILE_REJECT
        }));
    }
    
    state.pendingOffer = null;
    hideFileOfferDialog();
}

/**
 * Handle file accept from peer
 */
function handleFileAccept() {
    console.log('📁 Peer accepted file transfer');
    startSendingChunks();
}

/**
 * Handle file reject from peer
 */
function handleFileReject() {
    console.log('📁 Peer rejected file transfer');
    const state = window.fileTransferState;
    
    state.currentFile = null;
    state.sendingInProgress = false;
    
    showFileTransferError('Peer rejected the file transfer.');
    hideSendProgress();
}

/**
 * Handle incoming file chunk
 * @param {ArrayBuffer} data - The chunk data
 */
function handleFileChunk(data) {
    const state = window.fileTransferState;
    
    if (!state.receivingInProgress) {
        console.warn('📁 Received chunk but not expecting file');
        return;
    }
    
    // Store chunk
    state.receivedChunks.push(new Uint8Array(data));
    state.bytesReceived += data.byteLength;
    
    // Update progress
    const progress = (state.bytesReceived / state.expectedFileSize) * 100;
    updateReceiveProgress(progress, 'Receiving...');
}

/**
 * Handle EOF marker - file transfer complete
 * @param {Object} message - The EOF message
 */
function handleFileEOF(message) {
    console.log('📁 Received EOF, assembling file...');
    
    const state = window.fileTransferState;
    
    // Combine all chunks
    const totalLength = state.receivedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of state.receivedChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }
    
    console.log('📁 File assembled:', totalLength, 'bytes');
    
    // Create blob
    const blob = new Blob([combined]);
    
    // Trigger save dialog (Electron)
    saveReceivedFile(blob, state.expectedFileName);
    
    // Update progress
    updateReceiveProgress(100, 'Complete!');
    
    // Reset state after a delay
    setTimeout(() => {
        state.receivingInProgress = false;
        state.receivedChunks = [];
        state.bytesReceived = 0;
        state.expectedFileSize = 0;
        state.expectedFileName = '';
        hideReceiveProgress();
    }, 2000);
}

/**
 * Handle file cancel from peer
 */
function handleFileCancel() {
    console.log('📁 File transfer cancelled by peer');
    
    const state = window.fileTransferState;
    state.receivingInProgress = false;
    state.receivedChunks = [];
    
    showFileTransferError('Transfer cancelled by peer.');
    hideReceiveProgress();
}

// ==================== ENABLE/DISABLE ====================

/**
 * Toggle local file transfer enabled state
 * @param {boolean} enabled - Whether to enable or disable
 */
function setFileTransferEnabled(enabled) {
    const state = window.fileTransferState;
    state.isEnabled = enabled;
    
    console.log('📁 File transfer', enabled ? 'enabled' : 'disabled');
    
    // Notify peer
    if (state.dataChannel && state.dataChannel.readyState === 'open') {
        state.dataChannel.send(JSON.stringify({
            type: MESSAGE_TYPES.TOGGLE_ENABLED,
            enabled: enabled
        }));
    }
    
    // Update UI
    updateFileTransferToggle(enabled);
}

/**
 * Handle toggle enabled message from peer
 * @param {Object} message - The toggle message
 */
function handleToggleEnabled(message) {
    const state = window.fileTransferState;
    state.peerEnabled = message.enabled;
    
    console.log('📁 Peer file transfer', message.enabled ? 'enabled' : 'disabled');
    
    // Update UI to reflect peer state
    updatePeerFileTransferState(message.enabled);
}

// ==================== FILE SAVING (ELECTRON) ====================

/**
 * Save received file to disk using Electron's save dialog
 * @param {Blob} blob - The file blob
 * @param {string} fileName - The file name
 */
async function saveReceivedFile(blob, fileName) {
    console.log('📁 Saving file:', fileName);
    
    try {
        // Convert blob to array buffer
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Use Electron's save dialog via IPC
        if (window.appControls && window.appControls.ipcInvoke) {
            const result = await window.appControls.ipcInvoke('save-file-dialog', {
                defaultPath: fileName,
                data: Array.from(uint8Array)  // Convert to regular array for IPC
            });
            
            if (result.success) {
                console.log('✅ File saved:', result.path);
                showFileTransferSuccess(`File saved: ${fileName}`);
            } else if (result.cancelled) {
                console.log('📁 Save cancelled by user');
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } else {
            // Fallback: Use browser download (for testing)
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ File downloaded via browser fallback');
            showFileTransferSuccess(`File downloaded: ${fileName}`);
        }
    } catch (error) {
        console.error('📁 Error saving file:', error);
        showFileTransferError('Failed to save file: ' + error.message);
    }
}

// ==================== UI FUNCTIONS (to be implemented in agent.html) ====================

function showFileTransferUI() {
    const container = document.getElementById('file-transfer-container');
    if (container) container.style.display = 'block';
}

function hideFileTransferUI() {
    const container = document.getElementById('file-transfer-container');
    if (container) container.style.display = 'none';
}

function showFileOfferDialog(offer) {
    // Will be implemented in agent.html
    if (typeof window.showFileOfferModal === 'function') {
        window.showFileOfferModal(offer);
    }
}

function hideFileOfferDialog() {
    if (typeof window.hideFileOfferModal === 'function') {
        window.hideFileOfferModal();
    }
}

function updateSendProgress(percent, status) {
    if (typeof window.updateFileSendProgress === 'function') {
        window.updateFileSendProgress(percent, status);
    }
}

function hideSendProgress() {
    if (typeof window.hideFileSendProgress === 'function') {
        window.hideFileSendProgress();
    }
}

function updateReceiveProgress(percent, status) {
    if (typeof window.updateFileReceiveProgress === 'function') {
        window.updateFileReceiveProgress(percent, status);
    }
}

function hideReceiveProgress() {
    if (typeof window.hideFileReceiveProgress === 'function') {
        window.hideFileReceiveProgress();
    }
}

function updateFileTransferToggle(enabled) {
    if (typeof window.updateFileTransferToggleUI === 'function') {
        window.updateFileTransferToggleUI(enabled);
    }
}

function updatePeerFileTransferState(enabled) {
    if (typeof window.updatePeerFileTransferUI === 'function') {
        window.updatePeerFileTransferUI(enabled);
    }
}

function showFileTransferError(message) {
    if (window.superdeskModal) {
        window.superdeskModal.error(message, 'File Transfer Error');
    } else {
        alert('File Transfer Error: ' + message);
    }
}

function showFileTransferSuccess(message) {
    if (window.superdeskModal) {
        window.superdeskModal.success(message, 'File Transfer');
    }
}

// ==================== EXPORTS ====================

window.fileTransfer = {
    createChannel: createFileTransferChannel,
    setupReceiver: setupDataChannelReceiver,
    sendFile: sendFile,
    acceptOffer: acceptFileOffer,
    rejectOffer: rejectFileOffer,
    setEnabled: setFileTransferEnabled,
    getState: () => window.fileTransferState
};

console.log('✅ File Transfer Module loaded');
