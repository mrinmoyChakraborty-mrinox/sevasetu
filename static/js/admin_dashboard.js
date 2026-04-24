/* ============================================================
   app.js — SevaSetu Admin Dashboard
   1. Full-page skeleton loading (welcome, stats, feed, chart)
   2. Number counter animation for stat cards
   3. Chart.js interactive chart with tab switching (Donut/Bar)
   4. Section-level skeleton for NGO table + Verification queue
   5. Modal open/close with skeleton for popups
   6. Verify/Reject button feedback
   ============================================================ */


/* ════════════════════════════════════════════════════════════
   TIMING CONSTANTS
   Change these to match your real API response times.
════════════════════════════════════════════════════════════ */
const PAGE_SKELETON_DELAY  = 1600;  // full page skeleton duration (ms)
const CARD_SKELETON_DELAY  = 1800;  // NGO table + verification cards
const MODAL_SKELETON_DELAY = 800;   // modal popup skeleton


/* ════════════════════════════════════════════════════════════
   1. FULL-PAGE SKELETON LOADING
   On load, the page shows .page-skel placeholders everywhere.
   After PAGE_SKELETON_DELAY ms:
     - body gets class 'page-loaded'
     - CSS hides all .page-skel and reveals all .page-real
     - Stat numbers animate from 0 to their target values
     - Chart.js chart is initialised
   Replace setTimeout with your real fetch call.
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // Simulate data fetch
  setTimeout(() => {
    document.body.classList.add('page-loaded');

    // Trigger stat counter animation
    animateCounters();

    // Animate the Open Needs progress bar
    document.querySelectorAll('.stat-bar-fill').forEach(bar => {
      bar.style.width = '75%';
    });

    // Build the Chart.js chart
    initChart('doughnut');

  }, PAGE_SKELETON_DELAY);

});


/* ════════════════════════════════════════════════════════════
   2. NUMBER COUNTER ANIMATION
   Finds all .stat-num elements with data-target attribute
   and counts up from 0 to that value over ~900ms.
════════════════════════════════════════════════════════════ */
function animateCounters() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target   = parseInt(el.dataset.target, 10);
    const divisor  = el.dataset.divisor ? parseInt(el.dataset.divisor) : null;
    const suffix   = el.dataset.suffix || '';
    const duration = 900;
    const steps    = 40;
    const step     = target / steps;
    let current    = 0;
    let count      = 0;

    const timer = setInterval(() => {
      count++;
      current = Math.min(Math.round(step * count), target);

      if (divisor) {
        const val = (current / divisor).toFixed(1);
        el.textContent = val + suffix;
      } else {
        el.textContent = current.toLocaleString('en-IN');
      }

      if (count >= steps) clearInterval(timer);
    }, duration / steps);
  });
}


/* ════════════════════════════════════════════════════════════
   3. CHART.JS — NEEDS BY CATEGORY
   Draws either a doughnut or horizontal bar chart.
   Tab buttons switch between them.
════════════════════════════════════════════════════════════ */
const CHART_DATA = {
  labels:  ['Medical', 'Education', 'Food', 'Others'],
  values:  [125, 94, 62, 31],
  colors:  ['#006c44', '#fea619', '#fa7272', '#d9e3f6'],
  borders: ['#005232', '#e09000', '#e85252', '#bfc9d9'],
};

let chartInstance = null; // holds the active Chart.js instance

