/**
 * pages/operador-dashboard.js — Dashboard del operador de recolección (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  document.getElementById('fechaHoyOperador').textContent = formatearFechaHora(new Date().toISOString());

  (async () => {
    try {
      const [rutas, camion, incidenciasOperador, notificaciones, perfil] = await Promise.all([
        obtenerRutasPorOperador(),
        obtenerMiCamion(),
        obtenerMisIncidencias(),
        getNotificaciones(),
        obtenerMiPerfil(),
      ]);
      const rutaHoy = rutas.find((r) => r.estado !== 'completada') || rutas[0];

      renderKPIs(rutaHoy, camion, incidenciasOperador);
      renderProgresoRuta(rutaHoy);
      renderEstadoCamion(camion);
      renderNotificaciones(notificaciones);
      document.getElementById('avisoPasswordTemporal').style.display = perfil.usuario.debeCambiarPassword ? 'flex' : 'none';
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu panel', err.message);
    }
  })();

  function renderKPIs(ruta, camion, incidencias) {
    document.getElementById('kpiGridOperador').innerHTML = `
      <div class="kpi-card kpi-info">
        <div class="kpi-icon"><i class="ph ph-compass" aria-hidden="true"></i></div>
        <span class="kpi-label">Progreso de ruta</span>
        <span class="kpi-value">${ruta ? ruta.progreso : 0}%</span>
        <span class="kpi-trend">${ruta ? ruta.nombre : 'Sin ruta asignada'}</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="ph ph-truck" aria-hidden="true"></i></div>
        <span class="kpi-label">Estado del camión</span>
        <span class="kpi-value" style="font-size:var(--fs-xl);">${camion ? camion.placa : 'No asignado'}</span>
        <span class="kpi-trend">${camion ? camion.estado : '—'}</span>
      </div>
      <div class="kpi-card ${incidencias.length ? 'kpi-warning' : ''}">
        <div class="kpi-icon"><i class="ph ph-warning-circle" aria-hidden="true"></i></div>
        <span class="kpi-label">Incidencias reportadas</span>
        <span class="kpi-value">${incidencias.length}</span>
        <span class="kpi-trend">Historial personal</span>
      </div>
    `;
  }

  function renderProgresoRuta(ruta) {
    const contenedor = document.getElementById('progresoRuta');
    if (!ruta) {
      contenedor.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="ph ph-compass" aria-hidden="true"></i></div><h3>Sin ruta asignada hoy</h3><p>Contacta a tu coordinador si esperabas una asignación.</p></div>`;
      return;
    }
    contenedor.innerHTML = `
      <div class="flex justify-between items-center">
        <h3 class="mb-0">${ruta.nombre}</h3>
        ${badgeEstadoRuta(ruta.estado)}
      </div>
      <p class="text-muted">Turno: ${ruta.turno}</p>
      <div class="progress-bar mt-2"><div class="progress-bar-fill" style="width:${ruta.progreso}%"></div></div>
      <p class="text-muted mt-2 mb-3">${ruta.progreso}% completado</p>
      <ul class="feed-list">
        ${ruta.puntos.map((p) => `
          <li class="feed-item">
            <span class="feed-dot" style="background:${p.completado ? 'var(--color-primary-500)' : 'var(--color-border-strong)'};"></span>
            <div class="feed-content">
              <p>${p.completado ? '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>' : '<i class="ph ph-hourglass" aria-hidden="true"></i>'} ${p.direccion}</p>
            </div>
          </li>
        `).join('')}
      </ul>
      <a href="rutas.html" class="btn btn-outline btn-sm mt-2">Ver detalle completo</a>
    `;
  }

  function renderEstadoCamion(camion) {
    const contenedor = document.getElementById('estadoCamion');
    if (!camion) {
      contenedor.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="ph ph-truck" aria-hidden="true"></i></div><h3>Sin camión asignado</h3></div>`;
      return;
    }
    contenedor.innerHTML = `
      <p><strong>Placa:</strong> ${camion.placa}</p>
      <p><strong>Modelo:</strong> ${camion.modelo}</p>
      <p><strong>Capacidad:</strong> ${camion.capacidadKg} kg</p>
      <div class="progress-bar mt-2"><div class="progress-bar-fill" style="width:${camion.nivelCombustible}%"></div></div>
      <p class="text-muted mt-2 mb-0">Combustible: ${camion.nivelCombustible}%</p>
    `;
  }

  function renderNotificaciones(lista) {
    const feed = document.getElementById('feedNotificacionesOperador');
    if (lista.length === 0) {
      feed.innerHTML = `<div class="empty-state"><h3>Sin notificaciones</h3></div>`;
      return;
    }
    feed.innerHTML = lista.slice(0, 4).map((n) => `
      <li class="feed-item">
        <span class="feed-dot"></span>
        <div class="feed-content">
          <p>${n.titulo}</p>
          <time>${formatearFecha(n.fecha)}</time>
        </div>
      </li>
    `).join('');
  }
})();
