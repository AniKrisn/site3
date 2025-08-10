const BOID_COLORS = [
    '#16C47F', '#FFD65A', '#FF9D23', '#F93827', '#7C00FE', '#00224D', '#FAEF5D',
    '#39FF14', '#CCFF00', '#DFFF00', '#FFFF66', '#FFF700', '#FF5F1F', '#FF6E00',
    '#FF073A', '#FF3D00', '#FF00A0', '#FF00FF', '#FF1493', '#FE019A', '#9400FF',
    '#BF00FF', '#7DF9FF', '#00FFFF', '#00F5FF', '#00FFC6', '#00FF7F', '#00FFB3',
    '#ADFF2F', '#BFFF00', '#B0FF00', '#FAFF00', '#FFD700', '#FFA500', '#FF6F61',
    '#FF2D00', '#FF2400', '#FF3131', '#FF0033', '#FFA343', '#00FFEF', '#00BFFF',
    '#1F51FF', '#0066FF', '#00FF00', '#00E5FF', '#00E676', '#64FFDA', '#A0FF1F',
    '#FF69FF'
];

// Utilities for muted particle colors derived from boid color
function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

function rgbToString(c) {
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function mixRgb(a, b, t) {
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const tt = clamp01(t);
    return {
        r: Math.round(a.r * (1 - tt) + b.r * tt),
        g: Math.round(a.g * (1 - tt) + b.g * tt),
        b: Math.round(a.b * (1 - tt) + b.b * tt),
    };
}

function adjustBrightness(c, factor) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return {
        r: clamp(c.r * factor),
        g: clamp(c.g * factor),
        b: clamp(c.b * factor),
    };
}

