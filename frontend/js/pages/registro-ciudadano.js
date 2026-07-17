/**
 * pages/registro-ciudadano.js — Auto-registro público de ciudadanos (Fase 2)
 */

(function () {
  inicializarDatosSimulados();

  const sesionExistente = obtenerSesionActual();
  if (sesionExistente) {
    window.location.href = sesionExistente.usuario.rol === 'ciudadano'
      ? 'ciudadano/dashboard.html'
      : 'login.html';
    return;
  }

  const selectZona = document.getElementById('zona');
  (async () => {
    try {
      const zonas = await obtenerZonas();
      zonas.forEach((zona) => {
        const opt = document.createElement('option');
        opt.value = zona.nombre;
        opt.textContent = `${zona.nombre} — ${zona.referencia}`;
        selectZona.appendChild(opt);
      });
    } catch (err) {
      mostrarToast('error', 'No se pudieron cargar las zonas', err.message);
    }
  })();

  const campos = {
    correo: document.getElementById('correo'),
    dni: document.getElementById('dni'),
    zona: document.getElementById('zona'),
    password: document.getElementById('password'),
    confirmarPassword: document.getElementById('confirmarPassword'),
    terminos: document.getElementById('terminos'),
  };
  const errores = {
    correo: document.getElementById('errorCorreo'),
    dni: document.getElementById('errorDni'),
    zona: document.getElementById('errorZona'),
    password: document.getElementById('errorPassword'),
    confirmarPassword: document.getElementById('errorConfirmarPassword'),
    terminos: document.getElementById('errorTerminos'),
  };

  campos.dni.addEventListener('input', () => {
    campos.dni.value = campos.dni.value.replace(/\D/g, '').slice(0, 8);
  });

  function limpiarErrores() {
    Object.keys(campos).forEach((k) => {
      if (campos[k].classList) campos[k].classList.remove('is-invalid');
      errores[k].textContent = '';
      errores[k].classList.remove('show');
    });
  }

  function marcarError(campo, mensaje) {
    if (campos[campo].classList) campos[campo].classList.add('is-invalid');
    errores[campo].textContent = mensaje;
    errores[campo].classList.add('show');
  }

  const form = document.getElementById('formRegistro');
  const btn = document.getElementById('btnRegistro');
  const btnTexto = document.getElementById('btnRegistroTexto');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores();

    const datos = {
      correo: campos.correo.value.trim(),
      dni: campos.dni.value.trim(),
      zona: campos.zona.value,
      password: campos.password.value,
      confirmarPassword: campos.confirmarPassword.value,
      terminos: campos.terminos.checked,
    };

    // Validaciones de formato en el cliente. Los duplicados de correo/DNI
    // los valida el backend (fuente de verdad) y se muestran como error del servidor.
    let valido = true;

    const vCorreo = validarCorreo(datos.correo);
    if (!vCorreo.valido) { marcarError('correo', vCorreo.mensaje); valido = false; }

    const vDni = validarDNI(datos.dni);
    if (!vDni.valido) { marcarError('dni', vDni.mensaje); valido = false; }

    const vZona = validarSeleccionZona(datos.zona);
    if (!vZona.valido) { marcarError('zona', vZona.mensaje); valido = false; }

    const vPassword = validarPassword(datos.password);
    if (!vPassword.valido) { marcarError('password', vPassword.mensaje); valido = false; }

    const vConfirmacion = validarConfirmacionPassword(datos.password, datos.confirmarPassword);
    if (!vConfirmacion.valido) { marcarError('confirmarPassword', vConfirmacion.mensaje); valido = false; }

    const vTerminos = validarTerminos(datos.terminos);
    if (!vTerminos.valido) { marcarError('terminos', vTerminos.mensaje); valido = false; }

    if (!valido) return;

    btn.disabled = true;
    btnTexto.innerHTML = '<span class="spinner"></span> Creando cuenta...';

    const resultado = await registrarCiudadano(datos);

    if (!resultado.ok) {
      btn.disabled = false;
      btnTexto.textContent = 'Crear mi cuenta';
      if (/correo/i.test(resultado.mensaje)) marcarError('correo', resultado.mensaje);
      else if (/dni/i.test(resultado.mensaje)) marcarError('dni', resultado.mensaje);
      mostrarToast('error', 'No se pudo crear la cuenta', resultado.mensaje);
      return;
    }

    guardarSesion(resultado.usuario, resultado.token);
    mostrarToast('success', '¡Cuenta creada!', `Bienvenido a EcoRutas Wanchaq, vecino de ${datos.zona}.`);
    setTimeout(() => { window.location.href = 'ciudadano/dashboard.html'; }, 900);
  });
})();
