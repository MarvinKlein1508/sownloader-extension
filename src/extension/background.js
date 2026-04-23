const ext = typeof browser !== "undefined" ? browser : chrome;

ext.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "DOWNLOAD_SMULE") {
    return;
  }

  if (!ext.downloads || !ext.downloads.download) {
    if (sender?.tab?.id != null && ext.tabs?.sendMessage) {
      return ext.tabs.sendMessage(sender.tab.id, {
        type: "FALLBACK_DOWNLOAD_SMULE",
        url: msg.url,
        filename: msg.filename
      });
    }
    return;
  }

  return ext.downloads.download({
    url: msg.url,
    filename: msg.filename,
    saveAs: false
  }).catch((error) => {
    console.warn("downloads.download failed", error);

    if (sender?.tab?.id != null && ext.tabs?.sendMessage) {
      return ext.tabs.sendMessage(sender.tab.id, {
        type: "FALLBACK_DOWNLOAD_SMULE",
        url: msg.url,
        filename: msg.filename
      }).catch((fallbackError) => {
        console.warn("Fallback message failed", fallbackError);
      });
    }
  });
});
