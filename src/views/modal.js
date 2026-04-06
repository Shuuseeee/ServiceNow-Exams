import { $ } from '../lib/dom.js';

export function showModal(title, body, actions) {
  let html = '<div class="modal-title">' + title + '</div>';
  html += '<div class="modal-body">' + body + '</div>';
  html += '<div class="modal-actions">';
  actions.forEach(function (a, i) {
    html += '<button class="btn ' + a.cls + '" id="modalAct' + i + '">' + a.text + '</button>';
  });
  html += '</div>';
  document.getElementById('modalInner').innerHTML = html;
  document.getElementById('modal').classList.add('show');
  actions.forEach(function (a, i) {
    let btn = document.getElementById('modalAct' + i);
    if (btn) btn.onclick = a.action;
  });
}

export function showModalRaw(html) {
  document.getElementById('modalInner').innerHTML = html;
  document.getElementById('modal').classList.add('show');
}

export function hideModal() {
  document.getElementById('modal').classList.remove('show');
}

// Click outside to close
document.getElementById('modal').addEventListener('click', function (e) {
  if (e.target === document.getElementById('modal')) hideModal();
});

// Expose globally for onclick strings
window.hideModal = hideModal;
window.showModal = showModal;
window.showModalRaw = showModalRaw;
