(function() {
    function setupNorthernLights() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '-1';
        
        document.body.appendChild(canvas);

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function createSeededRandom(seed) {
            let m = 0x80000000;
            let a = 1103515245;
            let c = 12345;
            let state = seed;
            
            return function() {
                state = (a * state + c) % m;
                return state / (m - 1);
            };
        }

        // specific seed for pattern!
        const rng = createSeededRandom(1754823955821);
        
        // Perlin noise setup with seeded randomness
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = p[i + 256] = Math.floor(rng() * 256);

        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const lerp = (t, a, b) => a + t * (b - a);
        const grad = (hash, x, y, z) => {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        };

        function noise(x, y, z) {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            const Z = Math.floor(z) & 255;
            x -= Math.floor(x);
            y -= Math.floor(y);
            z -= Math.floor(z);
            const u = fade(x);
            const v = fade(y);
            const w = fade(z);
            const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
            const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
            return lerp(w, 
                lerp(v, 
                    lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
                    lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
                ),
                lerp(v, 
                    lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                    lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
                )
            );
        }

        const startTime = performance.now();

        function drawNorthernLights(time) {
            const elapsed = performance.now() - startTime;
            const fadeAlpha = elapsed > 15000 ? 0.03 : 0.05;
            ctx.fillStyle = `rgba(30, 5, 20, ${fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (elapsed < 5000) {
                // half as fast on mobile screens because the speed is calculated with screen width
                const timeScale = time * (window.innerWidth < 768 ? 0.001 : 0.003);
                const moveX = Math.sin(timeScale * 0.5) * canvas.width * 0.2;
                const moveY = Math.cos(timeScale * 0.3) * canvas.height * 0.1;

                const intensity = 0.85;
                const hueIncrement = 0.8; // slow hue increase

                for (let x = 0; x < canvas.width; x += 4) {
                    for (let y = 0; y < canvas.height; y += 2) {
                        const noiseX = (x + moveX) * 0.0002;   
                        const noiseY = (y + moveY) * 0.0002;
                        const noiseValue = (noise(noiseX, noiseY, timeScale) + 1) / 2 * intensity;
                        const noiseValue2 = (noise(noiseX * 2, noiseY * 2, timeScale * 1.5) + 1) / 2 * intensity;
                        
                        const irregularShape = Math.sin(y * 0.02 + noiseValue2 * 5 + timeScale) * 0.2 + 0.5;
                        const diagonalGradient = ((x + moveX) / canvas.width + (y + moveY) / canvas.height) / 2;
                        
                        if (noiseValue > 0.55 && 
                            diagonalGradient > irregularShape - 0.1 && 
                            diagonalGradient < irregularShape + 0.1) {
                            const depth = (noiseValue2 - 0.5) * 3;
                            const hue = (270 + depth * 110 + time * hueIncrement) % 180;
                            const lightness = 20 + depth * 50;
                            const alpha = (noiseValue - 0.55) * 2 * 0.20;
                            ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
                            ctx.fillRect(x, y, 3, 3);
                        }
                    }
                }
            }

            requestAnimationFrame(() => drawNorthernLights(time + 4));
        }

        drawNorthernLights(0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNorthernLights);
    } else {
        setupNorthernLights();
    }
})();