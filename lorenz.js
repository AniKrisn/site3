//old:
//percolationProbability = 0.8, SPEED = 12

//new:
//const SPEED = 75;
//const percolationProbability = 0.43;    // Probability for a cell to be "open"

const DEFAULT_SPEED = 75;
const DEFAULT_PERCOLATION = 0.1;
const HOVER_SPEED = 10;
const HOVER_PERCOLATION = 0.99;
const DEAD_SPEED = 200;
const DEAD_PERCOLATION = 0;
const TOGGLE_ON = 1200;

/*
const DEFAULT_SPEED = 10;
const DEFAULT_PERCOLATION = 0.9;
const HOVER_SPEED = 0;
const HOVER_PERCOLATION = 0.001;
*/



// Perlin Noise
const noise = (() => {
    const permutation = new Array(256).fill(0).map(() => Math.floor(Math.random() * 256));
    const p = new Array(512).fill(0).map((_, i) => permutation[i % 256]);
    
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    return function(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = fade(x);
        const v = fade(y);
        const w = fade(z);
        
        const A = p[X] + Y;
        const AA = p[A] + Z;
        const AB = p[A + 1] + Z;
        const B = p[X + 1] + Y;
        const BA = p[B] + Z;
        const BB = p[B + 1] + Z;
        
        return lerp(w,
            lerp(v,
                lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
                lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
            lerp(v,
                lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
    };
})();

let canvas = null;
let ctx = null;

// --- Bernoulli Percolation parameters --- //
const applyPercolationMask = true;   // Toggle to apply the percolation grid mask to the stars
const showPercolationGrid = false;     // Toggle to also draw the grid overlay
const cellSize = 10;                   // Size (in pixels) of each grid cell
let percolationGrid = [];              // The grid (2D array) that will be generated


// Generate a new Bernoulli percolation grid based on current canvas dimensions
function generatePercolationGrid() {
    const cols = Math.ceil(canvas.width / cellSize);
    const rows = Math.ceil(canvas.height / cellSize);
    percolationGrid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push(Math.random() < percolationProbability);
        }
        percolationGrid.push(row);
    }
}

// Create variables that will be modified
let SPEED = DEFAULT_SPEED;
let percolationProbability = DEFAULT_PERCOLATION;
let targetSpeed = DEFAULT_SPEED;
let targetProbability = DEFAULT_PERCOLATION;

// lerp transition speed
const TRANSITION_RATE = 0.1 * 0.8;

// Add mouse position tracking
let mouseX = 0;
let mouseY = 0;
let isMouseOnCanvas = false;

// Smooth interpolation function
function lerp(start, end, t) {
    return start + (end - start) * t;
}

// Update mouse position when moving
document.addEventListener('mousemove', (e) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isMouseOnCanvas = true;
});

document.addEventListener('mouseleave', () => {
    isMouseOnCanvas = false;
});

// Track if mouse is over a link
let isMouseOnLink = false;

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('mouseenter', () => {
        isMouseOnLink = true;
        targetSpeed = HOVER_SPEED;
        targetProbability = HOVER_PERCOLATION;
    });
    link.addEventListener('mouseleave', () => {
        isMouseOnLink = false;
        targetSpeed = DEFAULT_SPEED;
        targetProbability = DEFAULT_PERCOLATION;
    });
});


// If you wish to see the grid itself, you can draw an overlay:
function drawPercolationGrid() {
    for (let r = 0; r < percolationGrid.length; r++) {
        for (let c = 0; c < percolationGrid[r].length; c++) {
            const x = c * cellSize;
            const y = r * cellSize;
            ctx.strokeStyle = percolationGrid[r][c] ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }
}

let rotateX = 24;
let rotateY = -18;
let rotateZ = -44;
let isDragging = false;
let lastX = 0;
let lastY = 0;

const resizeCanvas = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generatePercolationGrid();
};

// Timer/animation handles
let percolationIntervalId = null;
let animationFrameId = null;
let toggleTimeoutId = null;
let lorenzRunning = false;

// Lorenz parameters
const sigma = 11;
const rho = 38;
const beta = 8/3;
const dt = 0.0155;

const points = [];
const maxPoints = 500;  
let x = 20, y = 4, z = 3;


