/**
 * pages/ciudadano-dashboard.js — Dashboard del ciudadano (Fase 2, backend real)
 */

const NIVELES_ECOLOGICOS = ['Eco Semilla', 'Eco Bronce', 'Eco Plata', 'Eco Oro', 'Eco Platino'];

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  document.getElementById('saludoUsuario').textContent = `Hola, ${sesion.usuario.nombres} `;
  document.getElementById('fechaHoy').textContent = formatearFechaHora(new Date().toISOString());

  (async () => {
    try {
      const [{ usuario: usuarioCompleto }, incidencias] = await Promise.all([
        obtenerMiPerfil(),
        obtenerMisIncidencias(),
      ]);
      const incidenciasActivas = incidencias.filter((i) => i.estado !== 'resuelta');

      renderKPIs(usuarioCompleto, incidenciasActivas.length);
      await renderProximaRecoleccion(usuarioCompleto.zona);
      renderNivelEcologico(usuarioCompleto);
      renderFeedIncidencias(incidencias);
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu panel', err.message);
    }
  })();

  function renderKPIs(usuario, incidenciasActivas) {
    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon"><i class="ph ph-recycle" aria-hidden="true"></i></div>
        <span class="kpi-label">Kg reciclados</span>
        <span class="kpi-value">${(usuario.kgReciclados ?? 0).toFixed(1)} kg</span>
        <span class="kpi-trend up"><i class="ph-fill ph-trend-up" aria-hidden="true"></i> Acumulado histórico</span>
      </div>
      <div class="kpi-card kpi-info">
        <div class="kpi-icon"><i class="ph-fill ph-plant" aria-hidden="true"></i></div>
        <span class="kpi-label">Nivel ecológico</span>
        <span class="kpi-value" style="font-size:var(--fs-xl);">${usuario.nivelEcologico || 'Eco Semilla'}</span>
        <span class="kpi-trend">Zona: ${usuario.zona || '—'}</span>
      </div>
      <div class="kpi-card ${incidenciasActivas > 0 ? 'kpi-warning' : ''}">
        <div class="kpi-icon"><i class="ph ph-warning-circle" aria-hidden="true"></i></div>
        <span class="kpi-label">Incidencias activas</span>
        <span class="kpi-value">${incidenciasActivas}</span>
        <span class="kpi-trend">${incidenciasActivas > 0 ? 'En seguimiento' : 'Sin pendientes'}</span>
      </div>
    `;
  }

  async function renderProximaRecoleccion(nombreZona) {
    const contenedor = document.getElementById('proximaRecoleccion');
    let zona = null;
    try {
      zona = await getZonaPorNombre(nombreZona);
    } catch (err) {
      contenedor.innerHTML = `<div class="empty-state"><h3>No se pudo cargar tu zona</h3><p>${err.message}</p></div>`;
      return;
    }

    if (!zona) {
      contenedor.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="ph ph-map-trifold" aria-hidden="true"></i></div><h3>Zona no configurada</h3><p>Actualiza tu perfil para ver tu horario de recolección.</p></div>`;
      return;
    }

    contenedor.innerHTML = `
      <div class="flex items-center gap-4" style="flex-wrap:wrap;">
        <div class="kpi-icon" style="width:56px;height:56px;font-size:1.6rem;"><i class="ph ph-truck" aria-hidden="true"></i></div>
        <div>
          <h3 style="margin-bottom:4px;">${zona.nombre}</h3>
          <p class="mb-0">${zona.horarioRecoleccion}</p>
          <span class="badge badge-info mt-2">${zona.tipoResiduoPrincipal}</span>
        </div>
      </div>
      <hr>
      <p class="text-muted mb-0"><i class="ph ph-map-pin" aria-hidden="true"></i> Referencia: ${zona.referencia}</p>
    `;
  }

  function renderNivelEcologico(usuario) {
    const nivel = usuario.nivelEcologico || 'Eco Semilla';
    const idx = Math.max(NIVELES_ECOLOGICOS.indexOf(nivel), 0);
    const porcentaje = Math.round(((idx + 1) / NIVELES_ECOLOGICOS.length) * 100);

    document.getElementById('nombreNivel').textContent = nivel;
    document.getElementById('barraNivel').style.width = `${porcentaje}%`;
    document.getElementById('descripcionNivel').textContent =
      idx < NIVELES_ECOLOGICOS.length - 1
        ? `Te falta poco para alcanzar ${NIVELES_ECOLOGICOS[idx + 1]}`
        : '¡Has alcanzado el máximo nivel ecológico!';
  }

  function renderFeedIncidencias(incidencias) {
    const feed = document.getElementById('feedIncidencias');
    if (incidencias.length === 0) {
      feed.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="ph-fill ph-check-circle" aria-hidden="true"></i></div><h3>Sin incidencias reportadas</h3></div>`;
      return;
    }
    feed.innerHTML = incidencias.slice(0, 4).map((inc) => `
      <li class="feed-item">
        <span class="feed-dot"></span>
        <div class="feed-content">
          <p>${inc.tipo} — ${badgeEstadoIncidencia(inc.estado)}</p>
          <time>${formatearFecha(inc.fecha)}</time>
        </div>
      </li>
    `).join('');
  }
})();
