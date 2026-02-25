// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const EXCHANGE_RATE = 10;
const LOW_STOCK_THRESHOLD = 5;
const MAX_ACTIVITY_LOG = 100;
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// ============================================
// STATE VARIABLES
// ============================================
let stockAlertInterval = null;
let currentUser = null;
let currentRole = null;
let revenueChartInstance = null;
let productChartInstance = null;
let selectedReportRecipient = null;
let editingOrderItem = null;
let pendingUser = null;
let afogaRestockAccess = {};
let idleTimer = null;
let priceFilterMin = null;
let priceFilterMax = null;

// ============================================
// USER MANAGEMENT DATA
// ============================================
const users = {
    boison: {
        username: 'boison',
        password: 'admin123',
        role: 'main',
        permissions: ['dashboard', 'new-order', 'track-orders', 'history', 'customers', 'daily-report', 'report-tracker', 'activity-log', 'backup', 'edit-orders', 'edit-inventory', 'user-management', 'product-management'],
        avatar: null,
        email: 'boison@emd.com',
        passwordChanged: false
    },
    afoga: {
        username: 'afoga',
        password: 'user123',
        role: 'limited',
        permissions: ['dashboard', 'new-order', 'track-orders', 'history', 'customers', 'daily-report', 'activity-log'],
        avatar: null,
        email: 'afoga@emd.com',
        passwordChanged: false
    }
};

// ============================================
// REGISTRATION PACKAGES
// ============================================
const registrationPackages = {
    starter: { name: '🌟 Starter Pack', description: 'Perfect for beginners', priceUSD: 20, priceGHS: 200 },
    chairman: { name: '👔 Chairman', description: 'For growing businesses', priceUSD: 40, priceGHS: 400 },
    director: { name: '🎯 Director', description: 'Premium business package', priceUSD: 80, priceGHS: 800 },
    executive: { name: '💼 Executive', description: 'Enterprise level', priceUSD: 240, priceGHS: 2400 },
    emperor: { name: '👑 Emperor', description: 'Ultimate premium', priceUSD: 480, priceGHS: 4800 },
    vip: { name: '💎 VIP', description: 'Exclusive VIP access', priceUSD: 1440, priceGHS: 14400 },
    president: { name: '🏆 President', description: 'Presidential elite status', priceUSD: 2880, priceGHS: 28800 }
};

// Calculate package breakdown (fixed ₵100 / $10 registration charge deducted from full package price)
function calculatePackageBreakdown(packageKey) {
    if (!registrationPackages[packageKey]) return null;
    const pkg = registrationPackages[packageKey];
    const registrationUSD = 10; // Fixed $10 uniform charge (deducted from package)
    const registrationGHS = 100; // Fixed ₵100 uniform charge (deducted from package)
    const productsUSD = pkg.priceUSD - registrationUSD; // Remaining value for products
    const productsGHS = pkg.priceGHS - registrationGHS; // Remaining value for products
    
    return {
        totalUSD: pkg.priceUSD,
        totalGHS: pkg.priceGHS,
        registrationUSD: registrationUSD,
        registrationGHS: registrationGHS,
        productsUSD: productsUSD,
        productsGHS: productsGHS
    };
}

// ============================================
// ORDER STATE
// ============================================
let currentOrderActionType = null;
let currentOrderPackage = null;
let customers = JSON.parse(localStorage.getItem('emdCustomers')) || [];
let sentReports = JSON.parse(localStorage.getItem('emdReports')) || [];
let activityLog = JSON.parse(localStorage.getItem('emdActivityLog')) || [];
let allOrders = JSON.parse(localStorage.getItem('emdOrders')) || [];
let disabledProducts = JSON.parse(localStorage.getItem('emdDisabledProducts')) || [];
let currentOrderItems = [];
let currentViewOrder = null;

// Music player system
let playlistMusic = (() => {
    try {
        const saved = localStorage.getItem('emdPlaylist');
        const parsed = saved ? JSON.parse(saved) : [];
        console.log('🎵 Loaded playlist with', parsed.length, 'tracks');
        return parsed;
    } catch(e) {
        console.error('Error loading playlist:', e);
        return [];
    }
})();
let currentMusicIndex = 0;
let isPlayingMusic = false;
let lastLowStockNotification = 0;
const LOW_STOCK_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

// ============================================
// ACTIVITIES LOG
// ============================================
let activitiesLog = (() => {
    try {
        const saved = localStorage.getItem('emdActivities');
        const parsed = saved ? JSON.parse(saved) : [];
        console.log('📋 Loaded activities log with', parsed.length, 'records');
        return parsed;
    } catch(e) {
        console.error('Error loading activities:', e);
        return [];
    }
})();

const ACTIVITY_TYPES = ['Team Building', 'Training', 'Meeting', 'Event', 'Workshop', 'Conference', 'Other'];
const ACTIVITY_PERIODS = { daily: 1, weekly: 7, monthly: 30, all: 9999 };

// ============================================
// PRODUCT DATA
// ============================================
const productsData = [
    { name: "Horite eye drop", price: 160, stock: 50 },
    { name: "Behar 3 caps", price: 280, stock: 50 },
    { name: "Force 4 DS", price: 280, stock: 50 },
    { name: "Soft lax", price: 280, stock: 50 },
    { name: "Chodex 3", price: 280, stock: 50 },
    { name: "Pros X", price: 280, stock: 50 },
    { name: "Utri tone", price: 280, stock: 50 },
    { name: "Dan Jaan 10", price: 280, stock: 50 },
    { name: "Havitas", price: 300, stock: 50 },
    { name: "Pepto rest", price: 280, stock: 50 },
    { name: "Dynamic Liv Forte", price: 280, stock: 50 },
    { name: "Clean detox", price: 280, stock: 50 },
    { name: "Cushvite 3", price: 280, stock: 50 },
    { name: "Variclear", price: 280, stock: 50 },
    { name: "Vita trace", price: 280, stock: 50 },
    { name: "Vita PX", price: 300, stock: 50 },
    { name: "Ibhar juice", price: 300, stock: 50 },
    { name: "Garlic", price: 280, stock: 50 },
    { name: "Art plus", price: 300, stock: 50 },
    { name: "Calcol Juice", price: 280, stock: 50 },
    { name: "Cedarmol juice", price: 300, stock: 50 },
    { name: "Duravine juice", price: 280, stock: 50 },
    { name: "Evertulsi drop", price: 160, stock: 50 },
    { name: "Fs desire caps", price: 280, stock: 50 },
    { name: "Gourd juice", price: 300, stock: 50 },
    { name: "IQ vision caps", price: 280, stock: 50 },
    { name: "Neutri F caps", price: 280, stock: 50 },
    { name: "Noni juice", price: 280, stock: 50 },
    { name: "TC dental", price: 160, stock: 50 },
    { name: "Dynamic slim juice", price: 300, stock: 50 },
    { name: "Vile Q", price: 280, stock: 50 },
    { name: "Cabul 500 caps", price: 280, stock: 50 },
    { name: "Pain vile oil", price: 280, stock: 50 }
];

let inventory = JSON.parse(localStorage.getItem('emdInventory')) || initializeInventory();

// ============================================
// INITIALIZATION FUNCTIONS
// ============================================
function initializeInventory() {
    return productsData.map(p => ({ ...p }));
}

function loadUserData() {
    const savedUsers = localStorage.getItem('emdUsers');
    if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        Object.keys(parsed).forEach(key => {
            if (users[key]) {
                users[key] = { ...users[key], ...parsed[key] };
            } else {
                users[key] = parsed[key];
            }
        });
    }
    const savedAfogaAccess = localStorage.getItem('emdAfogaRestockAccess');
    if (savedAfogaAccess) {
        afogaRestockAccess = JSON.parse(savedAfogaAccess);
    }
}

function saveUserData() {
    localStorage.setItem('emdUsers', JSON.stringify(users));
    localStorage.setItem('emdAfogaRestockAccess', JSON.stringify(afogaRestockAccess));
}

function logActivity(action, details) {
    const entry = {
        id: 'ACT-' + Date.now().toString().slice(-6),
        user: currentUser,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    };
    activityLog.unshift(entry);
    if (activityLog.length > MAX_ACTIVITY_LOG) activityLog.pop();
    localStorage.setItem('emdActivityLog', JSON.stringify(activityLog));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function playAlertSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 500);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        console.error('localStorage not available:', e);
        return false;
    }
}

// ============================================
// INDEXEDDB FOR MUSIC STORAGE
// ============================================
let musicDB = null;

function initMusicDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EMDMusicDB', 1);
        
        request.onerror = () => {
            console.error('IndexedDB initialization failed');
            resolve(false);
        };
        
        request.onsuccess = () => {
            musicDB = request.result;
            console.log('✅ IndexedDB initialized for music storage');
            resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('music')) {
                const store = db.createObjectStore('music', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('📀 Created music object store');
            }
        };
    });
}

function saveMusicToIndexedDB(musicData) {
    return new Promise((resolve, reject) => {
        if (!musicDB) {
            reject(new Error('IndexedDB not initialized'));
            return;
        }
        
        try {
            const transaction = musicDB.transaction(['music'], 'readwrite');
            const store = transaction.objectStore('music');
            const request = store.add(musicData);
            
            request.onsuccess = () => {
                console.log('💾 Music saved to IndexedDB:', musicData.id);
                resolve(musicData.id);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to save music to IndexedDB'));
            };
        } catch(error) {
            reject(error);
        }
    });
}

function getMusicFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        if (!musicDB) {
            reject(new Error('IndexedDB not initialized'));
            return;
        }
        
        try {
            const transaction = musicDB.transaction(['music'], 'readonly');
            const store = transaction.objectStore('music');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to read music from IndexedDB'));
            };
        } catch(error) {
            reject(error);
        }
    });
}

function getAllMusicFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!musicDB) {
            reject(new Error('IndexedDB not initialized'));
            return;
        }
        
        try {
            const transaction = musicDB.transaction(['music'], 'readonly');
            const store = transaction.objectStore('music');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to read music from IndexedDB'));
            };
        } catch(error) {
            reject(error);
        }
    });
}

function deleteMusicFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        if (!musicDB) {
            reject(new Error('IndexedDB not initialized'));
            return;
        }
        
        try {
            const transaction = musicDB.transaction(['music'], 'readwrite');
            const store = transaction.objectStore('music');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('🗑️ Music deleted from IndexedDB:', id);
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('Failed to delete music from IndexedDB'));
            };
        } catch(error) {
            reject(error);
        }
    });
}

function getWelcomeMessage() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
        return { greeting: 'Good Morning!', icon: 'fa-sun' };
    } else if (hour >= 12 && hour < 17) {
        return { greeting: 'Good Afternoon!', icon: 'fa-cloud-sun' };
    } else if (hour >= 17 && hour < 21) {
        return { greeting: 'Good Evening!', icon: 'fa-moon' };
    } else {
        return { greeting: 'Good Night!', icon: 'fa-star' };
    }
}

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let icon = 'fa-check-circle';
    let bgClass = 'bg-green-50 border-green-200';
    let iconClass = 'text-green-500';
    
    switch(type) {
        case 'error':
            icon = 'fa-circle-exclamation';
            bgClass = 'bg-red-50 border-red-200';
            iconClass = 'text-red-500';
            break;
        case 'warning':
            icon = 'fa-triangle-exclamation';
            bgClass = 'bg-yellow-50 border-yellow-200';
            iconClass = 'text-yellow-500';
            break;
        case 'info':
            icon = 'fa-circle-info';
            bgClass = 'bg-blue-50 border-blue-200';
            iconClass = 'text-blue-500';
            break;
    }
    
    toast.className = `toast ${type} ${bgClass} border rounded-lg p-4 shadow-lg`;
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fa-solid ${icon} ${iconClass} text-lg flex-shrink-0"></i>
            <span class="text-slate-700 font-medium text-sm">${message}</span>
            <button onclick="this.parentElement.parentElement.classList.remove('show'); setTimeout(() => this.parentElement.parentElement.remove(), 300);" class="ml-auto text-gray-400 hover:text-gray-600">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function formatCurrency(amount, currency = 'GHS') {
    if (currency === 'GHS') {
        return `₵${amount.toLocaleString()}`;
    }
    return `$${(amount / EXCHANGE_RATE).toFixed(2)}`;
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString();
}

// ============================================
// IDLE TIMEOUT FUNCTIONS
// ============================================
function resetIdleTimer() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    if (currentUser) {
        idleTimer = setTimeout(() => {
            logActivity('Auto Logout', `${currentUser} logged out due to inactivity`);
            logout();
        }, IDLE_TIMEOUT);
    }
}

function initIdleTimer() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, true);
    });
}

// ============================================
// LOGIN FUNCTIONS
// ============================================
function renderUserTabs() {
    // User tabs removed - username and password are now entered manually
}

function selectUser(username) {
    // Manual username entry - no selection needed
}

