const ext = typeof browser !== "undefined" ? browser : chrome;

const PORT_NAME = "SMULE_CHUNK_DOWNLOAD";
const RAW_MESSAGE_CHUNK_SIZE = 512 * 1024;

function uint8ArrayToBase64(bytes) {
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
}

function postChunk(port, bytes, index) {
  port.postMessage({
    type: "CHUNK",
    index,
    base64: uint8ArrayToBase64(bytes)
  });

  return index + 1;
}

ext.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) {
    return;
  }

  port.onMessage.addListener(async (msg) => {
    if (msg?.type !== "START") {
      return;
    }

    let chunkIndex = 0;

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
      const contentLength = Number(response.headers.get("content-length")) || null;

      port.postMessage({
        type: "META",
        contentType,
        contentLength
      });

      if (response.body?.getReader) {
        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          for (let offset = 0; offset < value.length; offset += RAW_MESSAGE_CHUNK_SIZE) {
            chunkIndex = postChunk(
              port,
              value.subarray(offset, offset + RAW_MESSAGE_CHUNK_SIZE),
              chunkIndex
            );
          }
        }
      } else {
        const bytes = new Uint8Array(await response.arrayBuffer());

        for (let offset = 0; offset < bytes.length; offset += RAW_MESSAGE_CHUNK_SIZE) {
          chunkIndex = postChunk(
            port,
            bytes.subarray(offset, offset + RAW_MESSAGE_CHUNK_SIZE),
            chunkIndex
          );
        }
      }

      port.postMessage({
        type: "DONE",
        chunks: chunkIndex,
        contentType
      });
    } catch (error) {
      console.error("Background chunk fetch failed", error);

      port.postMessage({
        type: "ERROR",
        error: error?.message || String(error)
      });
    }
  });
});
