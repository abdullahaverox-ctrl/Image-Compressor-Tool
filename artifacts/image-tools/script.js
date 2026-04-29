(function () {
  "use strict";

  const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const errorEl = document.getElementById("error-msg");
  const controls = document.getElementById("controls");
  const qualityInput = document.getElementById("quality");
  const qualityVal = document.getElementById("quality-val");
  const formatSelect = document.getElementById("format");
  const compressBtn = document.getElementById("compress-btn");
  const results = document.getElementById("results");
  const previewOriginal = document.getElementById("preview-original");
  const previewCompressed = document.getElementById("preview-compressed");
  const sizeOriginal = document.getElementById("size-original");
  const sizeCompressed = document.getElementById("size-compressed");
  const dimOriginal = document.getElementById("dim-original");
  const savings = document.getElementById("savings");
  const downloadBtn = document.getElementById("download-btn");
  const resetBtn = document.getElementById("reset-btn");
  const fallbackNotice = document.getElementById("fallback-notice");
  const yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  let originalFile = null;
  let originalImage = null;
  let originalUrl = null;
  let compressedUrl = null;

  // ---------- Helpers ----------
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(
      sizes.length - 1,
      Math.floor(Math.log(bytes) / Math.log(k))
    );
    const val = bytes / Math.pow(k, i);
    return `${val.toFixed(val >= 100 || i === 0 ? 0 : val >= 10 ? 1 : 2)} ${sizes[i]}`;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }

  function revokeUrls() {
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl);
      originalUrl = null;
    }
    if (compressedUrl) {
      URL.revokeObjectURL(compressedUrl);
      compressedUrl = null;
    }
  }

  function defaultFormatFor(file) {
    // Always use a lossy format for best compression. PNG ignores the quality
    // parameter in canvas.toBlob and very often produces larger files.
    if (file.type === "image/webp") return "image/webp";
    return "image/jpeg";
  }

  function extensionFor(mime) {
    if (mime === "image/webp") return "webp";
    return "jpg";
  }

  function toBlobAsync(canvas, mime, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ img, url });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read this image."));
      };
      img.src = url;
    });
  }

  // ---------- File handling ----------
  async function handleFile(file) {
    clearError();
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showError("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      showError(`File is too large. Maximum size is ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }

    revokeUrls();
    results.hidden = true;

    try {
      const { img, url } = await loadImage(file);
      originalFile = file;
      originalImage = img;
      originalUrl = url;

      previewOriginal.src = url;
      sizeOriginal.textContent = formatBytes(file.size);
      dimOriginal.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;

      // Set sensible default format based on input
      formatSelect.value = defaultFormatFor(file);

      controls.hidden = false;
    } catch (err) {
      showError(err.message || "Failed to load image.");
    }
  }

  // ---------- Compression ----------
  async function compressImage() {
    if (!originalImage || !originalFile) return;

    clearError();

    const mime = formatSelect.value;
    // Clamp quality to a safe lossy range (0.1 - 0.9). 1.0 effectively
    // disables compression and frequently produces files larger than the input.
    const rawQuality = Number(qualityInput.value) / 100;
    const quality = Math.max(0.1, Math.min(0.9, rawQuality));

    const canvas = document.createElement("canvas");
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showError("Your browser does not support canvas rendering.");
      return;
    }

    // Fill background for JPEG (no transparency support)
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(originalImage, 0, 0);

    compressBtn.disabled = true;
    const originalLabel = compressBtn.textContent;
    compressBtn.textContent = "Compressing…";

    try {
      let blob = await toBlobAsync(canvas, mime, quality);

      // Safety net: if encoder still produced something larger than the
      // original at the chosen quality, retry once at a noticeably lower
      // quality before giving up and falling back.
      if (blob && blob.size >= originalFile.size && quality > 0.4) {
        const retry = await toBlobAsync(
          canvas,
          mime,
          Math.max(0.1, quality - 0.25)
        );
        if (retry && retry.size < blob.size) blob = retry;
      }

      if (!blob) {
        showError("Compression failed. Try a different format or image.");
        return;
      }

      // If the compressed result is not actually smaller, fall back to the
      // original file so the user never downloads a bigger image than they
      // started with.
      const usedFallback = blob.size >= originalFile.size;
      const finalBlob = usedFallback ? originalFile : blob;
      const finalMime = usedFallback ? originalFile.type : mime;

      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      compressedUrl = URL.createObjectURL(finalBlob);

      previewCompressed.src = compressedUrl;
      sizeCompressed.textContent = formatBytes(finalBlob.size);

      const saved = originalFile.size - finalBlob.size;
      if (saved > 0) {
        const pct = (saved / originalFile.size) * 100;
        savings.textContent = `${formatBytes(saved)} (${pct.toFixed(1)}%)`;
        savings.classList.add("savings-positive");
      } else {
        savings.textContent = "0 B (already optimized)";
        savings.classList.remove("savings-positive");
      }

      fallbackNotice.hidden = !usedFallback;

      const baseName =
        (originalFile.name || "image").replace(/\.[^.]+$/, "") || "image";
      downloadBtn.href = compressedUrl;
      downloadBtn.download = usedFallback
        ? `${baseName}.${extensionFor(finalMime)}`
        : `${baseName}-compressed.${extensionFor(finalMime)}`;

      results.hidden = false;
    } finally {
      compressBtn.disabled = false;
      compressBtn.textContent = originalLabel;
    }
  }

  // ---------- Reset ----------
  function reset() {
    revokeUrls();
    originalFile = null;
    originalImage = null;
    fileInput.value = "";
    controls.hidden = true;
    results.hidden = true;
    fallbackNotice.hidden = true;
    clearError();
  }

  // ---------- Events ----------
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
  });

  // Drag & drop
  ["dragenter", "dragover"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  qualityInput.addEventListener("input", () => {
    qualityVal.textContent = `${qualityInput.value}%`;
  });

  compressBtn.addEventListener("click", compressImage);
  resetBtn.addEventListener("click", reset);
})();