function resetLogin() {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

// ============================================
// MUSIC SYSTEM FUNCTIONS
// ============================================
function uploadMusicFile() {
    console.log('🎵 Upload function called');
    
    const fileInput = document.getElementById('music-file-input');
    console.log('File input element:', fileInput);
    
    if (!fileInput) {
        console.error('File input element not found');
        showActionModal('error', 'Error', 'File input element not found in page');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        console.warn('No file selected');
        showActionModal('error', 'Error', 'Please select a music file');
        return;
    }
    
    const file = fileInput.files[0];
    console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Validate file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showActionModal('error', 'File Too Large', `Maximum file size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        fileInput.value = '';
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
        showActionModal('error', 'Invalid Type', 'Please select an audio file (MP3, WAV, OGG, etc.)');
        fileInput.value = '';
        return;
    }
    
    // Show loading/processing toast
    showToast(`📁 Processing ${file.name}...`, 'info');
    
    const reader = new FileReader();
    
    reader.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            console.log('Upload progress:', percentComplete.toFixed(2) + '%');
        }
    };
    
    reader.onload = function(e) {
        try {
            console.log('File loaded, creating music item');
            
            const musicItem = {
                id: 'MUSIC-' + Date.now(),
                name: file.name,
                data: e.target.result,
                type: file.type,
                fileSize: file.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: currentUser || 'Unknown',
                duration: 0
            };
            
            console.log('Music item created:', musicItem.id, musicItem.name);
            
            // Try to save to IndexedDB FIRST
            if (musicDB) {
                saveMusicToIndexedDB(musicItem).then(() => {
                    // Store metadata in localStorage only (not full base64)
                    const metadata = {
                        id: musicItem.id,
                        name: musicItem.name,
                        type: musicItem.type,
                        uploadedAt: musicItem.uploadedAt,
                        uploadedBy: musicItem.uploadedBy,
                        fileSize: musicItem.fileSize,
                        storagePath: 'indexeddb'
                    };
                    
                    playlistMusic.unshift(metadata);
                    console.log('Added to playlist metadata, total songs:', playlistMusic.length);
                    
                    try {
                        localStorage.setItem('emdPlaylist', JSON.stringify(playlistMusic));
                        console.log('Saved metadata to localStorage');
                    } catch(storageError) {
                        console.error('localStorage quota exceeded for metadata:', storageError);
                        playlistMusic.shift();
                        showActionModal('error', 'Storage Full', 'Not enough space to save file. Try removing old files.');
                        fileInput.value = '';
                        return;
                    }
                    
                    fileInput.value = '';
                    renderMusicPlaylist();
                    showToast(`✅ 🎵 ${file.name} added successfully!`, 'success');
                    logActivity('Music Added', `${file.name} (${(file.size / 1024).toFixed(2)}KB) added by ${currentUser || 'Unknown'}`);
                    console.log('Upload complete via IndexedDB');
                    
                }).catch(error => {
                    console.error('IndexedDB save failed:', error);
                    // Fallback to localStorage if IndexedDB fails
                    fallbackToLocalStorageMusicUpload(musicItem, file, fileInput);
                });
            } else {
                // Fallback if IndexedDB not available
                fallbackToLocalStorageMusicUpload(musicItem, file, fileInput);
            }
            
        } catch(error) {
            console.error('Error processing file:', error);
            showActionModal('error', 'Error', `Failed to process file: ${error.message}`);
            fileInput.value = '';
        }
    };
    
    reader.onerror = function(error) {
        console.error('FileReader error:', error);
        showActionModal('error', 'Read Error', 'Failed to read file. Try another file.');
        fileInput.value = '';
    };
    
    reader.onabort = function() {
        console.warn('FileReader aborted');
        showActionModal('error', 'Upload Cancelled', 'File upload was cancelled.');
        fileInput.value = '';
    };
    
    reader.readAsDataURL(file);
}

function fallbackToLocalStorageMusicUpload(musicItem, file, fileInput) {
    console.log('Falling back to localStorage for music upload');
    
    // Add to array with full data
    playlistMusic.unshift(musicItem);
    console.log('Added to playlist, total songs:', playlistMusic.length);
    
    // Save to localStorage with error handling
    try {
        localStorage.setItem('emdPlaylist', JSON.stringify(playlistMusic));
        console.log('Saved to localStorage successfully');
        
        fileInput.value = '';
        renderMusicPlaylist();
        showToast(`✅ 🎵 ${file.name} added successfully!`, 'success');
        logActivity('Music Added', `${file.name} (${(file.size / 1024).toFixed(2)}KB) added by ${currentUser || 'Unknown'}`);
        console.log('Upload complete via localStorage');
        
    } catch(storageError) {
        if (storageError.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded');
            playlistMusic.pop(); // Remove the item we just added
            
            showActionModal('error', 'Storage Full', 
                'Not enough space to save file. Your browser storage is full. Try clearing old files or using Firefox/Chrome with more storage space. ' +
                'File size: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
            fileInput.value = '';
            return;
        }
        throw storageError;
    }
}

function removeMusic(musicId) {
    // Remove from IndexedDB if stored there
    const music = playlistMusic.find(m => m.id === musicId);
    if (music && music.storagePath === 'indexeddb' && musicDB) {
        deleteMusicFromIndexedDB(musicId).then(() => {
            console.log('Deleted from IndexedDB');
        }).catch(error => {
            console.error('Failed to delete from IndexedDB:', error);
        });
    }
    
    // Remove from playlist
    playlistMusic = playlistMusic.filter(m => m.id !== musicId);
    localStorage.setItem('emdPlaylist', JSON.stringify(playlistMusic));
    if (currentMusicIndex >= playlistMusic.length && currentMusicIndex > 0) {
        currentMusicIndex = playlistMusic.length - 1;
    }
    stopMusic();
    renderMusicPlaylist();
    showToast('Music removed from playlist', 'info');
}

function playMusic(index) {
    if (!playlistMusic.length || index < 0 || index >= playlistMusic.length) return;
    
    const music = playlistMusic[index];
    const audioElement = document.getElementById('global-audio-player');
    if (!audioElement) return;
    
    try {
        currentMusicIndex = index;
        
        // Check if music is stored in IndexedDB
        if (music.storagePath === 'indexeddb' && musicDB) {
            getMusicFromIndexedDB(music.id).then(musicData => {
                if (musicData && musicData.data) {
                    audioElement.src = musicData.data;
                    audioElement.volume = 0.7;
                    audioElement.load();
                    
                    const playPromise = audioElement.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            isPlayingMusic = true;
                            updateMusicPlayerUI();
                            renderMusicPlaylist();
                        }).catch(error => {
                            console.error('Audio playback failed:', error);
                            showToast('⚠️ Audio playback issue. Ensure browser allows audio.', 'warning');
                            isPlayingMusic = false;
                            updateMusicPlayerUI();
                        });
                    } else {
                        isPlayingMusic = true;
                        updateMusicPlayerUI();
                        renderMusicPlaylist();
                    }
                } else {
                    throw new Error('Music data not found in IndexedDB');
                }
            }).catch(error => {
                console.error('Failed to load from IndexedDB:', error);
                showToast('❌ Failed to load music file', 'error');
            });
        } else if (music.data) {
            // Use data from localStorage
            audioElement.src = music.data;
            audioElement.volume = 0.7;
            audioElement.load();
            
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isPlayingMusic = true;
                    updateMusicPlayerUI();
                    renderMusicPlaylist();
                }).catch(error => {
                    console.error('Audio playback failed:', error);
                    showToast('⚠️ Audio playback issue. Ensure browser allows audio.', 'warning');
                    isPlayingMusic = false;
                    updateMusicPlayerUI();
                });
            } else {
                isPlayingMusic = true;
                updateMusicPlayerUI();
                renderMusicPlaylist();
            }
        } else {
            console.error('No audio data found for music:', music.id);
            showToast('❌ No audio data available', 'error');
        }
    } catch(e) {
        console.error('playMusic error:', e);
        isPlayingMusic = false;
        updateMusicPlayerUI();
    }
}

function pauseMusic() {
    const audioElement = document.getElementById('global-audio-player');
    if (!audioElement) return;
    audioElement.pause();
    isPlayingMusic = false;
    updateMusicPlayerUI();
}

function resumeMusic() {
    const audioElement = document.getElementById('global-audio-player');
    if (!audioElement) return;
    
    try {
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlayingMusic = true;
                updateMusicPlayerUI();
            }).catch(error => {
                console.error('Resume failed:', error);
                isPlayingMusic = false;
                updateMusicPlayerUI();
                showToast('⚠️ Could not resume audio playback', 'warning');
            });
        } else {
            isPlayingMusic = true;
            updateMusicPlayerUI();
        }
    } catch(e) {
        console.error('Resume error:', e);
        isPlayingMusic = false;
    }
}

function stopMusic() {
    const audioElement = document.getElementById('global-audio-player');
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
    isPlayingMusic = false;
    updateMusicPlayerUI();
}

function nextMusic() {
    if (playlistMusic.length === 0) return;
    let nextIndex = currentMusicIndex + 1;
    if (nextIndex >= playlistMusic.length) nextIndex = 0;
    playMusic(nextIndex);
}

function previousMusic() {
    if (playlistMusic.length === 0) return;
    let prevIndex = currentMusicIndex - 1;
    if (prevIndex < 0) prevIndex = playlistMusic.length - 1;
    playMusic(prevIndex);
}

function updateMusicPlayerUI() {
    const playBtn = document.getElementById('music-play-btn');
    const music = playlistMusic[currentMusicIndex];
    const trackName = document.getElementById('current-track-name');
    
    if (playBtn) {
        playBtn.innerHTML = isPlayingMusic 
            ? '<i class="fa-solid fa-pause"></i>' 
            : '<i class="fa-solid fa-play"></i>';
    }
    
    if (trackName && music) {
        trackName.textContent = music.name || 'No Music';
    }
}

function renderMusicPlaylist() {
    const container = document.getElementById('music-playlist-container');
    if (!container) {
        console.warn('music-playlist-container not found');
        return;
    }
    
    console.log('🎵 Rendering playlist with', playlistMusic.length, 'tracks');
    
    // Update total tracks count
    const totalTracksEl = document.getElementById('total-tracks');
    if (totalTracksEl) {
        totalTracksEl.textContent = playlistMusic.length;
        console.log('Updated total-tracks:', playlistMusic.length);
    }
    
    // Update current playing track
    const currentTrackEl = document.getElementById('current-playing-track');
    if (currentTrackEl && playlistMusic.length > 0) {
        currentTrackEl.textContent = playlistMusic[currentMusicIndex]?.name || 'None';
    }
    
    container.innerHTML = '';
    if (playlistMusic.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-6">No music files uploaded</p>';
        console.log('Playlist is empty');
        return;
    }
    
    playlistMusic.forEach((music, index) => {
        try {
            const div = document.createElement('div');
            div.className = `p-3 rounded-lg border transition-all cursor-pointer ${
                index === currentMusicIndex && isPlayingMusic 
                    ? 'bg-brand-100 border-brand-500' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
            }`;
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <p class="font-medium text-slate-800 text-sm truncate">🎵 ${music.name}</p>
                        <p class="text-xs text-slate-500">By ${music.uploadedBy || 'Unknown'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="playMusic(${index})" class="px-3 py-1 bg-brand-500 text-white rounded text-xs hover:bg-brand-600 font-bold">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        ${hasPermission('manage-music') ? `
                            <button onclick="removeMusic('${music.id}')" class="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            container.appendChild(div);
            console.log('Added track:', index, music.name);
        } catch(e) {
            console.error('Error rendering track:', e, music);
        }
    });
}

function handleMusicEnded() {
    nextMusic();
}

function initAudioPlayer() {
    const audioElement = document.getElementById('global-audio-player');
    if (!audioElement) return;
    
    // Set default volume
    audioElement.volume = 0.7;
    
    // Remove old event listeners to prevent duplicates
    audioElement.removeEventListener('ended', handleMusicEnded);
    audioElement.removeEventListener('error', audioErrorHandler);
    
    // Add fresh event listeners
    audioElement.addEventListener('ended', handleMusicEnded, false);
    audioElement.addEventListener('error', audioErrorHandler, false);
    
    // Connect volume slider
    const volumeControl = document.getElementById('music-volume');
    if (volumeControl) {
        volumeControl.oninput = function(e) {
            audioElement.volume = e.target.value / 100;
        };
    }
}

function audioErrorHandler(e) {
    console.error('Audio error:', e, 'Error code:', e.target.error?.code);
    isPlayingMusic = false;
    updateMusicPlayerUI();
    showToast('⚠️ Audio error. Check file format or browser permissions.', 'warning');
}

function handleMusicPlayBtn() {
    if (!playlistMusic.length) {
        showToast('📭 No music in playlist', 'info');
        return;
    }
    
    if (isPlayingMusic) {
        pauseMusic();
    } else {
        const audioElement = document.getElementById('global-audio-player');
        if (audioElement && audioElement.src) {
            resumeMusic();
        } else if (playlistMusic.length > 0) {
            playMusic(currentMusicIndex);
        }
    }
}

// Diagnostic function for debugging music issues
function debugMusic() {
    console.clear();
    console.log('=== 🎵 MUSIC SYSTEM DIAGNOSTICS ===');
    console.log('Playlist songs:', playlistMusic.length);
    console.log('Playlist:', playlistMusic);
    console.log('Current index:', currentMusicIndex);
    console.log('Is playing:', isPlayingMusic);
    console.log('Audio element:', document.getElementById('global-audio-player'));
    
    const storage = isLocalStorageAvailable();
    console.log('localStorage available:', storage);
    
    if (storage) {
        const stored = localStorage.getItem('emdPlaylist');
        console.log('Stored playlist JSON size:', stored ? stored.length : 0, 'bytes');
        console.log('Total localStorage used (estimated):', (new Blob([JSON.stringify(localStorage)]).size / 1024).toFixed(2), 'KB');
    }
    
    const fileInput = document.getElementById('music-file-input');
    console.log('File input element:', fileInput);
    console.log('File input works:', !!fileInput && typeof fileInput.click === 'function');
    
    console.log('=== END DIAGNOSTICS ===');
    console.log('Run: debugMusic() to refresh');
    console.log('Run: playlistMusic to see all songs');
    console.log('Run: playMusic(0) to play first song');
}

