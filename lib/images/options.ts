export function compressionOptions() {
  // Force JPEG: the original is only ever shown as a photo (no transparency
  // needed), and it keeps the stored bytes in sync with the "image/jpeg"
  // content-type we upload it under.
  return {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  };
}
