/**
 * pages/admin-incidencias.js — Gestión centralizada de incidencias (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  const POR_PAGINA = 8;
  let paginaActual = 1;
  let filtros = { estado: '', prioridad: '', rol: '' };
  let idSeleccionado = null;
  let todasIncidencias = [];
  let todosUsuarios = [];

  function nombreReportante(id) {
    const u = todosUsuarios.find((x) => x.id === id);
    return u ? `${u.nombres} ${u.apellidos}` : 'Usuario eliminado';
  }

  function listaFiltrada() {
    return todasIncidencias
      .filter((i) => !filtros.estado || i.estado === filtros.estado)
      .filter((i) => !filtros.prioridad || i.prioridad === filtros.prioridad)
      .filter((i) => !filtros.rol || i.rolReporta === filtros.rol)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  function badgePrioridad(p) {
    const mapa = { alta: 'badge-danger', media: 'badge-warning', baja: 'badge-neutral' };
    return `<span class="badge ${mapa[p] || 'badge-neutral'}">${p}</span>`;
  }

  function render() {
    const lista = listaFiltrada();
    const tbody = document.getElementById('tablaIncidenciasAdmin');

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon"><i class="ph ph-warning-circle" aria-hidden="true"></i></div><h3>Sin incidencias con este filtro</h3></div></td></tr>`;
      document.getElementById('paginacionIncidencias').innerHTML = '';
      return;
    }

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginaLista = lista.slice(inicio, inicio + POR_PAGINA);

    tbody.innerHTML = paginaLista.map((i) => `
      <tr>
        <td>${i.id}</td>
        <td>${i.tipo}</td>
        <td>${i.zona}</td>
        <td>${nombreReportante(i.reportadoPor)} <span class="text-muted">(${i.rolReporta})</span></td>
        <td>${badgePrioridad(i.prioridad)}</td>
        <td>${formatearFecha(i.fecha)}</td>
        <td>${badgeEstadoIncidencia(i.estado)}</td>
        <td><button class="btn btn-outline btn-sm" data-id="${i.id}">Ver / actualizar</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
    });

    renderPaginacion(document.getElementById('paginacionIncidencias'), lista.length, POR_PAGINA, paginaActual, (p) => {
      paginaActual = p;
      render();
    });
  }

  async function cargar() {
    const tbody = document.getElementById('tablaIncidenciasAdmin');
    tbody.innerHTML = `<tr><td colspan="8"><div class="loading-overlay"><span class="spinner"></span> Cargando incidencias...</div></td></tr>`;
    try {
      [todasIncidencias, todosUsuarios] = await Promise.all([getIncidencias(), getUsuarios()]);
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h3>No se pudieron cargar las incidencias</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  cargar();

  ['filtroEstado', 'filtroPrioridad', 'filtroRolReporta'].forEach((idEl, i) => {
    const claves = ['estado', 'prioridad', 'rol'];
    document.getElementById(idEl).addEventListener('change', (ev) => {
      filtros[claves[i]] = ev.target.value;
      paginaActual = 1;
      render();
    });
  });

  async function abrirDetalle(id) {
    const incidencia = todasIncidencias.find((i) => String(i.id) === String(id));
    if (!incidencia) return;
    idSeleccionado = id;

    document.getElementById('detalleIncidenciaContenido').innerHTML = `
      <p><strong>Tipo:</strong> ${incidencia.tipo}</p>
      <p><strong>Zona:</strong> ${incidencia.zona} — ${incidencia.direccion}</p>
      <p><strong>Descripción:</strong> ${incidencia.descripcion}</p>
      <p><strong>Reportado por:</strong> ${nombreReportante(incidencia.reportadoPor)} (${incidencia.rolReporta})</p>
      <p><strong>Fecha:</strong> ${formatearFechaHora(incidencia.fecha)}</p>
      <p><strong>Prioridad:</strong> ${badgePrioridad(incidencia.prioridad)}</p>
      <p class="mb-0"><strong>Historial de estados:</strong></p>
      <ul class="feed-list" id="historialIncidenciaDetalle"><li class="feed-item"><div class="feed-content"><p class="text-muted">Cargando...</p></div></li></ul>
    `;
    document.getElementById('nuevoEstadoIncidencia').value = incidencia.estado;
    abrirModal('modalDetalleIncidencia');

    try {
      const historial = await obtenerHistorialIncidencia(id);
      const lista = document.getElementById('historialIncidenciaDetalle');
      lista.innerHTML = historial.length === 0
        ? '<li class="feed-item"><div class="feed-content"><p class="text-muted">Sin cambios de estado registrados aún.</p></div></li>'
        : historial.map((h) => `
            <li class="feed-item">
              <span class="feed-dot"></span>
              <div class="feed-content">
                <p>${h.estadoAnterior} → ${h.estadoNuevo} ${h.usuarioNombre ? `— ${h.usuarioNombre}` : ''}</p>
                <time>${formatearFechaHora(h.fecha)}</time>
              </div>
            </li>
          `).join('');
    } catch (err) {
      const lista = document.getElementById('historialIncidenciaDetalle');
      if (lista) lista.innerHTML = `<li class="feed-item"><div class="feed-content"><p class="text-muted">No se pudo cargar el historial.</p></div></li>`;
    }
  }

  document.getElementById('btnGuardarEstadoIncidencia').addEventListener('click', async () => {
    const nuevoEstado = document.getElementById('nuevoEstadoIncidencia').value;
    try {
      await actualizarEstadoIncidencia(idSeleccionado, { estado: nuevoEstado });
      mostrarToast('success', 'Incidencia actualizada', `Estado cambiado a "${nuevoEstado}".`);
      cerrarModal('modalDetalleIncidencia');
      await cargar();
    } catch (err) {
      mostrarToast('error', 'No se pudo actualizar la incidencia', err.message);
    }
  });
})();