function clearLoginError() {
    const errorAlert = document.getElementById('login-error-alert');
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    
    if (errorAlert) errorAlert.classList.add('hidden');
    if (usernameError) usernameError.classList.add('hidden');
    if (passwordError) passwordError.classList.add('hidden');
}

function clearPasswordError() {
    const errorAlert = document.getElementById('password-change-error');
    const newPasswordError = document.getElementById('new-password-error');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    
    if (errorAlert) errorAlert.classList.add('hidden');
    if (newPasswordError) newPasswordError.classList.add('hidden');
    if (confirmPasswordError) confirmPasswordError.classList.add('hidden');
}

function showPasswordError(title, message, fields = []) {
    const errorAlert = document.getElementById('password-change-error');
    const errorTitle = document.getElementById('password-error-title');
    const errorMsg = document.getElementById('password-error-message');
    const newPasswordError = document.getElementById('new-password-error');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    
    // Show main error alert
    if (errorAlert && errorTitle && errorMsg) {
        errorTitle.textContent = title;
        errorMsg.textContent = message;
        errorAlert.classList.remove('hidden');
    }
    
    // Show field-specific errors
    if (fields.includes('new-password') && newPasswordError) {
        newPasswordError.classList.remove('hidden');
    }
    if (fields.includes('confirm-password') && confirmPasswordError) {
        confirmPasswordError.classList.remove('hidden');
    }
}

function showLoginError(title, message, fields = []) {
    const errorAlert = document.getElementById('login-error-alert');
    const errorTitle = document.getElementById('login-error-title');
    const errorMsg = document.getElementById('login-error-message');
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    
    // Show main error alert
    if (errorAlert && errorTitle && errorMsg) {
        errorTitle.textContent = title;
        errorMsg.textContent = message;
        errorAlert.classList.remove('hidden');
    }
    
    // Show field-specific errors
    if (fields.includes('username') && usernameError) {
        usernameError.classList.remove('hidden');
    }
    if (fields.includes('password') && passwordError) {
        passwordError.classList.remove('hidden');
    }
}

function handleLoginKeyPress(event) {
    if (event.key === 'Enter') {
        login();
    }
}

function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    
    // Validation
    if (!username) {
        showLoginError('Missing Username', 'Please enter your username.', ['username']);
        document.getElementById('login-username').focus();
        return;
    }
    
    if (!password) {
        showLoginError('Missing Password', 'Please enter your password.', ['password']);
        document.getElementById('login-password').focus();
        return;
    }
    
    // Check credentials
    if (!users[username]) {
        showLoginError('Invalid Credentials', 'Username or password is incorrect.', ['username', 'password']);
        logActivity('Login Failed', `Failed login attempt - invalid username: ${username}`);
        document.getElementById('login-password').value = '';
        return;
    }
    
    if (password !== users[username].password) {
        showLoginError('Invalid Credentials', 'Username or password is incorrect.', ['username', 'password']);
        logActivity('Login Failed', `Failed login attempt for ${username} - wrong password`);
        document.getElementById('login-password').value = '';
        return;
    }
    
    // Show loading state
    clearLoginError();
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Logging in...';
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> <span id="login-btn-text">Logging in...</span>';
    
    setTimeout(() => {
        try {
            currentUser = username;
            currentRole = users[username].role;
            logActivity('Login', `${username} logged in successfully`);
            
            resetIdleTimer();
            initIdleTimer();
            
            // Show success message briefly
            showActionModal('success', 'Welcome!', `Login successful for ${username}`);
            
            setTimeout(() => {
                closeModal('action-modal');
                
                if (!users[username].passwordChanged) {
                    document.getElementById('login-modal').classList.add('hidden');
                    document.getElementById('password-change-modal').classList.remove('hidden');
                    return;
                }
                completeLogin();
            }, 1500);
            
        } catch(error) {
            console.error('Login error:', error);
            loginBtn.disabled = false;
            loginBtnText.textContent = 'Login to Dashboard';
            loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> <span id="login-btn-text">Login to Dashboard</span>';
            showActionModal('error', 'Login Error', 'An error occurred during login. Please try again.');
            logActivity('Login Error', `Error during login for ${username}: ${error.message}`);
        }
    }, 800);
}

function completeLogin() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('page-loader').classList.remove('hidden');
    
    setTimeout(() => {
        document.getElementById('page-loader').classList.add('hidden');
        const welcome = getWelcomeMessage();
        document.getElementById('welcome-greeting').textContent = welcome.greeting;
        document.getElementById('welcome-icon').className = `fa-solid ${welcome.icon} text-5xl text-white`;
        document.getElementById('welcome-username').textContent = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
        document.getElementById('welcome-role').textContent = currentRole === 'main' ? 'Main Admin' : 'Admin';
        const avatar = users[currentUser].avatar || `https://ui-avatars.com/api/?name=${currentUser}&background=${currentRole === 'main' ? '0ea5e9' : 'f59e0b'}&color=fff&size=128`;
        document.getElementById('welcome-avatar').src = avatar;
        document.getElementById('welcome-modal').classList.remove('hidden');
    }, 1000);
    
    document.getElementById('current-user-name').textContent = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    document.getElementById('current-user-role').textContent = currentRole === 'main' ? 'Main Admin' : 'Admin';
    const avatar = users[currentUser].avatar || `https://ui-avatars.com/api/?name=${currentUser}&background=${currentRole === 'main' ? '0ea5e9' : 'f59e0b'}&color=fff&size=128`;
    document.getElementById('sidebar-avatar').src = avatar;
    
    if (currentRole === 'main') {
        document.getElementById('boison-admin-section').classList.remove('hidden');
        document.getElementById('nav-report-tracker').classList.remove('disabled');
    } else {
        document.getElementById('boison-admin-section').classList.add('hidden');
        document.getElementById('nav-report-tracker').classList.add('disabled');
    }
    
    updateNavPermissions();
    initProductSelect();
    updateClock();
    setInterval(updateClock, 1000);
    setDefaultDate();
    updateDashboardStats();
    renderHistory();
    renderInventory();
    renderTrackOrders();
    renderActivityLog();
    renderCustomers();
    startStockAlertChecker();
    
    // Initialize IndexedDB for music storage
    setTimeout(() => {
        initMusicDB().then(success => {
            if (success) {
                console.log('Music database ready');
            } else {
                console.warn('Music database not available, will use localStorage');
            }
        });
    }, 100);
    
    // Initialize music player
    setTimeout(() => {
        initAudioPlayer();
        updateMusicPlayerUI();
        renderMusicPlaylist();
        if (playlistMusic.length > 0) {
            playMusic(0);
        }
    }, 500);
}

function handlePasswordChangeKeyPress(event) {
    if (event.key === 'Enter') {
        changePassword();
    }
}

function changePassword() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const changeBtn = document.getElementById('change-password-btn');
    const username = document.getElementById('login-username').value;
    
    // Validation with inline errors
    if (!newPassword) {
        showPasswordError('Empty Field', 'Please enter a new password.', ['new-password']);
        document.getElementById('new-password').focus();
        return;
    }
    
    if (newPassword.length < 6) {
        showPasswordError('Weak Password', 'Password must be at least 6 characters long.', ['new-password']);
        document.getElementById('new-password').focus();
        return;
    }
    
    if (!confirmPassword) {
        showPasswordError('Missing Confirmation', 'Please confirm your password.', ['confirm-password']);
        document.getElementById('confirm-password').focus();
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showPasswordError('Passwords Do Not Match', 'Passwords do not match. Please try again.', ['confirm-password']);
        document.getElementById('confirm-password').focus();
        document.getElementById('confirm-password').value = '';
        return;
    }
    
    // Show loading state
    clearPasswordError();
    changeBtn.disabled = true;
    changeBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-2"></i> Updating Password...';
    
    setTimeout(() => {
        try {
            users[username].password = newPassword;
            users[username].passwordChanged = true;
            saveUserData();
            logActivity('Password Change', `${username} changed their password`);
            
            // Show success
            changeBtn.disabled = false;
            changeBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Password Updated!';
            
            setTimeout(() => {
                document.getElementById('password-change-modal').classList.add('hidden');
                showActionModal('success', 'Password Changed!', 'Your password has been updated successfully.');
                
                setTimeout(() => {
                    closeModal('action-modal');
                    completeLogin();
                }, 1500);
            }, 500);
            
        } catch(error) {
            console.error('Password change error:', error);
            changeBtn.disabled = false;
            changeBtn.innerHTML = '<i class="fa-solid fa-key mr-2"></i> Update Password';
            showActionModal('error', 'Error', 'Failed to update password. Please try again.');
        }
    }, 800);
}

function logout() {
    logActivity('Logout', `${currentUser} logged out`);
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    currentUser = null;
    currentRole = null;
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('logout-modal').classList.add('hidden');
    resetLogin();
}

function confirmLogout() {
    document.getElementById('logout-modal').classList.remove('hidden');
}

function updateNavPermissions() {
    const permissions = users[currentUser]?.permissions || [];
    ['dashboard', 'new-order', 'track-orders', 'history', 'customers', 'daily-report', 'report-tracker', 'activity-log', 'backup', 'user-management', 'product-management'].forEach(view => {
        const navItem = document.getElementById(`nav-${view}`);
        if (navItem) {
            if (!permissions.includes(view)) {
                navItem.classList.add('disabled');
            } else {
                navItem.classList.remove('disabled');
            }
        }
    });
}

function hasPermission(permission) {
    const permissionMap = {
        'edit-orders': true,
        'edit-inventory': true,
        'activities': true,
        'calculator': true,
        'user-management': currentRole === 'main',
        'product-management': currentRole === 'main',
        'music-management': currentRole === 'main',
        'manage-music': currentRole === 'main'
    };
    return permissionMap[permission] || users[currentUser]?.permissions.includes(permission) || false;
}

// ============================================
// CORE FUNCTIONS
// ============================================
function initProductSelect() {
    const select = document.getElementById('productSelect');
    select.innerHTML = '<option value="">Select a product...</option>';
    inventory.forEach(p => {
        const isDisabled = disabledProducts.includes(p.name);
        // Disabled products should NOT be visible during purchase
        if (isDisabled) return;
        const option = document.createElement('option');
        option.value = p.name;
        option.dataset.price = p.price;
        option.dataset.stock = p.stock;
        const usd = (p.price / EXCHANGE_RATE).toFixed(2);
        option.text = `${p.name} (₵${p.price} / $${usd}) - Stock: ${p.stock}`;
        if (p.stock === 0) {
            option.disabled = true;
            option.text += ' [OUT OF STOCK]';
        }
        select.appendChild(option);
    });
    select.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const price = parseInt(selectedOption.dataset.price || 0);
        const usd = (price / EXCHANGE_RATE).toFixed(2);
        document.getElementById('product-price-display').value = price ? `₵${price.toLocaleString()} / $${usd}` : '';
    });
}

// ============================================
// ORDER ACTION FUNCTIONS
// ============================================
function onActionTypeChange() {
    const actionType = document.getElementById('action-type').value;
    const customerNameInput = document.getElementById('customer-name');
    const packageDiv = document.getElementById('registration-package-div');
    const packageInfoDiv = document.getElementById('registration-package-info');
    
    currentOrderActionType = actionType;
    
    if (actionType === 'repurchase') {
        customerNameInput.placeholder = 'Enter customer name';
        customerNameInput.value = '';
        packageDiv.classList.add('hidden');
        packageInfoDiv.classList.add('hidden');
        document.getElementById('registration-fee-row').classList.add('hidden');
        renderOrderItems();
    } else if (actionType === 'new-registration') {
        customerNameInput.placeholder = 'Customer will receive EMD registration';
        customerNameInput.value = 'EMD User';
        packageDiv.classList.remove('hidden');
        // Load default package
        document.getElementById('registration-package').value = 'starter';
        onRegistrationPackageChange();
    } else {
        packageDiv.classList.add('hidden');
        packageInfoDiv.classList.add('hidden');
        document.getElementById('registration-fee-row').classList.add('hidden');
    }
}

