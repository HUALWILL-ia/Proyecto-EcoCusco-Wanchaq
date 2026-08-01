/**
 * pages/admin-historial-recolecciones.js — Historial consolidado de recolecciones (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  const POR_PAGINA = 8;
  let paginaActual = 1;
  let filtros = { operador: '', tipo: '' };
  let operadores = [];
  let todosRegistros = [];

  const selectOperador = document.getElementById('filtroOperador');
  const selectTipo = document.getElementById('filtroTipoResiduo');

  function nombreOperador(id) {
    const op = operadores.find((o) => o.id === id);
    return op ? `${op.nombres} ${op.apellidos}` : '—';
  }

  function listaFiltrada() {
    return todosRegistros
      .filter((r) => !filtros.operador || r.operador === filtros.operador)
      .filter((r) => !filtros.tipo || r.tipoResiduo === filtros.tipo)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  function renderKPIs() {
    const totalKg = todosRegistros.reduce((sum, r) => sum + r.kg, 0);
    const hoy = new Date().toDateString();
    const kgHoy = todosRegistros.filter((r) => new Date(r.fecha).toDateString() === hoy).reduce((sum, r) => sum + r.kg, 0);

    document.getElementById('kpiHistorial').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon">⚖️</div>
        <span class="kpi-label">Total histórico</span>
        <span class="kpi-value">${totalKg.toLocaleString('es-PE')} kg</span>
      </div>
      <div class="kpi-card kpi-info">
        <div class="kpi-icon">📅</div>
        <span class="kpi-label">Recolectado hoy</span>
        <span class="kpi-value">${kgHoy.toLocaleString('es-PE')} kg</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📋</div>
        <span class="kpi-label">Registros totales</span>
        <span class="kpi-value">${todosRegistros.length}</span>
      </div>
    `;
  }

  function render() {
    renderKPIs();
    const lista = listaFiltrada();
    const tbody = document.getElementById('tablaHistorialAdmin');

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>Sin registros con este filtro</h3></div></td></tr>`;
      document.getElementById('paginacionHistorial').innerHTML = '';
      return;
    }

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginaLista = lista.slice(inicio, inicio + POR_PAGINA);

    tbody.innerHTML = paginaLista.map((r) => `
      <tr>
        <td>${formatearFechaHora(r.fecha)}</td>
        <td>${nombreOperador(r.operador)}</td>
        <td>${r.rutaNombre}</td>
        <td><span class="badge badge-neutral">${r.tipoResiduo}</span></td>
        <td>${r.kg} kg</td>
        <td>${r.observaciones || '—'}</td>
      </tr>
    `).join('');

    renderPaginacion(document.getElementById('paginacionHistorial'), lista.length, POR_PAGINA, paginaActual, (p) => {
      paginaActual = p;
      render();
    });
  }

  async function cargar() {
    const tbody = document.getElementById('tablaHistorialAdmin');
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><span class="spinner"></span> Cargando historial...</div></div></td></tr>`;
    try {
      const [usuarios, registros, tipos] = await Promise.all([getUsuarios(), getRecolecciones(), obtenerTiposResiduo()]);
      operadores = usuarios.filter((u) => u.rol === 'operador');
      todosRegistros = registros;

      operadores.forEach((op) => {
        const opt = document.createElement('option');
        opt.value = op.id;
        opt.textContent = `${op.nombres} ${op.apellidos}`;
        selectOperador.appendChild(opt);
      });
      tipos.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.nombre;
        opt.textContent = t.nombre;
        selectTipo.appendChild(opt);
      });

      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No se pudo cargar el historial</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  cargar();

  selectOperador.addEventListener('change', (ev) => { filtros.operador = ev.target.value; paginaActual = 1; render(); });
  selectTipo.addEventListener('change', (ev) => { filtros.tipo = ev.target.value; paginaActual = 1; render(); });
})();
