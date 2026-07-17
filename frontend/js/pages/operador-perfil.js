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

    document.getElementById('avatarPerfil').textContent = (u.nombres[0] + u.apellidos[0]).toUpperCase();
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

  document.getElementById('formPerfil').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      await actualizarMiPerfil({
        telefono: document.getElementById('telefono').value.trim(),
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