function onRegistrationPackageChange() {
    const packageKey = document.getElementById('registration-package').value;
    if (!packageKey || !registrationPackages[packageKey]) return;
    
    const pkg = registrationPackages[packageKey];
    const breakdown = calculatePackageBreakdown(packageKey);
    currentOrderPackage = packageKey;
    
    // Update package info panel
    document.getElementById('package-name').textContent = pkg.name;
    document.getElementById('package-description').textContent = pkg.description;
    document.getElementById('package-price-ghs').textContent = `₵${pkg.priceGHS.toLocaleString()}`;
    document.getElementById('package-price-usd').textContent = `$${pkg.priceUSD.toLocaleString()}`;
    
    // Update breakdown info
    document.getElementById('breakdown-products-ghs').textContent = `₵${breakdown.productsGHS.toLocaleString()}`;
    document.getElementById('breakdown-products-usd').textContent = `$${breakdown.productsUSD.toFixed(2)}`;
    document.getElementById('breakdown-registration-ghs').textContent = `₵${breakdown.registrationGHS.toLocaleString()}`;
    document.getElementById('breakdown-registration-usd').textContent = `$${breakdown.registrationUSD.toFixed(2)}`;
    document.getElementById('breakdown-total-ghs').textContent = `₵${breakdown.totalGHS.toLocaleString()}`;
    document.getElementById('breakdown-total-usd').textContent = `$${breakdown.totalUSD.toLocaleString()}`;
    
    // Show breakdown
    document.getElementById('package-breakdown-section').classList.remove('hidden');
    
    document.getElementById('registration-fee-row').classList.remove('hidden');
    document.getElementById('registration-package-info').classList.remove('hidden');
    document.getElementById('registration-fee-label').textContent = pkg.name;
    document.getElementById('summary-reg-fee-ghs').textContent = `₵100`; // Fixed uniform fee
    document.getElementById('summary-reg-fee-usd').textContent = `$10`; // Fixed uniform fee
    
    renderOrderItems();
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('order-date').value = today;
    document.getElementById('filter-date-from').value = today;
    document.getElementById('filter-date-to').value = today;
}

