/**
 * pages/admin-crear-operador.js — Alta de cuentas de operador (Fase 2, exclusivo admin)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  const selectZona = document.getElementById('zonaAsignada');
  const selectCamion = document.getElementById('camionAsignado');

  async function cargarSelects() {
    try {
      const [zonas, camiones] = await Promise.all([obtenerZonas(), obtenerCamionesDisponibles()]);
      zonas.filter((z) => z.estado === 'activa').forEach((z) => {
        const opt = document.createElement('option');
        opt.value = z.id;
        opt.textContent = z.nombre;
        selectZona.appendChild(opt);
      });
      camiones.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.placa} — ${c.modelo}`;
        selectCamion.appendChild(opt);
      });
      if (camiones.length === 0) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = 'No hay camiones disponibles (todos ocupados o en mantenimiento)';
        selectCamion.appendChild(opt);
      }
    } catch (err) {
      mostrarToast('error', 'No se pudieron cargar zonas/camiones', err.message);
    }
  }

  async function renderTablaOperadores() {
    const tbody = document.getElementById('tablaOperadores');
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><span class="spinner"></span> Cargando operadores...</div></td></tr>`;

    try {
      const [usuarios, zonas, camiones] = await Promise.all([getUsuarios(), obtenerZonas(), getCamionesStorage()]);
      const operadores = usuarios.filter((u) => u.rol === 'operador');

      if (operadores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🚛</div><h3>Sin operadores registrados</h3></div></td></tr>`;
        return;
      }

      tbody.innerHTML = operadores.map((op) => {
        const zona = zonas.find((z) => z.id === op.zonaAsignada);
        const camion = camiones.find((c) => c.id === op.camionAsignado);
        const estadoBadge = op.estado === 'activo'
          ? '<span class="badge badge-success">Activo</span>'
          : '<span class="badge badge-neutral">Inactivo</span>';
        return `
          <tr>
            <td>${op.nombres} ${op.apellidos}</td>
            <td>${op.dni}</td>
            <td>${op.correo}</td>
            <td>${zona ? zona.nombre : '—'}</td>
            <td>${camion ? camion.placa : '—'}</td>
            <td>${estadoBadge}</td>
          </tr>`;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No se pudo cargar la lista</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  cargarSelects();
  renderTablaOperadores();

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

  const form = document.getElementById('formCrearOperador');
  const btn = document.getElementById('btnCrearOperador');
  const btnTexto = document.getElementById('btnCrearOperadorTexto');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores();

    const datos = {
      nombres: campos.nombres.value.trim(),
      apellidos: campos.apellidos.value.trim(),
      dni: campos.dni.value.trim(),
      correo: campos.correo.value.trim(),
      telefono: campos.telefono.value.trim(),
      zonaAsignada: document.getElementById('zonaAsignada').value || null,
      camionAsignado: document.getElementById('camionAsignado').value || null,
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

    const resultado = await crearCuentaOperador(datos, sesion.usuario.id);

    btn.disabled = false;
    btnTexto.textContent = 'Crear cuenta de operador';

    if (!resultado.ok) {
      if (/correo/i.test(resultado.mensaje)) marcarError('correo', resultado.mensaje);
      else if (/dni/i.test(resultado.mensaje)) marcarError('dni', resultado.mensaje);
      mostrarToast('error', 'No se pudo crear la cuenta', resultado.mensaje);
      return;
    }

    form.reset();
    renderTablaOperadores();

    document.getElementById('cajaCredenciales').innerHTML = `
      Correo: ${resultado.usuario.correo}<br>
      <span class="form-hint">Se envió la contraseña temporal al correo del operador. Deberá cambiarla en su primer inicio de sesión.</span>
    `;
    abrirModal('modalCredenciales');
    mostrarToast('success', 'Operador creado', resultado.mensaje);
  });
})();
