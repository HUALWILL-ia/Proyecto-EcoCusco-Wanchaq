/**
 * pages/ciudadano-perfil.js — Perfil del ciudadano (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  const selectZona = document.getElementById('zona');
  let ubicacionCapturada = null; // { latitud, longitud } — se inicializa con lo ya guardado, o al usar el botón de GPS

  async function cargarZonas() {
    const zonas = await obtenerZonas();
    zonas.forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.nombre;
      opt.textContent = z.nombre;
      selectZona.appendChild(opt);
    });
  }

  async function pintarPerfil() {
    const { usuario: u } = await obtenerMiPerfil();
    document.getElementById('dni').value = u.dni;
    document.getElementById('correo').value = u.correo;
    document.getElementById('telefono').value = u.telefono || '';
    document.getElementById('zona').value = u.zona || '';
    document.getElementById('direccion').value = u.direccion || '';

    if (u.latitud !== null && u.longitud !== null && u.latitud !== undefined && u.longitud !== undefined) {
      ubicacionCapturada = { latitud: u.latitud, longitud: u.longitud };
      document.getElementById('estadoUbicacion').textContent = `Ubicación guardada: ${u.latitud.toFixed(5)}, ${u.longitud.toFixed(5)}`;
    }

    document.getElementById('avatarPerfil').innerHTML = avatarHtml(u, 'avatar-lg');
    document.getElementById('nombrePerfil').textContent = `${u.nombres} ${u.apellidos}`;
    document.getElementById('rolPerfil').textContent = 'Vecino de Wanchaq';
    document.getElementById('nivelPerfil').textContent = u.nivelEcologico || 'Eco Semilla';
    document.getElementById('kgPerfil').textContent = `${(u.kgReciclados ?? 0).toFixed(1)} kg`;
    document.getElementById('fechaRegistroPerfil').textContent = formatearFecha(u.creadoEl);

    document.getElementById('avisoPasswordTemporal').style.display = u.debeCambiarPassword ? 'flex' : 'none';
  }

  (async () => {
    try {
      await cargarZonas();
      await pintarPerfil();
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu perfil', err.message);
    }
  })();

  const btnUsarUbicacion = document.getElementById('btnUsarUbicacion');
  const estadoUbicacion = document.getElementById('estadoUbicacion');

  btnUsarUbicacion.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      estadoUbicacion.textContent = 'Tu navegador no soporta geolocalización. Puedes seguir usando la dirección de texto.';
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
        estadoUbicacion.textContent = `<i class="ph-fill ph-check-circle" aria-hidden="true"></i> Ubicación capturada: ${ubicacionCapturada.latitud.toFixed(5)}, ${ubicacionCapturada.longitud.toFixed(5)} — recuerda hacer clic en "Guardar cambios".`;
        btnUsarUbicacion.disabled = false;
      },
      (error) => {
        estadoUbicacion.textContent = error.code === error.PERMISSION_DENIED
          ? 'No se concedió permiso de ubicación. Puedes seguir usando la dirección de texto.'
          : 'No se pudo obtener tu ubicación. Puedes seguir usando la dirección de texto.';
        btnUsarUbicacion.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const inputTelefono = document.getElementById('telefono');
  const errorTelefono = document.getElementById('errorTelefono');
  inputTelefono.addEventListener('input', () => {
    inputTelefono.value = inputTelefono.value.replace(/\D/g, '').slice(0, 9);
  });

  document.getElementById('formPerfil').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    inputTelefono.classList.remove('is-invalid');
    errorTelefono.textContent = '';
    errorTelefono.classList.remove('show');

    const vTelefono = validarCelular(inputTelefono.value);
    if (!vTelefono.valido) {
      inputTelefono.classList.add('is-invalid');
      errorTelefono.textContent = vTelefono.mensaje;
      errorTelefono.classList.add('show');
      return;
    }

    try {
      await actualizarMiPerfil({
        telefono: vTelefono.valor,
        zona: document.getElementById('zona').value,
        direccion: document.getElementById('direccion').value.trim(),
        latitud: ubicacionCapturada?.latitud ?? null,
        longitud: ubicacionCapturada?.longitud ?? null,
      });
      mostrarToast('success', 'Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo actualizar tu perfil', err.message);
    }
  });

  crearZonaCarga(document.getElementById('zonaCargaFotoPerfil'), {
    accept: 'image/*',
    maxSizeMB: 5,
    esImagen: true,
    textoFormatos: 'JPG, PNG o WEBP · máx. 5MB',
    subir: async (archivo, actualizarProgreso) => {
      const actualizado = await subirFotoPerfilConProgreso(archivo, actualizarProgreso);
      document.getElementById('avatarPerfil').innerHTML = avatarHtml(actualizado, 'avatar-lg');
      actualizarFotoPerfilSesion(actualizado.fotoPerfil);
      construirNavbarCiudadano(obtenerSesionActual());
      mostrarToast('success', 'Foto actualizada', 'Tu foto de perfil se guardó correctamente.');
      return { url: urlArchivo(actualizado.fotoPerfil) };
    },
  });

  const form = document.getElementById('formPassword');
  const campos = {
    passwordActual: document.getElementById('passwordActual'),
    passwordNueva: document.getElementById('passwordNueva'),
    passwordConfirmar: document.getElementById('passwordConfirmar'),
  };
  const errores = {
    passwordActual: document.getElementById('errorPasswordActual'),
    passwordNueva: document.getElementById('errorPasswordNueva'),
    passwordConfirmar: document.getElementById('errorPasswordConfirmar'),
  };

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    Object.keys(campos).forEach((k) => {
      campos[k].classList.remove('is-invalid');
      errores[k].textContent = '';
      errores[k].classList.remove('show');
    });

    let valido = true;

    const vActual = validarCampoObligatorio(campos.passwordActual.value);
    if (!vActual.valido) {
      campos.passwordActual.classList.add('is-invalid');
      errores.passwordActual.textContent = 'Ingresa tu contraseña actual.';
      errores.passwordActual.classList.add('show');
      valido = false;
    }

    const vNueva = validarPassword(campos.passwordNueva.value);
    if (!vNueva.valido) {
      campos.passwordNueva.classList.add('is-invalid');
      errores.passwordNueva.textContent = vNueva.mensaje;
      errores.passwordNueva.classList.add('show');
      valido = false;
    }

    const vConfirmar = validarConfirmacionPassword(campos.passwordNueva.value, campos.passwordConfirmar.value);
    if (!vConfirmar.valido) {
      campos.passwordConfirmar.classList.add('is-invalid');
      errores.passwordConfirmar.textContent = vConfirmar.mensaje;
      errores.passwordConfirmar.classList.add('show');
      valido = false;
    }

    if (!valido) return;

    try {
      await cambiarMiPassword({
        passwordActual: campos.passwordActual.value,
        passwordNueva: campos.passwordNueva.value,
      });
      form.reset();
      document.getElementById('avisoPasswordTemporal').style.display = 'none';
      mostrarToast('success', 'Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
    } catch (err) {
      campos.passwordActual.classList.add('is-invalid');
      errores.passwordActual.textContent = err.message;
      errores.passwordActual.classList.add('show');
      mostrarToast('error', 'No se pudo actualizar la contraseña', err.message);
    }
  });
})();
