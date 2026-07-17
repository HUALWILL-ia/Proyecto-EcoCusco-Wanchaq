/**
 * pages/admin-configuracion-seguridad.js — Políticas de seguridad y cuenta del admin (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  (async () => {
    try {
      const { usuario } = await obtenerMiPerfil();
      document.getElementById('avatarAdmin').textContent = (usuario.nombres[0] + usuario.apellidos[0]).toUpperCase();
      document.getElementById('nombreAdmin').textContent = `${usuario.nombres} ${usuario.apellidos}`;
      document.getElementById('cargoAdmin').textContent = usuario.cargo;

      // Actividad de acceso simulada (Fase 2: aún no hay un log de auditoría real en el backend).
      const accesos = [
        { texto: `Inicio de sesión exitoso (2FA verificado) — ${usuario.correo}`, fecha: new Date().toISOString() },
        { texto: 'Código 2FA verificado correctamente', fecha: new Date(Date.now() - 3600 * 1000).toISOString() },
        { texto: `Creación de cuenta de operador desde este panel`, fecha: new Date(Date.now() - 86400 * 1000).toISOString() },
      ];
      document.getElementById('feedAccesos').innerHTML = accesos.map((a) => `
        <li class="feed-item">
          <span class="feed-dot"></span>
          <div class="feed-content">
            <p>${a.texto}</p>
            <time>${formatearFechaHora(a.fecha)}</time>
          </div>
        </li>
      `).join('');
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu cuenta', err.message);
    }
  })();

  const CLAVE_POLITICA = 'ecoRutasWanchaq_politica_seguridad';
  const politica = Storage.get(CLAVE_POLITICA, { expiracionCodigo: '5', tiempoSesion: '30' });
  document.getElementById('expiracionCodigo').value = politica.expiracionCodigo;
  document.getElementById('tiempoSesion').value = politica.tiempoSesion;

  document.getElementById('btnGuardarPolitica').addEventListener('click', () => {
    Storage.set(CLAVE_POLITICA, {
      expiracionCodigo: document.getElementById('expiracionCodigo').value,
      tiempoSesion: document.getElementById('tiempoSesion').value,
    });
    mostrarToast('success', 'Política guardada', 'La configuración de seguridad se actualizó correctamente.');
  });

  const form = document.getElementById('formPasswordAdmin');
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
      mostrarToast('success', 'Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
    } catch (err) {
      campos.passwordActual.classList.add('is-invalid');
      errores.passwordActual.textContent = err.message;
      errores.passwordActual.classList.add('show');
      mostrarToast('error', 'No se pudo actualizar la contraseña', err.message);
    }
  });
})();
