// scrollTarget lerp scrollOffset*0.12 buttery smooth, passive listeners, mobile perf

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.getElementById('canvas');
let isMobile = window.innerWidth < 768;
const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: !isMobile, 
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = false;

// Lights
let ambientLightIntensity = 0.6;
const ambientLight = new THREE.AmbientLight(0x404040, ambientLightIntensity);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xe6d160, 1.2);
dirLight.position.set(1.2, 1.5, 1);
scene.add(dirLight);

// Scroll State
let scrollOffset = 0;
let scrollTarget = 0;
let maxScrollOffset = 0;
const GAP = isMobile ? 2.5 : 2.2;
// Unlimited tasks - no MAX_VISIBLE limit
const LERP_SPEED = 0.12; // Heavy premium Apple feel
let touchStartY = 0;
let touchStartOffset = 0;

// Tasks/State
const tasks = [];
const statusMessages = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const STORAGE_KEY = 'resswitchersTasks';
let animationTime = 0;
let cameraPosCache = new THREE.Vector3();

// Storage
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.map(t => t.userData.text)));
}

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        saved.forEach(addTask3D);
        updateMaxScroll();
    } catch {}
}

function updateMaxScroll() {
    maxScrollOffset = (tasks.length - 1) * GAP;
    scrollTarget = Math.min(0, Math.max(scrollTarget, -maxScrollOffset));
}

// Wheel smooth
window.addEventListener('wheel', e => {
    e.preventDefault();
    scrollTarget -= e.deltaY * 0.002;
    scrollTarget = Math.min(0, Math.max(scrollTarget, -maxScrollOffset));
}, {passive: false});

// Touch natural drag
let isTouchScrolling = false;
window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
    touchStartOffset = scrollTarget;
    isTouchScrolling = true;
}, {passive: true});

window.addEventListener('touchmove', e => {
    if (!isTouchScrolling) return;
    e.preventDefault();
    const deltaY = (touchStartY - e.touches[0].clientY) * 0.6;
    scrollTarget = touchStartOffset - deltaY * 0.002;
    scrollTarget = Math.min(0, Math.max(scrollTarget, -maxScrollOffset));
}, {passive: false});

window.addEventListener('touchend', () => {
    isTouchScrolling = false;
});

// Theme toggle & Magic Notebook
// Function to apply visibility
function applyGenderThemeVisibility(gender) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    if (gender === 'girl') {
        themeToggle.style.setProperty('display', 'none', 'important');
    } else {
        themeToggle.style.setProperty('display', 'flex', 'important');
    }
}

