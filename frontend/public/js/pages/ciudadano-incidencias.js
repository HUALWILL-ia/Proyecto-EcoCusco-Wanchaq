/**
 * pages/ciudadano-incidencias.js — Incidencias del ciudadano: "Reportar nueva"
 * y "Mis incidencias" viven en una sola pantalla (incidencias.html) con tabs
 * en JS vanilla, sin recargar la página.
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  /* ---------------------------------------------------------------------- */
  /* Tabs                                                                    */
  /* ---------------------------------------------------------------------- */

  const botonesTab = {
    reportar: document.getElementById('tabBtnReportar'),
    'mis-incidencias': document.getElementById('tabBtnMisIncidencias'),
  };
  const panelesTab = {
    reportar: document.getElementById('panelReportar'),
    'mis-incidencias': document.getElementById('panelMisIncidencias'),
  };

  let historialCargado = false;

  function activarTab(nombre) {
    Object.keys(botonesTab).forEach((clave) => {
      const esActivo = clave === nombre;
      botonesTab[clave].classList.toggle('active', esActivo);
      botonesTab[clave].setAttribute('aria-selected', String(esActivo));
      panelesTab[clave].classList.toggle('active', esActivo);
    });
    if (nombre === 'mis-incidencias' && !historialCargado) {
      historialCargado = true;
      cargarMisIncidencias();
    }
  }

  botonesTab.reportar.addEventListener('click', () => activarTab('reportar'));
  botonesTab['mis-incidencias'].addEventListener('click', () => activarTab('mis-incidencias'));
  document.getElementById('btnIrAReportar').addEventListener('click', () => activarTab('reportar'));
  document.getElementById('btnVerMisIncidencias').addEventListener('click', () => {
    cerrarModal('modalConfirmacion');
    activarTab('mis-incidencias');
  });

  if (window.location.hash === '#mis-incidencias') activarTab('mis-incidencias');

  /* ---------------------------------------------------------------------- */
  /* Panel "Reportar nueva"                                                  */
  /* ---------------------------------------------------------------------- */

  const selectZona = document.getElementById('zona');
  let usuario = null;

  (async () => {
    try {
      const perfil = await obtenerMiPerfil();
      usuario = perfil.usuario;
      const zonas = await obtenerZonas();
      zonas.forEach((z) => {
        const opt = document.createElement('option');
        opt.value = z.nombre;
        opt.textContent = z.nombre;
        if (z.nombre === usuario.zona) opt.selected = true;
        selectZona.appendChild(opt);
      });
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu información', err.message);
    }
  })();

  const campos = {
    tipo: document.getElementById('tipo'),
    zona: document.getElementById('zona'),
    direccion: document.getElementById('direccion'),
    descripcion: document.getElementById('descripcion'),
  };
  const errores = {
    tipo: document.getElementById('errorTipo'),
    zona: document.getElementById('errorZona'),
    direccion: document.getElementById('errorDireccion'),
    descripcion: document.getElementById('errorDescripcion'),
  };

  function limpiarErrores() {
    Object.keys(campos).forEach((k) => {
      campos[k].classList.remove('is-invalid');
      errores[k].textContent = '';
      errores[k].classList.remove('show');
    });
  }
  function marcarError(campo, mensaje) {
    campos[campo].classList.add('is-invalid');
    errores[campo].textContent = mensaje;
    errores[campo].classList.add('show');
  }

  const zonaCargaFoto = crearZonaCarga(document.getElementById('zonaCargaFotoIncidencia'), {
    accept: 'image/*',
    capture: 'environment',
    maxSizeMB: 5,
    esImagen: true,
    textoFormatos: 'JPG, PNG o WEBP · máx. 5MB',
  });

  const form = document.getElementById('formIncidencia');
  const btn = document.getElementById('btnEnviarIncidencia');
  const btnTexto = document.getElementById('btnEnviarIncidenciaTexto');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores();
    let valido = true;

    const vTipo = validarCampoObligatorio(campos.tipo.value);
    if (!vTipo.valido) { marcarError('tipo', vTipo.mensaje); valido = false; }

    const vZona = validarCampoObligatorio(campos.zona.value);
    if (!vZona.valido) { marcarError('zona', vZona.mensaje); valido = false; }

    const vDireccion = validarCampoObligatorio(campos.direccion.value);
    if (!vDireccion.valido) { marcarError('direccion', vDireccion.mensaje); valido = false; }

    const vDescripcion = validarCampoObligatorio(campos.descripcion.value);
    if (!vDescripcion.valido) { marcarError('descripcion', vDescripcion.mensaje); valido = false; }

    if (!valido) return;

    btn.disabled = true;
    btnTexto.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
      const datosFormulario = new FormData();
      datosFormulario.append('tipo', campos.tipo.value);
      datosFormulario.append('zona', campos.zona.value);
      datosFormulario.append('direccion', campos.direccion.value.trim());
      datosFormulario.append('descripcion', campos.descripcion.value.trim());
      const archivoFoto = zonaCargaFoto.obtenerArchivo();
      if (archivoFoto) datosFormulario.append('foto', archivoFoto);

      await crearIncidencia(datosFormulario);

      form.reset();
      if (usuario) selectZona.value = usuario.zona;
      zonaCargaFoto.limpiar();
      historialCargado = false; // fuerza recargar el historial la próxima vez que se abra la pestaña
      abrirModal('modalConfirmacion');
      mostrarToast('success', 'Reporte enviado', 'Tu incidencia fue registrada correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo enviar el reporte', err.message);
    } finally {
      btn.disabled = false;
      btnTexto.textContent = 'Enviar reporte';
    }
  });

  /* ---------------------------------------------------------------------- */
  /* Panel "Mis incidencias"                                                 */
  /* ---------------------------------------------------------------------- */

  const POR_PAGINA = 5;
  let paginaActual = 1;
  let filtroEstado = '';
  let todasIncidencias = [];

  function listaFiltrada() {
    return filtroEstado ? todasIncidencias.filter((i) => i.estado === filtroEstado) : todasIncidencias;
  }

  function renderHistorial() {
    const lista = listaFiltrada();
    const tbody = document.getElementById('tablaIncidencias');

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon"><i class="ph ph-tray" aria-hidden="true"></i></div><h3>Sin incidencias</h3><p>No tienes reportes con este filtro.</p></div></td></tr>`;
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
      renderHistorial();
    });
  }

  async function cargarMisIncidencias() {
    const tbody = document.getElementById('tablaIncidencias');
    tbody.innerHTML = `<tr><td colspan="5"><div class="loading-overlay"><span class="spinner"></span> Cargando...</div></td></tr>`;
    try {
      todasIncidencias = (await obtenerMisIncidencias())
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      renderHistorial();
    } catch (err) {
      historialCargado = false;
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><h3>No se pudo cargar tu historial</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  document.getElementById('filtroEstado').addEventListener('change', (ev) => {
    filtroEstado = ev.target.value;
    paginaActual = 1;
    renderHistorial();
  });
})();
