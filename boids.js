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
        this.color = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
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
const fadeOutGlobalStartAfterMs = 3500;
const fadeOutDurationMs = 1200;

function animate(now) {
    if (!animationStarted) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = now - animationStartTime;
    for (let boid of boids) {
        boid.fadeIn(elapsed);
        boid.fadeOut(elapsed, fadeOutGlobalStartAfterMs, fadeOutDurationMs);
        if (boid.opacity > 0) {
            boid.flock(boids);
            boid.update();
        }
        boid.draw(ctx);
    }
    const allFadedOut = boids.every(b => b.fadedOut);
    if (!allFadedOut) {
        requestAnimationFrame(animate);
    } else {
        animationStarted = false;
    }
}

function startBoids() {
    if (animationStarted) return;
    animationStarted = true;
    animationStartTime = performance.now();
    requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('boids');
    if (trigger) {
        trigger.style.cursor = 'pointer';
        trigger.addEventListener('click', startBoids, { once: true });
    }
});