// Gender Selection Logic - Run first
function initGenderSelection() {
    const genderModal = document.getElementById('genderModal');
    const themeToggle = document.getElementById('themeToggle');
    const userGender = localStorage.getItem('userGender');

    if (!userGender) {
        // First visit - show modal
        document.body.style.overflow = 'hidden';
        genderModal.style.display = 'flex';
        setTimeout(() => genderModal.classList.add('show'), 10);

        const boyBtn = document.getElementById('boyBtn');
        const girlBtn = document.getElementById('girlBtn');

        boyBtn.addEventListener('click', () => {
            localStorage.setItem('userGender', 'boy');
            applyGenderThemeVisibility('boy');
            fadeOutModal();
            document.body.classList.remove('girly-mode');
            // Restore lights
            ambientLightIntensity = document.body.classList.contains('light-mode') ? 1.0 : 0.6;
            ambientLight.intensity = ambientLightIntensity;
            dirLight.color.setHex(0xe6d160);
            dirLight.intensity = document.body.classList.contains('light-mode') ? 1.8 : 1.2;
            document.body.style.overflow = 'hidden';
        });

        girlBtn.addEventListener('click', () => {
            localStorage.setItem('userGender', 'girl');
            applyGenderThemeVisibility('girl');
            fadeOutModal();
            document.body.classList.add('girly-mode');
            document.body.style.overflow = 'hidden';
        });
    } else {
        // Reload - apply saved choice
        applyGenderThemeVisibility(userGender);
        if (userGender === 'girl') {
            document.body.classList.add('girly-mode');
        }
    }

    function fadeOutModal() {
        genderModal.classList.remove('show');
        setTimeout(() => {
            genderModal.style.display = 'none';
            document.body.style.overflow = 'hidden';
        }, 400);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Gender selection first
    initGenderSelection();
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            // Update 3D lighting
            ambientLightIntensity = document.body.classList.contains('light-mode') ? 1.0 : 0.6;
            ambientLight.intensity = ambientLightIntensity;
            
            // Update dirLight for theme consistency
            dirLight.intensity = document.body.classList.contains('light-mode') ? 1.8 : 1.2;
        });
    }

    // Scroll Reset Button
    const scrollResetBtn = document.getElementById('scrollResetBtn');
    if (scrollResetBtn) {
        scrollResetBtn.addEventListener('click', () => {
            scrollTarget = 0;
        });
    }

    // Magic Notebook Logic
    const notebookToggle = document.getElementById('notebookToggle');
    const notebookOverlay = document.getElementById('notebookOverlay');
    const closeNotebook = document.getElementById('closeNotebook');
    const magicNotes = document.getElementById('magicNotes');

    if (notebookToggle) {
        notebookToggle.addEventListener('click', () => {
            notebookOverlay.classList.toggle('active');
            document.body.style.overflow = notebookOverlay.classList.contains('active') ? 'hidden' : '';
            if (notebookOverlay.classList.contains('active')) {
                magicNotes.focus();
            }
        });
    }

    if (closeNotebook) {
        closeNotebook.addEventListener('click', () => {
            notebookOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (notebookOverlay) {
        notebookOverlay.addEventListener('click', (e) => {
            if (e.target === notebookOverlay) {
                notebookOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Auto-save/load notes
    const NOTES_KEY = 'magicNotesContent';
    if (magicNotes) {
        // Load
        const savedNotes = localStorage.getItem(NOTES_KEY);
        if (savedNotes) {
            magicNotes.value = savedNotes;
        }

        // Auto-save on input
        magicNotes.addEventListener('input', () => {
            localStorage.setItem(NOTES_KEY, magicNotes.value);
        });
    }
});

// Texture luxury
function createTaskTexture(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    canvas.width = 720;
    canvas.height = 190;
    
    // Darker solid background for contrast
    ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Top white gradient for 3D glass effect
    const topGradient = ctx.createLinearGradient(0, 0, 0, 30);
    topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, canvas.width, 30);
    
    // Bright glowing gold text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 52px MedievalSharp';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(text, 360, canvas.height/2, 400);
    
    // 2px solid gold border
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#D4AF37';
    ctx.strokeRect(10, 10, canvas.width-20, canvas.height-20);
    
    // Emerald green checkmark at x=80
    ctx.save();
    ctx.strokeStyle = '#50C878';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#50C878';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.moveTo(60, 92);
    ctx.lineTo(85, 117);
    ctx.lineTo(125, 77);
    ctx.stroke();
    ctx.restore();
    
    // Coral red X at x=640
    ctx.save();
    ctx.strokeStyle = '#FF4B2B';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#FF4B2B';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.moveTo(610, 77);
    ctx.lineTo(640, 107);
    ctx.moveTo(640, 77);
    ctx.lineTo(610, 107);
    ctx.stroke();
    ctx.restore();
    
    return new THREE.CanvasTexture(canvas);
}

function createStatusTexture(text, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 80;
    ctx.fillStyle = color + 'FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px MedievalSharp';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    return new THREE.CanvasTexture(canvas);
}

function showStatus(worldPos, text, color) {
    const material = new THREE.SpriteMaterial({map: createStatusTexture(text, color), transparent: true});
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(worldPos);
    sprite.position.y += 0.5;
    sprite.scale.set(3, 0.8, 1);
    scene.add(sprite);
    statusMessages.push({sprite, time: 0});
}

// Add smooth shift
function addTask3D(text) {
    if (!text.trim()) return;
    
    // No limit - keep all tasks
    
    const task = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 1.85),
        new THREE.MeshPhongMaterial({ 
            map: createTaskTexture(text), 
            side: THREE.DoubleSide, 
            transparent: true,
            opacity: 0.85,
            shininess: 80,
            specular: 0x50C878
        })
    );
    
    task.position.set(0, 2.5, isMobile ? -1.5 : 0);
    
    task.userData = {
        targetY: tasks.length * -GAP,
        originalY: tasks.length * -GAP,
        timeOffset: 0,
        text
    };
    
    task.frustumCulled = false;
    scene.add(task);
    tasks.push(task);
    updateMaxScroll();
    saveTasks();
}

function dissolveTask(task) {
    const start = animationTime;
    const anim = () => {
        const p = (animationTime - start) / 0.6;
        task.material.opacity *= 0.93;
        task.scale.multiplyScalar(0.92);
        if (p < 1) requestAnimationFrame(anim);
        else {
            scene.remove(task);
            const idx = tasks.indexOf(task);
            if (idx > -1) tasks.splice(idx, 1);
            updateMaxScroll();
            saveTasks();
        }
    };
    requestAnimationFrame(anim);
}

function completeTask(task) {
    showStatus(task.position, "NAADII", "#28a745");
    dissolveTask(task);
}

// Raycast scrolled auto-correct
canvas.addEventListener('click', e => {
    if (e.target !== canvas) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(tasks)[0];
    if (hit) {
        const uvX = hit.uv.x;
        if (uvX < 0.3) completeTask(hit.object);
        else if (uvX > 0.7) {
            showStatus(hit.point, "Mablanch👎🏾", "#ff4444");
            dissolveTask(hit.object);
        }
    }
});

window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}, {passive: true});

