const selector = document.querySelector('[data-site-page-select]');
function restoreSelection() {
  const current = selector?.querySelector('option[selected]');
  if (current) selector.value = current.value;
}
function navigate() {
  // Options are generated from the same registry as the desktop links.
  if (selector.value) window.location.assign(selector.value);
}
selector?.addEventListener('change', navigate);
window.addEventListener('pageshow', restoreSelection);
if (import.meta.hot) import.meta.hot.dispose(() => {
  selector?.removeEventListener('change', navigate);
  window.removeEventListener('pageshow', restoreSelection);
});
