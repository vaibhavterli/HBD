// Firebase configuration - provided by user
const firebaseConfig = {
    apiKey: "AIzaSyD6vGsuqMhPOZ4jXd7GDRBRzz2_F3oIxiY",
    authDomain: "abcd-43eb5.firebaseapp.com",
    databaseURL: "https://abcd-43eb5.firebaseio.com",
    projectId: "abcd-43eb5",
    storageBucket: "abcd-43eb5.firebasestorage.app",
    messagingSenderId: "1085158440539",
    appId: "1:1085158440539:web:3f6ca336811403c191c97e"
};

// Firebase state
let firebaseInitialized = false;
let db = null;
let storage = null;

// Pending uploads
let pendingFiles = [];
let fileType = '';

// Initialize the app
function init() {
    // Initialize Firebase with provided config
    initializeFirebase(firebaseConfig);
    
    // Setup event listeners
    setupEventListeners();
    
    // Start confetti animation
    startConfetti();
}

// Initialize Firebase
function initializeFirebase(config) {
    try {
        if (!firebaseInitialized) {
            firebase.initializeApp(config);
            db = firebase.database();
            storage = firebase.storage();
            firebaseInitialized = true;
        }
        
        // Load existing data
        loadPhotos();
        loadVideos();
        loadMessage();
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        alert('Failed to initialize Firebase. Please check your configuration.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Photo upload
    document.getElementById('photo-upload').addEventListener('change', (e) => {
        handleFileSelection(e.target.files, 'photo');
    });
    
    // Video upload
    document.getElementById('video-upload').addEventListener('change', (e) => {
        handleFileSelection(e.target.files, 'video');
    });
    
    // Confirm upload
    document.getElementById('confirm-upload').addEventListener('click', () => {
        uploadFiles();
    });
    
    // Cancel upload
    document.getElementById('cancel-upload').addEventListener('click', () => {
        cancelUpload();
    });
    
    // Save message
    document.getElementById('save-message').addEventListener('click', () => {
        saveMessage();
    });
    
    // Lightbox close
    document.getElementById('lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
            closeLightbox();
        }
    });
}

// Handle file selection
function handleFileSelection(files, type) {
    if (!files || files.length === 0) return;
    
    pendingFiles = Array.from(files);
    fileType = type;
    
    const previewContainer = document.getElementById('preview-items');
    previewContainer.innerHTML = '';
    
    pendingFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            if (type === 'photo') {
                previewItem.innerHTML = `<img src="${e.target.result}" alt="Preview ${index + 1}">`;
            } else {
                previewItem.innerHTML = `<video src="${e.target.result}" controls></video>`;
            }
            
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
    
    document.getElementById('upload-preview').classList.remove('hidden');
}

// Upload files to Firebase
async function uploadFiles() {
    if (!firebaseInitialized || pendingFiles.length === 0) return;
    
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('upload-progress').classList.remove('hidden');
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    try {
        for (let i = 0; i < pendingFiles.length; i++) {
            const file = pendingFiles[i];
            const progress = ((i + 1) / pendingFiles.length) * 100;
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Uploading ${i + 1} of ${pendingFiles.length}...`;
            
            // Convert to base64
            const base64 = await fileToBase64(file);
            
            // Save to Firebase
            const timestamp = Date.now();
            const itemId = `${fileType}_${timestamp}_${i}`;
            
            if (fileType === 'photo') {
                await db.ref(`photos/${itemId}`).set({
                    data: base64,
                    timestamp: timestamp,
                    type: file.type
                });
            } else {
                await db.ref(`videos/${itemId}`).set({
                    data: base64,
                    timestamp: timestamp,
                    type: file.type
                });
            }
        }
        
        // Success
        progressText.textContent = '✓ Upload complete!';
        setTimeout(() => {
            document.getElementById('upload-progress').classList.add('hidden');
            progressFill.style.width = '0%';
        }, 2000);
        
        // Reload gallery
        if (fileType === 'photo') {
            loadPhotos();
        } else {
            loadVideos();
        }
        
        // Clear pending files
        pendingFiles = [];
        document.getElementById('photo-upload').value = '';
        document.getElementById('video-upload').value = '';
        
    } catch (error) {
        console.error('Upload error:', error);
        progressText.textContent = '✗ Upload failed. Please try again.';
        setTimeout(() => {
            document.getElementById('upload-progress').classList.add('hidden');
        }, 3000);
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Cancel upload
function cancelUpload() {
    pendingFiles = [];
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('photo-upload').value = '';
    document.getElementById('video-upload').value = '';
}

// Load photos from Firebase
function loadPhotos() {
    if (!firebaseInitialized) return;
    
    db.ref('photos').on('value', (snapshot) => {
        const photos = snapshot.val();
        const gallery = document.getElementById('photo-gallery');
        
        if (!photos || Object.keys(photos).length === 0) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📷</span>
                    <p>No photos yet. Be the first to upload!</p>
                </div>
            `;
            return;
        }
        
        gallery.innerHTML = '';
        
        Object.keys(photos).forEach(key => {
            const photo = photos[key];
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${photo.data}" alt="Birthday photo">
                <button class="delete-btn" onclick="deletePhoto('${key}')" title="Delete">×</button>
            `;
            
            photoItem.querySelector('img').addEventListener('click', () => {
                openLightbox(photo.data);
            });
            
            gallery.appendChild(photoItem);
        });
    });
}

// Load videos from Firebase
function loadVideos() {
    if (!firebaseInitialized) return;
    
    db.ref('videos').on('value', (snapshot) => {
        const videos = snapshot.val();
        const gallery = document.getElementById('video-gallery');
        
        if (!videos || Object.keys(videos).length === 0) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎥</span>
                    <p>No videos yet. Upload some memories!</p>
                </div>
            `;
            return;
        }
        
        gallery.innerHTML = '';
        
        Object.keys(videos).forEach(key => {
            const video = videos[key];
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.innerHTML = `
                <video src="${video.data}" controls></video>
                <button class="delete-btn" onclick="deleteVideo('${key}')" title="Delete">×</button>
            `;
            
            gallery.appendChild(videoItem);
        });
    });
}

