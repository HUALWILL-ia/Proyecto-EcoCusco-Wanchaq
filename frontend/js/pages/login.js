/**
 * pages/login.js — Lógica de inicio de sesión (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();

  // Si ya hay sesión activa, redirige directo a su dashboard.
  const sesionExistente = obtenerSesionActual();
  if (sesionExistente) {
    redirigirSegunRol(sesionExistente.usuario.rol);
    return;
  }

  const form = document.getElementById('formLogin');
  const inputIdentificador = document.getElementById('identificador');
  const inputPassword = document.getElementById('password');
  const errorIdentificador = document.getElementById('errorIdentificador');
  const errorPassword = document.getElementById('errorPassword');
  const btnLogin = document.getElementById('btnLogin');
  const btnLoginTexto = document.getElementById('btnLoginTexto');

  function limpiarErrores() {
    [inputIdentificador, inputPassword].forEach((el) => el.classList.remove('is-invalid'));
    [errorIdentificador, errorPassword].forEach((el) => { el.textContent = ''; el.classList.remove('show'); });
  }

  function mostrarError(input, contenedorError, mensaje) {
    input.classList.add('is-invalid');
    contenedorError.textContent = mensaje;
    contenedorError.classList.add('show');
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpiarErrores();

    const identificador = inputIdentificador.value.trim();
    const password = inputPassword.value;

    const vIdentificador = validarCampoObligatorio(identificador);
    const vPassword = validarCampoObligatorio(password);

    let hayErrores = false;
    if (!vIdentificador.valido) { mostrarError(inputIdentificador, errorIdentificador, vIdentificador.mensaje); hayErrores = true; }
    if (!vPassword.valido) { mostrarError(inputPassword, errorPassword, vPassword.mensaje); hayErrores = true; }
    if (hayErrores) return;

    btnLogin.disabled = true;
    btnLoginTexto.innerHTML = '<span class="spinner"></span> Verificando...';

    const resultado = await iniciarLogin(identificador, password);

    if (!resultado.ok) {
      btnLogin.disabled = false;
      btnLoginTexto.textContent = 'Ingresar';
      mostrarToast('error', 'No se pudo iniciar sesión', resultado.mensaje);
      return;
    }

    if (resultado.requiere2FA) {
      mostrarToast('info', 'Código enviado', `Se envió un código de verificación a ${resultado.correo}.`);
      setTimeout(() => {
        window.location.href = 'verificacion-2fa.html';
      }, 900);
      return;
    }

    mostrarToast('success', 'Bienvenido', `Hola ${resultado.usuario.nombres}, redirigiendo a tu panel...`);
    setTimeout(() => redirigirSegunRol(resultado.usuario.rol), 800);
  });

  function redirigirSegunRol(rol) {
    if (rol === 'admin') window.location.href = 'admin/dashboard.html';
    else if (rol === 'operador') window.location.href = 'operador/dashboard.html';
    else window.location.href = 'ciudadano/dashboard.html';
  }

  const linkOlvidePassword = document.getElementById('linkOlvidePassword');
  const formOlvidePassword = document.getElementById('formOlvidePassword');
  const inputCorreoOlvide = document.getElementById('correoOlvide');
  const errorCorreoOlvide = document.getElementById('errorCorreoOlvide');
  const btnEnviarOlvidePassword = document.getElementById('btnEnviarOlvidePassword');

  linkOlvidePassword.addEventListener('click', (ev) => {
    ev.preventDefault();
    formOlvidePassword.reset();
    inputCorreoOlvide.classList.remove('is-invalid');
    errorCorreoOlvide.textContent = '';
    errorCorreoOlvide.classList.remove('show');
    abrirModal('modalOlvidePassword');
  });

  formOlvidePassword.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const correo = inputCorreoOlvide.value.trim();

    const vCorreo = validarCorreo(correo);
    if (!vCorreo.valido) {
      mostrarError(inputCorreoOlvide, errorCorreoOlvide, vCorreo.mensaje);
      return;
    }

    btnEnviarOlvidePassword.disabled = true;
    btnEnviarOlvidePassword.innerHTML = '<span class="spinner"></span> Enviando...';

    const resultado = await olvidarPassword(correo);

    btnEnviarOlvidePassword.disabled = false;
    btnEnviarOlvidePassword.textContent = 'Enviar contraseña temporal';

    if (!resultado.ok) {
      mostrarError(inputCorreoOlvide, errorCorreoOlvide, resultado.mensaje);
      return;
    }

    cerrarModal('modalOlvidePassword');
    mostrarToast('success', 'Correo enviado', resultado.mensaje);
  });
})();
