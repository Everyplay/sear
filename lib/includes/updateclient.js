/* jshint evil: true */
/* global SockJS:true */

(function (window) {
  window.sear_live_update = '/sear_sock';
  window._sockjs_onload = function () {
    if (window.sear_chrome || window._sear_sock_initialized) {
      return;
    }

    window._sear_sock_initialized = true;

    var sock;
    function onMessage(e) {
      if (window.sear_chrome) {
        sock.close();
        return;
      }

      var data = JSON.parse(e.data);

      if (data.type === 'update') {
        data = data.update;
      } else {
        return;
      }

      var updates = data.other || [];

      var i = 0;
      var length = updates.length;
      var update;

      for (; i < length; i++) {
        update = updates[i];

        if (update.type === 'eval') {
          // Yep it eval and in evil
          try {
            eval(update.eval);
          } catch (e) {
            console.warn(e.message);
          }
        }
      }
    }

    function connect() {
      sock = new SockJS(window.sear_live_update);

      sock.onclose = function () {
        if (window.sear_chrome) {
          return;
        }
        console.debug("Sear disconnected. Reconnecting in 3 seconds.");
        setTimeout(function () {
          connect();
        }, 3000);
      };

      sock.onmessage = onMessage;
    }

    connect();
  };

  var fileref = document.createElement('script');
  fileref.setAttribute("type", "text/javascript");
  fileref.setAttribute("async", "true");
  fileref.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/0.3.4/sockjs.min.js");
  document.getElementsByTagName("head")[0].appendChild(fileref);
})(window);
