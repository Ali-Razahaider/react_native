export type BuildPdfHtmlOptions = {
  pdfJsSource: string;
  workerBase64: string;
};

export function buildPdfHtml({ pdfJsSource, workerBase64 }: BuildPdfHtmlOptions): string {
  const safePdfJs = pdfJsSource.replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; background: #1c1c1f; height: 100%; overflow: hidden; }
  #page-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  canvas { display: block; margin: 0 auto; }
  body.dark canvas { filter: invert(1) hue-rotate(180deg); }
</style>
</head>
<body>
<div id="page-wrap">
  <canvas id="pdf-canvas"></canvas>
</div>
<script>${safePdfJs}</script>
<script>
(function () {
  var pdfjsLib = window.pdfjsLib;

  function base64ToUint8Array(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  var workerBlob = new Blob([base64ToUint8Array('${workerBase64}')], { type: 'application/javascript' });
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

  function post(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  var pdfDoc = null;

  function renderPage(n) {
    if (!pdfDoc) return;
    pdfDoc.getPage(n).then(function (page) {
      var container = document.getElementById('page-wrap');
      var canvas = document.getElementById('pdf-canvas');
      var base = page.getViewport({ scale: 1 });
      var containerW = Math.max(container.clientWidth || window.innerWidth, 320);
      var containerH = Math.max(container.clientHeight || window.innerHeight, 480);
      var scale = Math.min(containerW / base.width, containerH / base.height);
      var viewport = page.getViewport({ scale: scale });
      var dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }).then(function () {
      post({ type: 'pageRendered', page: n });
    }).catch(function (err) {
      post({ type: 'error', message: String((err && err.message) || err) });
    });
  }

  function openPdf(base64) {
    var data = base64ToUint8Array(base64);
    pdfjsLib.getDocument({ data: data }).promise.then(function (doc) {
      pdfDoc = doc;
      post({ type: 'totalPages', totalPages: doc.numPages });
      renderPage(1);
    }).catch(function (err) {
      post({ type: 'error', message: String((err && err.message) || err) });
    });
  }

  window.__openPdf = openPdf;
  window.__goToPage = function (n) { renderPage(n); };
  window.__setDarkMode = function (on) {
    document.body.classList.toggle('dark', !!on);
  };

  document.addEventListener('message', function (e) {
    var msg;
    try { msg = JSON.parse(e.data); } catch (_) { return; }
    if (msg.type === 'openPdf') openPdf(msg.data);
    else if (msg.type === 'goToPage') renderPage(msg.page);
    else if (msg.type === 'setDarkMode') window.__setDarkMode(msg.on);
  });

  post({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