document.querySelector('.todo-form')?.addEventListener('submit', e => {
    e.preventDefault();
    e.stopPropagation();
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (text) {
        addTask3D(text);
        input.value = '';
    }
});

camera.position.set(0, 0, 8);

function updateCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.fov = aspect < 2/3 ? 92 : 75;
    camera.position.z = aspect < 2/3 ? 10 : 8.5;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    isMobile = window.innerWidth < 768;
}

function init() {
    updateCamera();
    camera.lookAt(0, 0, 0);
    loadTasks();
}

init();
window.addEventListener('resize', updateCamera);

function animate() {
    requestAnimationFrame(animate);
    
    animationTime += 0.016;
    
    // Smooth lerp scrollOffset to target (Apple heavy premium)
    scrollOffset += (scrollTarget - scrollOffset) * LERP_SPEED;
    
    const bobAmp = 0.035;
    const bobSpeed = animationTime * 1.5;
    camera.updateMatrixWorld();
    camera.getWorldPosition(cameraPosCache);
    
    const zPos = isMobile ? -1.5 : 0;
    
    // Scrolled stack
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const baseY = task.userData.targetY - scrollOffset;
        task.userData.originalY += (baseY - task.userData.originalY) * 0.15;
        task.position.y = task.userData.originalY + Math.sin(bobSpeed + task.userData.timeOffset) * bobAmp;
        task.position.x = 0;
        task.position.z = zPos;
        task.lookAt(cameraPosCache);
    }
    
    // Status
    for (let i = statusMessages.length - 1; i >= 0; i--) {
        const msg = statusMessages[i];
        msg.time += 0.016;
        if (msg.time > 1.2) {
            scene.remove(msg.sprite);
            statusMessages.splice(i, 1);
            continue;
        }
        msg.sprite.material.opacity = 1 - msg.time;
        msg.sprite.position.y += 0.015;
    }
    
    renderer.render(scene, camera);
}
animate();

// Multi-Page Magic Notebook
const PAGES_KEY = 'magicNotebookPages';
const CURRENT_PAGE_KEY = 'currentNotebookPageId';
let pages = [];
let currentPageId = null;