function initChart(type) {
  const canvas = document.getElementById('needsChart');
  if (!canvas) return;

  // Destroy previous instance before re-creating
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const ctx = canvas.getContext('2d');

  const isDoughnut = type === 'doughnut';

  chartInstance = new Chart(ctx, {
    type: isDoughnut ? 'doughnut' : 'bar',

    data: {
      labels: CHART_DATA.labels,
      datasets: [{
        label: 'Needs',
        data: CHART_DATA.values,
        backgroundColor: CHART_DATA.colors,
        borderColor: isDoughnut ? CHART_DATA.borders : CHART_DATA.colors,
        borderWidth: isDoughnut ? 2 : 0,
        borderRadius: isDoughnut ? 0 : 6,
        hoverOffset: isDoughnut ? 10 : 0,
      }],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          display: false, // we use our custom stat items below
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(0);
              return ` ${ctx.raw} needs (${pct}%)`;
            },
          },
          backgroundColor: '#064e35',
          titleColor: '#ffffff',
          bodyColor: '#b7e8ce',
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
        },
      },

      // Doughnut-specific: centre label plugin
      ...(isDoughnut ? {
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(0);
                return ` ${ctx.raw} needs (${pct}%)`;
              },
            },
            backgroundColor: '#064e35',
            titleColor: '#ffffff',
            bodyColor: '#b7e8ce',
            padding: 10,
            cornerRadius: 8,
          },
          // Centre label via inline plugin
          doughnutCentreLabel: true,
        },
      } : {
        // Bar chart options
        indexAxis: 'y',  // horizontal bar
        scales: {
          x: {
            grid: { color: 'rgba(0,108,68,.06)' },
            ticks: { color: '#6e7a71', font: { size: 11, family: 'Plus Jakarta Sans' } },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#3e4942', font: { size: 12, weight: '700', family: 'Plus Jakarta Sans' } },
            border: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(0);
                return ` ${ctx.raw} needs (${pct}%)`;
              },
            },
            backgroundColor: '#064e35',
            titleColor: '#ffffff',
            bodyColor: '#b7e8ce',
            padding: 10,
            cornerRadius: 8,
          },
        },
      }),
    },

    // Plugin: draw "312 / Active" text inside doughnut hole
    plugins: isDoughnut ? [{
      id: 'centreLabel',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 1.5rem Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#064e35';
        ctx.fillText('312', cx, cy - 10);
        ctx.font = '700 .6rem Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#6e7a71';
        ctx.letterSpacing = '.08em';
        ctx.fillText('ACTIVE', cx, cy + 12);
        ctx.restore();
      },
    }] : [],
  });
}

/* Wire chart tab buttons */
document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    initChart(this.dataset.chart);
  });
});


/* ════════════════════════════════════════════════════════════
   4. SECTION-LEVEL SKELETON LOADING
   NGO table and verification queue use .section-wrap.loading/.loaded
   (independent of the full-page skeleton timing above).
════════════════════════════════════════════════════════════ */
document.querySelectorAll('.section-wrap').forEach(section => {
  setTimeout(() => {
    section.classList.remove('loading');
    section.classList.add('loaded');
  }, CARD_SKELETON_DELAY);
});


/* ════════════════════════════════════════════════════════════
   5. MODAL HELPERS
════════════════════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

function closeOnBackdrop(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('ngo-list-modal');
    closeModal('verif-modal');
  }
});


/* ════════════════════════════════════════════════════════════
   6. MODAL SKELETON LOADING
   Resets to .loading each open so skeleton always plays.
════════════════════════════════════════════════════════════ */
function startModalSkeleton(wrapId) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.classList.remove('loaded');
  wrap.classList.add('loading');
  setTimeout(() => {
    wrap.classList.remove('loading');
    wrap.classList.add('loaded');
  }, MODAL_SKELETON_DELAY);
}

document.getElementById('ngo-viewall-btn')?.addEventListener('click', () => {
  openModal('ngo-list-modal');
  startModalSkeleton('ngo-modal-wrap');
});
document.getElementById('close-ngo-modal')?.addEventListener('click', () => closeModal('ngo-list-modal'));

document.getElementById('verif-viewall-btn')?.addEventListener('click', () => {
  openModal('verif-modal');
  startModalSkeleton('verif-modal-wrap');
});
document.getElementById('close-verif-modal')?.addEventListener('click', () => closeModal('verif-modal'));


/* ════════════════════════════════════════════════════════════
   7. VERIFY / REJECT FEEDBACK
════════════════════════════════════════════════════════════ */
function handleVerify(btn) {
  btn.textContent = '✓ Verified';
  btn.style.background = '#059669';
  btn.disabled = true;
  // TODO: fetch('/api/ngo/verify', { method:'PATCH', body: JSON.stringify({ id }) })
}

function handleReject(btn) {
  btn.textContent = '✗ Rejected';
  btn.style.background = '#a83639';
  btn.style.color = '#fff';
  btn.disabled = true;
  // TODO: fetch('/api/ngo/reject', { method:'PATCH', body: JSON.stringify({ id }) })
}

document.querySelectorAll('.btn-verify').forEach(b => b.addEventListener('click', () => handleVerify(b)));
document.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', () => handleReject(b)));

document.querySelectorAll('.review-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const orig = this.textContent;
    this.textContent = 'Opening…';
    setTimeout(() => { this.textContent = orig; }, 900);
  });
});


/* ════════════════════════════════════════════════════════════
   8. NAV DROPDOWN
════════════════════════════════════════════════════════════ */
const menuWrap = document.querySelector('.menu-wrap');
const navDd    = document.getElementById('nav-dd');
document.querySelector('.menu-btn')?.addEventListener('click', () => navDd?.classList.toggle('open'));
document.addEventListener('click', e => {
  if (menuWrap && !menuWrap.contains(e.target)) navDd?.classList.remove('open');
});
