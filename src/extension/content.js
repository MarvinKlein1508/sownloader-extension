const ext = typeof browser !== "undefined" ? browser : chrome;

function isFirefoxAndroid() {
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && /Firefox/i.test(ua);
}

function fallbackDownload(url, filename) {
  if (!url) return;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadFile(url, filename) {
  if (!url) return;
 
  if (isFirefoxAndroid()) {
    fallbackDownload(url, filename);
    return;
  }

  ext.runtime.sendMessage({
    type: "DOWNLOAD_SMULE",
    url,
    filename
  }).catch((error) => {
    console.warn("Background download failed, using fallback", error);
    fallbackDownload(url, filename);
  });
}

ext.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "FALLBACK_DOWNLOAD_SMULE") {
    fallbackDownload(msg.url, msg.filename);
  }
});

(() => {
  const TARGET_SELECTOR = "body";
  const BUTTON_ID = "sownloader";
  const DIALOG_ID = "sownloader-dialog";

  async function insertUI() {
    const match = window.location.href.match(/(\d+_\d+)(?=\/|$)/);
    const id = match ? match[1] : null;

    if (!id) {
      return false;
    }

    console.log("SOWNLOADER EXTENSION LOADED");

    const target = document.querySelector(TARGET_SELECTOR);

    if (!target) return false;


    if (!document.getElementById(DIALOG_ID)) {
      injectDialog(target);
    }

    if (document.getElementById(BUTTON_ID)) return true;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.textContent = "Sownloader";

    button.addEventListener("click", async () => {
      const match = window.location.href.match(/(\d+_\d+)(?=\/|$)/);
      const id = match ? match[1] : null;

      if (!id) {
        return false;
      }

      const dialog = document.getElementById(DIALOG_ID);
      const btnDownloadAudio = document.getElementById("sownloader-download-audio");
      const btnDownloadVideo = document.getElementById("sownloader-download-video");
      const renderError = document.getElementById("sownloader-render-error");


      if (!dialog) return;

      try {
        const url = `https://www.smule.com/api/performance/${id}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "*/*",
            "Accept-Language": "en;q=0.9",
            "Referer": "https://www.smule.com/"
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const performanceData = await response.json();
        console.log("Performance JSON:", performanceData);
        console.log("Performance URL:", performanceData.media_url);

        const downloadAudioLink = performanceData.media_url ? await processRecording(performanceData.media_url) : null;
        const downloadVideoLink = performanceData.video_media_mp4_url ? await processRecording(performanceData.video_media_mp4_url) : null;

        console.log(downloadAudioLink);
        console.log(downloadVideoLink);

        if (!downloadAudioLink) {
          btnDownloadAudio.style.display = "none";
          btnDownloadAudio.onclick = null;
        }
        else {
          btnDownloadAudio.style.display = "block";
          btnDownloadAudio.onclick = async () => {
            downloadFile(
              downloadAudioLink,
              (performanceData.title || "smule_recording") + ".m4a"
            );
          };
        }

        if (!downloadVideoLink) {
          btnDownloadVideo.style.display = "none";
          btnDownloadVideo.onclick = null;
        }
        else {
          btnDownloadVideo.style.display = "block";
          btnDownloadVideo.onclick = async () => {
            downloadFile(
              downloadVideoLink,
              (performanceData.title || "smule_recording") + ".mp4"
            );
          };
        }

        if (!downloadAudioLink && !downloadVideoLink) {
          renderError.style.display = "block";
        }
        else {
          renderError.style.display = "none";
        }

        dialog.showModal();

      } catch (error) {
        console.error("Error:", error);
        //status.textContent = `Fehler: ${error.message}`;
      }
    });

    target.prepend(button);
    return true;
  }

  function injectDialog(target) {
    const paypalDonate = ext.i18n.getMessage("paypalDonate");
    const patreonText = ext.i18n.getMessage("becomePatreon");
    const renderingError = ext.i18n.getMessage("renderingError");

    const dialog = document.createElement("dialog");
    dialog.id = DIALOG_ID;
    dialog.style.padding = "20px";
    dialog.style.border = "none";
    dialog.style.borderRadius = "12px";
    dialog.style.width = "400px";
    dialog.style.maxWidth = "90vw";
    dialog.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";

    dialog.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2 style="margin:0;font-size:18px;">Sownloader by MarvinKleinMusic</h2>
        <button id="sownloader-close" style="border:none;background:transparent;font-size:20px;cursor:pointer;">×</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <p id="sownloader-render-error">${renderingError}</p>
        <button id="sownloader-download-audio">Download audio</button>
        <button id="sownloader-download-video">Download video</button>
        <hr class="sownloader-separator" />
        <a class="sownloader-btn" href="https://paypal.me/sownloader" target="_blank"><i class="fab fa-paypal"></i>${paypalDonate}</a>
        <a class="sownloader-btn" href="https://patreon.com/Sownloader" target="_blank">${patreonText}</a>
        <hr class="sownloader-separator" />
        <a href="https://sownloader.com" target="_blank">Powered by Sownloader.com</a>
      </div>
    `;

    target.appendChild(dialog);

    const closeBtn = dialog.querySelector("#sownloader-close");
    closeBtn?.addEventListener("click", () => {
      dialog.close();
    });

    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        dialog.close();
      }
    });
  }

  function init() {
    insertUI().then((success) => {
      if (success) return;

      const observer = new MutationObserver(() => {
        insertUI().then((done) => {
          if (done) {
            observer.disconnect();
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  function smuleError(e) { }

  function r(g) {
    var k = {}, a, l = 0, d, c = 0, b, e = "", f = String.fromCharCode, h = g.length;
    for (a = 0; 64 > a; a++) {
      k["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(a)] = a;
    }
    for (d = 0; d < h; d++) {
      for (a = k[g.charAt(d)], l = (l << 6) + a, c += 6; 8 <= c;) {
        ((b = l >>> (c -= 8) & 255) || d < h - 2) && (e += f(b));
      }
    }
    return e;
  }

  const s = r("TT18WlV5TXVeLXFXYn1WTF5qSmR9TXYpOHklYlFXWGY+SUZCRGNKPiU0emcyQ2l8dGVsamBkVlpA");

  function processRecording(g) {
    if (null === g || "string" !== typeof g || 2 > g.length || 0 !== g.indexOf("e:")) return g;

    for (var k = r(g.substring(2)), a = [], h = 0, d, c = "", b = 0; 256 > b; b++) {
      a[b] = b;
    }

    for (b = 0; 256 > b; b++) {
      h = (h + a[b] + s.charCodeAt(b % s.length)) % 256;
      d = a[b];
      a[b] = a[h];
      a[h] = d;
    }

    for (var e = h = b = 0; e < k.length; e++) {
      b = (b + 1) % 256;
      h = (h + a[b]) % 256;
      d = a[b];
      a[b] = a[h];
      a[h] = d;
      c += String.fromCharCode(k.charCodeAt(e) ^ a[(a[b] + a[h]) % 256]);
    }

    0 !== c.indexOf("http") && smuleError("Failed to decode URL " + g + "; got " + c);
    return c;
  }

  init();
})();