document.querySelectorAll('.switch').forEach((el) => {
  el.addEventListener('click', () => {
    const on = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', String(on));
    el.classList.toggle('on', on);
  });
});
