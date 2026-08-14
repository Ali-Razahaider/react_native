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
  #hl {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transform-origin: 0 0;
    z-index: 3;
    pointer-events: none;
    overflow: hidden;
  }
  #hl div {
    position: absolute;
    background: rgba(32, 138, 239, 0.35);
    border-radius: 2px;
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
    <div id="hl"></div>
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

  function dbg(msg) {
    post({ type: 'debug', message: String(msg) });
  }

  function postError(err) {
    post({ type: 'error', message: String((err && err.message) || err) });
  }

  var pdfDoc = null;
  var currentPage = 1;
  var busy = false;

  // Word boxes for each rendered page, keyed by page number. Built from the
  // transparent text layer's own geometry (see buildWords) so hit-testing
  // always matches the pixels on screen — no OCR, no browser caret heuristics.
  var pageWordCache = {};

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
  function renderTextLayerFor(canvas, page, viewport, pageIndex) {
    var layer = document.getElementById(canvas.id === 'pdf-canvas' ? 'text-layer' : 'text-layer-b');
    layer.innerHTML = '';
    layer.style.setProperty('--scale-factor', String(viewport.scale));
    return page.getTextContent().then(function (content) {
      return pdfjsLib.renderTextLayer({
        textContentSource: content,
        container: layer,
        viewport: viewport
      }).promise;
    }).then(function () {
      pageWordCache[pageIndex] = buildWordBoxes(layer, zoom);
    });
  }

  // Build per-word bounding boxes from the rendered text layer. Each word's
  // box comes from Range.getBoundingClientRect on the transparent span text,
  // so it agrees with pdf.js's own layout (including scaleX/rotate transforms
  // it applies to spans) and with the canvas the user actually sees. Rects are
  // normalized by the zoom that was active during rendering, yielding stable
  // layer-local coordinates that hit-testing divides by the *current* zoom.
  function buildWordBoxes(layer, scale) {
    var words = [];
    var layerRect = layer.getBoundingClientRect();
    var spans = layer.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      var node = span.firstChild;
      if (!node || node.nodeType !== 3) continue;
      var text = node.textContent;
      if (!text) continue;
      // March through words in the run of text inside this span.
      var re = /[A-Za-z]+(?:['\u2019-][A-Za-z]+)*/g;
      var m;
      while ((m = re.exec(text)) !== null) {
        var range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        var rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) continue;
        var word = {
          word: m[0],
          x: (rect.left - layerRect.left) / scale,
          y: (rect.top - layerRect.top) / scale,
          w: rect.width / scale,
          h: rect.height / scale,
        };
        if (words.length < 30000) words.push(word);
      }
    }
    return words;
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
      // Size the highlight overlay to the same box as the text layer so child
      // divs positioned in layer-local coordinates land exactly on the word.
      var hl = document.getElementById('hl');
      hl.style.width = viewport.width + 'px';
      hl.style.height = viewport.height + 'px';
      hl.innerHTML = '';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pixels = page.render({ canvasContext: ctx, viewport: viewport }).promise;
      var words = renderTextLayerFor(canvas, page, viewport, n);
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
    pageWordCache = {};
    pdfjsLib.getDocument({ data: base64ToUint8Array(base64) }).promise.then(function (doc) {
      pdfDoc = doc;
      post({ type: 'totalPages', totalPages: doc.numPages });
      renderFirstPage(initialPage || 1);
    }).catch(postError);
  }

  // Render page 1 to an offscreen canvas at a small size and send the JPEG
  // back so the native side can use it as the book's icon/thumbnail.
  function captureThumbnail() {
    if (!pdfDoc) return;
    var targetWidth = 240;
    pdfDoc.getPage(1).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var scale = targetWidth / base.width;
      var viewport = page.getViewport({ scale: scale });
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
        post({ type: 'thumbnail', data: canvas.toDataURL('image/jpeg', 0.7) });
      }).catch(postError);
    }).catch(postError);
  }

  window.__openPdf = openPdf;
  window.__goToPage = renderPage;
  window.__flip = flip;
  window.__resetZoom = resetZoom;
  window.__captureThumbnail = captureThumbnail;
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

  // The canvas is centered in the stage (top:50%/left:50% + translate),
  // but the stage scales around its top-left corner (transform-origin:0 0).
  // So content screen-space bounds are:
  //   left   = panX + zoom * (vw/2 - cw/2)
  //   right  = panX + zoom * (vw/2 + cw/2)
  // (and the same for Y). At zoom z the page is visually centered when
  // pan = (vw/2, vh/2) * (1 - z), NOT when pan = 0. Clamping around 0
  // snaps the page back toward the top-left whenever it is panned, which
  // is why horizontal drags "reset to the top". Compute real bounds below.
  function clampPan() {
    var canvas = visibleCanvas();
    var cw = parseFloat(canvas.style.width) || 0;
    var ch = parseFloat(canvas.style.height) || 0;
    var container = document.getElementById('page-wrap');
    var vw = container.clientWidth || window.innerWidth;
    var vh = container.clientHeight || window.innerHeight;

    if (cw * zoom <= vw) {
      // Fits horizontally: pin to the centered position for this zoom.
      panX = (vw - zoom * vw) / 2;
    } else {
      // Wider than the viewport: keep the content covering it, no gaps.
      var minX = vw - (zoom * (vw + cw)) / 2;
      var maxX = (zoom * (cw - vw)) / 2;
      panX = Math.max(minX, Math.min(maxX, panX));
    }

    if (ch * zoom <= vh) {
      panY = (vh - zoom * vh) / 2;
    } else {
      var minY = vh - (zoom * (vh + ch)) / 2;
      var maxY = (zoom * (ch - vh)) / 2;
      panY = Math.max(minY, Math.min(maxY, panY));
    }
  }

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  // After a gesture, re-clamp: dimensions that now fit are re-centered,
  // larger ones keep their current position. No jumps because clampPan
  // uses the correct centered baseline for the current zoom.
  function settlePan() {
    clampPan();
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
    // A long-press just fired: don't count this release as a tap, otherwise
    // the next touch would be seen as a double-tap and zoom unexpectedly.
    if (!swiping && !pinchStartDist && !longPressed) {
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

  // --- Word lookup (long-press) ------------------------------------------
  var LONG_PRESS_MS = 380;
  var longPressTimer = null;
  var longPressed = false;
  var longPressedDelivered = false;
  var longPressX = 0;
  var longPressY = 0;
  var longPressStart = 0;

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // Run the selection now, exactly once, no matter which signal gets here
  // first (our timer, Android's touchcancel, or its synthetic contextmenu).
  function deliverLongPressNow() {
    if (longPressed || longPressedDelivered) return true; // already handled
    clearLongPress();
    fireLongPress(longPressX, longPressY);
    longPressedDelivered = true;
    return longPressed;
  }

  // Hit-test a screen-space point against the current page's word boxes. Boxes
  // are stored in text-layer-local coordinates, so convert the point the same
  // way by subtracting the visible text layer's bounding rect.
  // Two passes: first, a word whose box strictly contains the point always
  // wins (most specific). Only when the touch lands in the slop band between
  // words do we fall back to nearest-center so a long press on the edge of a
  // long word after a short one (e.g. "a university") isn't hijacked by the
  // smaller neighbor to the left.
  function wordAtPoint(x, y) {
    var words = pageWordCache[currentPage];
    if (!words || words.length === 0) return null;
    var layer = textLayers[front];
    if (!layer) return null;
    var layerRect = layer.getBoundingClientRect();
    // Touch points are in viewport coords; boxes are stored in layer-local
    // coords normalized by zoom, so apply the same normalization here.
    var px = (x - layerRect.left) / zoom;
    var py = (y - layerRect.top) / zoom;
    var best = null;
    var bestArea = Infinity;
    // Pass 1: strict containment.
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) {
        var area = w.w * w.h;
        if (area < bestArea) {
          bestArea = area;
          best = w;
        }
      }
    }
    if (best) return best;
    // Pass 2: generous hit area for small-cap words; nearest center wins.
    var slop = Math.max(4, Math.min(10, (layerRect.height + layerRect.width) * 0.004)) / zoom;
    var bestDist = Infinity;
    for (var j = 0; j < words.length; j++) {
      var sw = words[j];
      if (px >= sw.x - slop && px <= sw.x + sw.w + slop && py >= sw.y - slop && py <= sw.y + sw.h + slop) {
        var ddx = px - (sw.x + sw.w / 2);
        var ddy = py - (sw.y + sw.h / 2);
        var dist = ddx * ddx + ddy * ddy;
        if (dist < bestDist) {
          bestDist = dist;
          best = sw;
        }
      }
    }
    return best;
  }

  function drawHighlight(word) {
    var hl = document.getElementById('hl');
    hl.innerHTML = '';
    var div = document.createElement('div');
    div.style.left = word.x + 'px';
    div.style.top = word.y + 'px';
    div.style.width = word.w + 'px';
    div.style.height = word.h + 'px';
    hl.appendChild(div);
  }

  function fireLongPress(x, y) {
    var words = pageWordCache[currentPage];
    // Rendered page with zero word boxes (scanned/image-only page): let the
    // native side tell the user instead of silently doing nothing.
    if (words && words.length === 0) {
      post({ type: 'noSelectableText' });
      return;
    }
    var word = wordAtPoint(x, y);
    if (!word) {
      // A long-press on empty space just drops any previous highlight.
      document.getElementById('hl').innerHTML = '';
      return;
    }
    drawHighlight(word);
    longPressed = true;
    post({ type: 'wordSelected', word: word.word });
  }

  document.addEventListener('touchstart', function (e) {
    if (e.changedTouches.length !== 1) return;
    var t = e.changedTouches[0];
    longPressX = t.clientX;
    longPressY = t.clientY;
    longPressStart = Date.now();
    clearLongPress();
    longPressed = false;
    longPressedDelivered = false;
    longPressTimer = setTimeout(function () {
      longPressTimer = null;
      deliverLongPressNow();
    }, LONG_PRESS_MS);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!longPressTimer) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - longPressX;
    var dy = t.clientY - longPressY;
    // Finger moved beyond a small slop: no longer a press, don't interrupt
    // swipe/pinch/pan gestures.
    if (Math.abs(dx) + Math.abs(dy) > 10) {
      clearLongPress();
    }
  }, { passive: true });

  function longPressEnd() {
    clearLongPress();
    longPressed = false;
  }
  document.addEventListener('touchend', longPressEnd, { passive: true });
  document.addEventListener('touchcancel', function (e) {
    // Android pre-empts long-presses with its own handling (the haptic you
    // feel) BEFORE our timer runs, then fires touchcancel. If the finger was
    // held long enough, treat the cancel as the long-press trigger; otherwise
    // it's a genuine cancel.
    var delivered = false;
    if (longPressTimer) {
      var held = Date.now() - longPressStart;
      if (held >= 140) delivered = deliverLongPressNow();
    }
    if (!delivered) longPressEnd();
  }, { passive: true });

  // Android Q+ also fires a synthetic contextmenu on long-press. Swallow it
  // so the browser's native text-selection callout never appears, and use it
  // as the trigger if our timer hasn't fired yet.
  document.addEventListener('contextmenu', function (e) {
    if (e.cancelable) e.preventDefault();
    if (e.clientX >= 0 && e.clientY >= 0) {
      longPressX = e.clientX;
      longPressY = e.clientY;
    }
    deliverLongPressNow();
  }, { passive: false });

  applyTransform();

  document.addEventListener('message', function (e) {
    var msg;
    try { msg = JSON.parse(e.data); } catch (_) { return; }
    if (msg.type === 'openPdf') openPdf(msg.data, msg.initialPage);
    else if (msg.type === 'goToPage') renderPage(msg.page);
    else if (msg.type === 'flip') flip(msg.direction);
    else if (msg.type === 'setDarkMode') window.__setDarkMode(msg.on);
    else if (msg.type === 'captureThumbnail') window.__captureThumbnail();
  });

  post({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
