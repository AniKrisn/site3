// Conway's Game of Life — menu-controlled start/stop

const DEFAULT_PERCOLATION = 0.15;
const TRANSITION_DURATION = 0.8; // seconds
const GRID_SIZE = 22;
const UPDATE_INTERVAL = 25; // ms
const GLOW_INTENSITY = '20px';
const ON_COLOR = '#e6f7ff';
const GLOW_COLOR = 'rgba(135, 206, 250, 0.8)';

let conwayCanvas = null;
let conwayCtx = null;
let conwayAnimationRunning = false;
let conwayFadingOut = false;
let conwayFadeOutStart = 0;
const conwayFadeOutDurationMs = 800;
let conwayGlobalAlpha = 1;
// Percolation ramp settings
const PERCOLATION_FADE_DURATION = 2000; // ms to reach DEFAULT_PERCOLATION
let currentPercolation = 0; // starts at 0 and ramps up to DEFAULT_PERCOLATION
let percolationFadeStart = 0;
let isRampingPercolation = false;

let percolationGrid = [];
let transitionGrid = [];
let decayTimerGrid = [];
let randomThresholdGrid = [];

let showScratches = true;
let verticalJitter = 5;
const JITTER_DURATION = 4000;
const JITTER_STEP = (5 - 0.3) / (JITTER_DURATION / 16);
let jitterIntervalId = null;

let lastTime = 0;
let accumulatedTime = 0;

function ensureConwayCanvas() {
    if (conwayCanvas) return;
    conwayCanvas = document.createElement('canvas');
    conwayCanvas.id = 'conway-canvas';
    conwayCanvas.style.position = 'fixed';
    conwayCanvas.style.top = '0';
    conwayCanvas.style.left = '0';
    conwayCanvas.style.width = '100vw';
    conwayCanvas.style.height = '100vh';
    conwayCanvas.style.pointerEvents = 'none';
    conwayCanvas.style.zIndex = '1';
    document.body.appendChild(conwayCanvas);
    conwayCtx = conwayCanvas.getContext('2d');

    const resize = () => resizeConwayCanvas();
    resizeConwayCanvas();
    window.addEventListener('resize', resize);
    // Store the bound listener for later removal
    conwayCanvas._resizeHandler = resize;
}

function resizeConwayCanvas() {
    if (!conwayCanvas) return;
    conwayCanvas.width = window.innerWidth;
    conwayCanvas.height = window.innerHeight;

    const cols = Math.ceil(conwayCanvas.width / GRID_SIZE);
    const rows = Math.ceil(conwayCanvas.height / GRID_SIZE);

    // Stable randomness per cell so ramping density adds cells without flicker
    randomThresholdGrid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Math.random())
    );
    percolationGrid = randomThresholdGrid.map(row => row.map(v => v < currentPercolation));
    // Start transitions at 0 so new cells fade in visually
    transitionGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
    decayTimerGrid = percolationGrid.map(row => row.map(() => null));
}

function getNeighbors(r, c) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],   [1, 1]
    ];
    return directions.map(([dr, dc]) => percolationGrid[r + dr]?.[c + dc] || false);
}

function getNeighborsCount(r, c) {
    return getNeighbors(r, c).filter(Boolean).length;
}

function updatePercolationGrid() {
    const newGrid = percolationGrid.map((row, r) =>
        row.map((cell, c) => {
            const neighbors = getNeighborsCount(r, c);
            return cell ? (neighbors === 2 || neighbors === 3) : neighbors === 3;
        })
    );
    percolationGrid = newGrid;
}

function updateTransitions(deltaTime) {
    const transitionSpeed = 1 / (TRANSITION_DURATION * 1000);
    const decayDuration = 1200;
    for (let r = 0; r < transitionGrid.length; r++) {
        for (let c = 0; c < transitionGrid[r].length; c++) {
            const active = percolationGrid[r][c];
            if (active) {
                transitionGrid[r][c] = Math.min(1, transitionGrid[r][c] + deltaTime * transitionSpeed);
                decayTimerGrid[r][c] = null;
            } else {
                if (decayTimerGrid[r][c] === null) {
                    decayTimerGrid[r][c] = performance.now();
                } else if (performance.now() - decayTimerGrid[r][c] > decayDuration) {
                    transitionGrid[r][c] = Math.max(0, transitionGrid[r][c] - deltaTime * transitionSpeed);
                }
            }
        }
    }
}

function drawScratches() {
    if (!showScratches || !conwayCtx || !conwayCanvas) return;
    conwayCtx.globalAlpha = 0.12 * conwayGlobalAlpha;
    conwayCtx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * conwayCanvas.width;
        const y = Math.random() * conwayCanvas.height;
        const length = Math.random() * 100 + 20;
        const angle = (Math.random() - 0.5) * Math.PI;
        conwayCtx.save();
        conwayCtx.translate(x, y);
        conwayCtx.rotate(angle);
        conwayCtx.fillRect(0, 0, length, 1);
        conwayCtx.restore();
    }
    conwayCtx.globalAlpha = 1;
}

