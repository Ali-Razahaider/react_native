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
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; touch-action: none; }
  body { background: #f2f3f5; }
  body.dark { background: #000000; }
  #page-wrap { position: relative; width: 100%; height: 100%; touch-action: none; }
  #stage {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
    will-change: transform;
  }
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
  .textLayer {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    line-height: 1;
    text-align: initial;
    text-size-adjust: none;
    transform-origin: 0 0;
    z-index: 2;
    touch-action: auto;
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
  .textLayer span, .textLayer br {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
  }
  .textLayer ::selection {
    background: rgba(32, 138, 239, 0.35);
  }
</style>
</head>
<body>
<div id="page-wrap">
  <div id="stage">
    <div class="textLayer" id="text-layer"></div>
    <canvas id="pdf-canvas"></canvas>
    <div class="textLayer" id="text-layer-b"></div>
    <canvas id="pdf-canvas-b"></canvas>
  </div>
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
  var textLayers = [
    document.getElementById('text-layer'),
    document.getElementById('text-layer-b'),
  ];
  var front = 0;

  // Render the invisible, selectable text layer over a given canvas. The
  // spans are transparent by default, so only selections become visible.
  function renderTextLayerFor(canvas, page, viewport) {
    var layer = document.getElementById(canvas.id === 'pdf-canvas' ? 'text-layer' : 'text-layer-b');
    layer.innerHTML = '';
    layer.style.setProperty('--scale-factor', String(viewport.scale));
    return page.getTextContent().then(function (content) {
      return pdfjsLib.renderTextLayer({
        textContentSource: content,
        container: layer,
        viewport: viewport
      }).promise;
    });
  }

  // Show the text layer that matches the visible canvas; keep the buffered
  // page's layer invisible and non-interactive so text can't be selected
  // from the page that isn't on screen.
  function syncLayers() {
    for (var i = 0; i < 2; i++) {
      var active = i === front;
      textLayers[i].style.opacity = active ? '1' : '0';
      textLayers[i].style.pointerEvents = active ? 'auto' : 'none';
    }
  }

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
      var pixels = page.render({ canvasContext: ctx, viewport: viewport }).promise;
      var words = renderTextLayerFor(canvas, page, viewport);
      return Promise.all([pixels, words]);
    });
  }

  // First page: draw it straight onto the visible canvas.
  function renderFirstPage(n) {
    renderInto(canvases[front], n).then(function () {
      currentPage = n;
      canvases[front].classList.add('visible');
      syncLayers();
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
      syncLayers();
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
    resetZoom();
    pdfjsLib.getDocument({ data: base64ToUint8Array(base64) }).promise.then(function (doc) {
      pdfDoc = doc;
      post({ type: 'totalPages', totalPages: doc.numPages });
      renderFirstPage(initialPage || 1);
    }).catch(postError);
  }

  window.__openPdf = openPdf;
  window.__goToPage = renderPage;
  window.__flip = flip;
  window.__resetZoom = resetZoom;
  window.__setDarkMode = function (on) {
    document.body.classList.toggle('dark', !!on);
  };

  // --- Zoom & pan ---------------------------------------------------------
  var zoom = 1;
  var minZoom = 1;
  var maxZoom = 3;
  var panX = 0;
  var panY = 0;

  var stage = document.getElementById('stage');

  function applyTransform() {
    stage.style.transform =
      'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
  }

  function visibleCanvas() {
    return canvases[front];
  }

  function clampPan() {
    var canvas = visibleCanvas();
    var cw = parseFloat(canvas.style.width) || 0;
    var ch = parseFloat(canvas.style.height) || 0;
    var container = document.getElementById('page-wrap');
    var vw = container.clientWidth || window.innerWidth;
    var vh = container.clientHeight || window.innerHeight;
    var maxX = Math.max(0, (cw * zoom - vw) / 2);
    var maxY = Math.max(0, (ch * zoom - vh) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  // After a gesture, drop pan in any dimension where the content fits the
  // viewport again. This re-centers the page when zoomed back out without
  // fighting focal anchoring while zoomed in.
  function settlePan() {
    var canvas = visibleCanvas();
    var cw = parseFloat(canvas.style.width) || 0;
    var ch = parseFloat(canvas.style.height) || 0;
    var container = document.getElementById('page-wrap');
    var vw = container.clientWidth || window.innerWidth;
    var vh = container.clientHeight || window.innerHeight;
    if (cw * zoom <= vw) panX = 0;
    if (ch * zoom <= vh) panY = 0;
    applyTransform();
  }

  // Keep the point under (fx, fy) fixed while changing scale to newZoom.
  function zoomAround(fx, fy, newZoom) {
    // Screen coords: p' = (p - pan) * zoom, so p = pan + p' / zoom.
    // We want the content point under the focal point to stay put.
    panX = fx - ((fx - panX) / zoom) * newZoom;
    panY = fy - ((fy - panY) / zoom) * newZoom;
    zoom = newZoom;
    applyTransform();
  }

  var touches = {};
  var pinchStartDist = 0;
  var pinchStartZoom = 1;
  var pinchStartPanX = 0;
  var pinchStartPanY = 0;
  var pinchMidX = 0;
  var pinchMidY = 0;
  var swiping = false;
  var lastTapTime = 0;
  var lastTapX = 0;
  var lastTapY = 0;
  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;

  function touchDistance() {
    var ids = Object.keys(touches);
    if (ids.length < 2) return 0;
    var a = touches[ids[0]];
    var b = touches[ids[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  document.addEventListener('touchstart', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      touches[e.changedTouches[i].identifier] = e.changedTouches[i];
    }
    swiping = false;

    if (Object.keys(touches).length === 2) {
      e.preventDefault();
      pinchStartDist = touchDistance();
      pinchStartZoom = zoom;
      pinchStartPanX = panX;
      pinchStartPanY = panY;
      var ids = Object.keys(touches);
      pinchMidX = (touches[ids[0]].clientX + touches[ids[1]].clientX) / 2;
      pinchMidY = (touches[ids[0]].clientY + touches[ids[1]].clientY) / 2;
    } else if (Object.keys(touches).length === 1) {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      touchActive = true;
    }
  }, { passive: false });

  document.addEventListener('touchmove', function (e) {
    var count = Object.keys(touches).length;

    if (count === 2 && pinchStartDist > 0) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        touches[e.changedTouches[i].identifier] = e.changedTouches[i];
      }
      e.preventDefault();
      var ratio = touchDistance() / pinchStartDist;
      var newZoom = Math.max(minZoom, Math.min(maxZoom, pinchStartZoom * ratio));
      var factor = newZoom / pinchStartZoom;

      // Zoom around the pinch's INITIAL midpoint (a fixed anchor), not the
      // moving midpoint. This keeps the point you started pinching at pinned
      // to the same screen spot, so finger drift doesn't scroll the page.
      panX = pinchMidX - (pinchMidX - pinchStartPanX) * factor;
      panY = pinchMidY - (pinchMidY - pinchStartPanY) * factor;
      zoom = newZoom;
      applyTransform();
      return;
    }

    if (count === 1 && zoom > 1.01) {
      // When zoomed in, a single-finger drag pans instead of flipping pages.
      e.preventDefault();
      var id = e.changedTouches[0].identifier;
      var prev = touches[id];
      if (prev) {
        panX += e.changedTouches[0].clientX - prev.clientX;
        panY += e.changedTouches[0].clientY - prev.clientY;
      }
      touches[id] = e.changedTouches[0];
      clampPan();
      applyTransform();
      return;
    }

    for (var i = 0; i < e.changedTouches.length; i++) {
      touches[e.changedTouches[i].identifier] = e.changedTouches[i];
    }

    if (count === 1 && touchActive) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      // Only a horizontal swipe flips pages; vertical drags are ignored.
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        touchActive = false;
        swiping = true;
        var direction = dx < 0 ? 'next' : 'prev';
        flip(direction);
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', function (e) {
    var endTouch = e.changedTouches[0];

    if (!swiping && !touchActive && Object.keys(touches).length === 2) {
      // One finger lifted after a pinch: switch to single-finger pan.
      touchActive = false;
    }

    for (var i = 0; i < e.changedTouches.length; i++) {
      delete touches[e.changedTouches[i].identifier];
    }

    // Double-tap toggles zoom (1x <-> ~2.5x) around the tap point.
    if (!swiping && !pinchStartDist) {
      var dx2 = endTouch.clientX - touchStartX;
      var dy2 = endTouch.clientY - touchStartY;
      var moved = Math.abs(dx2) + Math.abs(dy2);
      var now = Date.now();
      if (moved < 16) {
        if (now - lastTapTime < 300) {
          var target = zoom > 1.01 ? 1 : 2.5;
          zoomAround(endTouch.clientX, endTouch.clientY, target);
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          lastTapX = endTouch.clientX;
          lastTapY = endTouch.clientY;
        }
      } else {
        lastTapTime = 0;
      }
    }

    // Re-center any dimension that fits again (e.g. after zooming back out).
    // This doesn't fight focal anchoring while zoomed in, so no jump.
    if (!swiping) {
      settlePan();
    }
    pinchStartDist = 0;
    touchActive = false;
    swiping = false;
  }, { passive: false });

  document.addEventListener('touchcancel', function () {
    touches = {};
    pinchStartDist = 0;
    touchActive = false;
    swiping = false;
    settlePan();
  }, { passive: false });

  applyTransform();

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
