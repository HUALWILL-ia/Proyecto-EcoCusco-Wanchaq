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
    nombres: document.getElementById('nombres'),
    apellidos: document.getElementById('apellidos'),
    correo: document.getElementById('correo'),
    dni: document.getElementById('dni'),
    celular: document.getElementById('celular'),
    zona: document.getElementById('zona'),
    direccion: document.getElementById('direccion'),
    password: document.getElementById('password'),
    confirmarPassword: document.getElementById('confirmarPassword'),
    terminos: document.getElementById('terminos'),
  };
  const errores = {
    nombres: document.getElementById('errorNombres'),
    apellidos: document.getElementById('errorApellidos'),
    correo: document.getElementById('errorCorreo'),
    dni: document.getElementById('errorDni'),
    celular: document.getElementById('errorCelular'),
    zona: document.getElementById('errorZona'),
    direccion: document.getElementById('errorDireccion'),
    password: document.getElementById('errorPassword'),
    confirmarPassword: document.getElementById('errorConfirmarPassword'),
    terminos: document.getElementById('errorTerminos'),
  };

  let ubicacionCapturada = null; // { latitud, longitud } o null si no se usó/rechazó

  const btnUsarUbicacion = document.getElementById('btnUsarUbicacion');
  const estadoUbicacion = document.getElementById('estadoUbicacion');

  btnUsarUbicacion.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      estadoUbicacion.textContent = 'Tu navegador no soporta geolocalización. Puedes continuar solo con tu dirección.';
      return;
    }

    btnUsarUbicacion.disabled = true;
    estadoUbicacion.textContent = 'Solicitando permiso de ubicación...';

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        ubicacionCapturada = {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        };
        estadoUbicacion.textContent = '<i class="ph-fill ph-check-circle" aria-hidden="true"></i> Ubicación capturada correctamente.';
        btnUsarUbicacion.disabled = false;
      },
      (error) => {
        ubicacionCapturada = null;
        estadoUbicacion.textContent = error.code === error.PERMISSION_DENIED
          ? 'No se concedió permiso de ubicación. Puedes continuar solo con tu dirección.'
          : 'No se pudo obtener tu ubicación. Puedes continuar solo con tu dirección.';
        btnUsarUbicacion.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const estadoBusquedaDni = document.getElementById('estadoBusquedaDni');

  campos.dni.addEventListener('input', async () => {
    campos.dni.value = campos.dni.value.replace(/\D/g, '').slice(0, 8);
    if (campos.dni.value.length !== 8) {
      estadoBusquedaDni.textContent = '';
      return;
    }

    estadoBusquedaDni.textContent = 'Buscando datos con RENIEC...';
    try {
      const datos = await consultarDni(campos.dni.value);
      if (datos.nombres) campos.nombres.value = datos.nombres;
      if (datos.apellidos) campos.apellidos.value = datos.apellidos;
      estadoBusquedaDni.textContent = '<i class="ph-fill ph-check-circle" aria-hidden="true"></i> Nombres y apellidos autocompletados. Puedes corregirlos si es necesario.';
    } catch (err) {
      estadoBusquedaDni.textContent = `${err.message} (puedes seguir llenando el formulario manualmente).`;
    }
  });

  campos.celular.addEventListener('input', () => {
    campos.celular.value = campos.celular.value.replace(/\D/g, '').slice(0, 9);
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
      nombres: campos.nombres.value.trim(),
      apellidos: campos.apellidos.value.trim(),
      correo: campos.correo.value.trim(),
      dni: campos.dni.value.trim(),
      telefono: campos.celular.value.trim(),
      zona: campos.zona.value,
      direccion: campos.direccion.value.trim(),
      password: campos.password.value,
      confirmarPassword: campos.confirmarPassword.value,
      terminos: campos.terminos.checked,
      latitud: ubicacionCapturada?.latitud ?? null,
      longitud: ubicacionCapturada?.longitud ?? null,
    };

    // Validaciones de formato en el cliente. Los duplicados de correo/DNI
    // los valida el backend (fuente de verdad) y se muestran como error del servidor.
    let valido = true;

    const vNombres = validarCampoObligatorio(datos.nombres);
    if (!vNombres.valido) { marcarError('nombres', 'Ingresa tus nombres.'); valido = false; }

    const vApellidos = validarCampoObligatorio(datos.apellidos);
    if (!vApellidos.valido) { marcarError('apellidos', 'Ingresa tus apellidos.'); valido = false; }

    const vCorreo = validarCorreo(datos.correo);
    if (!vCorreo.valido) { marcarError('correo', vCorreo.mensaje); valido = false; }

    const vDni = validarDNI(datos.dni);
    if (!vDni.valido) { marcarError('dni', vDni.mensaje); valido = false; }

    const vCelular = validarCelular(datos.telefono);
    if (!vCelular.valido) { marcarError('celular', vCelular.mensaje); valido = false; }

    const vZona = validarSeleccionZona(datos.zona);
    if (!vZona.valido) { marcarError('zona', vZona.mensaje); valido = false; }

    const vDireccion = validarCampoObligatorio(datos.direccion);
    if (!vDireccion.valido) { marcarError('direccion', 'Ingresa tu dirección (calle/avenida y número).'); valido = false; }

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
