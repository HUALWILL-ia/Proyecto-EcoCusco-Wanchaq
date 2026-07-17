/**
 * pages/admin-zonas.js — CRUD de zonas de recolección (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  let todasZonas = [];

  async function cargar() {
    const tbody = document.getElementById('tablaZonas');
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><span class="spinner"></span> Cargando zonas...</div></td></tr>`;
    try {
      todasZonas = await obtenerZonas();
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No se pudieron cargar las zonas</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  function render() {
    const tbody = document.getElementById('tablaZonas');

    if (todasZonas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>Sin zonas registradas</h3></div></td></tr>`;
      return;
    }

    tbody.innerHTML = todasZonas.map((z) => `
      <tr>
        <td><strong>${z.nombre}</strong></td>
        <td>${z.referencia}</td>
        <td>${z.horarioRecoleccion}</td>
        <td><span class="badge badge-neutral">${z.tipoResiduoPrincipal}</span></td>
        <td>${z.contenedores}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-accion="editar" data-id="${z.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-accion="eliminar" data-id="${z.id}">Eliminar</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-accion="editar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirFormularioEdicion(btn.dataset.id));
    });
    tbody.querySelectorAll('[data-accion="eliminar"]').forEach((btn) => {
      btn.addEventListener('click', () => eliminarZonaExistente(btn.dataset.id));
    });
  }

  cargar();

  const form = document.getElementById('formZona');
  const campos = {
    nombre: document.getElementById('nombre'),
    referencia: document.getElementById('referencia'),
    horario: document.getElementById('horario'),
  };
  const errores = {
    nombre: document.getElementById('errorNombre'),
    referencia: document.getElementById('errorReferencia'),
    horario: document.getElementById('errorHorario'),
  };

  document.getElementById('btnNuevaZona').addEventListener('click', () => {
    form.reset();
    document.getElementById('zonaId').value = '';
    document.getElementById('tituloModalZona').textContent = 'Nueva zona';
    abrirModal('modalZona');
  });

  function abrirFormularioEdicion(id) {
    const zona = todasZonas.find((z) => String(z.id) === String(id));
    if (!zona) return;
    document.getElementById('zonaId').value = zona.id;
    campos.nombre.value = zona.nombre;
    campos.referencia.value = zona.referencia;
    campos.horario.value = zona.horarioRecoleccion;
    document.getElementById('tipoResiduoPrincipal').value = zona.tipoResiduoPrincipal;
    document.getElementById('contenedores').value = zona.contenedores;
    document.getElementById('tituloModalZona').textContent = `Editar ${zona.nombre}`;
    abrirModal('modalZona');
  }

  async function eliminarZonaExistente(id) {
    try {
      await eliminarZona(id);
      await cargar();
      mostrarToast('success', 'Zona eliminada', 'La zona se eliminó del listado.');
    } catch (err) {
      mostrarToast('error', 'No se pudo eliminar la zona', err.message);
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    Object.keys(campos).forEach((k) => {
      campos[k].classList.remove('is-invalid');
      errores[k].textContent = '';
      errores[k].classList.remove('show');
    });

    let valido = true;
    Object.keys(campos).forEach((k) => {
      const v = validarCampoObligatorio(campos[k].value);
      if (!v.valido) {
        campos[k].classList.add('is-invalid');
        errores[k].textContent = v.mensaje;
        errores[k].classList.add('show');
        valido = false;
      }
    });
    if (!valido) return;

    const idExistente = document.getElementById('zonaId').value;
    const datos = {
      nombre: campos.nombre.value.trim(),
      referencia: campos.referencia.value.trim(),
      horarioRecoleccion: campos.horario.value.trim(),
      tipoResiduoPrincipal: document.getElementById('tipoResiduoPrincipal').value,
      contenedores: Number(document.getElementById('contenedores').value) || 0,
    };

    try {
      if (idExistente) await actualizarZona(idExistente, datos);
      else await crearZona(datos);

      cerrarModal('modalZona');
      await cargar();
      mostrarToast('success', 'Zona guardada', 'Los datos de la zona se guardaron correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo guardar la zona', err.message);
    }
  });
})();
