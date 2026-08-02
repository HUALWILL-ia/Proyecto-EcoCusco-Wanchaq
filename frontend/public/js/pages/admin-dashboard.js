/**
 * pages/admin-dashboard.js — Dashboard administrativo (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  document.getElementById('fechaHoyAdmin').textContent = formatearFechaHora(new Date().toISOString());

  (async () => {
    try {
      const kpis = await obtenerKpisAdmin();
      renderKPIs(kpis);
      renderChart(kpis.recoleccionesPorZona);
      renderActividad(kpis.actividadReciente);
      renderFlota(kpis.flota);
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar el panel', err.message);
    }
  })();

  function renderKPIs(kpis) {
    document.getElementById('kpiGridAdmin').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon"><i class="ph ph-users" aria-hidden="true"></i></div>
        <span class="kpi-label">Usuarios activos</span>
        <span class="kpi-value">${kpis.usuariosActivos}</span>
        <span class="kpi-trend">De ${kpis.usuariosTotal} registrados</span>
      </div>
      <div class="kpi-card kpi-info">
        <div class="kpi-icon"><i class="ph ph-map-trifold" aria-hidden="true"></i></div>
        <span class="kpi-label">Zonas cubiertas</span>
        <span class="kpi-value">${kpis.zonas}</span>
        <span class="kpi-trend">Distrito de Wanchaq</span>
      </div>
      <div class="kpi-card ${kpis.incidenciasPendientes > 0 ? 'kpi-warning' : ''}">
        <div class="kpi-icon"><i class="ph ph-warning-circle" aria-hidden="true"></i></div>
        <span class="kpi-label">Incidencias pendientes</span>
        <span class="kpi-value">${kpis.incidenciasPendientes}</span>
        <span class="kpi-trend">De ${kpis.incidenciasTotal} reportadas</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="ph-fill ph-check-circle" aria-hidden="true"></i></div>
        <span class="kpi-label">Recolecciones del día</span>
        <span class="kpi-value">${kpis.recoleccionesHoy}</span>
        <span class="kpi-trend">Registros de la flota hoy</span>
      </div>
    `;
  }

  function renderChart(recoleccionesPorZona) {
    const ctx = document.getElementById('chartRecoleccionesZona');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: recoleccionesPorZona.map((z) => z.zona),
        datasets: [{
          label: 'Kg recolectados (aprox.)',
          data: recoleccionesPorZona.map((z) => z.kg),
          backgroundColor: '#2c9a54',
          borderRadius: 6,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e5ece7' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function renderActividad(actividadReciente) {
    const feed = document.getElementById('feedActividad');
    if (actividadReciente.length === 0) {
      feed.innerHTML = `<div class="empty-state"><h3>Sin actividad reciente</h3></div>`;
      return;
    }
    feed.innerHTML = actividadReciente.map((e) => `
      <li class="feed-item">
        <span class="feed-dot"></span>
        <div class="feed-content">
          <p>${e.texto}</p>
          <time>${formatearFechaHora(e.fecha)}</time>
        </div>
      </li>
    `).join('');
  }

  function renderFlota(camiones) {
    const tbody = document.getElementById('tablaFlotaResumen');
    tbody.innerHTML = camiones.map((c) => {
      const estadoBadge = c.estado === 'operativo'
        ? '<span class="badge badge-success">Operativo</span>'
        : '<span class="badge badge-warning">Mantenimiento</span>';
      return `
        <tr>
          <td>${c.placa}</td>
          <td>${c.modelo}</td>
          <td>${c.zonaNombre || '—'}</td>
          <td>${estadoBadge}</td>
          <td>
            <div class="progress-bar" style="width:100px; display:inline-block; vertical-align:middle;">
              <div class="progress-bar-fill" style="width:${c.nivelCombustible}%"></div>
            </div>
            <span class="text-muted" style="font-size:var(--fs-xs);"> ${c.nivelCombustible}%</span>
          </td>
        </tr>`;
    }).join('');
  }
})();