function drawConwayFrame() {
    if (!conwayCtx || !conwayCanvas) return;
    conwayCtx.clearRect(0, 0, conwayCanvas.width, conwayCanvas.height);
    conwayCtx.shadowBlur = 0;
    for (let r = 0; r < percolationGrid.length; r++) {
        for (let c = 0; c < percolationGrid[r].length; c++) {
            const x = c * GRID_SIZE + (Math.random() * 0.1);
            const y = r * GRID_SIZE + (Math.random() * verticalJitter);
            const transitionValue = transitionGrid[r][c] * conwayGlobalAlpha;
            if (transitionValue > 0) {
                conwayCtx.shadowBlur = parseInt(GLOW_INTENSITY) * transitionValue;
                conwayCtx.shadowColor = GLOW_COLOR;
                conwayCtx.fillStyle = ON_COLOR;
                conwayCtx.globalAlpha = transitionValue;
                conwayCtx.fillRect(x, y, GRID_SIZE - 1, GRID_SIZE - 1);
                conwayCtx.globalAlpha = 1;
                conwayCtx.shadowBlur = 0;
            }
        }
    }
    drawScratches();
}

function endConway() {
    conwayAnimationRunning = false;
    document.dispatchEvent(new Event('conway:ended'));
    if (jitterIntervalId) {
        clearInterval(jitterIntervalId);
        jitterIntervalId = null;
    }
    if (conwayCanvas) {
        if (conwayCanvas._resizeHandler) {
            window.removeEventListener('resize', conwayCanvas._resizeHandler);
            delete conwayCanvas._resizeHandler;
        }
        if (conwayCanvas.parentNode) conwayCanvas.parentNode.removeChild(conwayCanvas);
    }
    conwayCanvas = null;
    conwayCtx = null;
}

function animateConway(now) {
    if (!conwayAnimationRunning) return;
    if (!lastTime) lastTime = now;
    const deltaTime = now - lastTime;
    lastTime = now;

    if (conwayFadingOut) {
        const elapsedFade = now - conwayFadeOutStart;
        conwayGlobalAlpha = Math.max(0, 1 - (elapsedFade / conwayFadeOutDurationMs));
        if (conwayGlobalAlpha <= 0) {
            endConway();
            return;
        }
    } else if (isRampingPercolation && currentPercolation < DEFAULT_PERCOLATION) {
        // Ramp up density from 0 to DEFAULT_PERCOLATION without running the life rules
        const elapsed = now - percolationFadeStart;
        const progress = Math.min(1, elapsed / PERCOLATION_FADE_DURATION);
        const newPerc = DEFAULT_PERCOLATION * progress;
        if (newPerc !== currentPercolation) {
            currentPercolation = newPerc;
            // Update active cells using stable thresholds; keep transitionGrid as-is for smooth fade
            for (let r = 0; r < percolationGrid.length; r++) {
                for (let c = 0; c < percolationGrid[r].length; c++) {
                    percolationGrid[r][c] = randomThresholdGrid[r][c] < currentPercolation;
                }
            }
        }
        if (progress >= 1) {
            isRampingPercolation = false;
        }
    }

    updateTransitions(deltaTime);
    accumulatedTime += deltaTime;
    if (!isRampingPercolation && accumulatedTime > UPDATE_INTERVAL) {
        // Only start applying Game of Life rules after ramp completes
        updatePercolationGrid();
        accumulatedTime = 0;
    }
    drawConwayFrame();
    requestAnimationFrame(animateConway);
}

function resetConwayState() {
    lastTime = 0;
    accumulatedTime = 0;
    verticalJitter = 5;
    showScratches = true;
    if (jitterIntervalId) clearInterval(jitterIntervalId);
    jitterIntervalId = setInterval(() => {
        verticalJitter = Math.max(0.3, verticalJitter - JITTER_STEP);
        if (verticalJitter <= 0.3 && jitterIntervalId) {
            clearInterval(jitterIntervalId);
            jitterIntervalId = null;
        }
    }, 16);
    setTimeout(() => { showScratches = false; }, 3000);
}

function startConway() {
    if (conwayAnimationRunning) return;
    ensureConwayCanvas();
    resetConwayState();
    currentPercolation = 0;
    percolationFadeStart = performance.now();
    isRampingPercolation = true;
    for (let r = 0; r < percolationGrid.length; r++) {
        for (let c = 0; c < percolationGrid[r].length; c++) {
            percolationGrid[r][c] = false;
            transitionGrid[r][c] = 0;
            decayTimerGrid[r][c] = null;
        }
    }
    conwayAnimationRunning = true;
    conwayFadingOut = false;
    conwayGlobalAlpha = 1;
    document.dispatchEvent(new Event('conway:started'));
    requestAnimationFrame(animateConway);
}

function stopConway() {
    if (!conwayAnimationRunning) return;
    if (conwayFadingOut) return;
    conwayFadingOut = true;
    conwayFadeOutStart = performance.now();
}

window.startConway = startConway;
window.stopConway = stopConway;