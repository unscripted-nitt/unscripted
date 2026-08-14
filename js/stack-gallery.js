// js/stack-gallery.js — vanilla-JS port of the Stack React component
// (drag a photo away or click it to send it to the back of the stack).
// This project has no React/motion — Pointer Events + CSS transforms instead.
export class StackGallery {
  constructor(container, images, opts = {}) {
    this.container = container;
    this.opts = Object.assign(
      { randomRotation: false, sensitivity: 200, sendToBackOnClick: true },
      opts
    );
    this.cards = images.map((src, i) => ({ id: i + 1, src }));
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.classList.add('stack-container');
    this.cards.forEach((card, index) => this.renderCard(card, index));
  }

  renderCard(card, index) {
    const total = this.cards.length;

    const wrap = document.createElement('div');
    wrap.className = 'card-rotate';
    wrap.style.zIndex = String(total - index);

    const inner = document.createElement('div');
    inner.className = 'card';
    const randomRotate = this.opts.randomRotation ? Math.random() * 10 - 5 : 0;
    inner.style.transform = `rotateZ(${(total - index - 1) * 4 + randomRotate}deg) scale(${1 + index * 0.06 - total * 0.06})`;
    inner.style.transformOrigin = '90% 90%';

    const img = document.createElement('img');
    img.src = card.src;
    img.alt = 'Unscripted moment';
    img.className = 'card-image';
    img.loading = 'lazy';
    img.onclick = e => {
      // Only treat as "open lightbox" if this card is on top and wasn't dragged.
      if (index === total - 1 && window.openLightbox) window.openLightbox(card.src);
    };
    inner.appendChild(img);
    wrap.appendChild(inner);

    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;

    const onDown = e => {
      if (index !== total - 1) return; // only the top card is draggable
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      wrap.style.transition = 'none';
      wrap.setPointerCapture?.(e.pointerId);
    };
    const onMove = e => {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      wrap.style.transform = `translate(${dx}px, ${dy}px) rotateY(${dx / 4}deg) rotateX(${-dy / 4}deg)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      wrap.style.transition = '';
      if (Math.abs(dx) > this.opts.sensitivity || Math.abs(dy) > this.opts.sensitivity) {
        this.sendToBack(card.id);
      } else {
        wrap.style.transform = '';
      }
      dx = 0; dy = 0;
    };

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);

    if (this.opts.sendToBackOnClick) {
      wrap.addEventListener('click', () => {
        if (index === total - 1 && Math.abs(dx) < 4 && Math.abs(dy) < 4) this.sendToBack(card.id);
      });
    }

    this.container.appendChild(wrap);
  }

  sendToBack(id) {
    const idx = this.cards.findIndex(c => c.id === id);
    if (idx === -1) return;
    const [card] = this.cards.splice(idx, 1);
    this.cards.unshift(card);
    this.render();
  }
}
