/**
 * pages/operador-rutas.js — Detalle de rutas asignadas al operador (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  async function render() {
    const contenedor = document.getElementById('listaRutas');
    contenedor.innerHTML = `<div class="card"><div class="loading-overlay"><span class="spinner"></span> Cargando rutas...</div></div>`;

    let rutas = [];
    try {
      rutas = await obtenerRutasPorOperador();
    } catch (err) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><h3>No se pudieron cargar tus rutas</h3><p>${err.message}</p></div></div>`;
      return;
    }

    if (rutas.length === 0) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">🧭</div><h3>Sin rutas asignadas</h3><p>Tu coordinador aún no te ha asignado una ruta.</p></div></div>`;
      return;
    }

    contenedor.innerHTML = rutas.map((ruta) => `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="mb-0">${ruta.nombre}</h2>
            <span class="text-muted">Turno: ${ruta.turno}</span>
          </div>
          ${badgeEstadoRuta(ruta.estado)}
        </div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${ruta.progreso}%"></div></div>
        <p class="text-muted mt-2">${ruta.progreso}% completado — ${ruta.puntos.filter((p) => p.completado).length}/${ruta.puntos.length} puntos</p>
        <div class="table-wrapper mt-3">
          <table class="data-table">
            <thead><tr><th>#</th><th>Dirección</th><th>Estado</th></tr></thead>
            <tbody>
              ${ruta.puntos.map((p) => `
                <tr>
                  <td>${p.orden}</td>
                  <td>${p.direccion}</td>
                  <td>${p.completado ? '<span class="badge badge-success">Completado</span>' : '<span class="badge badge-neutral">Pendiente</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <a href="registro-recoleccion.html" class="btn btn-primary btn-sm mt-3">Registrar recolección</a>
      </div>
    `).join('');
  }

  render();
})();