function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1,3), 16);
    const g1 = parseInt(color1.substring(3,5), 16);
    const b1 = parseInt(color1.substring(5,7), 16);
    
    const r2 = parseInt(color2.substring(1,3), 16);
    const g2 = parseInt(color2.substring(3,5), 16);
    const b2 = parseInt(color2.substring(5,7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `rgb(${r},${g},${b})`;
}

const leftWingColors = {
    primary: '#EB5A3C',
    secondary: '#d5eab2',
};

const rightWingColors = {
    primary: '#243642',
    secondary: '#E2F1E7',
};

function drawStar(ctx, x, y, size) {
    const min = 5; 
    const max = 9; 
    const spikes = Math.floor(Math.random() * (max - min + 1)) + min;
    const outerRadius = size;
    const innerRadius = size / 2;

    ctx.beginPath();
    for(let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes;
        if(i === 0) {
            ctx.moveTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        } else {
            ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
    }
    ctx.closePath();
}

function getColorForPoint(x, z) {
    if (x < 0) {
        const factor = (z / 50 + 1) / 2;
        return interpolateColor(leftWingColors.primary, leftWingColors.secondary, factor);
    } else {
        const factor = (z / 50 + 1) / 2;
        return interpolateColor(rightWingColors.primary, rightWingColors.secondary, factor);
    }
}

function rotatePoint(point) {
    let { x, y, z } = point;
    
    const radX = rotateX * Math.PI / 180;
    const radY = rotateY * Math.PI / 180;
    const radZ = rotateZ * Math.PI / 180;
    
    let y1 = y * Math.cos(radX) - z * Math.sin(radX);
    let z1 = y * Math.sin(radX) + z * Math.cos(radX);
    y = y1;
    z = z1;
    
    let x1 = x * Math.cos(radY) + z * Math.sin(radY);
    let z2 = -x * Math.sin(radY) + z * Math.cos(radY);
    x = x1;
    z = z2;
    
    let x2 = x * Math.cos(radZ) - y * Math.sin(radZ);
    let y2 = x * Math.sin(radZ) + y * Math.cos(radZ);
    x = x2;
    y = y2;
    
    return { x, y, z };
}

function updateLorenz() {
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    
    x += dx;
    y += dy;
    z += dz;
    
    const scale = 6.5;
    const scaledX = x * scale;
    const scaledY = y * scale;
    const scaledZ = z * scale;
    
    points.push({
        x: scaledX,
        y: scaledY,
        z: scaledZ,
        color: getColorForPoint(scaledX, scaledZ)
    });
    
    if (points.length > maxPoints) points.shift();
}

function draw() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;  
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.0013;
    
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    
    for (let i = 0; i < points.length; i++) {
        const point = rotatePoint({ ...points[i] });
        
        // Add glitch effect using Perlin noise
        const glitchX = noise(point.x * 0.1, point.y * 0.1, time) * 0.65;
        const glitchY = noise(point.y * 0.1, point.z * 0.1, time) * 0.85;
        
        const scale = 800 / (800 - point.z);
        const screenX = centerX + (point.x + glitchX) * scale;
        const screenY = centerY + (point.y + glitchY) * scale;
        
        // --- Apply Bernoulli percolation mask --- //
        if (applyPercolationMask) {
            const cellX = Math.floor(screenX / cellSize);
            const cellY = Math.floor(screenY / cellSize);
            // Validate that the computed cell is within our grid bounds:
            if (
                cellY < 0 ||
                cellY >= percolationGrid.length ||
                cellX < 0 ||
                cellX >= percolationGrid[0].length
            ) {
                continue; // Skip drawing if outside
            }
            if (!percolationGrid[cellY][cellX]) {
                continue; // Skip drawing star if the cell is "closed"
            }
        }
        
        ctx.fillStyle = points[i].color;
        ctx.globalAlpha = (i / points.length) * 0.8 + 0.2;
        
        drawStar(ctx, screenX, screenY, 1.6 * scale); 
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Optionally draw the percolation grid overlay.
    if (showPercolationGrid) {
        drawPercolationGrid();
    }
}

// AUTOMATIC TOGGLE 
function getRandomToggleOff() {
    return Math.floor(Math.random() * (800 - 200 + 1)) + 500;
}

function scheduleToggleMouseState() {
    isMouseOnCanvas = !isMouseOnCanvas;
    toggleTimeoutId = setTimeout(
        scheduleToggleMouseState,
        isMouseOnCanvas ? TOGGLE_ON : getRandomToggleOff()
    );
}


function animate() {
    // OLD SETTINGS //  
    /* 
    if (isMouseOnCanvas) {
        const isRightHalf = mouseX > canvas.width / 2;
        targetSpeed = isRightHalf ? HOVER_SPEED : DEFAULT_SPEED;
        targetProbability = isRightHalf ? HOVER_PERCOLATION : DEFAULT_PERCOLATION;
    } else {
        targetSpeed = DEFAULT_SPEED;
        targetProbability = DEFAULT_PERCOLATION;
    }

    if (isMouseOnCanvas && isMouseOnLink) {
        targetSpeed = DEAD_SPEED;
        targetProbability = DEAD_PERCOLATION;
    }
    */

    if (isMouseOnCanvas) {
        targetSpeed = HOVER_SPEED;
        targetProbability = HOVER_PERCOLATION;
    }
    
    if (!isMouseOnCanvas) {
        targetSpeed = DEAD_SPEED;
        targetProbability = DEAD_PERCOLATION;
    }
    
    // Smoothly interpolate current values
    SPEED = lerp(SPEED, targetSpeed, TRANSITION_RATE);
    const newProbability = lerp(percolationProbability, targetProbability, TRANSITION_RATE);
    
    // Only regenerate grid if probability changed significantly
    if (Math.abs(newProbability - percolationProbability) > 0.01) {
        percolationProbability = newProbability;
        generatePercolationGrid();
    }

    updateLorenz();
    draw();
    animationFrameId = requestAnimationFrame(animate);
}

function endLorenz() {
    if (!lorenzRunning) return;
    lorenzRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (percolationIntervalId) {
        clearInterval(percolationIntervalId);
        percolationIntervalId = null;
    }
    if (toggleTimeoutId) {
        clearTimeout(toggleTimeoutId);
        toggleTimeoutId = null;
    }
    window.removeEventListener('resize', resizeCanvas);
    if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
    document.dispatchEvent(new Event('lorenz:ended'));
}

function startLorenz() {
    if (lorenzRunning) return;
    lorenzRunning = true;
    // Create canvas lazily
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    document.body.appendChild(canvas);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    percolationIntervalId = setInterval(generatePercolationGrid, SPEED);
    scheduleToggleMouseState();

    document.dispatchEvent(new Event('lorenz:started'));

    if (window.innerWidth > 760) {
        animate();
    }

    // Auto end after 10s to match menu's fallback duration
    setTimeout(endLorenz, 10000);
}

window.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('lorenz');
    if (trigger) {
        trigger.style.cursor = 'pointer';
        trigger.addEventListener('click', startLorenz);
    }
});
