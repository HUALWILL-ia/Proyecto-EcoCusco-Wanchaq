/**
 * pages/ciudadano-historial-reciclaje.js — Historial de reciclaje del ciudadano (HU-29, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  const POR_PAGINA = 8;
  let paginaActual = 1;
  const filtros = { tipoResiduo: '', desde: '', hasta: '' };

  const selectTipo = document.getElementById('filtroTipoResiduo');
  const inputDesde = document.getElementById('filtroDesde');
  const inputHasta = document.getElementById('filtroHasta');
  const tbody = document.getElementById('tablaHistorialReciclaje');
  const paginacion = document.getElementById('paginacionReciclaje');

  async function cargar() {
    tbody.innerHTML = `<tr><td colspan="5"><div class="loading-overlay"><span class="spinner"></span> Cargando historial...</div></td></tr>`;
    try {
      const respuesta = await obtenerHistorialReciclajeCiudadano({
        tipoResiduo: filtros.tipoResiduo,
        desde: filtros.desde,
        hasta: filtros.hasta,
        pagina: paginaActual,
        porPagina: POR_PAGINA,
      });
      render(respuesta.data, respuesta.paginacion);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><h3>No se pudo cargar tu historial</h3><p>${err.message}</p></div></td></tr>`;
      paginacion.innerHTML = '';
    }
  }

  function render(lista, paginacionInfo) {
    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">♻️</div><h3>Sin registros</h3><p>Todavía no hay recolecciones registradas en tu zona con este filtro.</p></div></td></tr>`;
      paginacion.innerHTML = '';
      return;
    }

    tbody.innerHTML = lista.map((r) => `
      <tr>
        <td>${formatearFechaHora(r.fecha)}</td>
        <td>${r.zona || '—'}</td>
        <td><span class="badge badge-neutral">${r.tipoResiduo}</span></td>
        <td>${r.kg} kg</td>
        <td>${badgeEstadoRuta(r.estado)}</td>
      </tr>
    `).join('');

    renderPaginacion(paginacion, paginacionInfo.total, paginacionInfo.porPagina, paginacionInfo.pagina, (p) => {
      paginaActual = p;
      cargar();
    });
  }

  (async () => {
    try {
      const tipos = await obtenerTiposResiduo();
      tipos.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.nombre;
        opt.textContent = t.nombre;
        selectTipo.appendChild(opt);
      });
    } catch (err) {
      mostrarToast('error', 'No se pudieron cargar los tipos de residuo', err.message);
    }
  })();

  cargar();

  selectTipo.addEventListener('change', (ev) => { filtros.tipoResiduo = ev.target.value; paginaActual = 1; cargar(); });
  inputDesde.addEventListener('change', (ev) => { filtros.desde = ev.target.value; paginaActual = 1; cargar(); });
  inputHasta.addEventListener('change', (ev) => { filtros.hasta = ev.target.value; paginaActual = 1; cargar(); });
})();
