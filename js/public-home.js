// js/public-home.js — Events, Gallery, Pathways on homepage
import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── EVENTS ─────────────────────────────────────────────────
async function loadEventsPreview() {
  const container = document.getElementById('events-preview-container');
  if (!container) return;
  try {
    const snap = await getDocs(query(collection(db, 'events'), orderBy('date', 'desc')));
    container.innerHTML = '';
    let rendered = 0;
    snap.forEach(doc => {
      const e = doc.data();
      if (e.type !== 'upcoming') return;
      rendered++;
      let dateStr = '—';
      if (e.date) {
        try {
          const d = e.date.toDate ? e.date.toDate() : new Date(e.date);
          dateStr = d.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
        } catch(_) { dateStr = String(e.date); }
      }
      let rolesHtml = '';
      if (e.rolesDisplay?.length) {
        rolesHtml = '<div class="event-roles-grid">' +
          e.rolesDisplay.map(r =>
            `<span class="role-tag"><strong>${r.role}</strong> ${r.name}</span>`
          ).join('') + '</div>';
      }
      const badgeClass = 'badge-upcoming';
      const badgeText  = 'Upcoming';
      container.innerHTML += `
        <div class="event-card fade-up active-event">
          <div class="event-date">${dateStr}</div>
          <div class="event-title">${e.title || 'Untitled Event'}</div>
          <div class="event-desc">${e.description || ''}</div>
          ${rolesHtml}
          <span class="event-badge ${badgeClass}" style="margin-top:1rem;">${badgeText}</span>
        </div>`;
    });
    if (!rendered) {
      container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;grid-column:1/-1;">No live events currently. Check back soon.</p>';
    } else {
      setTimeout(() => {
        container.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
      }, 80);
    }
  } catch(err) {
    console.warn('Events error:', err);
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;grid-column:1/-1;">Could not load events.</p>';
  }
}

// ── GALLERY — public photos visible without login (req 6) ──
async function loadGalleryPreview(isLoggedIn = false) {
  const container = document.getElementById('galleryPreview');
  if (!container) return;
  try {
    // Always fetch all, filter client-side to avoid needing composite Firestore index
    const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    container.innerHTML = '';
    if (snap.empty) {
      container.innerHTML = '<div class="gallery-placeholder">No photos yet.</div>'; return;
    }
    snap.forEach(doc => {
      const p = doc.data();
      if (!isLoggedIn && p.visibility !== 'public') return;
      const img = document.createElement('img');
      img.src = p.url; img.alt = p.caption || 'Unscripted';
      img.loading = 'lazy';
      img.onclick = () => openLightbox(p.url);
      container.appendChild(img);
    });
  } catch(err) {
    console.warn('Gallery error:', err);
    container.innerHTML = '<div class="gallery-placeholder">Gallery loading...</div>';
  }
}

onAuthStateChanged(auth, user => loadGalleryPreview(!!user));

function openLightbox(src) {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (lb && img) { img.src = src; lb.classList.add('open'); }
}
window.closeLightbox = () => document.getElementById('lightbox')?.classList.remove('open');

// ── PATHWAYS PREVIEW ───────────────────────────────────────
async function loadPathwaysPreview() {
  const container = document.getElementById('pathways-preview-grid');
  if (!container) return;
  try {
    const snap  = await getDocs(collection(db, 'pathways'));
    const order = ['L1','L2','L3K','L3H'];
    const data  = {};
    snap.forEach(d => data[d.id] = d.data());
    container.innerHTML = '';
    order.forEach((id, i) => {
      const p = data[id]; if (!p) return;
      const labels = ['Beginner','Intermediate','Advanced','Advanced'];
      const nums = ['01','02','L3K','L3H'];
      const card   = document.createElement('div');
      card.className = 'pathway-card fade-up';
      card.style.transitionDelay = (i * 0.1) + 's';
      card.innerHTML = `
        <div class="pathway-num">${nums[i]}</div>
        <h3>${p.name || id}</h3>
        <p>${p.description || ''}</p>
        <span class="pathway-tag">${labels[i]}</span>`;
      container.appendChild(card);
    });
    setTimeout(() => container.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible')), 100);
  } catch(err) {
    console.warn('Pathways error:', err);
  }
}

loadEventsPreview();
loadPathwaysPreview();
loadGalleryPreview(false); // Load public gallery immediately for guests