// Particle system for multicolored trails
class Particle {
    constructor(x, y, velX, velY, size, lifeFrames, color, opacity = 1) {
        this.pos = new Vect2(x, y);
        this.vel = new Vect2(velX, velY);
        this.size = size;
        this.life = lifeFrames;
        this.maxLife = lifeFrames;
        this.color = color;
        this.opacity = opacity;
    }
    update() {
        // Lightweight physics
        this.pos = this.pos.add(this.vel);
        this.vel = this.vel.mult(0.3); // slight drag
        this.size = Math.max(0, this.size * 0.985);
        this.life -= 1;
        // Fade based on remaining life
        this.opacity = Math.max(0, this.life / this.maxLife);
        return this.life > 0 && this.size > 0.2 && this.opacity > 0.02;
    }
    draw(ctx) {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// Muted trails, no hue cycling

class Vect2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(other) { return new Vect2(this.x + other.x, this.y + other.y); }
    sub(other) { return new Vect2(this.x - other.x, this.y - other.y); }
    mult(scalar) { return new Vect2(this.x * scalar, this.y * scalar); }
    div(scalar) { return new Vect2(this.x / scalar, this.y / scalar); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() { const len = this.length(); return len > 0 ? this.div(len) : new Vect2(0, 0); }
    limit(max) { const len = this.length(); return len > max ? this.normalize().mult(max) : this; }
    distance(other) { return this.sub(other).length(); }
}

class Boid {
    constructor(x, y, fadeInDelay = 0, fadeOutDelay = 0) {
        this.pos = new Vect2(x, y);
        this.vel = new Vect2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        this.acc = new Vect2(0, 0);
        this.maxSpeed = 2;
        this.maxForce = 0.03;
        this.size = 3;
        this.opacity = 0;
        this.fadeInDelay = fadeInDelay;
        this.fadingIn = false;
        this.fadedIn = false;
        this.fadeInStart = null;
        this.fadeOutDelay = fadeOutDelay;
        this.fadingOut = false;
        this.fadedOut = false;
        this.fadeOutStart = null;
        this.color = BOID_COLORS[Math.floor(Math.random() * BOID_COLORS.length)];
    }
    update() {
        this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
        this.pos = this.pos.add(this.vel);
        this.acc = new Vect2(0, 0);
        if (this.pos.x < 0) this.pos.x = canvas.width;
        if (this.pos.x > canvas.width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = canvas.height;
        if (this.pos.y > canvas.height) this.pos.y = 0;
    }
    applyForce(force) { this.acc = this.acc.add(force); }
    flock(boids) {
        const sep = this.separate(boids).mult(separationWeight);
        const ali = this.align(boids).mult(alignmentWeight);
        const coh = this.cohesion(boids).mult(cohesionWeight);
        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }
    separate(boids) {
        const desiredSeparation = 25;
        let steer = new Vect2(0, 0);
        let count = 0;
        for (let other of boids) {
            const distance = this.pos.distance(other.pos);
            if (distance > 0 && distance < desiredSeparation) {
                let diff = this.pos.sub(other.pos);
                diff = diff.normalize().div(distance);
                steer = steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer = steer.div(count);
            steer = steer.normalize().mult(this.maxSpeed);
            steer = steer.sub(this.vel);
            steer = steer.limit(this.maxForce);
        }
        return steer;
    }
    align(boids) {
        const neighborDist = 50;
        let sum = new Vect2(0, 0);
        let count = 0;
        for (let other of boids) {
            const distance = this.pos.distance(other.pos);
            if (distance > 0 && distance < neighborDist) {
                sum = sum.add(other.vel);
                count++;
            }
        }
        if (count > 0) {
            sum = sum.div(count);
            sum = sum.normalize().mult(this.maxSpeed);
            let steer = sum.sub(this.vel);
            steer = steer.limit(this.maxForce);
            return steer;
        }
        return new Vect2(0, 0);
    }
    cohesion(boids) {
        const neighborDist = 50;
        let sum = new Vect2(0, 0);
        let count = 0;
        for (let other of boids) {
            const distance = this.pos.distance(other.pos);
            if (distance > 0 && distance < neighborDist) {
                sum = sum.add(other.pos);
                count++;
            }
        }
        if (count > 0) {
            sum = sum.div(count);
            return this.seek(sum);
        }
        return new Vect2(0, 0);
    }
    seek(target) {
        let desired = target.sub(this.pos);
        desired = desired.normalize().mult(this.maxSpeed);
        let steer = desired.sub(this.vel);
        steer = steer.limit(this.maxForce);
        return steer;
    }
    fadeIn(now) {
        if (this.fadedIn || this.fadingOut) return;
        if (!this.fadingIn && now >= this.fadeInDelay) {
            this.fadingIn = true;
            this.fadeInStart = now;
        }
        if (this.fadingIn) {
            const elapsed = now - this.fadeInStart;
            this.opacity = Math.min(1, elapsed / 1200);
            if (this.opacity >= 1) {
                this.opacity = 1;
                this.fadedIn = true;
            }
        }
    }
    fadeOut(now, globalFadeOutStartAfterMs, fadeOutDurationMs) {
        if (this.fadedOut) return;
        const startThreshold = globalFadeOutStartAfterMs + this.fadeOutDelay;
        if (!this.fadingOut && now >= startThreshold) {
            this.fadingOut = true;
            this.fadeOutStart = now;
        }
        if (this.fadingOut) {
            const elapsed = now - this.fadeOutStart;
            const remaining = Math.max(0, 1 - (elapsed / fadeOutDurationMs));
            this.opacity = remaining;
            if (this.opacity <= 0) {
                this.opacity = 0;
                this.fadedOut = true;
            }
        }
    }
    draw(ctx) {
        if (this.opacity <= 0) return;
        const angle = Math.atan2(this.vel.y, this.vel.x);
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(angle);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.size * 2, 0);
        ctx.lineTo(-this.size, -this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}

// --- Background Setup ---
const canvas = document.createElement('canvas');
canvas.id = 'boids-bg';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
canvas.style.pointerEvents = 'none'; // allow clicks through
canvas.style.zIndex = '0'; // behind everything
document.body.prepend(canvas);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const ctx = canvas.getContext('2d');
const boids = [];
const particles = [];
const MAX_PARTICLES = 1800;


const separationWeight = 1.0;
const alignmentWeight = 0.4;
const cohesionWeight = 1.0;


const boidCount = 50;
const fadeInStagger = 100;
const fadeOutStagger = 100;
for (let i = 0; i < boidCount; i++) {
    boids.push(new Boid(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        i * fadeInStagger,
        i * fadeOutStagger
    ));
}


let animationStarted = false;
let animationStartTime = null;
let fadeOutGlobalStartAfterMs = Infinity; // only trigger on explicit stop
const fadeOutDurationMs = 1200;

function animate(now) {
    if (!animationStarted) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = now - animationStartTime;
    // Emit particles and update boids
    for (let boid of boids) {
        boid.fadeIn(elapsed);
        boid.fadeOut(elapsed, fadeOutGlobalStartAfterMs, fadeOutDurationMs);
        if (boid.opacity > 0) {
            // Boid movement
            boid.flock(boids);
            boid.update();

            // Particle emission behind the boid
            const velocityMagnitude = boid.vel.length();
            const direction = boid.vel.length() > 0 ? boid.vel.normalize() : new Vect2(1, 0);
            const emissionCount = Math.min(3, 1 + Math.floor(velocityMagnitude * 0.7));
            const spawnBaseX = boid.pos.x - direction.x * boid.size * 2;
            const spawnBaseY = boid.pos.y - direction.y * boid.size * 2;
            for (let i = 0; i < emissionCount; i++) {
                const jitterAngle = (Math.random() - 0.5) * Math.PI * 0.5; // +/- 45 deg
                const jitterSpeed = velocityMagnitude * (0.05 + Math.random() * 0.1);
                const cosA = Math.cos(jitterAngle);
                const sinA = Math.sin(jitterAngle);
                const vx = (-direction.x * cosA + -direction.y * sinA) * jitterSpeed;
                const vy = (-direction.y * cosA + direction.x * sinA) * jitterSpeed;
                const size = 0.8 + Math.random() * 1.0;
                const life = 20 + Math.floor(Math.random() * 18); // 20-38 frames
                // Muted color derived from the boid's base color, lightly desaturated and slightly varied in brightness
                const baseRgb = hexToRgb(boid.color);
                const neutral = { r: 200, g: 200, b: 200 };
                const desaturated = mixRgb(baseRgb, neutral, 0.35);
                const brightness = 0.85 + Math.random() * 0.15;
                const finalRgb = adjustBrightness(desaturated, brightness);
                const color = rgbToString(finalRgb);
                particles.push(new Particle(
                    spawnBaseX + (Math.random() - 0.5) * boid.size,
                    spawnBaseY + (Math.random() - 0.5) * boid.size,
                    vx,
                    vy,
                    size,
                    life,
                    color,
                    boid.opacity * 0.9
                ));
            }
        }
    }

    // Update and draw particles (behind boids)
    if (particles.length > 0) {
        // Update
        for (let i = particles.length - 1; i >= 0; i--) {
            const alive = particles[i].update();
            if (!alive) particles.splice(i, 1);
        }
        // Cap particle count
        if (particles.length > MAX_PARTICLES) {
            particles.splice(0, particles.length - MAX_PARTICLES);
        }
        // Draw with normal blending for a more understated look
        for (let p of particles) p.draw(ctx);
    }

    // Draw boids on top
    for (let boid of boids) {
        boid.draw(ctx);
    }
    const allFadedOut = boids.every(b => b.fadedOut);
    const noParticlesLeft = particles.length === 0;
    if (!(allFadedOut && noParticlesLeft)) {
        requestAnimationFrame(animate);
    } else {
        animationStarted = false;
        document.dispatchEvent(new Event('boids:ended'));
    }
}

function resetBoids() {
    for (let boid of boids) {
        boid.pos = new Vect2(Math.random() * canvas.width, Math.random() * canvas.height);
        boid.vel = new Vect2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        boid.acc = new Vect2(0, 0);
        boid.opacity = 0;
        boid.fadingIn = false;
        boid.fadedIn = false;
        boid.fadeInStart = null;
        boid.fadingOut = false;
        boid.fadedOut = false;
        boid.fadeOutStart = null;
    }
    particles.length = 0;
}

function startBoids() {
    if (animationStarted) return;
    resetBoids();
    animationStarted = true;
    animationStartTime = performance.now();
    fadeOutGlobalStartAfterMs = Infinity;
    document.dispatchEvent(new Event('boids:started'));
    requestAnimationFrame(animate);
}

// Allow external controller (menu) to stop early and trigger fade-out
function stopBoids() {
    if (!animationStarted) return;
    // Request fade-out to start now (staggered by per-boid delay)
    fadeOutGlobalStartAfterMs = 0;
    // animate() loop already running; it will detect fade-out completion
}

// Expose controls globally for menu controller
window.startBoids = startBoids;
window.stopBoids = stopBoids;


