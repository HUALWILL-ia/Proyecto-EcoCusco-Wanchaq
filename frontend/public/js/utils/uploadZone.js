/**
 * utils/uploadZone.js
 * Zona de carga de archivos reutilizable: click/toque o arrastrar-soltar
 * (desktop), vista previa, barra de progreso y estado "completado" con
 * miniatura + opción de eliminar/reemplazar. Reemplaza el <input type="file">
 * básico del navegador en reportar incidencia (ciudadano/operador) y foto de
 * perfil (ciudadano/operador).
 *
 * No conoce ningún endpoint de la API:
 * - Si se le pasa `subir(archivo, actualizarProgreso)`, lo ejecuta y muestra
 *   el progreso que ese callback vaya reportando (modo "subida inmediata",
 *   usado en foto de perfil).
 * - Si no se pasa `subir`, queda en modo "diferido": valida el archivo,
 *   anima una barra de progreso simple (no hay nada que subir todavía) y lo
 *   deja disponible vía obtenerArchivo() para que la propia pantalla lo
 *   adjunte al enviar su formulario (usado en reportar incidencia).
 *
 * @param {HTMLElement} contenedor - elemento vacío donde se construye el componente
 * @param {object} opciones
 * @param {string} [opciones.accept='image/*']
 * @param {string|null} [opciones.capture] - 'environment' | 'user' | null
 * @param {number} [opciones.maxSizeMB=5]
 * @param {boolean} [opciones.esImagen=true] - si se muestra miniatura cuadrada al completar
 * @param {string} [opciones.textoFormatos] - texto secundario de ayuda
 * @param {(archivo: File, actualizarProgreso: (pct:number|null)=>void) => Promise<any>} [opciones.subir]
 * @param {(info: {archivo: File, resultado?: any}) => void} [opciones.onCompletado]
 * @param {() => void} [opciones.onEliminar]
 */
