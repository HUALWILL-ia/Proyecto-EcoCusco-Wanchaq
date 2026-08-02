/**
 * pages/politicas-privacidad.js — Página pública de Términos y Política de Privacidad
 */

document.addEventListener('DOMContentLoaded', () => {
  insertarFooterInstitucional();

  const toggle = document.getElementById('btnNavToggle');
  const links = document.getElementById('navbarLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    });
  }
});
