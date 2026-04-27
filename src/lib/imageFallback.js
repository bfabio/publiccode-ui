export function loadImageFallback(img) {
  img.style.visibility = 'visible';

  const placeholder = img.previousElementSibling;
  if (placeholder instanceof HTMLElement) {
    placeholder.style.display = 'none';
    placeholder.style.visibility = 'hidden';
  }

  const shell = img.closest('.image-shell');
  shell?.classList.remove('image-loading');
  shell?.classList.add('image-loaded');
  img.classList.add('image-loaded');
}

export function failImageFallback(img) {
  const fallback = img.dataset.fallback;
  if (fallback && img.src !== fallback) {
    img.src = fallback;
    img.dataset.fallback = '';
    return;
  }

  img.style.display = 'none';

  const placeholder = img.previousElementSibling;
  if (placeholder instanceof HTMLElement) {
    placeholder.style.display = 'none';
  }

  img.closest('.image-shell')?.classList.remove('image-loading');
}
