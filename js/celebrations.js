// js/celebrations.js
// ============================================================
// Lightweight, dependency-free celebration effects:
//   - launchConfetti()   full-screen confetti burst
//   - launchBrokenHearts() falling broken-heart burst
//   - showCelebToast()   slide-in toast card (badge / rank change)
// No external libraries — a single canvas is reused for both
// particle effects and removed from the DOM once the animation ends.
// ============================================================

function getCanvas() {
  let canvas = document.getElementById('celebrationCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'celebrationCanvas';
    document.body.appendChild(canvas);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  return canvas;
}

function runParticles(makeParticle, count, durationMs) {
  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: count }, makeParticle);
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => p.update(elapsed));
    particles.forEach(p => p.draw(ctx));
    if (elapsed < durationMs) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}

// ── CONFETTI ──────────────────────────────────────────────
// 7-8s so it has time to fall the full height of the screen: particles are
// staggered in over roughly the first 2s (instead of bursting all at once)
// and given a slower, more graceful fall speed than before, so the rain
// keeps going instead of finishing early and leaving an empty canvas for
// the remainder of the celebration.
export function launchConfetti() {
  const colors = ['#FF5722', '#FFC400', '#4CAF50', '#29B6F6', '#AB47BC', '#FF7043'];
  const w = window.innerWidth;

  runParticles(() => {
    const size = 6 + Math.random() * 6;
    const x = Math.random() * w;
    const delay = Math.random() * 2200;
    const fallSpeed = 1.8 + Math.random() * 2.0;
    const drift = (Math.random() - 0.5) * 2.5;
    const spin = (Math.random() - 0.5) * 12;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = Math.random() < 0.5 ? 'rect' : 'circle';
    let y = -20 - Math.random() * 200;
    let rot = Math.random() * 360;

    return {
      x_: x,
      update(elapsed) {
        if (elapsed < delay) return;
        y += fallSpeed;
        this.x_ += drift;
        rot += spin;
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x_, y);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.fillStyle = color;
        ctx.globalAlpha = y > window.innerHeight - 60 ? Math.max(0, 1 - (y - (window.innerHeight - 60)) / 60) : 1;
        if (shape === 'rect') ctx.fillRect(-size / 2, -size / 3, size, size * 0.66);
        else { ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    };
  }, 220, 7500);
}

// ── BROKEN HEARTS ─────────────────────────────────────────
// Same 7-8s treatment as confetti — staggered entry + slower fall so the
// hearts keep drifting down for the full celebration instead of clearing
// the screen a couple of seconds in.
export function launchBrokenHearts() {
  const w = window.innerWidth;

  runParticles(() => {
    const size = 22 + Math.random() * 16;
    const x = Math.random() * w;
    const delay = Math.random() * 2500;
    const fallSpeed = 1.0 + Math.random() * 1.4;
    const drift = (Math.random() - 0.5) * 1.2;
    let y = -40 - Math.random() * 220;
    let rot = (Math.random() - 0.5) * 30;

    return {
      update(elapsed) {
        if (elapsed < delay) return;
        y += fallSpeed;
        this.x_ += drift;
      },
      x_: x,
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x_, y);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.font = `${size}px serif`;
        ctx.globalAlpha = y > window.innerHeight - 100 ? Math.max(0, 1 - (y - (window.innerHeight - 100)) / 100) : 0.9;
        ctx.textAlign = 'center';
        ctx.fillText('💔', 0, 0);
        ctx.restore();
      }
    };
  }, 40, 7500);
}

// ── TOAST ──────────────────────────────────────────────────
// type: 'badge' | 'rankup' | 'rankdown'
export function showCelebToast({ type = 'badge', title, body, autoHideMs = 7000 }) {
  const icons = { badge: '🏅', rankup: '📈', rankdown: '📉' };
  const cls   = { badge: 'badge-toast', rankup: 'rankup-toast', rankdown: 'rankdown-toast' };

  const el = document.createElement('div');
  el.className = `celeb-toast ${cls[type] || ''}`;
  el.innerHTML = `
    <div class="celeb-toast-icon">${icons[type] || '🎉'}</div>
    <div style="flex:1;">
      <div class="celeb-toast-title">${title}</div>
      <div class="celeb-toast-body">${body}</div>
    </div>
    <button class="celeb-toast-close" aria-label="Dismiss">&times;</button>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

  const remove = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 500);
  };
  el.querySelector('.celeb-toast-close').addEventListener('click', remove);
  if (autoHideMs) setTimeout(remove, autoHideMs);
}
