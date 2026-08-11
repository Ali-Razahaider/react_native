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
  html, body { margin: 0; padding: 0; background: #1c1c1f; height: 100%; overflow: hidden; touch-action: none; }
  #page-wrap { position: relative; width: 100%; height: 100%; touch-action: none; }
  canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: block;
    touch-action: none;
    opacity: 0;
    transition: opacity 0.22s ease;
  }
  canvas.visible { opacity: 1; }
  body.dark canvas { filter: invert(1) hue-rotate(180deg); }
</style>
</head>
<body>
<div id="page-wrap">
  <canvas id="pdf-canvas"></canvas>
  <canvas id="pdf-canvas-b"></canvas>
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

  function postError(err) {
    post({ type: 'error', message: String((err && err.message) || err) });
  }

  var pdfDoc = null;
  var currentPage = 1;
  var busy = false;

  // Two stacked canvases. front is the index of the visible one.
  var canvases = [
    document.getElementById('pdf-canvas'),
    document.getElementById('pdf-canvas-b'),
  ];
  var front = 0;

  function renderInto(canvas, n) {
    return pdfDoc.getPage(n).then(function (page) {
      var container = document.getElementById('page-wrap');
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
    });
  }

  // First page: draw it straight onto the visible canvas.
  function renderFirstPage(n) {
    renderInto(canvases[front], n).then(function () {
      currentPage = n;
      canvases[front].classList.add('visible');
      post({ type: 'pageRendered', page: n });
    }).catch(postError);
  }

  // Later pages: draw onto the hidden canvas, fade it in, then swap roles.
  function renderPage(n) {
    if (!pdfDoc || busy) return;
    busy = true;
    var next = 1 - front; // the hidden canvas
    renderInto(canvases[next], n).then(function () {
      currentPage = n;
      canvases[next].classList.add('visible');
      canvases[front].classList.remove('visible');
      front = next;
      busy = false;
      post({ type: 'pageRendered', page: n });
    }).catch(function (err) {
      busy = false;
      postError(err);
    });
  }

  function flip(direction) {
    if (!pdfDoc || busy) return;
    var next = direction === 'next' ? currentPage + 1 : currentPage - 1;
    if (next < 1 || next > pdfDoc.numPages) return;
    renderPage(next);
  }

  function openPdf(base64, initialPage) {
    pdfjsLib.getDocument({ data: base64ToUint8Array(base64) }).promise.then(function (doc) {
      pdfDoc = doc;
      post({ type: 'totalPages', totalPages: doc.numPages });
      renderFirstPage(initialPage || 1);
    }).catch(postError);
  }

  window.__openPdf = openPdf;
  window.__goToPage = renderPage;
  window.__flip = flip;
  window.__setDarkMode = function (on) {
    document.body.classList.toggle('dark', !!on);
  };

  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;

  document.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
  });

  document.addEventListener('touchmove', function (e) {
    if (!touchActive) return;
    var dx = e.touches[0].clientX - touchStartX;
    var dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      e.preventDefault();
      touchActive = false;
      var direction = dx < 0 ? 'next' : 'prev';
      flip(direction);
    }
  });

  document.addEventListener('touchend', function () {
    touchActive = false;
  });

  document.addEventListener('message', function (e) {
    var msg;
    try { msg = JSON.parse(e.data); } catch (_) { return; }
    if (msg.type === 'openPdf') openPdf(msg.data, msg.initialPage);
    else if (msg.type === 'goToPage') renderPage(msg.page);
    else if (msg.type === 'flip') flip(msg.direction);
    else if (msg.type === 'setDarkMode') window.__setDarkMode(msg.on);
  });

  post({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
