// js/pixel-transition.js — vanilla-JS port of the PixelTransition React component
// (reveals a "second" face of a card behind an animated grid of pixels).
// Uses gsap, which this project already depends on (see js/preloader.js).
import { gsap } from 'gsap';

export class PixelTransition {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = Object.assign(
      {
        firstContent: '',
        secondContent: '',
        gridSize: 7,
        pixelColor: 'currentColor',
        animationStepDuration: 0.3,
        once: false,
        className: ''
      },
      opts
    );

    this.isActive = false;
    this.delayedCall = null;

    this.render();
  }

  render() {
    const { firstContent, secondContent, gridSize, pixelColor, className } = this.opts;

    this.container.classList.add('pixel-transition');
    if (className) this.container.classList.add(...className.split(' ').filter(Boolean));
    if (!this.container.hasAttribute('tabindex')) this.container.tabIndex = 0;

    this.container.innerHTML = `
      <div class="pixel-transition__default"></div>
      <div class="pixel-transition__active"></div>
      <div class="pixel-transition__pixels"></div>
    `;

    this.defaultEl = this.container.querySelector('.pixel-transition__default');
    this.activeEl = this.container.querySelector('.pixel-transition__active');
    this.pixelsEl = this.container.querySelector('.pixel-transition__pixels');

    this.setContent(this.defaultEl, firstContent);
    this.setContent(this.activeEl, secondContent);

    const frag = document.createDocumentFragment();
    const size = 100 / gridSize;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel-transition__pixel';
        pixel.style.backgroundColor = pixelColor;
        pixel.style.width = `${size}%`;
        pixel.style.height = `${size}%`;
        pixel.style.left = `${col * size}%`;
        pixel.style.top = `${row * size}%`;
        frag.appendChild(pixel);
      }
    }
    this.pixelsEl.appendChild(frag);
    this.pixels = this.pixelsEl.querySelectorAll('.pixel-transition__pixel');

    const isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice) {
      this.container.addEventListener('click', () => this.handleClick());
    } else {
      this.container.addEventListener('mouseenter', () => this.handleEnter());
      this.container.addEventListener('mouseleave', () => this.handleLeave());
      this.container.addEventListener('focus', () => this.handleEnter());
      this.container.addEventListener('blur', () => this.handleLeave());
    }
  }

  // Accepts either an HTML string or a DOM node for first/second content.
  setContent(el, content) {
    if (content instanceof Node) {
      el.appendChild(content);
    } else {
      el.innerHTML = content;
    }
  }

  animate(activate) {
    this.isActive = activate;
    const pixels = this.pixels;
    if (!pixels || !pixels.length) return;

    const { animationStepDuration } = this.opts;

    gsap.killTweensOf(pixels);
    if (this.delayedCall) this.delayedCall.kill();

    gsap.set(pixels, { display: 'none' });
    const staggerDuration = animationStepDuration / pixels.length;

    gsap.to(pixels, {
      display: 'block',
      duration: 0,
      stagger: { each: staggerDuration, from: 'random' }
    });

    this.delayedCall = gsap.delayedCall(animationStepDuration, () => {
      this.activeEl.style.display = activate ? 'block' : 'none';
      this.activeEl.style.pointerEvents = activate ? 'none' : '';
    });

    gsap.to(pixels, {
      display: 'none',
      duration: 0,
      delay: animationStepDuration,
      stagger: { each: staggerDuration, from: 'random' }
    });
  }

  handleEnter() {
    if (!this.isActive) this.animate(true);
  }

  handleLeave() {
    if (this.isActive && !this.opts.once) this.animate(false);
  }

  handleClick() {
    if (!this.isActive) this.animate(true);
    else if (this.isActive && !this.opts.once) this.animate(false);
  }
}