// Load pages
function loadNotebookData() {
    try {
        pages = JSON.parse(localStorage.getItem(PAGES_KEY) || '[]');
    } catch {
        pages = [];
    }
    currentPageId = localStorage.getItem(CURRENT_PAGE_KEY);
    if (!pages.find(p => p.id === currentPageId)) {
        currentPageId = null;
    }
}

function saveNotebookData() {
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
    if (currentPageId) {
        localStorage.setItem(CURRENT_PAGE_KEY, currentPageId);
    }
}

function populatePageSelect() {
    const select = document.getElementById('pageSelect');
    if (!select) return;
    select.innerHTML = pages.map(p => `<option value="${p.id}">${p.title || 'Untitled'}</option>`).join('');
}

function loadCurrentPage() {
    const page = pages.find(p => p.id === currentPageId);
    const notes = document.getElementById('magicNotes');
    const titleInput = document.getElementById('pageTitleInput');
    if (page) {
        if (notes) notes.value = page.content;
        if (titleInput) titleInput.value = page.title || '';
        updateSelectOptionText();
    }
}

function updatePageTitle(id, title) {
    const page = pages.find(p => p.id === id);
    if (page) page.title = title;
}

function newPage() {
    const id = 'page_' + Date.now();
    pages.push({
        id,
        title: 'New Page...',
        content: ''
    });
    currentPageId = id;
    saveNotebookData();
    populatePageSelect();
    loadCurrentPage();
    document.getElementById('pageTitleInput').focus();
}

function deleteCurrentPage() {
    const idx = pages.findIndex(p => p.id === currentPageId);
    if (idx === -1) return;
    pages.splice(idx, 1);
    if (pages.length > 0) {
        currentPageId = pages[0].id;
    } else {
        currentPageId = null;
    }
    saveNotebookData();
    populatePageSelect();
    loadCurrentPage();
}

// Magic Notebook Toggle Logic
const notebookToggle = document.getElementById('notebookToggle');
const notebookOverlay = document.getElementById('notebookOverlay');
const closeNotebook = document.getElementById('closeNotebook');
const magicNotes = document.getElementById('magicNotes');
const newPageBtn = document.getElementById('newPageBtn');
const deletePageBtn = document.getElementById('deletePageBtn');
const pageSelect = document.getElementById('pageSelect');

if (notebookToggle && notebookOverlay) {
    notebookToggle.addEventListener('click', () => {
        notebookOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        loadNotebookData();
        populatePageSelect();
        loadCurrentPage();
        magicNotes.focus();
    });
}

if (closeNotebook && notebookOverlay) {
    closeNotebook.addEventListener('click', () => {
        notebookOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === notebookOverlay) {
        notebookOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

if (magicNotes) {
    magicNotes.addEventListener('input', () => {
        if (currentPageId) {
            const page = pages.find(p => p.id === currentPageId);
            if (page) {
                page.content = magicNotes.value;
                saveNotebookData();
            }
        }
    });
}

if (newPageBtn) {
    newPageBtn.addEventListener('click', newPage);
}

if (deletePageBtn) {
    deletePageBtn.addEventListener('click', deleteCurrentPage);
}

const pageTitleInput = document.getElementById('pageTitleInput');

function updateSelectOptionText() {
    if (!currentPageId || !pageSelect) return;
    const page = pages.find(p => p.id === currentPageId);
    if (!page) return;
    const option = pageSelect.querySelector(`option[value="${currentPageId}"]`);
    if (option) option.textContent = page.title || 'Untitled';
}

if (pageTitleInput) {
    pageTitleInput.addEventListener('input', (e) => {
        if (currentPageId) {
            const page = pages.find(p => p.id === currentPageId);
            if (page) {
                page.title = e.target.value;
                saveNotebookData();
                updateSelectOptionText();
            }
        }
    });
}

if (pageSelect) {
    pageSelect.addEventListener('change', (e) => {
        currentPageId = e.target.value;
        loadCurrentPage();
        if (pageTitleInput) pageTitleInput.focus();
        saveNotebookData();
    });
}

