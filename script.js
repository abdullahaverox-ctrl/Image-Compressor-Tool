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
  const chooseAnotherBtn = document.getElementById("choose-another-btn");
  const fallbackNotice = document.getElementById("fallback-notice");
  const yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav toggle
  const navToggle = document.getElementById("nav-toggle");
  const primaryNav = document.getElementById("primary-nav");
  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = primaryNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.classList.toggle("is-open", isOpen);
    });
  }

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

  function setDownloadEnabled(enabled) {
    if (enabled) {
      downloadBtn.classList.remove("is-disabled");
      downloadBtn.removeAttribute("aria-disabled");
      downloadBtn.removeAttribute("tabindex");
    } else {
      downloadBtn.classList.add("is-disabled");
      downloadBtn.setAttribute("aria-disabled", "true");
      downloadBtn.setAttribute("tabindex", "-1");
      downloadBtn.removeAttribute("href");
      downloadBtn.removeAttribute("download");
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
    fallbackNotice.hidden = true;
    setDownloadEnabled(false);

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
        savings.textContent = `${formatBytes(saved)} smaller (${pct.toFixed(1)}%)`;
        savings.classList.add("savings-positive");
      } else {
        savings.textContent = "No reduction — already optimized";
        savings.classList.remove("savings-positive");
      }

      fallbackNotice.hidden = !usedFallback;

      const baseName =
        (originalFile.name || "image").replace(/\.[^.]+$/, "") || "image";
      const fileName = usedFallback
        ? `${baseName}.${extensionFor(finalMime)}`
        : `${baseName}-compressed.${extensionFor(finalMime)}`;

      downloadBtn.href = compressedUrl;
      downloadBtn.setAttribute("download", fileName);
      setDownloadEnabled(true);

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
    previewOriginal.removeAttribute("src");
    previewCompressed.removeAttribute("src");
    sizeOriginal.textContent = "—";
    sizeCompressed.textContent = "—";
    dimOriginal.textContent = "—";
    savings.textContent = "—";
    savings.classList.remove("savings-positive");
    setDownloadEnabled(false);
    controls.hidden = true;
    results.hidden = true;
    fallbackNotice.hidden = true;
    clearError();
  }

  function chooseAnother() {
    reset();
    // Defer until after the reset to ensure the value is cleared on all
    // browsers, so the same file can be selected again and re-trigger change.
    setTimeout(() => {
      fileInput.click();
    }, 0);
  }

  // ---------- Events ----------
  // Clear the input value on every click so picking the same file again
  // still fires the `change` event.
  fileInput.addEventListener("click", () => {
    fileInput.value = "";
  });

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
  chooseAnotherBtn.addEventListener("click", chooseAnother);

  // Initialize download button as disabled until a file is ready.
  setDownloadEnabled(false);

  // ============================================================
  // Image Resizer
  // ============================================================
  const rFileInput = document.getElementById("r-file-input");
  const rDropZone = document.getElementById("r-drop-zone");
  const rErrorEl = document.getElementById("r-error-msg");
  const rControls = document.getElementById("r-controls");
  const rOriginalDim = document.getElementById("r-original-dim");
  const rWidthInput = document.getElementById("r-width");
  const rHeightInput = document.getElementById("r-height");
  const rAspectInput = document.getElementById("r-aspect");
  const rFormatSelect = document.getElementById("r-format");
  const rResizeBtn = document.getElementById("r-resize-btn");
  const rResults = document.getElementById("r-results");
  const rPreviewOriginal = document.getElementById("r-preview-original");
  const rPreviewResized = document.getElementById("r-preview-resized");
  const rSizeOriginal = document.getElementById("r-size-original");
  const rSizeResized = document.getElementById("r-size-resized");
  const rDimOriginalMeta = document.getElementById("r-dim-original-meta");
  const rDimResized = document.getElementById("r-dim-resized");
  const rDownloadBtn = document.getElementById("r-download-btn");
  const rResetBtn = document.getElementById("r-reset-btn");
  const rChooseAnotherBtn = document.getElementById("r-choose-another-btn");

  let rOriginalFile = null;
  let rOriginalImage = null;
  let rOriginalUrl = null;
  let rResizedUrl = null;
  let rAspectLock = 1;
  let rSyncing = false; // prevents recursive width/height sync

  function rShowError(msg) {
    rErrorEl.textContent = msg;
    rErrorEl.hidden = false;
  }

  function rClearError() {
    rErrorEl.textContent = "";
    rErrorEl.hidden = true;
  }

  function rRevokeUrls() {
    if (rOriginalUrl) {
      URL.revokeObjectURL(rOriginalUrl);
      rOriginalUrl = null;
    }
    if (rResizedUrl) {
      URL.revokeObjectURL(rResizedUrl);
      rResizedUrl = null;
    }
  }

  function rSetDownloadEnabled(enabled) {
    if (enabled) {
      rDownloadBtn.classList.remove("is-disabled");
      rDownloadBtn.removeAttribute("aria-disabled");
      rDownloadBtn.removeAttribute("tabindex");
    } else {
      rDownloadBtn.classList.add("is-disabled");
      rDownloadBtn.setAttribute("aria-disabled", "true");
      rDownloadBtn.setAttribute("tabindex", "-1");
      rDownloadBtn.removeAttribute("href");
      rDownloadBtn.removeAttribute("download");
    }
  }

  async function rHandleFile(file) {
    rClearError();
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      rShowError("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      rShowError(`File is too large. Maximum size is ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }

    rRevokeUrls();
    rResults.hidden = true;
    rSetDownloadEnabled(false);

    try {
      const { img, url } = await loadImage(file);
      rOriginalFile = file;
      rOriginalImage = img;
      rOriginalUrl = url;
      rAspectLock = img.naturalWidth / img.naturalHeight;

      rPreviewOriginal.src = url;
      rSizeOriginal.textContent = formatBytes(file.size);
      rDimOriginalMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
      rOriginalDim.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

      rWidthInput.value = String(img.naturalWidth);
      rHeightInput.value = String(img.naturalHeight);
      rWidthInput.max = String(img.naturalWidth * 4);
      rHeightInput.max = String(img.naturalHeight * 4);

      // Default output format mirrors source for fidelity.
      if (file.type === "image/jpeg") rFormatSelect.value = "image/jpeg";
      else if (file.type === "image/webp") rFormatSelect.value = "image/webp";
      else rFormatSelect.value = "image/png";

      rControls.hidden = false;
    } catch (err) {
      rShowError(err.message || "Failed to load image.");
    }
  }

  function rExtensionFor(mime) {
    if (mime === "image/webp") return "webp";
    if (mime === "image/jpeg") return "jpg";
    return "png";
  }

  async function rResize() {
    if (!rOriginalImage || !rOriginalFile) return;
    rClearError();

    const w = Math.round(Number(rWidthInput.value));
    const h = Math.round(Number(rHeightInput.value));

    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      rShowError("Please enter a valid width and height (1 px or more).");
      return;
    }

    const MAX_DIM = 16384;
    if (w > MAX_DIM || h > MAX_DIM) {
      rShowError(`Dimensions are too large. Maximum is ${MAX_DIM} px per side.`);
      return;
    }

    const mime = rFormatSelect.value;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rShowError("Your browser does not support canvas rendering.");
      return;
    }

    // Higher quality resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // White background for JPEG (no transparency)
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.drawImage(rOriginalImage, 0, 0, w, h);

    rResizeBtn.disabled = true;
    const originalLabel = rResizeBtn.textContent;
    rResizeBtn.textContent = "Resizing…";

    try {
      // Use a moderate quality for lossy formats; PNG ignores it.
      const quality = mime === "image/png" ? undefined : 0.92;
      const blob = await toBlobAsync(canvas, mime, quality);

      if (!blob) {
        rShowError("Resize failed. Try a different format or image.");
        return;
      }

      if (rResizedUrl) URL.revokeObjectURL(rResizedUrl);
      rResizedUrl = URL.createObjectURL(blob);

      rPreviewResized.src = rResizedUrl;
      rSizeResized.textContent = formatBytes(blob.size);
      rDimResized.textContent = `${w} × ${h}`;

      const baseName =
        (rOriginalFile.name || "image").replace(/\.[^.]+$/, "") || "image";
      rDownloadBtn.href = rResizedUrl;
      rDownloadBtn.setAttribute(
        "download",
        `${baseName}-${w}x${h}.${rExtensionFor(mime)}`
      );
      rSetDownloadEnabled(true);

      rResults.hidden = false;
    } finally {
      rResizeBtn.disabled = false;
      rResizeBtn.textContent = originalLabel;
    }
  }

  function rReset() {
    rRevokeUrls();
    rOriginalFile = null;
    rOriginalImage = null;
    rFileInput.value = "";
    rPreviewOriginal.removeAttribute("src");
    rPreviewResized.removeAttribute("src");
    rSizeOriginal.textContent = "—";
    rSizeResized.textContent = "—";
    rDimOriginalMeta.textContent = "—";
    rDimResized.textContent = "—";
    rOriginalDim.textContent = "—";
    rWidthInput.value = "";
    rHeightInput.value = "";
    rAspectInput.checked = true;
    rSetDownloadEnabled(false);
    rControls.hidden = true;
    rResults.hidden = true;
    rClearError();
  }

  function rChooseAnother() {
    rReset();
    setTimeout(() => {
      rFileInput.click();
    }, 0);
  }

  // ----- Resizer events -----
  rFileInput.addEventListener("click", () => {
    rFileInput.value = "";
  });

  rFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) rHandleFile(file);
  });

  ["dragenter", "dragover"].forEach((ev) => {
    rDropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      rDropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((ev) => {
    rDropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      rDropZone.classList.remove("dragover");
    });
  });

  rDropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) rHandleFile(file);
  });

  rWidthInput.addEventListener("input", () => {
    if (rSyncing || !rAspectInput.checked || !rOriginalImage) return;
    const w = Number(rWidthInput.value);
    if (!Number.isFinite(w) || w <= 0) return;
    rSyncing = true;
    rHeightInput.value = String(Math.max(1, Math.round(w / rAspectLock)));
    rSyncing = false;
  });

  rHeightInput.addEventListener("input", () => {
    if (rSyncing || !rAspectInput.checked || !rOriginalImage) return;
    const h = Number(rHeightInput.value);
    if (!Number.isFinite(h) || h <= 0) return;
    rSyncing = true;
    rWidthInput.value = String(Math.max(1, Math.round(h * rAspectLock)));
    rSyncing = false;
  });

  rAspectInput.addEventListener("change", () => {
    if (!rAspectInput.checked || !rOriginalImage) return;
    // When re-enabling, snap height to current width using locked ratio.
    const w = Number(rWidthInput.value);
    if (Number.isFinite(w) && w > 0) {
      rSyncing = true;
      rHeightInput.value = String(Math.max(1, Math.round(w / rAspectLock)));
      rSyncing = false;
    }
  });

  rResizeBtn.addEventListener("click", rResize);
  rResetBtn.addEventListener("click", rReset);
  rChooseAnotherBtn.addEventListener("click", rChooseAnother);
  rSetDownloadEnabled(false);

  // ============================================================
  // Tab navigation
  // ============================================================
  const tabs = document.querySelectorAll(".tool-tab");
  const panels = {
    "panel-compressor": document.getElementById("panel-compressor"),
    "panel-resizer": document.getElementById("panel-resizer"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");
      tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      Object.entries(panels).forEach(([id, panel]) => {
        if (!panel) return;
        panel.hidden = id !== target;
      });
    });
  });
})();
