document.addEventListener('DOMContentLoaded', () => {
    const boidsEl = document.getElementById('boids');
    const lorenzEl = document.getElementById('lorenz');
    const conwayEl = document.getElementById('conway');

    const menuItems = [boidsEl, lorenzEl, conwayEl].filter(Boolean);

    menuItems.forEach((el) => { el.style.cursor = 'pointer'; });

    let activeEl = null; // which menu item is currently active

    function setVisibility(el, visible) {
        el.style.visibility = visible ? 'visible' : 'hidden';
        el.style.pointerEvents = visible ? 'auto' : 'none';
        el.style.cursor = visible ? 'pointer' : 'default';
    }

    function showOrHideAllExcept(selectedEl) {
        menuItems.forEach((el) => {
            if (selectedEl && el === selectedEl) {
                setVisibility(el, true);
            } else {
                // Hide others during an active selection
                setVisibility(el, false);
            }
        });
    }

    function stopActiveAnimation() {
        if (!activeEl) return;
        const id = activeEl.id;
        if (id === 'boids' && typeof window.stopBoids === 'function') {
            window.stopBoids();
        } else if (id === 'lorenz' && typeof window.stopLorenz === 'function') {
            window.stopLorenz();
        } else if (id === 'conway' && typeof window.stopConway === 'function') {
            window.stopConway();
        }
    }

    function restoreAfterEnd(endedEl) {
        if (!endedEl) return;
        endedEl.style.color = '';
        if (activeEl === endedEl) {
            activeEl = null;
        }
        if (activeEl) {
            // Keep only the active item visible
            showOrHideAllExcept(activeEl);
        } else {
            // No active item; restore all
            menuItems.forEach((el) => setVisibility(el, true));
        }
    }

    function activateSelection(selectedEl) {
        if (!selectedEl) return;
        activeEl = selectedEl;

        // Highlight selected, hide others (layout preserved)
        selectedEl.style.color = '#FFE100';
        showOrHideAllExcept(selectedEl);
    }

    if (boidsEl) {
        boidsEl.addEventListener('click', () => {
            // Toggle behavior
            if (activeEl === boidsEl) {
                if (typeof window.stopBoids === 'function') window.stopBoids();
            } else {
                // stop whatever is currently active first
                stopActiveAnimation();
                activateSelection(boidsEl);
                if (typeof window.startBoids === 'function') {
                    window.startBoids();
                } else if (typeof window.startBoids === 'undefined') {
                    // fallback to global function without namespacing
                    if (typeof startBoids === 'function') startBoids();
                }
            }
        });
        document.addEventListener('boids:started', () => {
            if (activeEl !== boidsEl) {
                activateSelection(boidsEl);
            }
        });
        document.addEventListener('boids:ended', () => restoreAfterEnd(boidsEl));
    }
    if (lorenzEl) {
        lorenzEl.addEventListener('click', () => {
            if (activeEl === lorenzEl) {
                if (typeof window.stopLorenz === 'function') window.stopLorenz();
            } else {
                stopActiveAnimation();
                activateSelection(lorenzEl);
                if (typeof window.startLorenz === 'function') {
                    window.startLorenz();
                } else if (typeof startLorenz === 'function') {
                    startLorenz();
                }
            }
        });
        document.addEventListener('lorenz:started', () => {
            if (activeEl !== lorenzEl) {
                activateSelection(lorenzEl);
            }
        });
        document.addEventListener('lorenz:ended', () => restoreAfterEnd(lorenzEl));
    }
    if (conwayEl) {
        conwayEl.addEventListener('click', () => {
            if (activeEl === conwayEl) {
                if (typeof window.stopConway === 'function') window.stopConway();
            } else {
                stopActiveAnimation();
                activateSelection(conwayEl);
                if (typeof window.startConway === 'function') window.startConway();
            }
        });
        document.addEventListener('conway:started', () => {
            if (activeEl !== conwayEl) {
                activateSelection(conwayEl);
            }
        });
        document.addEventListener('conway:ended', () => restoreAfterEnd(conwayEl));
    }
});


