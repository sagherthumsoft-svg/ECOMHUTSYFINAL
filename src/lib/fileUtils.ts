export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getFileExtension = (fileName: string) => {
  return fileName.split(".").pop()?.toLowerCase() || "";
};

export const getFileIconColor = (fileName: string) => {
  const ext = getFileExtension(fileName);
  switch (ext) {
    case "pdf":
      return "bg-red-500";
    case "doc":
    case "docx":
      return "bg-blue-500";
    case "xls":
    case "xlsx":
    case "csv":
      return "bg-green-500";
    case "ppt":
    case "pptx":
      return "bg-orange-500";
    case "zip":
    case "rar":
    case "7z":
      return "bg-purple-500";
    case "txt":
      return "bg-gray-500";
    default:
      return "bg-indigo-500";
  }
};

export const isImageFile = (type?: string) => type?.startsWith("image/");
export const isVideoFile = (type?: string) => type?.startsWith("video/");
export const isAudioFile = (type?: string) => type?.startsWith("audio/");
export const isPdfFile = (type?: string, name?: string) => 
  type?.includes("pdf") || name?.toLowerCase().endsWith(".pdf");

export const isDocFile = (fileName: string) => {
  const ext = getFileExtension(fileName);
  return ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext);
};

export const downloadFile = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Delay revocation to ensure browser captures the download
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.warn("Direct blob download failed, trying standard link download behavior:", error);
    // Fallback: Create an anchor tag with the actual URL and a `download` attribute
    const link = document.createElement("a");
    link.href = url + (url.includes("?") ? "&" : "?") + "download=1";
    link.download = fileName || "download";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => document.body.removeChild(link), 100);
  }
};