function crearZonaCarga(contenedor, opciones = {}) {
  const {
    accept = 'image/*',
    capture = null,
    maxSizeMB = 5,
    esImagen = true,
    textoFormatos = 'JPG, PNG o WEBP · máx. 5MB',
    subir = null,
    onCompletado = null,
    onEliminar = null,
  } = opciones;

  contenedor.classList.add('upload-zone-wrapper');
  contenedor.innerHTML = `
    <div class="upload-zone" tabindex="0" role="button" aria-label="Subir archivo">
      <input type="file" class="upload-zone-input" accept="${accept}" tabindex="-1" aria-hidden="true"${capture ? ` capture="${capture}"` : ''}>
      <div class="upload-zone-icon">☁️⬆️</div>
      <p class="upload-zone-texto-principal">
        <span class="upload-zone-texto-touch">Toca para subir</span>
        <span class="upload-zone-texto-desktop">Arrastra o haz clic para subir</span>
      </p>
      <p class="upload-zone-texto-secundario">${textoFormatos}</p>
    </div>
    <div class="upload-zone-progreso" style="display:none;">
      <div class="upload-zone-progreso-info">
        <span class="upload-zone-progreso-nombre"></span>
        <span class="upload-zone-progreso-tamano"></span>
      </div>
      <div class="upload-zone-barra"><div class="upload-zone-barra-fill"></div></div>
    </div>
    <div class="upload-zone-completado" style="display:none;">
      <img class="upload-zone-thumb" alt="Vista previa"${esImagen ? '' : ' style="display:none;"'}>
      <span class="upload-zone-check">✅</span>
      <div class="upload-zone-item-info">
        <span class="upload-zone-item-nombre"></span>
        <span class="upload-zone-item-tiempo"></span>
      </div>
      <button type="button" class="upload-zone-eliminar" aria-label="Eliminar archivo">🗑️</button>
    </div>
  `;

  const zona = contenedor.querySelector('.upload-zone');
  const input = contenedor.querySelector('.upload-zone-input');
  const bloqueProgreso = contenedor.querySelector('.upload-zone-progreso');
  const progresoNombre = contenedor.querySelector('.upload-zone-progreso-nombre');
  const progresoTamano = contenedor.querySelector('.upload-zone-progreso-tamano');
  const barraFill = contenedor.querySelector('.upload-zone-barra-fill');
  const bloqueCompletado = contenedor.querySelector('.upload-zone-completado');
  const thumb = contenedor.querySelector('.upload-zone-thumb');
  const itemNombre = contenedor.querySelector('.upload-zone-item-nombre');
  const itemTiempo = contenedor.querySelector('.upload-zone-item-tiempo');
  const btnEliminar = contenedor.querySelector('.upload-zone-eliminar');

  let archivoActual = null;
  let fechaCompletado = null;
  let intervaloTiempo = null;
  let urlPreviewLocal = null;

  function formatearTamano(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function mostrarEstado(estado) {
    zona.style.display = estado === 'idle' ? '' : 'none';
    bloqueProgreso.style.display = estado === 'progreso' ? '' : 'none';
    bloqueCompletado.style.display = estado === 'completado' ? 'flex' : 'none';
  }

  function actualizarProgreso(porcentaje) {
    if (porcentaje === null || porcentaje === undefined) {
      barraFill.classList.add('indeterminado');
    } else {
      barraFill.classList.remove('indeterminado');
      barraFill.style.width = `${Math.min(Math.max(porcentaje, 0), 100)}%`;
    }
  }

  function detenerRelojRelativo() {
    if (intervaloTiempo) {
      clearInterval(intervaloTiempo);
      intervaloTiempo = null;
    }
  }

  function iniciarRelojRelativo() {
    detenerRelojRelativo();
    const actualizarTexto = () => {
      itemTiempo.textContent = fechaCompletado ? tiempoRelativo(fechaCompletado) : '';
    };
    actualizarTexto();
    intervaloTiempo = setInterval(actualizarTexto, 30000);
  }

  function tipoValido(archivo) {
    if (!accept || accept === '*') return true;
    return accept.split(',').map((t) => t.trim()).some((tipo) => {
      if (tipo.endsWith('/*')) return archivo.type.startsWith(tipo.slice(0, -1));
      return archivo.type === tipo;
    });
  }

  function reiniciarAIdle() {
    detenerRelojRelativo();
    archivoActual = null;
    fechaCompletado = null;
    if (urlPreviewLocal) { URL.revokeObjectURL(urlPreviewLocal); urlPreviewLocal = null; }
    input.value = '';
    mostrarEstado('idle');
  }

  async function procesarArchivo(archivo) {
    if (!archivo) return;

    if (!tipoValido(archivo)) {
      mostrarToast('error', 'Archivo no permitido', `Selecciona un archivo válido: ${textoFormatos}`);
      return;
    }
    if (archivo.size > maxSizeMB * 1024 * 1024) {
      mostrarToast('error', 'Archivo muy grande', `El archivo no debe superar ${maxSizeMB} MB.`);
      return;
    }

    archivoActual = archivo;
    progresoNombre.textContent = archivo.name;
    progresoTamano.textContent = formatearTamano(archivo.size);
    if (urlPreviewLocal) URL.revokeObjectURL(urlPreviewLocal);
    urlPreviewLocal = esImagen ? URL.createObjectURL(archivo) : null;

    mostrarEstado('progreso');
    actualizarProgreso(subir ? 0 : null);

    if (subir) {
      try {
        const resultado = await subir(archivo, actualizarProgreso);
        fechaCompletado = new Date().toISOString();
        itemNombre.textContent = archivo.name;
        if (esImagen) {
          thumb.src = (resultado && resultado.url) ? resultado.url : urlPreviewLocal;
        }
        iniciarRelojRelativo();
        mostrarEstado('completado');
        if (onCompletado) onCompletado({ archivo, resultado });
      } catch (err) {
        mostrarToast('error', 'No se pudo subir el archivo', err.message);
        reiniciarAIdle();
      }
      return;
    }

    // Modo diferido: no hay backend que reportar todavía (el archivo viaja
    // junto con el resto del formulario al enviarlo) — animación simple.
    for (const paso of [30, 65, 100]) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      actualizarProgreso(paso);
    }

    fechaCompletado = new Date().toISOString();
    itemNombre.textContent = archivo.name;
    if (esImagen) thumb.src = urlPreviewLocal;
    iniciarRelojRelativo();
    mostrarEstado('completado');
    if (onCompletado) onCompletado({ archivo });
  }

  zona.addEventListener('click', () => input.click());
  zona.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      input.click();
    }
  });
  zona.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    zona.classList.add('dragover');
  });
  zona.addEventListener('dragleave', () => zona.classList.remove('dragover'));
  zona.addEventListener('drop', (ev) => {
    ev.preventDefault();
    zona.classList.remove('dragover');
    const archivo = ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (archivo) procesarArchivo(archivo);
  });
  input.addEventListener('change', () => {
    const archivo = input.files[0];
    if (archivo) procesarArchivo(archivo);
  });
  btnEliminar.addEventListener('click', () => {
    reiniciarAIdle();
    if (onEliminar) onEliminar();
  });

  mostrarEstado('idle');

  return {
    obtenerArchivo: () => archivoActual,
    limpiar: reiniciarAIdle,
  };
}

window.crearZonaCarga = crearZonaCarga;
