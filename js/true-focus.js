// js/true-focus.js — vanilla-JS port of the TrueFocus React component
// (blurs every word except the "focused" one, tracked by an animated
// corner-bracket frame). This project has no React/motion — plain DOM +
// CSS transitions instead, same pattern as js/stack-gallery.js.
export class TrueFocus {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = Object.assign(
      {
        sentence: 'True Focus',
        separator: ' ',
        manualMode: false,
        blurAmount: 5,
        borderColor: 'green',
        glowColor: 'rgba(0, 255, 0, 0.6)',
        wordColors: null,
        animationDuration: 0.5,
        pauseBetweenAnimations: 1
      },
      opts
    );

    this.words = this.opts.sentence.split(this.opts.separator);
    this.currentIndex = 0;
    this.lastActiveIndex = null;
    this.wordEls = [];
    this.intervalId = null;

    // Honour the OS "reduce motion" setting: show every word sharp and
    // skip the cycling blur/frame animation entirely.
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (this.reduceMotion) this.opts.manualMode = true;

    this.onResize = () => this.updateFrame();

    this.render();
    this.updateFrame();
    this.startAutoPlay();
    window.addEventListener('resize', this.onResize);
  }

  render() {
    const { manualMode, borderColor, glowColor, animationDuration, wordColors } = this.opts;

    this.container.classList.add('focus-container');
    this.container.innerHTML = '';

    // Screen readers get the sentence once, as plain text; the per-word
    // spans and the corner frame are purely visual.
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = this.words.join(' ');
    this.container.appendChild(srText);

    this.wordEls = this.words.map((word, index) => {
      const span = document.createElement('span');
      span.className = `focus-word${manualMode ? ' manual' : ''}`;
      span.setAttribute('aria-hidden', 'true');
      span.textContent = word;
      span.style.setProperty('--border-color', borderColor);
      span.style.setProperty('--glow-color', glowColor);
      span.style.transition = `filter ${animationDuration}s ease`;
      if (wordColors && wordColors.length) {
        span.style.color = wordColors[index % wordColors.length];
      }
      span.addEventListener('mouseenter', () => this.handleMouseEnter(index));
      span.addEventListener('mouseleave', () => this.handleMouseLeave());
      this.container.appendChild(span);
      return span;
    });

    this.frameEl = document.createElement('div');
    this.frameEl.className = 'focus-frame';
    this.frameEl.setAttribute('aria-hidden', 'true');
    this.frameEl.style.setProperty('--border-color', borderColor);
    this.frameEl.style.setProperty('--glow-color', glowColor);
    this.frameEl.style.transition =
      `transform ${animationDuration}s ease, ` +
      `width ${animationDuration}s ease, ` +
      `height ${animationDuration}s ease, ` +
      `opacity ${animationDuration}s ease`;

    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
      const corner = document.createElement('span');
      corner.className = `corner ${pos}`;
      this.frameEl.appendChild(corner);
    });
    this.container.appendChild(this.frameEl);

    this.applyBlur();
  }

  applyBlur() {
    const { blurAmount } = this.opts;
    if (this.reduceMotion) {
      this.wordEls.forEach(el => { el.style.filter = 'none'; });
      return;
    }
    this.wordEls.forEach((el, i) => {
      const isActive = i === this.currentIndex;
      el.style.filter = isActive ? 'blur(0px)' : `blur(${blurAmount}px)`;
    });
  }

  updateFrame() {
    if (this.reduceMotion) {
      if (this.frameEl) this.frameEl.style.opacity = '0';
      return;
    }
    if (this.currentIndex === null || this.currentIndex === -1 || !this.frameEl) {
      if (this.frameEl) this.frameEl.style.opacity = '0';
      return;
    }
    const activeEl = this.wordEls[this.currentIndex];
    if (!activeEl) return;

    const parentRect = this.container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    this.frameEl.style.transform = `translate(${activeRect.left - parentRect.left}px, ${activeRect.top - parentRect.top}px)`;
    this.frameEl.style.width = `${activeRect.width}px`;
    this.frameEl.style.height = `${activeRect.height}px`;
    this.frameEl.style.opacity = '1';
  }

  setActive(index) {
    this.currentIndex = index;
    this.applyBlur();
    this.updateFrame();
  }

  startAutoPlay() {
    if (this.opts.manualMode) return;
    const { animationDuration, pauseBetweenAnimations } = this.opts;
    this.intervalId = setInterval(() => {
      this.setActive((this.currentIndex + 1) % this.words.length);
    }, (animationDuration + pauseBetweenAnimations) * 1000);
  }

  handleMouseEnter(index) {
    if (!this.opts.manualMode) return;
    this.lastActiveIndex = index;
    this.setActive(index);
  }

  handleMouseLeave() {
    if (!this.opts.manualMode) return;
    this.setActive(this.lastActiveIndex);
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    window.removeEventListener('resize', this.onResize);
  }
}
