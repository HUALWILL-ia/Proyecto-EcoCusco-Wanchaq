/**
 * pages/ciudadano-historial-incidencias.js — Historial de incidencias del ciudadano (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  const POR_PAGINA = 5;
  let paginaActual = 1;
  let filtroEstado = '';
  let todasIncidencias = [];

  function listaFiltrada() {
    return filtroEstado ? todasIncidencias.filter((i) => i.estado === filtroEstado) : todasIncidencias;
  }

  function render() {
    const lista = listaFiltrada();
    const tbody = document.getElementById('tablaIncidencias');

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📭</div><h3>Sin incidencias</h3><p>No tienes reportes con este filtro.</p></div></td></tr>`;
      document.getElementById('paginacion').innerHTML = '';
      return;
    }

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginaLista = lista.slice(inicio, inicio + POR_PAGINA);

    tbody.innerHTML = paginaLista.map((i) => `
      <tr>
        <td>${i.id}</td>
        <td>${i.tipo}</td>
        <td>${i.zona}</td>
        <td>${formatearFecha(i.fecha)}</td>
        <td>${badgeEstadoIncidencia(i.estado)}</td>
      </tr>
    `).join('');

    renderPaginacion(document.getElementById('paginacion'), lista.length, POR_PAGINA, paginaActual, (p) => {
      paginaActual = p;
      render();
    });
  }

  (async () => {
    try {
      todasIncidencias = (await obtenerMisIncidencias())
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      render();
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu historial', err.message);
    }
  })();

  document.getElementById('filtroEstado').addEventListener('change', (ev) => {
    filtroEstado = ev.target.value;
    paginaActual = 1;
    render();
  });
})();
