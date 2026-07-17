/**
 * pages/ciudadano-incidencias.js — Registro de incidencia por el ciudadano (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

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
      const archivoFoto = document.getElementById('foto').files[0];
      if (archivoFoto) datosFormulario.append('foto', archivoFoto);

      await crearIncidencia(datosFormulario);

      form.reset();
      if (usuario) selectZona.value = usuario.zona;
      abrirModal('modalConfirmacion');
      mostrarToast('success', 'Reporte enviado', 'Tu incidencia fue registrada correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo enviar el reporte', err.message);
    } finally {
      btn.disabled = false;
      btnTexto.textContent = 'Enviar reporte';
    }
  });
})();