// Delete photo
function deletePhoto(key) {
    if (!firebaseInitialized) return;
    
    if (confirm('Are you sure you want to delete this photo?')) {
        db.ref(`photos/${key}`).remove();
    }
}

// Delete video
function deleteVideo(key) {
    if (!firebaseInitialized) return;
    
    if (confirm('Are you sure you want to delete this video?')) {
        db.ref(`videos/${key}`).remove();
    }
}

// Save message
function saveMessage() {
    if (!firebaseInitialized) return;
    
    const message = document.getElementById('birthday-message').value.trim();
    
    if (!message) {
        alert('Please write a message first!');
        return;
    }
    
    db.ref('message').set({
        text: message,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('birthday-message').value = '';
        loadMessage();
    }).catch((error) => {
        console.error('Error saving message:', error);
        alert('Failed to save message. Please try again.');
    });
}

// Load message
function loadMessage() {
    if (!firebaseInitialized) return;
    
    db.ref('message').on('value', (snapshot) => {
        const message = snapshot.val();
        const savedMessageDiv = document.getElementById('saved-message');
        
        if (message && message.text) {
            savedMessageDiv.innerHTML = `<p>${message.text}</p>`;
            savedMessageDiv.classList.remove('hidden');
        } else {
            savedMessageDiv.classList.add('hidden');
        }
    });
}

// Lightbox functions
function openLightbox(src) {
    document.getElementById('lightbox-image').src = src;
    document.getElementById('lightbox').classList.remove('hidden');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.add('hidden');
    document.getElementById('lightbox-image').src = '';
}

// Confetti animation
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = ['#FF6B9D', '#C44569', '#FFC048', '#00D9FF', '#B4E7CE', '#C9A0DC'];
    
    for (let i = 0; i < 50; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.05,
            tiltAngle: 0
        });
    }
    
    function drawConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((piece, index) => {
            ctx.beginPath();
            ctx.arc(piece.x, piece.y, piece.r, 0, Math.PI * 2);
            ctx.fillStyle = piece.color;
            ctx.fill();
            
            // Update position
            piece.y += piece.d;
            piece.tiltAngle += piece.tiltAngleIncremental;
            piece.x += Math.sin(piece.tiltAngle) * 2;
            
            // Reset if off screen
            if (piece.y > canvas.height) {
                confetti[index] = {
                    x: Math.random() * canvas.width,
                    y: -20,
                    r: piece.r,
                    d: piece.d,
                    color: piece.color,
                    tilt: piece.tilt,
                    tiltAngleIncremental: piece.tiltAngleIncremental,
                    tiltAngle: piece.tiltAngle
                };
            }
        });
        
        requestAnimationFrame(drawConfetti);
    }
    
    drawConfetti();
    
    // Resize canvas on window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}