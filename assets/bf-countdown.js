/* Black Friday countdown (snippets/bf-countdown.liquid).
   Each [data-bf-countdown] carries up to three deadlines (theme settings,
   "YYYY-MM-DD HH:MM" in the shop's time zone, data-tz = the shop's UTC
   offset). The first deadline still in the future is counted down to;
   when it passes the next one takes over, and when all have passed the
   element hides itself. Format: "1d 04:12:33", or "04:12:33" on the last day. */
(function () {
  if (window.__bfCountdown) return;
  window.__bfCountdown = true;

  function parse(str, tz) {
    var s = (str || '').trim();
    if (!s) return null;
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/);
    if (!m) return null;
    var off = (tz || '+0000').replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
    var iso = m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]) + 'T' + pad(+m[4]) + ':' + m[5] + ':00' + off;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function init(el) {
    var tz = el.getAttribute('data-tz');
    var deadlines = ['data-d1', 'data-d2', 'data-d3']
      .map(function (a) { return parse(el.getAttribute(a), tz); })
      .filter(function (t) { return t !== null; })
      .sort(function (a, b) { return a - b; });
    var out = el.querySelector('[data-bf-time]');
    if (!out || !deadlines.length) { el.setAttribute('hidden', ''); return; }

    function tick() {
      var now = Date.now(), target = null;
      for (var i = 0; i < deadlines.length; i++) { if (deadlines[i] > now) { target = deadlines[i]; break; } }
      if (target === null) { el.setAttribute('hidden', ''); return false; }
      var s = Math.floor((target - now) / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      out.textContent = (d > 0 ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
      el.removeAttribute('hidden');
      return true;
    }
    if (tick()) {
      var iv = setInterval(function () { if (!tick()) clearInterval(iv); }, 1000);
    }
  }

  function scan() {
    document.querySelectorAll('[data-bf-countdown]:not([data-bf-ready])').forEach(function (el) {
      el.setAttribute('data-bf-ready', '1');
      init(el);
    });
  }
  window.bfCountdownScan = scan;
  scan();
  document.addEventListener('shopify:section:load', scan);
  document.addEventListener('DOMContentLoaded', scan);
})();
