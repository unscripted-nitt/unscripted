import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLORS = ['#FF5722','#E64A19','#FF7043','#F4511E','#BF360C','#D84315'];
let allMembers = [];
let currentRole = 'all';

async function loadMembers() {
  try {
    const snap = await getDocs(query(collection(db,'members'), orderBy('name')));
    allMembers = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.isActive !== false) allMembers.push({id:doc.id,...d});
    });
    if (!allMembers.length) {
      document.getElementById('membersGrid').innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;padding:3rem;">Member list coming soon.</p>';
      return;
    }
    renderMembers(allMembers);
  } catch(e) {
    document.getElementById('membersGrid').innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;padding:3rem;">Could not load members.</p>';
  }
}

function renderMembers(members) {
  const grid = document.getElementById('membersGrid');
  if (!members.length) {
    grid.innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;padding:2rem;">No members found.</p>';
    return;
  }
  grid.innerHTML = members.map((m, i) => {
    const initials = (m.name||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const color = m.avatarColor || COLORS[i % COLORS.length];
    const roleLabel = { core:'Core Team', mentor:'Mentor', admin:'Admin' }[m.role] || 'Member';
    const roleColor = m.role === 'core' || m.role === 'admin' ? 'var(--orange)' : 'var(--text-light)';
    const avatarHtml = m.photoUrl
      ? '<img src="' + m.photoUrl + '" alt="' + (m.name||'Member') + '" />'
      : initials;
    const degreeHtml = m.degree
      ? '<div class="dept" style="font-size:0.72rem;">' + m.degree + '</div>'
      : '';
    const batchHtml = m.batch ? ' &middot; ' + m.batch : '';
    return '<div class="member-card fade-up visible">'
      + '<div class="avatar" style="background:' + (m.photoUrl ? 'transparent' : color) + '">' + avatarHtml + '</div>'
      + '<h3>' + (m.name||'Member') + '</h3>'
      + '<div class="dept">' + (m.department||m.dept||'') + batchHtml + '</div>'
      + degreeHtml
      + '<div class="video-meta" style="color:' + roleColor + ';margin-top:0.4rem;">' + roleLabel + '</div>'
      + '</div>';
  }).join('');
}

window.filterMembers = function(role, btn) {
  currentRole = role;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const search = document.getElementById('memberSearch').value.toLowerCase();
  applyFilters(search);
};

window.searchMembers = function(val) {
  applyFilters(val.toLowerCase());
};

function applyFilters(search) {
  let filtered = currentRole === 'all' ? allMembers : allMembers.filter(m => m.role === currentRole);
  if (search) filtered = filtered.filter(m =>
    (m.name||'').toLowerCase().includes(search) ||
    (m.dept||m.department||'').toLowerCase().includes(search)
  );
  renderMembers(filtered);
}

loadMembers();
