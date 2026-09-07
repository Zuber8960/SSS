import Api from '../services/Api';

export const fetchDeliveryNotes = (params = {}) =>
  Api.get('/deliveryNote', { params }).then((r) => r.data.data || r.data || []);

export const fetchDeliveryNoteByDlyNoteNo = (dlyNoteNo) =>
  Api.get(`/deliveryNote/${encodeURIComponent(dlyNoteNo)}`).then((r) => r.data.data || r.data || null);

export const fetchDeliveryNoteByDocketNo = (docketNo) =>
  Api.get(`/deliveryNote/docket/${encodeURIComponent(docketNo)}`).then((r) => r.data.data || r.data || null);

export const saveDeliveryNote = (payload) =>
  Api.post('/deliveryNote', payload).then((r) => r.data.data || r.data);

export const updateDeliveryNote = (dlyNoteNo, payload) =>
  Api.put(`/deliveryNote/${encodeURIComponent(dlyNoteNo)}`, payload).then((r) => r.data.data || r.data);

export const deleteDeliveryNote = (dlyNoteNo) =>
  Api.delete(`/deliveryNote/${encodeURIComponent(dlyNoteNo)}`).then((r) => r.data);

/**
 * Compress/resize an image file in the browser before upload.
 * Mobile camera photos are often 5–12MB; this resizes to max 2000px on the
 * longest edge and re-encodes as JPEG, iterating quality down until the
 * result is under maxBytes. Non-image files are returned unchanged.
 */
export const compressImageFile = async (file, maxBytes = 4 * 1024 * 1024) => {
  const isImage = /^image\//i.test(file.type) || /\.(jpe?g|png|gif|heic|heif)$/i.test(file.name);
  if (!isImage || file.size <= maxBytes) return file;

  try {
    // Load the image (createImageBitmap handles most types; fall back to <img>)
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
        img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e); };
        img.src = objectUrl;
      });
    }

    const MAX_DIM = 2000;
    let { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

    // Iterate quality until under the size cap
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
      );
      if (blob && blob.size <= maxBytes) {
        const name = (file.name || "camera.jpg").replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
      }
    }
    // Could not compress enough — return the last attempt anyway (backend will judge)
    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.4)
    );
    if (blob) {
      const name = (file.name || "camera.jpg").replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    }
    return file;
  } catch {
    // If compression fails for any reason, fall back to the original file
    return file;
  }
};

// Upload a POD file to the backend (stored in backend/uploads/pod, served at /uploads/pod/...)
// Images are compressed in-browser first — mobile camera photos are often >5MB
// which would otherwise fail with a 413 from the backend's size limit.
export const uploadPodFile = async (file) => {
  const compressed = await compressImageFile(file);
  const formData = new FormData();
  formData.append('file', compressed);
  return Api.post('/deliveryNote/pod', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data?.data?.url || r.data?.url || null);
};
