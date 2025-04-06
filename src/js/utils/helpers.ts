export function showError(message: string): void {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.remove("d-none");
  } else {
    alert(message);
  }
}

export function toggleLoading(show: boolean): void {
  const loading = document.getElementById("loadingFile")!;
  loading.classList.toggle("d-none", !show);
  loading.classList.toggle("d-flex", show);
}
