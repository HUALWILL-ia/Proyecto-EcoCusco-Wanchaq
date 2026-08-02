/**
 * pages/ciudadano-notificaciones.js — Notificaciones del ciudadano (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  const ICONOS = { success: '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>', warning: '<i class="ph ph-warning" aria-hidden="true"></i>', info: '<i class="ph ph-info" aria-hidden="true"></i>', error: '<i class="ph ph-prohibit" aria-hidden="true"></i>' };
  let notificaciones = [];

  async function cargar() {
    try {
      notificaciones = (await getNotificaciones()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      render();
    } catch (err) {
      mostrarToast('error', 'No se pudieron cargar tus notificaciones', err.message);
    }
  }

  function render() {
    const contenedor = document.getElementById('listaNotificaciones');

    if (notificaciones.length === 0) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon"><i class="ph ph-bell" aria-hidden="true"></i></div><h3>No tienes notificaciones</h3><p>Aquí verás avisos sobre recolecciones e incidencias.</p></div></div>`;
      return;
    }

    contenedor.innerHTML = notificaciones.map((n) => `
      <div class="card" style="border-left:4px solid ${n.leida ? 'var(--color-border)' : 'var(--color-primary-500)'}; cursor:pointer;" data-id="${n.id}">
        <div class="flex justify-between items-center" style="align-items:flex-start;">
          <div class="flex gap-3" style="align-items:flex-start;">
            <span style="font-size:1.3rem;">${ICONOS[n.tipo] || '<i class="ph ph-info" aria-hidden="true"></i>'}</span>
            <div>
              <strong>${n.titulo}</strong> ${!n.leida ? '<span class="badge badge-info">Nueva</span>' : ''}
              <p class="mb-0 mt-2">${n.mensaje}</p>
              <span class="text-muted" style="font-size:var(--fs-xs);">${formatearFechaHora(n.fecha)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    contenedor.querySelectorAll('[data-id]').forEach((card) => {
      card.addEventListener('click', () => marcarLeida(card.dataset.id));
    });
  }

  async function marcarLeida(id) {
    const notificacion = notificaciones.find((n) => String(n.id) === String(id));
    if (!notificacion || notificacion.leida) return;
    try {
      await marcarNotificacionLeida(id);
      notificacion.leida = true;
      render();
    } catch (err) {
      mostrarToast('error', 'No se pudo actualizar la notificación', err.message);
    }
  }

  document.getElementById('btnMarcarTodas').addEventListener('click', async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      notificaciones.forEach((n) => { n.leida = true; });
      render();
      mostrarToast('success', 'Listo', 'Todas tus notificaciones se marcaron como leídas.');
    } catch (err) {
      mostrarToast('error', 'No se pudo completar la acción', err.message);
    }
  });

  cargar();
})();
