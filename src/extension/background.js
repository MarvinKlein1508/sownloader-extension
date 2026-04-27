const ext = typeof browser !== "undefined" ? browser : chrome;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "FETCH_SMULE_AS_BASE64") {
    return false;
  }

  (async () => {
    try {
      const response = await fetch(msg.url, {
        method: "GET",
        headers: {
          "Accept": "*/*",
          "Referer": "https://www.smule.com/"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const buffer = await response.arrayBuffer();

      sendResponse({
        ok: true,
        base64: arrayBufferToBase64(buffer),
        contentType
      });
    } catch (error) {
      console.error("Background blob fetch failed", error);
      sendResponse({
        ok: false,
        error: error?.message || String(error)
      });
    }
  })();

  return true;
});
