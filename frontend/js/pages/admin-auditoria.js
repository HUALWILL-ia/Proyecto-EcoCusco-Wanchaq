/**
 * pages/admin-auditoria.js — Visualización de auditoría (Fase 3, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  let paginaActual = 1;
  const POR_PAGINA = 15;
  const filtros = { tabla: '', desde: '', hasta: '' };
  let registrosActuales = [];

  const ETIQUETAS_OPERACION = {
    INSERT: '<span class="badge badge-success">INSERT</span>',
    UPDATE: '<span class="badge badge-info">UPDATE</span>',
    DELETE: '<span class="badge badge-danger">DELETE</span>',
  };

  async function cargarTablasDisponibles(tablasDisponibles) {
    const select = document.getElementById('filtroTabla');
    if (select.dataset.cargado) return;
    tablasDisponibles.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
    select.dataset.cargado = '1';
  }

  async function cargar() {
    const tbody = document.getElementById('tablaAuditoria');
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><span class="spinner"></span> Cargando auditoría...</div></td></tr>`;

    try {
      const respuesta = await obtenerAuditoria({ ...filtros, pagina: paginaActual, porPagina: POR_PAGINA });
      registrosActuales = respuesta.data;
      await cargarTablasDisponibles(respuesta.tablasDisponibles || []);
      render(respuesta.paginacion);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No se pudo cargar la auditoría</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  function render(paginacion) {
    const tbody = document.getElementById('tablaAuditoria');

    if (registrosActuales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🕵️</div><h3>Sin registros de auditoría con este filtro</h3></div></td></tr>`;
      document.getElementById('paginacionAuditoria').innerHTML = '';
      return;
    }

    tbody.innerHTML = registrosActuales.map((a) => `
      <tr>
        <td>${formatearFechaHora(a.fecha)}</td>
        <td><span class="badge badge-neutral">${a.tablaAfectada}</span></td>
        <td>${ETIQUETAS_OPERACION[a.operacion] || a.operacion}</td>
        <td>#${a.registroId ?? '—'}</td>
        <td>${a.usuarioNombre || '<span class="text-muted">Sistema</span>'}</td>
        <td><button class="btn btn-outline btn-sm" data-id="${a.id}">Ver JSON</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => mostrarDetalle(btn.dataset.id));
    });

    renderPaginacion(document.getElementById('paginacionAuditoria'), paginacion.total, POR_PAGINA, paginacion.pagina, (p) => {
      paginaActual = p;
      cargar();
    });
  }

  function mostrarDetalle(id) {
    const registro = registrosActuales.find((a) => String(a.id) === String(id));
    if (!registro) return;

    document.getElementById('tituloDetalleAuditoria').textContent = `${registro.tablaAfectada} · ${registro.operacion} · #${registro.registroId ?? '—'}`;
    document.getElementById('datosAnteriores').textContent = registro.datosAnteriores ? JSON.stringify(registro.datosAnteriores, null, 2) : '(sin datos previos — INSERT)';
    document.getElementById('datosNuevos').textContent = registro.datosNuevos ? JSON.stringify(registro.datosNuevos, null, 2) : '(sin datos nuevos — DELETE)';
    abrirModal('modalDetalleAuditoria');
  }

  cargar();

  document.getElementById('filtroTabla').addEventListener('change', (ev) => {
    filtros.tabla = ev.target.value;
    paginaActual = 1;
    cargar();
  });
  document.getElementById('filtroDesde').addEventListener('change', (ev) => {
    filtros.desde = ev.target.value;
    paginaActual = 1;
    cargar();
  });
  document.getElementById('filtroHasta').addEventListener('change', (ev) => {
    filtros.hasta = ev.target.value;
    paginaActual = 1;
    cargar();
  });
})();
