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
  const acciones = document.getElementById('navbarActionsPublic');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const abrir = links.style.display !== 'flex';
      links.style.display = abrir ? 'flex' : 'none';
      if (acciones) acciones.style.display = abrir ? 'flex' : 'none';
    });
  }
});