function updateClock() {
    const options = { timeZone: 'Africa/Accra', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('ghana-clock').textContent = new Date().toLocaleTimeString('en-US', options);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function switchView(viewName) {
    if (!hasPermission(viewName)) {
        showActionModal('error', 'Access Denied', 'You do not have permission to access this section');
        return;
    }
    
    ['dashboard', 'new-order', 'track-orders', 'history', 'customers', 'activities', 'calculator', 'daily-report', 'report-tracker', 'activity-log', 'backup', 'user-management', 'product-management', 'music-management'].forEach(v => {
        document.getElementById(`view-${v}`).classList.add('hidden');
        const navItem = document.getElementById(`nav-${v}`);
        if (navItem) navItem.classList.remove('active');
    });
    
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('active');
    
    const titles = {
        'dashboard': 'Dashboard',
        'new-order': 'Create New Order',
        'track-orders': 'Track Orders & Inventory',
        'history': 'Order History',
        'customers': 'Customer Management',
        'activities': 'Activities',
        'daily-report': 'Daily Report',
        'report-tracker': 'Report Tracker',
        'activity-log': 'Activity Log',
        'backup': 'Backup & Restore',
        'user-management': 'User Management',
        'product-management': 'Product Manager',
        'music-management': 'Music Manager'
    };
    document.getElementById('page-title').textContent = titles[viewName];
    
    if(window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    }
    
    resetIdleTimer();
    
    if(viewName === 'dashboard') {
        updateDashboardStats();
        checkLowStock(false);
    }
    if(viewName === 'history') renderHistory();
    if(viewName === 'track-orders') {
        renderInventory();
        renderTrackOrders();
    }
    if(viewName === 'daily-report') {
        updateReportSummary();
    }
    if(viewName === 'report-tracker') {
        renderReportTracker();
    }
    if(viewName === 'activities') {
        updateActivityStats();
        renderActivitiesList();
        document.getElementById('modal-activity-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if(viewName === 'activity-log') {
        renderActivityLog();
    }
    if(viewName === 'user-management') {
        renderUserManagement();
    }
    if(viewName === 'product-management') {
        renderProductManagement();
    }
    if(viewName === 'customers') {
        renderCustomers();
    }
}

// ============================================
// ORDER FUNCTIONS
// ============================================
function addToOrderList() {
    const select = document.getElementById('productSelect');
    const qtyInput = document.getElementById('product-quantity');
    const name = select.value;
    
    if (!name) {
        showActionModal('error', 'No Product Selected', 'Please select a product from the list');
        select.focus();
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const price = parseInt(selectedOption.dataset.price || 0);
    const stock = parseInt(selectedOption.dataset.stock || 0);
    const qty = parseInt(qtyInput.value) || 1;
    
    if (qty <= 0) {
        showActionModal('error', 'Invalid Quantity', 'Please enter a quantity greater than 0');
        qtyInput.focus();
        return;
    }
    
    if (qty > stock) {
        showActionModal('error', 'Insufficient Stock', `Only ${stock} units available for ${name}. Please reduce the quantity.`);
        qtyInput.value = stock;
        qtyInput.focus();
        return;
    }
    
    const existingItem = currentOrderItems.find(item => item.name === name);
    if (existingItem) {
        if (existingItem.qty + qty > stock) {
            showActionModal('error', 'Insufficient Stock', 
                `Total quantity (${existingItem.qty + qty}) exceeds available stock (${stock} units).`);
            return;
        }
        existingItem.qty += qty;
        existingItem.total = existingItem.qty * existingItem.price;
        showToast(`✅ ${name}: quantity updated to ${existingItem.qty} units`, 'info', 2500);
        console.log(`📦 Updated ${name}: ${qty} more units added (total: ${existingItem.qty})`);
    } else {
        currentOrderItems.push({ name, price, qty, total: price * qty });
        showToast(`✅ ${name} added to cart (${qty} units)`, 'success', 2500);
        console.log(`✨ Added ${name}: ${qty} units @ ₵${price}/unit = ₵${price * qty}`);
    }
    
    renderOrderItems();
    select.value = "";
    document.getElementById('product-price-display').value = "";
    qtyInput.value = 1;
}

function renderOrderItems() {
    const container = document.getElementById('order-items-container');
    const badge = document.getElementById('item-count-badge');
    
    if (currentOrderItems.length === 0) {
        container.innerHTML = `
            <div class="text-center text-slate-400 py-12">
                <i class="fa-solid fa-basket-shopping text-4xl mb-3 opacity-30"></i>
                <p class="text-sm">Cart is empty</p>
            </div>`;
        badge.textContent = "0 Items";
        updateTotals(0);
        return;
    }
    
    container.innerHTML = '';
    let grandTotal = 0;
    let totalQty = 0;
    
    currentOrderItems.forEach((item, index) => {
        const product = inventory.find(p => p.name === item.name);
        const remainingStock = product ? product.stock : 0;
        
        grandTotal += item.total;
        totalQty += item.qty;
        const usd = (item.total / EXCHANGE_RATE).toFixed(2);
        const div = document.createElement('div');
        div.className = 'group flex justify-between items-start bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow';
        div.innerHTML = `
            <div class="flex-1">
                <p class="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <i class="fa-solid fa-box text-blue-500"></i> ${item.name}
                </p>
                <p class="text-xs text-slate-600 mt-1 flex gap-2">
                    <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">${item.qty} units</span>
                    <span class="text-slate-500">@ ₵${item.price.toLocaleString()} each</span>
                </p>
                <div class="text-xs text-slate-500 mt-1">
                    <i class="fa-solid fa-warehouse"></i> Stock available: ${remainingStock} units
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right bg-white p-2 rounded-lg">
                    <div class="font-bold text-brand-600">₵${item.total.toLocaleString()}</div>
                    <div class="text-xs text-slate-400">$${usd}</div>
                </div>
                <button onclick="removeOrderItem(${index})" class="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100" title="Remove item">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    
    badge.textContent = `${totalQty} Items`;
    updateTotals(grandTotal);
}

function removeOrderItem(index) {
    currentOrderItems.splice(index, 1);
    renderOrderItems();
}

function updateRegistrationFee() {
    renderOrderItems();
}

function updateTotals(subtotal) {
    let regFee = 0;
    let packageName = '';
    
    if (currentOrderActionType === 'new-registration' && currentOrderPackage) {
        const pkg = registrationPackages[currentOrderPackage];
        regFee = 100; // Fixed ₵100 uniform registration fee
        packageName = pkg.name;
    }
    
    const total = subtotal + regFee;
    
    document.getElementById('summary-subtotal-ghs').textContent = `₵${subtotal.toLocaleString()}`;
    document.getElementById('summary-subtotal-usd').textContent = `$${(subtotal / EXCHANGE_RATE).toFixed(2)}`;
    
    const regRow = document.getElementById('registration-fee-row');
    if (regFee > 0) {
        regRow.classList.remove('hidden');
        if (packageName) {
            document.getElementById('registration-fee-label').textContent = packageName;
        }
        document.getElementById('summary-reg-fee-ghs').textContent = `₵${regFee.toLocaleString()}`;
        document.getElementById('summary-reg-fee-usd').textContent = `$${(regFee / EXCHANGE_RATE).toFixed(2)}`;
    } else {
        regRow.classList.add('hidden');
    }
    
    document.getElementById('summary-total-ghs').textContent = `₵${total.toLocaleString()}`;
    document.getElementById('summary-total-usd').textContent = `$${(total / EXCHANGE_RATE).toFixed(2)}`;
}

function saveOrder() {
    if (currentOrderItems.length === 0) {
        showActionModal('error', 'Empty Order', 'Please add products');
        return;
    }
    
    const customerName = document.getElementById('customer-name').value.trim();
    const destination = document.getElementById('customer-destination').value.trim();
    const orderDate = document.getElementById('order-date').value;
    
    if (!customerName || !destination) {
        showActionModal('error', 'Missing Info', 'Please fill all required fields');
        return;
    }
    
    if (currentOrderActionType === 'new-registration' && !currentOrderPackage) {
        showActionModal('error', 'Package Required', 'Please select a registration package');
        return;
    }
    
    let regFee = 0;
    let packageName = null;
    if (currentOrderActionType === 'new-registration' && currentOrderPackage) {
        const pkg = registrationPackages[currentOrderPackage];
        regFee = 100; // Fixed ₵100 uniform registration fee
        packageName = pkg.name;
    }
    
    const subtotal = currentOrderItems.reduce((sum, item) => sum + item.total, 0);
    const totalAmount = subtotal + regFee;
    
    for (const item of currentOrderItems) {
        const product = inventory.find(p => p.name === item.name);
        if (!product || product.stock < item.qty) {
            showActionModal('error', 'Stock Error', `Insufficient stock for ${item.name}`);
            return;
        }
    }
    
    document.getElementById('processing-overlay').classList.remove('hidden');
    document.getElementById('processing-overlay').classList.add('flex');
    
    setTimeout(() => {
        // Deduct products from inventory
        const deductedItems = [];
        currentOrderItems.forEach(item => {
            const product = inventory.find(p => p.name === item.name);
            if (product) {
                const previousStock = product.stock;
                product.stock -= item.qty;
                deductedItems.push({
                    name: item.name,
                    deducted: item.qty,
                    previousStock: previousStock,
                    newStock: product.stock
                });
                console.log(`✅ ${item.name}: ${item.qty} units deducted (${previousStock} → ${product.stock})`);
                
                if (product.stock === 0 && currentRole === 'limited') {
                    afogaRestockAccess[product.name] = true;
                }
            }
        });
        
        localStorage.setItem('emdInventory', JSON.stringify(inventory));
        console.log('💾 Inventory saved to localStorage');
        
        saveUserData();
        
        const now = new Date();
        const newOrder = {
            id: 'EMD-' + Date.now().toString().slice(-6),
            date: orderDate,
            timestamp: now.toISOString(),
            customer: customerName,
            destination: destination,
            items: [...currentOrderItems],
            actionType: currentOrderActionType,
            registrationPackage: currentOrderPackage,
            registrationPackageName: packageName,
            registrationFee: regFee,
            subtotal: subtotal,
            total: totalAmount,
            createdBy: currentUser,
            deductedItems: deductedItems
        };
        
        allOrders.unshift(newOrder);
        localStorage.setItem('emdOrders', JSON.stringify(allOrders));
        console.log(`📋 Order ${newOrder.id} saved to localStorage`);
        
        logActivity('Order Created', 
            `Order ${newOrder.id}: ${currentOrderItems.length} product(s) ordered by ${customerName}. ` +
            `Total: ₵${totalAmount} | Deducted: ${deductedItems.map(d => `${d.name}(${d.deducted})`).join(', ')}`
        );
        
        currentOrderItems = [];
        currentOrderActionType = null;
        currentOrderPackage = null;
        renderOrderItems();
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-destination').value = '';
        document.getElementById('action-type').value = '';
        document.getElementById('registration-package').value = '';
        document.getElementById('registration-package-info').classList.add('hidden');
        setDefaultDate();
        initProductSelect();
        
        document.getElementById('processing-overlay').classList.add('hidden');
        document.getElementById('processing-overlay').classList.remove('flex');
        
        // Show detailed success message
        showActionModal('success', '✅ Order Saved Successfully!', 
            `Order ID: ${newOrder.id}\n\n` +
            `Customer: ${customerName}\n` +
            `Total Amount: ₵${totalAmount.toLocaleString()} ($${(totalAmount / EXCHANGE_RATE).toFixed(2)})\n` +
            `Products: ${currentOrderActionType === 'new-registration' ? `${currentOrderItems.length} items + Registration` : currentOrderItems.length + ' item(s)'}\n\n` +
            `Thank you for your order!`
        );
        
        showToast(`✅ Order ${newOrder.id} saved successfully!`, 'success', 4000);
        
        setTimeout(() => {
            closeModal('action-modal');
            switchView('dashboard');
        }, 2000);
    }, 1500);
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================
function updateDashboardStats() {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
    const totalProductsSold = allOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + i.qty, 0), 0);
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalProductTypes = inventory.length;
    const totalQuantity = inventory.reduce((sum, p) => sum + p.stock, 0);
    
    animateValue("dash-total-revenue", 0, totalRevenue, 1500, true);
    document.getElementById('dash-total-revenue-usd').textContent = `$${(totalRevenue / EXCHANGE_RATE).toFixed(2)}`;
    animateValue("dash-total-orders", 0, totalOrders, 1500);
    animateValue("dash-products-sold", 0, totalProductsSold, 1500);
    animateValue("dash-avg-order", 0, Math.floor(avgOrder), 1500, true);
    document.getElementById('dash-avg-order-usd').textContent = `$${(avgOrder / EXCHANGE_RATE).toFixed(2)}`;
    animateValue("dash-total-products", 0, totalProductTypes, 1500);
    animateValue("dash-total-quantity", 0, totalQuantity, 1500);
    
    const tbody = document.getElementById('recent-orders-body');
    tbody.innerHTML = '';
    
    if (totalOrders === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No recent orders</td></tr>';
    } else {
        allOrders.slice(0, 5).forEach(order => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-50 hover:bg-slate-50';
            const dateTime = order.timestamp ? new Date(order.timestamp).toLocaleString() : order.date;
            tr.innerHTML = `
                <td class="py-3 pl-4 font-bold text-brand-600">${order.id}</td>
                <td class="py-3">${order.customer}</td>
                <td class="py-3 text-slate-500">${dateTime}</td>
                <td class="py-3 text-slate-500 capitalize">${order.createdBy || 'Unknown'}</td>
                <td class="py-3 text-right pr-4 font-bold">₵${order.total.toLocaleString()}</td>
                <td class="py-3 text-center"><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Completed</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    renderCharts();
}

function renderCharts() {
    const revenueCtx = document.getElementById('revenue-chart').getContext('2d');
    const productCtx = document.getElementById('product-chart').getContext('2d');
    
    if (revenueChartInstance) revenueChartInstance.destroy();
    if (productChartInstance) productChartInstance.destroy();
    
    const last7Days = [];
    const revenueData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
        const dayRevenue = allOrders
            .filter(o => o.date === dateStr)
            .reduce((sum, o) => sum + o.total, 0);
        revenueData.push(dayRevenue);
    }
    
    revenueChartInstance = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Revenue (₵)',
                data: revenueData,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    const productSales = {};
    allOrders.forEach(order => {
        order.items.forEach(item => {
            productSales[item.name] = (productSales[item.name] || 0) + item.qty;
        });
    });
    
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    productChartInstance = new Chart(productCtx, {
        type: 'doughnut',
        data: {
            labels: topProducts.map(p => p[0]),
            datasets: [{
                data: topProducts.map(p => p[1]),
                backgroundColor: ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'right' } }
        }
    });
}

// ============================================
// HISTORY FUNCTIONS
// ============================================
function renderHistory() {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';
    
    const fromDate = document.getElementById('filter-date-from').value;
    const toDate = document.getElementById('filter-date-to').value;
    
    const filteredOrders = allOrders.filter(order => {
        if (!fromDate && !toDate) return true;
        if (fromDate && order.date < fromDate) return false;
        if (toDate && order.date > toDate) return false;
        return true;
    });
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">No orders found</td></tr>';
        return;
    }
    
    filteredOrders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50';
        const dateTime = order.timestamp ? new Date(order.timestamp).toLocaleString() : order.date;
        const usd = (order.total / EXCHANGE_RATE).toFixed(2);
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-brand-600">${order.id}</td>
            <td class="py-3 px-4 text-slate-500">${dateTime}</td>
            <td class="py-3 px-4 font-medium">${order.customer}</td>
            <td class="py-3 px-4 text-slate-500">${order.destination}</td>
            <td class="py-3 px-4 text-slate-500 capitalize">${order.createdBy || 'Unknown'}</td>
            <td class="py-3 px-4 text-right">
                <div class="font-bold">₵${order.total.toLocaleString()}</div>
                <div class="text-xs text-slate-400">$${usd}</div>
            </td>
            <td class="py-3 px-4 text-center">
                <button onclick="viewOrderDetails('${order.id}')" class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white transition" aria-label="View order details">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function applyDateFilter() {
    renderHistory();
}

function clearDateFilter() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    renderHistory();
}

// ============================================
// TRACK ORDERS & INVENTORY
// ============================================
function renderInventory() {
    const tbody = document.getElementById('inventory-body');
    tbody.innerHTML = '';
    
    inventory.forEach((product, index) => {
        const isDisabled = disabledProducts.includes(product.name);
        const tr = document.createElement('tr');
        tr.className = `border-b border-slate-100 hover:bg-slate-50 ${isDisabled ? 'product-disabled' : ''}`;
        const usd = (product.price / EXCHANGE_RATE).toFixed(2);
        
        let statusClass = 'bg-green-100 text-green-700';
        let statusText = 'In Stock';
        if (product.stock === 0) {
            statusClass = 'bg-red-100 text-red-700';
            statusText = 'Out of Stock';
        } else if (product.stock <= LOW_STOCK_THRESHOLD) {
            statusClass = 'bg-orange-100 text-orange-700';
            statusText = 'Low Stock';
        }
        
        if (isDisabled) {
            statusClass = 'bg-slate-200 text-slate-600';
            statusText = 'Disabled';
        }
        
        const canRestock = currentRole === 'main' || (currentRole === 'limited' && product.stock === 0 && afogaRestockAccess[product.name]);
        
        tr.innerHTML = `
            <td class="py-3 px-4 font-medium">${product.name}</td>
            <td class="py-3 px-4 text-center font-bold">₵${product.price}</td>
            <td class="py-3 px-4 text-center">$${usd}</td>
            <td class="py-3 px-4 text-center font-bold ${product.stock <= LOW_STOCK_THRESHOLD && !isDisabled ? 'text-red-600' : ''}">${product.stock}</td>
            <td class="py-3 px-4 text-center"><span class="${statusClass} px-3 py-1 rounded-full text-xs font-bold">${statusText}</span></td>
            <td class="py-3 px-4 text-center">
                ${canRestock && !isDisabled ? `<button onclick="restockProduct(${index})" class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white" aria-label="Restock"><i class="fa-solid fa-plus"></i></button>` : (isDisabled ? '<span class="text-slate-400 text-xs">Disabled</span>' : '<span class="text-slate-400 text-xs">No Access</span>')}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function restockProduct(index) {
    const product = inventory[index];
    const newStock = prompt(`Enter new stock for ${product.name}:`, product.stock + 50);
    if (newStock !== null && !isNaN(newStock) && parseInt(newStock) >= 0) {
        product.stock = parseInt(newStock);
        localStorage.setItem('emdInventory', JSON.stringify(inventory));
        if (currentRole === 'limited') {
            delete afogaRestockAccess[product.name];
            saveUserData();
        }
        renderInventory();
        initProductSelect();
        logActivity('Inventory Update', `${currentUser} restocked ${product.name} to ${product.stock} units`);
        showToast(`${product.name} stock updated`, 'success');
    }
}

function renderTrackOrders() {
    const tbody = document.getElementById('track-orders-body');
    tbody.innerHTML = '';
    
    allOrders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50';
        const usd = (order.total / EXCHANGE_RATE).toFixed(2);
        const itemsCount = order.items.reduce((sum, i) => sum + i.qty, 0);
        const dateTime = order.timestamp ? new Date(order.timestamp).toLocaleString() : order.date;
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-brand-600">${order.id}</td>
            <td class="py-3 px-4 text-slate-500">${dateTime}</td>
            <td class="py-3 px-4 font-medium">${order.customer}</td>
            <td class="py-3 px-4 text-slate-500 capitalize">${order.createdBy || 'Unknown'}</td>
            <td class="py-3 px-4 text-slate-500">${itemsCount} items</td>
            <td class="py-3 px-4 text-right">
                <div class="font-bold">₵${order.total.toLocaleString()}</div>
                <div class="text-xs text-slate-400">$${usd}</div>
            </td>
            <td class="py-3 px-4 text-center"><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Completed</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================
// CUSTOMER MANAGEMENT
// ============================================
function renderCustomers() {
    const tbody = document.getElementById('customers-body');
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No customers found</td></tr>';
        return;
    }
    
    customers.forEach((customer, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50';
        const dateAdded = customer.dateAdded ? new Date(customer.dateAdded).toLocaleDateString() : 'N/A';
        tr.innerHTML = `
            <td class="py-3 px-4 font-medium">${customer.name}</td>
            <td class="py-3 px-4 text-slate-600">${customer.phone}</td>
            <td class="py-3 px-4 text-slate-500 capitalize">${customer.addedBy || 'Unknown'}</td>
            <td class="py-3 px-4 text-slate-500">${dateAdded}</td>
            <td class="py-3 px-4 text-center"><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Active</span></td>
            <td class="py-3 px-4 text-center">
                ${currentRole === 'main' ? `<button onclick="deleteCustomer(${index})" class="w-7 h-7 rounded bg-red-100 text-red-600 hover:bg-red-500 hover:text-white" aria-label="Delete customer"><i class="fa-solid fa-trash text-xs"></i></button>` : '<span class="text-slate-400 text-xs">No Access</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddCustomerModal() {
    document.getElementById('new-customer-name').value = '';
    document.getElementById('new-customer-phone').value = '';
    openModal('add-customer-modal');
}

function saveNewCustomer() {
    const name = document.getElementById('new-customer-name').value.trim();
    const phone = document.getElementById('new-customer-phone').value.trim();
    
    if (!name) {
        showActionModal('error', 'Error', 'Customer name is required');
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        showActionModal('error', 'Invalid Phone', 'Phone number must be exactly 10 digits');
        return;
    }
    
    customers.push({
        name,
        phone,
        addedBy: currentUser,
        dateAdded: new Date().toISOString()
    });
    localStorage.setItem('emdCustomers', JSON.stringify(customers));
    logActivity('Customer Added', `${currentUser} added customer ${name}`);
    closeModal('add-customer-modal');
    renderCustomers();
    showToast(`${name} has been added successfully`, 'success');
}

function deleteCustomer(index) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    const customer = customers[index];
    customers.splice(index, 1);
    localStorage.setItem('emdCustomers', JSON.stringify(customers));
    logActivity('Customer Deleted', `${currentUser} deleted customer ${customer.name}`);
    renderCustomers();
    showToast('Customer deleted successfully', 'success');
}

function downloadCustomerTemplate() {
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Name', 'Phone Number (10 digits)'],
        ['John Doe', '0244123456'],
        ['Jane Smith', '0501234567']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Customer_Template.xlsx');
}

function uploadCustomers(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            let added = 0;
            let skipped = 0;
            json.forEach(row => {
                if (row['Name'] && /^\d{10}$/.test(String(row['Phone Number (10 digits)'] || row['Phone']))) {
                    customers.push({
                        name: row['Name'],
                        phone: String(row['Phone Number (10 digits)'] || row['Phone']),
                        addedBy: currentUser,
                        dateAdded: new Date().toISOString()
                    });
                    added++;
                } else {
                    skipped++;
                }
            });
            localStorage.setItem('emdCustomers', JSON.stringify(customers));
            logActivity('Bulk Customer Upload', `${currentUser} uploaded ${added} customers`);
            renderCustomers();
            showToast(`${added} customers added, ${skipped} skipped`, 'success');
        } catch (error) {
            showActionModal('error', 'Upload Failed', 'Invalid file format');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// ============================================
// DAILY REPORT
// ============================================
function selectReportRecipient(username) {
    selectedReportRecipient = username;
    document.getElementById('recipient-boison').classList.remove('border-brand-500', 'bg-brand-50');
    document.getElementById(`recipient-${username}`).classList.add('border-brand-500', 'bg-brand-50');
    document.getElementById('report-username').value = username;
}

function updateReportSummary() {
    document.getElementById('report-total-orders').textContent = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('report-total-revenue').textContent = `₵${totalRevenue.toLocaleString()}`;
}

function sendDailyReport() {
    if (!selectedReportRecipient) {
        showActionModal('error', 'Error', 'Please select a recipient');
        return;
    }
    if (currentRole === 'limited' && selectedReportRecipient !== 'boison') {
        showActionModal('error', 'Access Denied', 'Afoga can only send reports to Boison');
        return;
    }
    
    document.getElementById('processing-overlay').classList.remove('hidden');
    document.getElementById('processing-overlay').classList.add('flex');
    
    setTimeout(() => {
        const report = {
            id: 'RPT-' + Date.now().toString().slice(-6),
            sentBy: currentUser,
            sentTo: selectedReportRecipient,
            timestamp: new Date().toISOString(),
            totalOrders: allOrders.length,
            totalRevenue: allOrders.reduce((sum, o) => sum + o.total, 0)
        };
        sentReports.unshift(report);
        localStorage.setItem('emdReports', JSON.stringify(sentReports));
        logActivity('Report Sent', `${currentUser} sent daily report to ${selectedReportRecipient}`);
        document.getElementById('processing-overlay').classList.add('hidden');
        document.getElementById('processing-overlay').classList.remove('flex');
        showToast(`Daily report sent to ${selectedReportRecipient}`, 'success');
    }, 2000);
}

// ============================================
// REPORT TRACKER
// ============================================
function renderReportTracker() {
    const tbody = document.getElementById('report-tracker-body');
    tbody.innerHTML = '';
    
    if (sentReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">No reports sent yet</td></tr>';
        return;
    }
    
    sentReports.forEach(report => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50';
        const dateTime = new Date(report.timestamp).toLocaleString();
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-brand-600">${report.id}</td>
            <td class="py-3 px-4 capitalize">${report.sentBy}</td>
            <td class="py-3 px-4 capitalize">${report.sentTo}</td>
            <td class="py-3 px-4 text-slate-500">${dateTime}</td>
            <td class="py-3 px-4 text-center font-bold">${report.totalOrders}</td>
            <td class="py-3 px-4 text-center font-bold">₵${report.totalRevenue.toLocaleString()}</td>
            <td class="py-3 px-4 text-center"><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Delivered</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================
// ACTIVITY LOG
// ============================================
function renderActivityLog() {
    const container = document.getElementById('activity-log-container');
    container.innerHTML = '';
    
    if (activityLog.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-8">No activity recorded</p>';
        return;
    }
    
    activityLog.slice(0, 50).forEach(entry => {
        const date = new Date(entry.timestamp);
        const div = document.createElement('div');
        div.className = 'relative pl-6 pb-6';
        div.innerHTML = `
            <div class="absolute left-[-21px] top-0 w-3 h-3 rounded-full bg-brand-500 border-2 border-white shadow"></div>
            <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex justify-between items-start mb-2">
                    <p class="font-bold text-slate-800">${entry.action}</p>
                    <span class="text-xs text-slate-400">${date.toLocaleString()}</span>
                </div>
                <p class="text-sm text-slate-600">${entry.details}</p>
                <p class="text-xs text-slate-400 mt-2">By: ${entry.user}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

// ============================================
// USER MANAGEMENT
// ============================================
function renderUserManagement() {
    const avatar = users.afoga.avatar || 'https://ui-avatars.com/api/?name=afoga&background=f59e0b&color=fff&size=128';
    document.getElementById('user-mgmt-afoga-avatar').src = avatar;
    
    const container = document.getElementById('additional-users-container');
    container.innerHTML = '';
    
    Object.keys(users).forEach(username => {
        if (username !== 'boison' && username !== 'afoga') {
            const user = users[username];
            const userAvatar = user.avatar || `https://ui-avatars.com/api/?name=${username}&background=6366f1&color=fff&size=128`;
            const div = document.createElement('div');
            div.className = 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200';
            div.innerHTML = `
                <div class="flex items-center gap-6">
                    <img src="${userAvatar}" alt="${username} Avatar" class="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h4 class="text-lg font-bold text-slate-800">${username.charAt(0).toUpperCase() + username.slice(1)}</h4>
                            <span class="permission-badge limited">Admin</span>
                        </div>
                        <p class="text-sm text-slate-600 mb-4">${user.email}</p>
                        <div class="flex gap-3">
                            <button onclick="resetUserPassword('${username}')" class="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition">
                                <i class="fa-solid fa-key mr-1"></i> Reset Password
                            </button>
                            <button onclick="resetUserAvatar('${username}')" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition">
                                <i class="fa-solid fa-image mr-1"></i> Reset Avatar
                            </button>
                            <button onclick="deleteUser('${username}')" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition">
                                <i class="fa-solid fa-trash mr-1"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        }
    });
}

function openCreateUserModal() {
    document.getElementById('new-user-username').value = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('new-user-email').value = '';
    openModal('create-user-modal');
}

function saveNewUser() {
    const username = document.getElementById('new-user-username').value.trim().toLowerCase();
    const password = document.getElementById('new-user-password').value;
    const email = document.getElementById('new-user-email').value.trim();
    
    if (!username || !password || !email) {
        showActionModal('error', 'Error', 'All fields are required');
        return;
    }
    if (users[username]) {
        showActionModal('error', 'Error', 'Username already exists');
        return;
    }
    
    users[username] = {
        username,
        password,
        role: 'limited',
        permissions: ['dashboard', 'new-order', 'track-orders', 'history', 'customers', 'daily-report', 'activity-log'],
        avatar: null,
        email,
        passwordChanged: false
    };
    saveUserData();
    logActivity('User Created', `${currentUser} created new user ${username}`);
    closeModal('create-user-modal');
    renderUserManagement();
    showToast(`${username} has been created successfully`, 'success');
}

function resetUserPassword(username) {
    if (!confirm(`Reset ${username} password to default (user123)?`)) return;
    users[username].password = 'user123';
    users[username].passwordChanged = false;
    saveUserData();
    logActivity('Password Reset', `${currentUser} reset ${username}'s password`);
    showToast(`${username} password has been reset to default`, 'success');
}

function resetUserAvatar(username) {
    if (!confirm(`Reset ${username} avatar to default?`)) return;
    users[username].avatar = null;
    saveUserData();
    logActivity('Avatar Reset', `${currentUser} reset ${username}'s avatar`);
    renderUserManagement();
    showToast(`${username} avatar has been reset`, 'success');
}

function deleteUser(username) {
    if (!confirm(`Delete user ${username}? This cannot be undone.`)) return;
    delete users[username];
    saveUserData();
    logActivity('User Deleted', `${currentUser} deleted user ${username}`);
    renderUserManagement();
    showToast(`${username} has been deleted`, 'success');
}

function resetAfogaPassword() {
    if (!confirm('Reset Afoga password to default (user123)?')) return;
    users.afoga.password = 'user123';
    users.afoga.passwordChanged = false;
    saveUserData();
    logActivity('Password Reset', `${currentUser} reset Afoga's password`);
    showToast('Afoga password has been reset to default', 'success');
}

function resetAfogaAvatar() {
    if (!confirm('Reset Afoga avatar to default?')) return;
    users.afoga.avatar = null;
    saveUserData();
    logActivity('Avatar Reset', `${currentUser} reset Afoga's avatar`);
    renderUserManagement();
    showToast('Afoga avatar has been reset', 'success');
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================
function renderProductManagement() {
    const tbody = document.getElementById('product-management-body');
    tbody.innerHTML = '';
    
    // Update stats cards
    const totalProducts = inventory.length;
    const totalQuantity = inventory.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = inventory.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length;
    const avgPrice = totalProducts > 0 ? Math.round(inventory.reduce((sum, p) => sum + p.price, 0) / totalProducts) : 0;
    
    document.getElementById('pm-total-products').textContent = totalProducts;
    document.getElementById('pm-total-quantity').textContent = totalQuantity;
    document.getElementById('pm-low-stock').textContent = lowStock;
    document.getElementById('pm-avg-price').textContent = `₵${avgPrice.toLocaleString()}`;
    
    inventory.forEach((product, index) => {
        const isDisabled = disabledProducts.includes(product.name);
        
        // Apply price filter
        if (priceFilterMin !== null && product.price < priceFilterMin) return;
        if (priceFilterMax !== null && product.price > priceFilterMax) return;
        
        const tr = document.createElement('tr');
        tr.className = `border-b border-slate-100 hover:bg-slate-50 ${isDisabled ? 'product-disabled' : ''}`;
        const usd = (product.price / EXCHANGE_RATE).toFixed(2);
        tr.innerHTML = `
            <td class="py-3 px-4 font-medium">${product.name}</td>
            <td class="py-3 px-4 text-center font-bold">₵${product.price}</td>
            <td class="py-3 px-4 text-center">$${usd}</td>
            <td class="py-3 px-4 text-center font-bold">${product.stock}</td>
            <td class="py-3 px-4 text-center"><span class="${isDisabled ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'} px-3 py-1 rounded-full text-xs font-bold">${isDisabled ? 'Disabled' : 'Active'}</span></td>
            <td class="py-3 px-4 text-center">
                <button onclick="toggleProductDisable(${index})" class="w-8 h-8 rounded-lg ${isDisabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} hover:opacity-80" aria-label="${isDisabled ? 'Enable' : 'Disable'} product">
                    <i class="fa-solid ${isDisabled ? 'fa-check' : 'fa-ban'}"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function applyPriceFilter() {
    const minInput = document.getElementById('price-filter-min').value;
    const maxInput = document.getElementById('price-filter-max').value;
    
    priceFilterMin = minInput ? parseInt(minInput) : null;
    priceFilterMax = maxInput ? parseInt(maxInput) : null;
    
    renderProductManagement();
    showToast('Filter applied', 'success');
}

function clearPriceFilter() {
    document.getElementById('price-filter-min').value = '';
    document.getElementById('price-filter-max').value = '';
    priceFilterMin = null;
    priceFilterMax = null;
    renderProductManagement();
}

function openAddProductModal() {
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-product-price').value = '';
    document.getElementById('new-product-stock').value = '50';
    openModal('add-product-modal');
}

function saveNewProduct() {
    const name = document.getElementById('new-product-name').value.trim();
    const price = parseInt(document.getElementById('new-product-price').value);
    const stock = parseInt(document.getElementById('new-product-stock').value);
    
    if (!name || !price || !stock) {
        showActionModal('error', 'Error', 'All fields are required');
        return;
    }
    
    inventory.push({ name, price, stock });
    localStorage.setItem('emdInventory', JSON.stringify(inventory));
    logActivity('Product Added', `${currentUser} added new product ${name}`);
    closeModal('add-product-modal');
    renderInventory();
    renderProductManagement();
    initProductSelect();
    showToast(`${name} has been added successfully`, 'success');
}

function toggleProductDisable(index) {
    const product = inventory[index];
    const isDisabled = disabledProducts.includes(product.name);
    if (isDisabled) {
        disabledProducts = disabledProducts.filter(p => p !== product.name);
        logActivity('Product Enabled', `${currentUser} enabled product ${product.name}`);
    } else {
        disabledProducts.push(product.name);
        logActivity('Product Disabled', `${currentUser} disabled product ${product.name}`);
    }
    localStorage.setItem('emdDisabledProducts', JSON.stringify(disabledProducts));
    renderProductManagement();
    renderInventory();
    initProductSelect();
    showToast(`${product.name} ${isDisabled ? 'enabled' : 'disabled'} successfully`, 'success');
}

// ============================================
// EDIT ORDER FUNCTIONS
// ============================================
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    currentViewOrder = order;
    document.getElementById('modal-order-id').textContent = order.id;
    document.getElementById('modal-order-datetime').textContent = order.timestamp ? new Date(order.timestamp).toLocaleString() : order.date;
    document.getElementById('modal-order-customer').textContent = order.customer;
    document.getElementById('modal-order-destination').textContent = order.destination;
    document.getElementById('modal-order-createdby').textContent = order.createdBy ? order.createdBy.charAt(0).toUpperCase() + order.createdBy.slice(1) : 'Unknown';
    document.getElementById('modal-order-total-ghs').textContent = `₵${order.total.toLocaleString()}`;
    document.getElementById('modal-order-total-usd').textContent = `$${(order.total / EXCHANGE_RATE).toFixed(2)}`;
    
    const itemsContainer = document.getElementById('modal-order-items');
    itemsContainer.innerHTML = '';
    
    // Add action type info if available
    if (order.actionType) {
        const actionDiv = document.createElement('div');
        actionDiv.className = 'flex justify-between items-center py-2 bg-blue-50 px-2 rounded mb-2';
        const actionLabel = order.actionType === 'new-registration' ? 'New Registration' : 'Repurchase';
        actionDiv.innerHTML = `<span class="text-sm font-medium text-blue-700">Order Type</span><span class="font-bold text-blue-700">${actionLabel}</span>`;
        itemsContainer.appendChild(actionDiv);
    }
    
    // Add registration package info if available
    if (order.registrationPackageName) {
        const pkgDiv = document.createElement('div');
        pkgDiv.className = 'flex justify-between items-center py-2 bg-purple-50 px-2 rounded mb-2';
        pkgDiv.innerHTML = `<span class="text-sm font-medium text-purple-700">Package</span><span class="font-bold text-purple-700">${order.registrationPackageName}</span>`;
        itemsContainer.appendChild(pkgDiv);
    }
    
    order.items.forEach((item, index) => {
        const div = document.createElement('div');
        const canEdit = hasPermission('edit-orders');
        const canEditQty = canEdit && (item.qty <= LOW_STOCK_THRESHOLD || currentRole === 'main');
        div.className = 'flex justify-between items-center py-2 border-b border-slate-50';
        div.innerHTML = `
            <div>
                <p class="font-medium">${item.name}</p>
                <p class="text-xs text-slate-500">Qty: ${item.qty} x ₵${item.price} / $${(item.price/EXCHANGE_RATE).toFixed(2)}</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <div class="font-bold">₵${item.total.toLocaleString()}</div>
                    <div class="text-xs text-slate-400">$${(item.total/EXCHANGE_RATE).toFixed(2)}</div>
                </div>
                ${canEditQty ? `<button onclick="openEditModal('${order.id}', ${index})" class="w-7 h-7 rounded bg-brand-100 text-brand-600 hover:bg-brand-500 hover:text-white" aria-label="Edit quantity"><i class="fa-solid fa-pen text-xs"></i></button>` : ''}
            </div>
        `;
        itemsContainer.appendChild(div);
    });
    
    if (order.registrationFee > 0) {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-2 bg-green-50 px-2 rounded mt-2';
        div.innerHTML = `<span class="text-sm font-medium text-green-700">Registration Fee</span><span class="font-bold text-green-700">₵${order.registrationFee.toLocaleString()} / $${(order.registrationFee/EXCHANGE_RATE).toFixed(2)}</span>`;
        itemsContainer.appendChild(div);
    }
    
    openModal('order-modal');
}

function openEditModal(orderId, itemIndex) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    editingOrderItem = { orderId, itemIndex };
    const item = order.items[itemIndex];
    document.getElementById('edit-product-name').value = item.name;
    document.getElementById('edit-quantity').value = item.qty;
    openModal('edit-order-modal');
}

function saveEditedQuantity() {
    if (!editingOrderItem) return;
    
    const newQty = parseInt(document.getElementById('edit-quantity').value);
    if (!newQty || newQty < 1) {
        showActionModal('error', 'Error', 'Invalid quantity');
        return;
    }
    
    const order = allOrders.find(o => o.id === editingOrderItem.orderId);
    const item = order.items[editingOrderItem.itemIndex];
    const product = inventory.find(p => p.name === item.name);
    
    if (newQty > item.qty) {
        const diff = newQty - item.qty;
        if (product.stock < diff) {
            showActionModal('error', 'Insufficient Stock', `Only ${product.stock} units available`);
            return;
        }
        product.stock -= diff;
    } else if (newQty < item.qty) {
        const diff = item.qty - newQty;
        product.stock += diff;
    }
    
    const oldTotal = item.total;
    item.qty = newQty;
    item.total = newQty * item.price;
    order.total = order.total - oldTotal + item.total;
    
    localStorage.setItem('emdOrders', JSON.stringify(allOrders));
    localStorage.setItem('emdInventory', JSON.stringify(inventory));
    logActivity('Order Edited', `${currentUser} edited quantity for ${item.name} in order ${order.id}`);
    
    closeModal('edit-order-modal');
    viewOrderDetails(editingOrderItem.orderId);
    renderHistory();
    renderInventory();
    initProductSelect();
    showToast('Order quantity updated successfully', 'success');
}

// ============================================
// DOWNLOAD PDF
// ============================================
function downloadOrderPDF() {
    if (!currentViewOrder) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const order = currentViewOrder;
    
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('EMD INVENTORY', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Order Receipt', 105, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Order ID: ${order.id}`, 14, 50);
    doc.text(`Date: ${order.timestamp ? new Date(order.timestamp).toLocaleString() : order.date}`, 14, 56);
    doc.text(`Customer: ${order.customer}`, 14, 62);
    doc.text(`Destination: ${order.destination}`, 14, 68);
    doc.text(`Created By: ${order.createdBy || 'Unknown'}`, 14, 74);
    
    let yPosition = 80;
    
    // Add order type info
    if (order.actionType) {
        const actionLabel = order.actionType === 'new-registration' ? 'New Registration' : 'Repurchase';
        doc.setFont(undefined, 'bold');
        doc.text(`Order Type: ${actionLabel}`, 14, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
    }
    
    // Add package info if applicable
    if (order.registrationPackageName) {
        doc.setFont(undefined, 'bold');
        doc.text(`Package: ${order.registrationPackageName}`, 14, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
    }
    
    yPosition += 4;
    
    const tableData = order.items.map(item => [
        item.name,
        item.qty.toString(),
        `₵${item.price.toLocaleString()} / $${(item.price/EXCHANGE_RATE).toFixed(2)}`,
        `₵${item.total.toLocaleString()} / $${(item.total/EXCHANGE_RATE).toFixed(2)}`
    ]);
    
    doc.autoTable({
        startY: yPosition,
        head: [['Product', 'Qty', 'Unit Price (GHS/USD)', 'Total (GHS/USD)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] },
    });
    
    let finalY = doc.lastAutoTable.finalY + 10;
    if (order.registrationFee > 0) {
        // Add package breakdown if applicable
        if (order.registrationPackage) {
            const breakdown = calculatePackageBreakdown(order.registrationPackage);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(240, 249, 251);
            doc.rect(14, finalY - 2, 182, 26, 'F');
            
            doc.setFontSize(9);
            doc.text('📦 Product Claims:', 18, finalY + 3);
            doc.text(`₵${breakdown.productsGHS.toLocaleString()} / $${breakdown.productsUSD.toFixed(2)}`, 160, finalY + 3, { align: 'right' });
            
            doc.text('🎖️ Registration Charge:', 18, finalY + 10);
            doc.text(`₵${breakdown.registrationGHS.toLocaleString()} / $${breakdown.registrationUSD.toFixed(2)}`, 160, finalY + 10, { align: 'right' });
            
            finalY += 30;
        } else {
            doc.setFont(undefined, 'bold');
            doc.text('Registration Fee:', 14, finalY);
            doc.text(`₵${order.registrationFee.toLocaleString()} / $${(order.registrationFee/EXCHANGE_RATE).toFixed(2)}`, 150, finalY, { align: 'right' });
            finalY += 10;
            doc.setFont(undefined, 'normal');
        }
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Grand Total:', 14, finalY);
    doc.text(`₵${order.total.toLocaleString()} / $${(order.total/EXCHANGE_RATE).toFixed(2)}`, 150, finalY, { align: 'right' });
    
    doc.save(`Order_${order.id}.pdf`);
}

// ============================================
// DOWNLOAD EXCEL
// ============================================
function downloadOrderExcel() {
    if (!currentViewOrder) return;
    
    const order = currentViewOrder;
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Order Details'],
        ['Order ID', order.id],
        ['Date', order.timestamp ? new Date(order.timestamp).toLocaleString() : order.date],
        ['Customer', order.customer],
        ['Destination', order.destination],
        ['Created By', order.createdBy || 'Unknown'],
    ];
    
    // Add order type
    if (order.actionType) {
        const actionLabel = order.actionType === 'new-registration' ? 'New Registration' : 'Repurchase';
        wsData.push(['Order Type', actionLabel]);
    }
    
    // Add package info
    if (order.registrationPackageName) {
        wsData.push(['Package', order.registrationPackageName]);
    }
    
    wsData.push([]);
    wsData.push(['Items']);
    wsData.push(['Product Name', 'Quantity', 'Unit Price (GHS)', 'Unit Price (USD)', 'Total (GHS)', 'Total (USD)']);
    
    order.items.forEach(item => {
        wsData.push([
            item.name,
            item.qty,
            item.price,
            (item.price/EXCHANGE_RATE).toFixed(2),
            item.total,
            (item.total/EXCHANGE_RATE).toFixed(2)
        ]);
    });
    
    if (order.registrationFee > 0) {
        wsData.push([]);
        wsData.push(['Registration Fee', '', '', '', order.registrationFee, (order.registrationFee/EXCHANGE_RATE).toFixed(2)]);
    }
    
    wsData.push([]);
    wsData.push(['GRAND TOTAL', '', '', '', order.total, (order.total/EXCHANGE_RATE).toFixed(2)]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Order Details');
    XLSX.writeFile(wb, `Order_${order.id}.xlsx`);
}

// ============================================
// STOCK ALERTS
// ============================================
function checkLowStock(auto = false) {
    const lowStockProducts = inventory.filter(p => p.stock <= LOW_STOCK_THRESHOLD && !disabledProducts.includes(p.name));
    
    if (lowStockProducts.length > 0) {
        document.getElementById('low-stock-alerts').classList.remove('hidden');
        const listContainer = document.getElementById('low-stock-container');
        listContainer.innerHTML = '';
        
        lowStockProducts.forEach(product => {
            const div = document.createElement('div');
            div.className = 'bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <p class="font-bold text-red-700">${product.name}</p>
                    <p class="text-sm text-red-600">Only ${product.stock} left</p>
                </div>
                ${hasPermission('edit-inventory') ? `<button onclick="restockProductByName('${product.name}')" class="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">Restock</button>` : ''}
            `;
            listContainer.appendChild(div);
        });
        
        if (auto) {
            playAlertSound();
            const modalList = document.getElementById('stock-alert-list');
            modalList.innerHTML = '';
            lowStockProducts.forEach(product => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center bg-red-50 p-3 rounded-lg';
                div.innerHTML = `<span class="font-medium text-red-700">${product.name}</span><span class="font-bold text-red-600">${product.stock} left</span>`;
                modalList.appendChild(div);
            });
            openModal('stock-alert-modal');
        }
    } else {
        document.getElementById('low-stock-alerts').classList.add('hidden');
    }
}

function restockProductByName(name) {
    const index = inventory.findIndex(p => p.name === name);
    if (index !== -1) restockProduct(index);
}

// ============================================
// ACTIVITIES MANAGEMENT
// ============================================
function createActivity(type, location, outcome, activityDate, frequency) {
    if (!type || !location || !outcome || !activityDate || !frequency) {
        showActionModal('error', 'Missing Fields', 'Please fill all activity details.');
        return false;
    }
    
    let frequencyValue = frequency;
    if (frequency === 'other') {
        frequencyValue = document.getElementById('activity-frequency-custom').value.trim();
        if (!frequencyValue) {
            showActionModal('error', 'Missing Frequency', 'Please enter a custom frequency.');
            return false;
        }
    }
    
    const activity = {
        id: `ACT-${Date.now()}`,
        type: type,
        location: location,
        outcome: outcome,
        date: activityDate,
        frequency: frequencyValue,
        createdBy: currentUser.username || 'Unknown',
        createdAt: new Date().toISOString(),
        icon: getActivityIcon(type)
    };
    
    activitiesLog.unshift(activity); // Add to beginning for newest first
    localStorage.setItem('emdActivities', JSON.stringify(activitiesLog));
    console.log('✅ Activity created:', activity.id, '| Frequency:', frequencyValue);
    return true;
}

function getActivityIcon(type) {
    const icons = {
        'Team Building': 'fa-people-group',
        'Training': 'fa-book-open',
        'Meeting': 'fa-handshake',
        'Event': 'fa-champagne-glasses',
        'Workshop': 'fa-wrench',
        'Conference': 'fa-microphone',
        'Other': 'fa-note-sticky'
    };
    return icons[type] || 'fa-circle';
}

function getActivitiesByPeriod(period) {
    const daysToCheck = ACTIVITY_PERIODS[period] || 9999;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToCheck);
    
    return activitiesLog.filter(act => {
        const actDate = new Date(act.createdAt);
        return actDate >= cutoffDate;
    });
}

function deleteActivity(activityId) {
    const index = activitiesLog.findIndex(a => a.id === activityId);
    if (index !== -1) {
        activitiesLog.splice(index, 1);
        localStorage.setItem('emdActivities', JSON.stringify(activitiesLog));
        renderActivitiesList();
        showActionModal('success', 'Activity Deleted', 'Activity removed successfully.');
    }
}

function renderActivitiesList(period = 'all') {
    const activitiesContainer = document.getElementById('activities-list');
    if (!activitiesContainer) return;
    
    const filteredActivities = getActivitiesByPeriod(period);
    
    if (filteredActivities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12">
                <i class="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
                <p class="text-gray-400 text-lg">No activities found for this period</p>
            </div>
        `;
        return;
    }
    
    activitiesContainer.innerHTML = '';
    filteredActivities.forEach(activity => {
        const div = document.createElement('div');
        div.className = 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-all';
        
        const dateObj = new Date(activity.createdAt);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        div.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-blue-900">${activity.type}</h3>
                        <p class="text-xs text-blue-600">${formattedDate} at ${formattedTime}</p>
                    </div>
                </div>
                <button onclick="deleteActivity('${activity.id}')" class="text-red-500 hover:text-red-700 text-lg">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="space-y-2 mb-3">
                <div class="flex items-start gap-2">
                    <i class="fas fa-map-marker-alt text-red-500 mt-1 text-sm"></i>
                    <div>
                        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Location</p>
                        <p class="text-blue-900 font-medium">${activity.location}</p>
                    </div>
                </div>
                <div class="flex items-start gap-2">
                    <i class="fas fa-bullseye text-green-500 mt-1 text-sm"></i>
                    <div>
                        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Outcome</p>
                        <p class="text-blue-900 font-medium">${activity.outcome}</p>
                    </div>
                </div>
                <div class="flex items-start gap-2">
                    <i class="fas fa-repeat text-purple-500 mt-1 text-sm"></i>
                    <div>
                        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Frequency</p>
                        <p class="text-blue-900 font-medium capitalize">${activity.frequency || 'Not set'}</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-600 border-t border-blue-200 pt-2">
                <i class="fas fa-user text-gray-400"></i>
                <span>${activity.createdBy}</span>
            </div>
        `;
        activitiesContainer.appendChild(div);
    });
}

function openActivityModal() {
    const modal = document.getElementById('activity-modal');
    if (!modal) return;
    
    // Reset form
    document.getElementById('activity-type').value = '';
    document.getElementById('activity-location').value = '';
    document.getElementById('activity-outcome').value = '';
    document.getElementById('activity-frequency').value = '';
    document.getElementById('activity-frequency-custom').value = '';
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activity-date').value = today;
    
    // Hide manual frequency field by default
    document.getElementById('manual-frequency-field').classList.add('hidden');
    
    openModal('activity-modal');
}

function toggleActivityFrequencyField() {
    const frequency = document.getElementById('activity-frequency').value;
    const manualField = document.getElementById('manual-frequency-field');
    
    if (frequency === 'other') {
        manualField.classList.remove('hidden');
        document.getElementById('activity-frequency-custom').focus();
    } else {
        manualField.classList.add('hidden');
        document.getElementById('activity-frequency-custom').value = '';
    }
}

function saveActivityFromModal() {
    const type = document.getElementById('activity-type').value;
    const location = document.getElementById('activity-location').value;
    const outcome = document.getElementById('activity-outcome').value;
    const activityDate = document.getElementById('activity-date').value;
    const frequency = document.getElementById('activity-frequency').value;
    
    if (createActivity(type, location, outcome, activityDate, frequency)) {
        closeModal('activity-modal');
        renderActivitiesList();
        showActionModal('success', 'Activity Created', `${type} activity has been saved successfully with ${frequency} frequency.`);
    }
}

function switchActivityPeriod(period) {
    // Update active button styles
    document.querySelectorAll('[data-period-btn]').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-blue-100', 'text-blue-600');
    });
    
    if (event && event.target) {
        event.target.classList.remove('bg-blue-100', 'text-blue-600');
        event.target.classList.add('bg-blue-600', 'text-white');
    }
    
    renderActivitiesList(period);
    updateActivityStats();
}

function updateActivityStats() {
    const totalCount = activitiesLog.length;
    const monthlyCount = getActivitiesByPeriod('monthly').length;
    const weeklyCount = getActivitiesByPeriod('weekly').length;
    
    document.getElementById('total-activities-count').textContent = totalCount;
    document.getElementById('monthly-activities-count').textContent = monthlyCount;
    document.getElementById('weekly-activities-count').textContent = weeklyCount;
}

function startStockAlertChecker() {
    // Check for critical stock (5 units) every 30 minutes and notify with sound
    if (stockAlertInterval) clearInterval(stockAlertInterval);
    
    const checkCriticalStock = () => {
        const criticalProducts = inventory.filter(p => p.stock === 5 && !disabledProducts.includes(p.name));
        
        if (criticalProducts.length > 0) {
            const now = Date.now();
            if (now - lastLowStockNotification >= LOW_STOCK_CHECK_INTERVAL) {
                lastLowStockNotification = now;
                playAlertSound();
                showToast(`⚠️ ${criticalProducts.length} product(s) at critical stock level (5 units)`, 'warning');
                
                // Show modal notification
                const modalList = document.getElementById('stock-alert-list');
                if (modalList) {
                    modalList.innerHTML = '';
                    criticalProducts.forEach(product => {
                        const div = document.createElement('div');
                        div.className = 'flex justify-between items-center bg-red-50 p-3 rounded-lg';
                        div.innerHTML = `<span class="font-medium text-red-700">🚨 ${product.name}</span><span class="font-bold text-red-600">${product.stock} units</span>`;
                        modalList.appendChild(div);
                    });
                    openModal('stock-alert-modal');
                }
            }
        }
    };
    
    stockAlertInterval = setInterval(checkCriticalStock, LOW_STOCK_CHECK_INTERVAL);
    // Run immediately on start
    checkCriticalStock();
}

// ============================================
// BACKUP FUNCTIONS
// ============================================
function exportData() {
    const backupData = {
        orders: allOrders,
        inventory,
        users,
        activityLog,
        customers,
        sentReports,
        disabledProducts,
        afogaRestockAccess,
        exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EMD_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    logActivity('Backup Exported', `${currentUser} exported system backup`);
    showToast('Backup downloaded', 'success');
}

function exportAndDelete() {
    if(confirm('WARNING: This will download all data and then DELETE EVERYTHING from the dashboard. Continue?')) {
        exportData();
        setTimeout(() => {
            localStorage.removeItem('emdOrders');
            localStorage.removeItem('emdInventory');
            localStorage.removeItem('emdUsers');
            localStorage.removeItem('emdActivityLog');
            localStorage.removeItem('emdCustomers');
            localStorage.removeItem('emdReports');
            localStorage.removeItem('emdDisabledProducts');
            localStorage.removeItem('emdAfogaRestockAccess');
            allOrders = [];
            inventory = initializeInventory();
            customers = [];
            sentReports = [];
            activityLog = [];
            disabledProducts = [];
            afogaRestockAccess = {};
            // Reset users to default
            users.boison.password = 'admin123';
            users.boison.passwordChanged = false;
            users.boison.avatar = null;
            users.afoga.password = 'user123';
            users.afoga.passwordChanged = false;
            users.afoga.avatar = null;
            // Remove additional users
            Object.keys(users).forEach(key => {
                if (key !== 'boison' && key !== 'afoga') {
                    delete users[key];
                }
            });
            saveUserData();
            logActivity('Data Cleared', `${currentUser} exported and deleted ALL data`);
            updateDashboardStats();
            renderInventory();
            renderProductManagement();
            renderUserManagement();
            showToast('All data deleted', 'success');
        }, 1000);
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!importedData.orders || !importedData.inventory) throw new Error('Invalid format');
            if(confirm(`Import ${importedData.orders.length} orders? This will REPLACE ALL existing data!`)) {
                allOrders = importedData.orders;
                inventory = importedData.inventory;
                if (importedData.users) {
                    Object.keys(importedData.users).forEach(key => {
                        users[key] = importedData.users[key];
                    });
                }
                if (importedData.activityLog) activityLog = importedData.activityLog;
                if (importedData.customers) customers = importedData.customers;
                if (importedData.sentReports) sentReports = importedData.sentReports;
                if (importedData.disabledProducts) disabledProducts = importedData.disabledProducts;
                if (importedData.afogaRestockAccess) afogaRestockAccess = importedData.afogaRestockAccess;
                localStorage.setItem('emdOrders', JSON.stringify(allOrders));
                localStorage.setItem('emdInventory', JSON.stringify(inventory));
                localStorage.setItem('emdUsers', JSON.stringify(users));
                localStorage.setItem('emdActivityLog', JSON.stringify(activityLog));
                localStorage.setItem('emdCustomers', JSON.stringify(customers));
                localStorage.setItem('emdReports', JSON.stringify(sentReports));
                localStorage.setItem('emdDisabledProducts', JSON.stringify(disabledProducts));
                localStorage.setItem('emdAfogaRestockAccess', JSON.stringify(afogaRestockAccess));
                logActivity('Data Imported', `${currentUser} imported complete system backup`);
                updateDashboardStats();
                renderInventory();
                initProductSelect();
                renderCustomers();
                renderUserManagement();
                renderProductManagement();
                showToast('All data restored successfully', 'success');
            }
        } catch (error) {
            showActionModal('error', 'Import Failed', 'Invalid backup file');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// PROFILE FUNCTIONS
// ============================================
function openProfileModal() {
    const user = users[currentUser];
    document.getElementById('profile-username').textContent = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    document.getElementById('profile-role').textContent = currentRole === 'main' ? 'Main Admin' : 'Admin';
    document.getElementById('profile-role-detail').textContent = currentRole === 'main' ? 'Main Admin' : 'Admin';
    document.getElementById('profile-email').textContent = user.email;
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${currentUser}&background=${currentRole === 'main' ? '0ea5e9' : 'f59e0b'}&color=fff&size=128`;
    document.getElementById('profile-avatar').src = avatar;
    
    const uploadOverlay = document.getElementById('avatar-upload-overlay');
    const uploadElement = document.getElementById('profile-avatar-upload');
    if (currentRole === 'limited') {
        uploadOverlay.style.display = 'none';
        uploadElement.style.cursor = 'default';
    } else {
        uploadOverlay.style.display = 'flex';
        uploadElement.style.cursor = 'pointer';
    }
    openModal('profile-modal');
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        users[currentUser].avatar = e.target.result;
        saveUserData();
        document.getElementById('profile-avatar').src = e.target.result;
        document.getElementById('sidebar-avatar').src = e.target.result;
        logActivity('Avatar Updated', `${currentUser} updated their profile avatar`);
        showToast('Profile picture changed successfully', 'success');
    };
    reader.readAsDataURL(file);
}

function changeProfilePassword() {
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    
    if (currentPassword !== users[currentUser].password) {
        showActionModal('error', 'Wrong Password', 'Current password is incorrect');
        return;
    }
    if (newPassword.length < 6) {
        showActionModal('error', 'Weak Password', 'Password must be at least 6 characters');
        return;
    }
    
    users[currentUser].password = newPassword;
    saveUserData();
    logActivity('Password Changed', `${currentUser} changed their password`);
    document.getElementById('profile-current-password').value = '';
    document.getElementById('profile-new-password').value = '';
    closeModal('profile-modal');
    showToast('Password changed successfully', 'success');
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function showActionModal(type, title, message) {
    const iconContainer = document.getElementById('action-icon-container');
    const titleElement = document.getElementById('action-title');
    const messageElement = document.getElementById('action-message');
    const modal = document.getElementById('action-modal');
    
    // Clear previous classes
    iconContainer.className = '';
    
    if (type === 'success') {
        iconContainer.className = 'w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100 text-emerald-600 text-3xl';
        iconContainer.innerHTML = '<i class="fa-solid fa-check"></i>';
        titleElement.className = 'text-2xl font-bold text-slate-800 mb-2';
        messageElement.className = 'text-slate-600 mb-8 leading-relaxed';
    } else if (type === 'error') {
        iconContainer.className = 'w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-red-100 to-orange-100 text-red-600 text-3xl animate-pulse';
        iconContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        titleElement.className = 'text-2xl font-bold text-red-700 mb-2';
        messageElement.className = 'text-red-600 mb-8 leading-relaxed';
    } else if (type === 'warning') {
        iconContainer.className = 'w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 text-3xl';
        iconContainer.innerHTML = '<i class="fa-solid fa-exclamation"></i>';
        titleElement.className = 'text-2xl font-bold text-amber-700 mb-2';
        messageElement.className = 'text-amber-600 mb-8 leading-relaxed';
    } else if (type === 'info') {
        iconContainer.className = 'w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 text-3xl';
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        titleElement.className = 'text-2xl font-bold text-blue-700 mb-2';
        messageElement.className = 'text-blue-600 mb-8 leading-relaxed';
    }
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    openModal('action-modal');
}

function animateValue(id, start, end, duration, isCurrency = false) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const value = Math.floor(easeProgress * (end - start) + start);
        obj.innerHTML = isCurrency ? "₵" + value.toLocaleString() : value.toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// ============================================
// PASSWORD STRENGTH CHECKER
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function(e) {
            const password = e.target.value;
            const strengthBar = document.getElementById('password-strength-bar');
            const strengthText = document.getElementById('password-strength-text');
            let strength = 'weak';
            let text = 'Weak';
            
            if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
                strength = 'strong';
                text = 'Strong';
            } else if (password.length >= 6) {
                strength = 'medium';
                text = 'Medium';
            }
            
            strengthBar.className = `password-strength ${strength}`;
            strengthText.textContent = `Password strength: ${text}`;
        });
    }
    
    // Initialize on page load
    loadUserData();
});

function switchCalculatorTab(tabName) {
    document.querySelectorAll('.calc-tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`calc-tab-${tabName}`).classList.remove('hidden');
    document.querySelectorAll('.calc-tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'bg-purple-500', 'bg-green-500', 'text-white', 'shadow-md');
        btn.classList.add('bg-slate-200', 'text-slate-600', 'hover:bg-slate-300');
    });
    const activeBtn = document.querySelector(`[data-calc-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-200', 'text-slate-600', 'hover:bg-slate-300');
        activeBtn.classList.add(tabName === 'repurchase' ? 'bg-blue-500' : tabName === 'referral' ? 'bg-purple-500' : 'bg-green-500', 'text-white', 'shadow-md');
    }
}

function calculateRepurchaseBonus() {
    const amount = parseFloat(document.getElementById('repurchase-amount').value) || 0;
    const bonus = amount * 0.20;
    document.getElementById('repurchase-bonus-display').textContent = `$${bonus.toFixed(2)}`;
    document.getElementById('repurchase-amount-display').textContent = `$${amount.toFixed(2)}`;
    console.log(`🛒 Repurchase: $${amount.toFixed(2)} → 20% = $${bonus.toFixed(2)}`);
}

function calculateReferralBonus() {
    const amount = parseFloat(document.getElementById('referral-amount').value) || 0;
    const bonus = amount * 0.25;
    document.getElementById('referral-bonus-display').textContent = `$${bonus.toFixed(2)}`;
    document.getElementById('referral-amount-display').textContent = `$${amount.toFixed(2)}`;
    console.log(`👥 Referral: $${amount.toFixed(2)} → 25% = $${bonus.toFixed(2)}`);
}

function calculateMatchingBonus() {
    const rightAmount = parseFloat(document.getElementById('matching-right').value) || 0;
    const leftAmount = parseFloat(document.getElementById('matching-left').value) || 0;
    if (rightAmount < 20 || leftAmount < 20) {
        document.getElementById('matching-bonus-display').textContent = '$0.00';
        document.getElementById('matching-uniform-display').textContent = '$0.00';
        document.getElementById('matching-right-display').textContent = '$0.00';
        document.getElementById('matching-left-display').textContent = '$0.00';
        return;
    }
    const uniformMatch = Math.min(rightAmount, leftAmount);
    const bonus = uniformMatch * 0.15;
    document.getElementById('matching-right-display').textContent = `$${uniformMatch.toFixed(2)}`;
    document.getElementById('matching-left-display').textContent = `$${uniformMatch.toFixed(2)}`;
    document.getElementById('matching-uniform-display').textContent = `$${uniformMatch.toFixed(2)}`;
    document.getElementById('matching-bonus-display').textContent = `$${bonus.toFixed(2)}`;
    console.log(`⚖️ Match: R=$${rightAmount.toFixed(2)}, L=$${leftAmount.toFixed(2)} → U=$${uniformMatch.toFixed(2)} → 15% = $${bonus.toFixed(2)}`);
}

window.addEventListener('beforeunload', () => {
    if (stockAlertInterval) clearInterval(stockAlertInterval);
    if (idleTimer) clearTimeout(idleTimer);
});
