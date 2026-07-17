/**
 * pages/index.js — Landing page pública de EcoRutas Wanchaq
 */

document.addEventListener('DOMContentLoaded', async () => {
  insertarFooterInstitucional();

  const contenedorZonas = document.getElementById('zonesStrip');
  if (contenedorZonas && typeof obtenerZonas === 'function') {
    try {
      const zonas = await obtenerZonas();
      zonas.forEach((zona) => {
        const chip = document.createElement('span');
        chip.className = 'zone-chip';
        chip.textContent = zona.nombre;
        contenedorZonas.appendChild(chip);
      });
    } catch (err) {
      console.error('No se pudieron cargar las zonas:', err.message);
    }
  }

  const toggle = document.getElementById('btnNavToggle');
  const links = document.getElementById('navbarLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    });
  }
});
