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
    
    const scale = 18;
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

// --- Lorenz animation wiring ---
let lorenzCanvas = null;
let lorenzCtx = null;
let lorenzAnimationRunning = false;
let lorenzAnimationStartTime = 0;
// Run until explicitly stopped
let lorenzFadingOut = false;
let lorenzFadeOutStart = 0;
const lorenzFadeOutDurationMs = 800;
let lorenzGlobalAlpha = 1;


let rotateX = 24;
let rotateY = -18;
let rotateZ = -44;

function ensureLorenzCanvas() {
    if (lorenzCanvas) return;
    lorenzCanvas = document.createElement('canvas');
    lorenzCanvas.id = 'lorenz-canvas';
    lorenzCanvas.style.position = 'fixed';
    lorenzCanvas.style.top = '0';
    lorenzCanvas.style.left = '0';
    lorenzCanvas.style.width = '100vw';
    lorenzCanvas.style.height = '100vh';
    lorenzCanvas.style.pointerEvents = 'none';
    lorenzCanvas.style.zIndex = '1';
    document.body.appendChild(lorenzCanvas);
    lorenzCtx = lorenzCanvas.getContext('2d');

    const resize = () => {
        lorenzCanvas.width = window.innerWidth;
        lorenzCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
}

function resetLorenzState() {
    // Reset initial state
    x = 20; y = 4; z = 3;
    points.length = 0;
}

function drawLorenzFrame() {
    if (!lorenzCtx || !lorenzCanvas) return;
    const { width, height } = lorenzCanvas;
    lorenzCtx.clearRect(0, 0, width, height);

    const centerX = width / 3.75;
    const centerY = height / 1.8;
    const offsetX = Math.min(180, Math.max(80, width * 0.08)); // shift to the right
    const mirrorX = -1;
    const mirrorY = 1;

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const rotated = rotatePoint({ x: p.x, y: p.y, z: p.z });

        const screenX = centerX + rotated.x * mirrorX + offsetX;
        const screenY = centerY + rotated.y * mirrorY;

        const depth = Math.max(-150, Math.min(150, rotated.z));
        const depthScale = 0.8 + (depth + 150) / 250; // 
        const trailAlpha = i / points.length; // older points are dimmer

        lorenzCtx.save();
        lorenzCtx.globalAlpha = Math.min(1, 0.15 + trailAlpha * 0.85) * lorenzGlobalAlpha;
        lorenzCtx.fillStyle = p.color;
        drawStar(lorenzCtx, screenX, screenY, 1.6 * depthScale);
        lorenzCtx.fill();
        lorenzCtx.restore();
    }
}

function endLorenz() {
    lorenzAnimationRunning = false;
    document.dispatchEvent(new Event('lorenz:ended'));
    if (lorenzCanvas && lorenzCanvas.parentNode) {
        lorenzCanvas.parentNode.removeChild(lorenzCanvas);
    }
    lorenzCanvas = null;
    lorenzCtx = null;
}

function animateLorenz(now) {
    if (!lorenzAnimationRunning) return;
    if (lorenzFadingOut) {
        const elapsedFade = now - lorenzFadeOutStart;
        lorenzGlobalAlpha = Math.max(0, 1 - (elapsedFade / lorenzFadeOutDurationMs));
        if (lorenzGlobalAlpha <= 0) {
            endLorenz();
            return;
        }
    }
    updateLorenz();
    drawLorenzFrame();
    requestAnimationFrame(animateLorenz);
}

function startLorenz() {
    if (lorenzAnimationRunning) return;
    ensureLorenzCanvas();
    resetLorenzState();
    lorenzAnimationRunning = true;
    lorenzAnimationStartTime = performance.now();
    lorenzFadingOut = false;
    lorenzGlobalAlpha = 1;
    document.dispatchEvent(new Event('lorenz:started'));
    requestAnimationFrame(animateLorenz);
}

// Stop handler for external controller (menu)
function stopLorenz() {
    if (!lorenzAnimationRunning) return;
    if (lorenzFadingOut) return;
    lorenzFadingOut = true;
    lorenzFadeOutStart = performance.now();
}

// Expose globally for menu controller
window.startLorenz = startLorenz;
window.stopLorenz = stopLorenz;