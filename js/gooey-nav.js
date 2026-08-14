// js/gooey-nav.js — vanilla-JS port of the GooeyNav React component.
// This site is plain HTML/JS (Vite, no React), so this reimplements the same
// particle/"goo" effect imperatively against a <div class="gooey-nav-container">
// that wraps a <nav><ul><li><a>...</a></li></ul></nav> structure.
export class GooeyNav {
  constructor(container, opts = {}) {
    this.container = container;
    this.nav = container.querySelector('nav');
    this.items = Array.from(container.querySelectorAll('li'));
    this.filter = container.querySelector('.effect.filter');
    this.text = container.querySelector('.effect.text');

    this.particleCount = opts.particleCount ?? 15;
    this.particleDistances = opts.particleDistances ?? [90, 10];
    this.particleR = opts.particleR ?? 100;
    this.timeVariance = opts.timeVariance ?? 300;
    this.animationTime = opts.animationTime ?? 600;
    this.colors = opts.colors ?? [1, 2, 3, 1, 2, 3, 1, 4];
    this.activeIndex = this.findInitialActiveIndex(opts.initialActiveIndex ?? 0);

    this.items.forEach((li, i) => {
      li.classList.toggle('active', i === this.activeIndex);
      const a = li.querySelector('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      // Only intercept in-page hash links for the goo effect;
      // real page navigations (pages/members.html etc.) proceed normally.
      if (href.startsWith('#')) {
        a.addEventListener('click', e => {
          e.preventDefault();
          this.setActive(i, li);
          const target = document.querySelector(href);
          target?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    });

    window.addEventListener('resize', () => this.updateEffectPosition(this.items[this.activeIndex]));
    requestAnimationFrame(() => this.updateEffectPosition(this.items[this.activeIndex]));
  }

  findInitialActiveIndex(fallback) {
    const path = window.location.pathname.split('/').pop();
    const hash = window.location.hash;
    const idx = this.items.findIndex(li => {
      const href = li.querySelector('a')?.getAttribute('href') || '';
      return (hash && href === hash) || (path && href.endsWith(path));
    });
    return idx >= 0 ? idx : fallback;
  }

  noise(n = 1) {
    return n / 2 - Math.random() * n;
  }

  getXY(distance, pointIndex, totalPoints) {
    const angle = ((360 + this.noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  }

  updateEffectPosition(el) {
    if (!el || !this.filter || !this.text) return;
    const cRect = this.container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const styles = {
      left: `${r.x - cRect.x}px`,
      top: `${r.y - cRect.y}px`,
      width: `${r.width}px`,
      height: `${r.height}px`
    };
    Object.assign(this.filter.style, styles);
    Object.assign(this.text.style, styles);
    this.text.innerText = el.innerText;
  }

  makeParticles() {
    const el = this.filter;
    const bubbleTime = this.animationTime * 2 + this.timeVariance;
    el.style.setProperty('--time', `${bubbleTime}ms`);

    for (let i = 0; i < this.particleCount; i++) {
      const t = this.animationTime * 2 + this.noise(this.timeVariance * 2);
      const start = this.getXY(this.particleDistances[0], this.particleCount - i, this.particleCount);
      const end = this.getXY(this.particleDistances[1] + this.noise(7), this.particleCount - i, this.particleCount);
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      const rotate = this.noise(this.particleR / 10);
      const rotateDeg = rotate > 0 ? (rotate + this.particleR / 20) * 10 : (rotate - this.particleR / 20) * 10;

      el.classList.remove('active');
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.className = 'particle';
        particle.style.setProperty('--start-x', `${start[0]}px`);
        particle.style.setProperty('--start-y', `${start[1]}px`);
        particle.style.setProperty('--end-x', `${end[0]}px`);
        particle.style.setProperty('--end-y', `${end[1]}px`);
        particle.style.setProperty('--time', `${t}ms`);
        particle.style.setProperty('--scale', `${1 + this.noise(0.2)}`);
        particle.style.setProperty('--color', `var(--color-${color}, var(--orange))`);
        particle.style.setProperty('--rotate', `${rotateDeg}deg`);
        point.className = 'point';
        particle.appendChild(point);
        el.appendChild(particle);
        requestAnimationFrame(() => el.classList.add('active'));
        setTimeout(() => {
          try { el.removeChild(particle); } catch (_) {}
        }, t);
      }, 30);
    }
  }

  setActive(index, li) {
    if (this.activeIndex === index) return;
    this.items[this.activeIndex]?.classList.remove('active');
    li.classList.add('active');
    this.activeIndex = index;
    this.updateEffectPosition(li);

    this.filter.querySelectorAll('.particle').forEach(p => this.filter.removeChild(p));
    this.text.classList.remove('active');
    void this.text.offsetWidth; // restart CSS animation
    this.text.classList.add('active');
    this.makeParticles();
  }
}
