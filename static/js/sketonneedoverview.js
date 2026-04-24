/**
 * SevaSetu Skeleton Loader — JS Controller
 */
const SkeletonLoader = (() => {
    // The skeleton wrapper (body in this standalone file)
    const skeletonEl = document.body;

    // Real content container (swap in your actual dashboard element here)
    let realContentEl = null;

    function show() {
        skeletonEl.style.display = 'flex';
        skeletonEl.style.opacity = '1';
        if (realContentEl) realContentEl.style.display = 'none';
    }

    function hide(fadeMs = 300) {
        skeletonEl.style.transition = `opacity ${fadeMs}ms ease`;
        skeletonEl.style.opacity = '0';
        setTimeout(() => {
            skeletonEl.style.display = 'none';
            if (realContentEl) {
                realContentEl.style.display = 'flex';
                realContentEl.style.animation = 'fadeIn 0.4s ease both';
            }
        }, fadeMs);
    }

    function toggle() {
        const visible = skeletonEl.style.opacity !== '0';
        visible ? hide() : show();
    }

    function setRealContent(el) {
        realContentEl = el;
    }

    return { show, hide, toggle, setRealContent };
})();

// ── Demo: auto-hide after 2.5 s to simulate a data load ──────────────────
setTimeout(() => {
    document.body.style.transition = 'opacity 0.4s ease';
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = '';
        // Reset so demo loops
        setTimeout(() => SkeletonLoader.show(), 600);
    }, 400);
}, 2500);