document.addEventListener('DOMContentLoaded', () => {
    const boidsEl = document.getElementById('boids');
    const lorenzEl = document.getElementById('lorenz');
    const conwayEl = document.getElementById('conway');

    const menuItems = [boidsEl, lorenzEl, conwayEl].filter(Boolean);

    menuItems.forEach((el) => { el.style.cursor = 'pointer'; });

    const DURATIONS_MS = {
        boids: 10000,
        lorenz: 10000,
        conway: 10000,
    };

    let activeTimeoutId = null;
    let activeEl = null;
    // No completed state; items should not permanently disappear

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

    function restoreAfterEnd(endedEl) {
        if (!endedEl) return;
        // Clear highlight on ended item
        endedEl.style.color = '';

        // If the ended item is the active one, clear active state
        if (activeEl === endedEl) {
            activeEl = null;
            if (activeTimeoutId) {
                clearTimeout(activeTimeoutId);
                activeTimeoutId = null;
            }
        }

        // Show all items again
        menuItems.forEach((el) => setVisibility(el, true));
    }

    function activateSelection(selectedEl, durationMs) {
        if (!selectedEl) return;
        // If another is active, clear fallback timeout
        if (activeTimeoutId) {
            clearTimeout(activeTimeoutId);
            activeTimeoutId = null;
        }
        activeEl = selectedEl;

        // Highlight selected, hide others (layout preserved)
        selectedEl.style.color = '#FFE100';
        showOrHideAllExcept(selectedEl);

        // Fallback in case no :ended event is emitted
        activeTimeoutId = setTimeout(() => {
            // Only restore if still active
            if (activeEl === selectedEl) restoreAfterEnd(selectedEl);
        }, durationMs);
    }

    if (boidsEl) {
        boidsEl.addEventListener('click', () => {
            activateSelection(boidsEl, DURATIONS_MS.boids);
        });
        document.addEventListener('boids:started', () => {
            if (activeEl !== boidsEl) {
                activateSelection(boidsEl, DURATIONS_MS.boids);
            }
        });
        document.addEventListener('boids:ended', () => restoreAfterEnd(boidsEl));
    }
    if (lorenzEl) {
        lorenzEl.addEventListener('click', () => {
            activateSelection(lorenzEl, DURATIONS_MS.lorenz);
        });
        document.addEventListener('lorenz:started', () => {
            if (activeEl !== lorenzEl) {
                activateSelection(lorenzEl, DURATIONS_MS.lorenz);
            }
        });
        document.addEventListener('lorenz:ended', () => restoreAfterEnd(lorenzEl));
    }
    if (conwayEl) {
        conwayEl.addEventListener('click', () => {
            activateSelection(conwayEl, DURATIONS_MS.conway);
        });
        document.addEventListener('conway:started', () => {
            if (activeEl !== conwayEl) {
                activateSelection(conwayEl, DURATIONS_MS.conway);
            }
        });
        document.addEventListener('conway:ended', () => restoreAfterEnd(conwayEl));
    }
});


