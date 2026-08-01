/**
 * pages/operador-perfil.js — Perfil del operador (datos personales + cambio de contraseña)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  async function pintarPerfil() {
    const { usuario: u, zonaInfo, camionInfo } = await obtenerMiPerfil();

    document.getElementById('dni').value = u.dni;
    document.getElementById('correo').value = u.correo;
    document.getElementById('cargo').value = u.cargo || '';
    document.getElementById('telefono').value = u.telefono || '';
    document.getElementById('zonaAsignada').value = zonaInfo ? zonaInfo.nombre : 'Sin zona asignada';
    document.getElementById('camionAsignado').value = camionInfo ? `${camionInfo.placa} — ${camionInfo.modelo}` : 'Sin camión asignado';

    document.getElementById('avatarPerfil').innerHTML = avatarHtml(u, 'avatar-lg');
    document.getElementById('nombrePerfil').textContent = `${u.nombres} ${u.apellidos}`;
    document.getElementById('rolPerfil').textContent = u.cargo || 'Operador de Recolección';
    document.getElementById('fechaRegistroPerfil').textContent = formatearFecha(u.creadoEl);

    document.getElementById('avisoPasswordTemporal').style.display = u.debeCambiarPassword ? 'flex' : 'none';
  }

  (async () => {
    try {
      await pintarPerfil();
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu perfil', err.message);
    }
  })();

  crearZonaCarga(document.getElementById('zonaCargaFotoPerfil'), {
    accept: 'image/*',
    maxSizeMB: 5,
    esImagen: true,
    textoFormatos: 'JPG, PNG o WEBP · máx. 5MB',
    subir: async (archivo, actualizarProgreso) => {
      const actualizado = await subirFotoPerfilConProgreso(archivo, actualizarProgreso);
      document.getElementById('avatarPerfil').innerHTML = avatarHtml(actualizado, 'avatar-lg');
      actualizarFotoPerfilSesion(actualizado.fotoPerfil);
      construirSidebar('operador', obtenerSesionActual());
      mostrarToast('success', 'Foto actualizada', 'Tu foto de perfil se guardó correctamente.');
      return { url: urlArchivo(actualizado.fotoPerfil) };
    },
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
      });
      mostrarToast('success', 'Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo actualizar tu perfil', err.message);
    }
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
