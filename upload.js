/* Bike Trip 2026 — photo upload to the shared Google Drive album.
 *
 * Family members pick/snap photos on their phone and they upload straight to
 * the shared Google Drive folder. Uploads go through a Cloudflare Worker
 * (see upload-relay/) that holds the Google OAuth credentials, so nobody has
 * to sign in to Google. Images are downscaled in the browser first to keep
 * uploads fast on spotty trail data.
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var WORKER = (window.UPLOAD_WORKER_URL || "").trim();
  var ALBUM_URL = "https://drive.google.com/drive/folders/12tFp83mPtvHTAqrWHggXpnkcJkSI5nKn";
  var HIST_KEY = "biketrip_photos_v1";
  var MAX_DIM = 2048;   // px, longest side after downscale
  var JPEG_Q = 0.85;

  function riderName() { return (localStorage.getItem("biketrip_name") || "").trim(); }
  function loadHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { return []; } }
  function saveHist(h) { try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 60))); } catch (e) {} }

  // ---- downscale big photos before upload ----
  function compress(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return resolve(file);
      var draw = function (src, w, h) {
        var scale = Math.min(1, MAX_DIM / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(src, 0, 0, cw, ch);
        canvas.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", JPEG_Q);
      };
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: "from-image" })
          .then(function (bmp) { draw(bmp, bmp.width, bmp.height); })
          .catch(function () { resolve(file); });
      } else {
        var img = new Image();
        img.onload = function () { draw(img, img.naturalWidth, img.naturalHeight); };
        img.onerror = function () { resolve(file); };
        img.src = URL.createObjectURL(file);
      }
    });
  }

  function uploadOne(file, row) {
    return new Promise(function (resolve) {
      var bar = row.querySelector(".bar > i");
      var stat = row.querySelector(".pstat");
      var fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("name", riderName() || "rider");
      var xhr = new XMLHttpRequest();
      xhr.open("POST", WORKER);
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) bar.style.width = Math.round(e.loaded / e.total * 100) + "%";
      };
      xhr.onload = function () {
        var res = {};
        try { res = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300 && res.ok) {
          bar.style.width = "100%";
          stat.textContent = T("photoDone"); stat.className = "pstat ok";
          if (res.link) {
            var a = document.createElement("a");
            a.href = res.link; a.target = "_blank"; a.rel = "noopener"; a.textContent = T("photoView");
            row.appendChild(a);
            var h = loadHist(); h.unshift({ name: res.name, link: res.link, ts: Date.now() }); saveHist(h);
          }
        } else {
          stat.textContent = (res && res.error) ? res.error : T("photoErr");
          stat.className = "pstat err";
        }
        resolve();
      };
      xhr.onerror = function () { stat.textContent = T("photoErr"); stat.className = "pstat err"; resolve(); };
      xhr.send(fd);
    });
  }

  function makeRow(file) {
    var row = document.createElement("div");
    row.className = "photo-row";
    var img = document.createElement("img");
    img.className = "thumb";
    if (/^image\//.test(file.type)) img.src = URL.createObjectURL(file);
    var meta = document.createElement("div");
    meta.className = "pmeta";
    meta.innerHTML = "<div class='pname'></div>" +
      "<div class='pstat'>" + T("photoUploading") + "</div>" +
      "<div class='bar'><i></i></div>";
    meta.querySelector(".pname").textContent = file.name || "photo";
    row.appendChild(img); row.appendChild(meta);
    return row;
  }

  function handleFiles(files) {
    if (!WORKER) { setNote(T("photoNotConfig"), true); return; }
    var list = $("photoResults");
    var arr = Array.prototype.slice.call(files);
    // sequential uploads keep memory + bandwidth sane on phones
    (function next(i) {
      if (i >= arr.length) return;
      var row = makeRow(arr[i]);
      list.insertBefore(row, list.firstChild);
      compress(arr[i]).then(function (f) { return uploadOne(f, row); }).then(function () { next(i + 1); });
    })(0);
  }

  function setNote(msg, warn) {
    var n = $("photoNote");
    if (!n) return;
    n.textContent = msg || "";
    n.style.color = warn ? "#ffd98a" : "var(--muted)";
  }

  function renderHistory() {
    var list = $("photoResults");
    if (!list) return;
    loadHist().slice(0, 12).forEach(function (p) {
      var row = document.createElement("div");
      row.className = "photo-row";
      row.innerHTML = "<div class='thumb' style='display:flex;align-items:center;justify-content:center;font-size:20px'>🖼️</div>" +
        "<div class='pmeta'><div class='pname'></div><div class='pstat ok'>" + T("photoDone") + "</div></div>" +
        "<a target='_blank' rel='noopener' href='" + p.link + "'>" + T("photoView") + "</a>";
      row.querySelector(".pname").textContent = p.name || "photo";
      list.appendChild(row);
    });
  }

  function init() {
    var btn = $("btnPhoto"), input = $("photoInput");
    if (!btn || !input) return;
    var album = $("photoAlbum");
    if (album) album.href = ALBUM_URL;
    if (!WORKER) setNote(T("photoNotConfig"), true);
    btn.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () {
      if (input.files && input.files.length) handleFiles(input.files);
      input.value = "";
    });
    renderHistory();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
