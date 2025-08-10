document.addEventListener('DOMContentLoaded', () => {
    const logEl = document.getElementById('log');
    const readingEl = logEl ? logEl.querySelector('.reading') : null;

    // Programmatically assign stagger index for reading children
    if (readingEl) {
        const children = Array.from(readingEl.children);
        // configurable step via CSS var on container
        readingEl.style.setProperty('--stagger-step', '40ms');
        children.forEach((child, index) => {
            child.style.setProperty('--stagger-index', String(index + 1));
        });
    }

    // Keep reading open for a short grace period after hover leaves
    if (logEl && readingEl) {
        let readingHideTimer = null;

        const openReading = () => {
            if (readingHideTimer) {
                clearTimeout(readingHideTimer);
                readingHideTimer = null;
            }
            logEl.classList.add('open');
            readingEl.classList.add('open');
        };

        const scheduleCloseReading = () => {
            if (readingHideTimer) clearTimeout(readingHideTimer);
            readingHideTimer = setTimeout(() => {
                logEl.classList.remove('open');
                readingEl.classList.remove('open');
            }, 1000); // 1s grace period
        };

        logEl.addEventListener('mouseenter', openReading);
        readingEl.addEventListener('mouseenter', openReading);
        logEl.addEventListener('mouseleave', scheduleCloseReading);
        readingEl.addEventListener('mouseleave', scheduleCloseReading);
    }

    // Setup socials dropdown under title with upward waterfall
    const titleEl = document.getElementById('title');
    const socialsEl = titleEl ? titleEl.querySelector('.socials') : null;

    if (socialsEl) {
        const socialChildren = Array.from(socialsEl.children);
        // reverse stagger: last child should appear first -> assign higher index to earlier elements
        const total = socialChildren.length;
        socialsEl.style.setProperty('--stagger-step', '40ms');
        socialChildren.forEach((child, idx) => {
            const reverseIndex = total - idx; // total..1
            child.style.setProperty('--stagger-index', String(reverseIndex));
        });

        let socialsHideTimer = null;
        const openSocials = () => {
            if (socialsHideTimer) {
                clearTimeout(socialsHideTimer);
                socialsHideTimer = null;
            }
            titleEl.classList.add('open');
            socialsEl.classList.add('open');
        };
        const scheduleCloseSocials = () => {
            if (socialsHideTimer) clearTimeout(socialsHideTimer);
            socialsHideTimer = setTimeout(() => {
                titleEl.classList.remove('open');
                socialsEl.classList.remove('open');
            }, 1000);
        };

        titleEl.addEventListener('mouseenter', openSocials);
        socialsEl.addEventListener('mouseenter', openSocials);
        titleEl.addEventListener('mouseleave', scheduleCloseSocials);
        socialsEl.addEventListener('mouseleave', scheduleCloseSocials);
    }

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


