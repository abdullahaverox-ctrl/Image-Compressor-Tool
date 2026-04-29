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
    if (file.type === "image/png") return "image/png";
    if (file.type === "image/webp") return "image/webp";
    return "image/jpeg";
  }

  function extensionFor(mime) {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "jpg";
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
  function compressImage() {
    if (!originalImage || !originalFile) return;

    clearError();

    const mime = formatSelect.value;
    const quality = Math.max(0.1, Math.min(1, Number(qualityInput.value) / 100));

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

    canvas.toBlob(
      (blob) => {
        compressBtn.disabled = false;
        compressBtn.textContent = originalLabel;

        if (!blob) {
          showError("Compression failed. Try a different format or image.");
          return;
        }

        if (compressedUrl) URL.revokeObjectURL(compressedUrl);
        compressedUrl = URL.createObjectURL(blob);

        previewCompressed.src = compressedUrl;
        sizeCompressed.textContent = formatBytes(blob.size);

        const diff = originalFile.size - blob.size;
        const pct = (diff / originalFile.size) * 100;
        if (diff > 0) {
          savings.textContent = `${formatBytes(diff)} (${pct.toFixed(1)}%)`;
          savings.classList.add("savings-positive");
        } else {
          savings.textContent = `+${formatBytes(Math.abs(diff))} larger`;
          savings.classList.remove("savings-positive");
        }

        const baseName =
          (originalFile.name || "image").replace(/\.[^.]+$/, "") || "image";
        downloadBtn.href = compressedUrl;
        downloadBtn.download = `${baseName}-compressed.${extensionFor(mime)}`;

        results.hidden = false;
      },
      mime,
      quality
    );
  }

  // ---------- Reset ----------
  function reset() {
    revokeUrls();
    originalFile = null;
    originalImage = null;
    fileInput.value = "";
    controls.hidden = true;
    results.hidden = true;
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
