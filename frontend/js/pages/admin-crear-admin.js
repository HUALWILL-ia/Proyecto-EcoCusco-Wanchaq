/**
 * pages/admin-crear-admin.js — Alta de cuentas de administrador (exclusivo admin)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  async function renderTablaAdministradores() {
    const tbody = document.getElementById('tablaAdministradores');
    tbody.innerHTML = `<tr><td colspan="4"><div class="loading-overlay"><span class="spinner"></span> Cargando administradores...</div></td></tr>`;

    try {
      const usuarios = await getUsuarios();
      const administradores = usuarios.filter((u) => u.rol === 'admin');

      if (administradores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">🛡️</div><h3>Sin administradores registrados</h3></div></td></tr>`;
        return;
      }

      tbody.innerHTML = administradores.map((admin) => {
        const estadoBadge = admin.estado === 'activo'
          ? '<span class="badge badge-success">Activo</span>'
          : '<span class="badge badge-neutral">Inactivo</span>';
        return `
          <tr>
            <td>${admin.nombres} ${admin.apellidos}</td>
            <td>${admin.dni}</td>
            <td>${admin.correo}</td>
            <td>${estadoBadge}</td>
          </tr>`;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><h3>No se pudo cargar la lista</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  renderTablaAdministradores();

  const campos = {
    nombres: document.getElementById('nombres'),
    apellidos: document.getElementById('apellidos'),
    dni: document.getElementById('dni'),
    correo: document.getElementById('correo'),
    telefono: document.getElementById('telefono'),
  };
  const errores = {
    nombres: document.getElementById('errorNombres'),
    apellidos: document.getElementById('errorApellidos'),
    dni: document.getElementById('errorDni'),
    correo: document.getElementById('errorCorreo'),
    telefono: document.getElementById('errorTelefono'),
  };

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
      estadoBusquedaDni.textContent = '✅ Nombres y apellidos autocompletados. Puedes corregirlos si es necesario.';
    } catch (err) {
      estadoBusquedaDni.textContent = `${err.message} (puedes seguir llenando el formulario manualmente).`;
    }
  });

  campos.telefono.addEventListener('input', () => {
    campos.telefono.value = campos.telefono.value.replace(/\D/g, '').slice(0, 9);
  });

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

  const form = document.getElementById('formCrearAdmin');
  const btn = document.getElementById('btnCrearAdmin');
  const btnTexto = document.getElementById('btnCrearAdminTexto');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores();

    const datos = {
      nombres: campos.nombres.value.trim(),
      apellidos: campos.apellidos.value.trim(),
      dni: campos.dni.value.trim(),
      correo: campos.correo.value.trim(),
      telefono: campos.telefono.value.trim(),
    };

    let valido = true;

    const vNombres = validarCampoObligatorio(datos.nombres);
    if (!vNombres.valido) { marcarError('nombres', vNombres.mensaje); valido = false; }

    const vApellidos = validarCampoObligatorio(datos.apellidos);
    if (!vApellidos.valido) { marcarError('apellidos', vApellidos.mensaje); valido = false; }

    const vDni = validarDNI(datos.dni);
    if (!vDni.valido) { marcarError('dni', vDni.mensaje); valido = false; }

    const vCorreo = validarCorreo(datos.correo);
    if (!vCorreo.valido) { marcarError('correo', vCorreo.mensaje); valido = false; }

    const vTelefono = validarCelular(datos.telefono);
    if (!vTelefono.valido) { marcarError('telefono', vTelefono.mensaje); valido = false; }

    if (!valido) return;

    btn.disabled = true;
    btnTexto.innerHTML = '<span class="spinner"></span> Creando cuenta...';

    const resultado = await crearCuentaAdmin(datos);

    btn.disabled = false;
    btnTexto.textContent = 'Crear cuenta de administrador';

    if (!resultado.ok) {
      if (/correo/i.test(resultado.mensaje)) marcarError('correo', resultado.mensaje);
      else if (/dni/i.test(resultado.mensaje)) marcarError('dni', resultado.mensaje);
      mostrarToast('error', 'No se pudo crear la cuenta', resultado.mensaje);
      return;
    }

    form.reset();
    renderTablaAdministradores();

    document.getElementById('cajaCredenciales').innerHTML = `
      Correo: ${resultado.usuario.correo}<br>
      <span class="form-hint">Se envió la contraseña temporal al correo del administrador. Deberá cambiarla en su primer inicio de sesión.</span>
    `;
    abrirModal('modalCredenciales');
    mostrarToast('success', 'Administrador creado', resultado.mensaje);
  });
})();
