(function () {
  "use strict";

  function createOfflineIndicator() {
    var indicator = document.createElement("div");
    indicator.id = "offline-indicator";
    indicator.className = "offline-indicator";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");
    indicator.textContent = "Offline mode: records and PDF tools remain available on this iPad.";
    document.body.insertBefore(indicator, document.body.firstChild);
  }

  function updateOfflineStatus() {
    if (navigator.onLine) {
      document.body.classList.remove("offline");
    } else {
      document.body.classList.add("offline");
    }
  }

  function showUpdateNotice() {
    if (document.getElementById("app-update-notice")) return;
    var notice = document.createElement("div");
    notice.id = "app-update-notice";
    notice.className = "app-update-notice";

    var message = document.createElement("span");
    message.textContent = "A newer app version is ready.";

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Refresh";
    button.addEventListener("click", function () {
      window.location.reload();
    });

    notice.appendChild(message);
    notice.appendChild(button);
    document.body.appendChild(notice);
  }

  createOfflineIndicator();
  updateOfflineStatus();
  window.addEventListener("online", updateOfflineStatus);
  window.addEventListener("offline", updateOfflineStatus);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js").then(function (registration) {
        registration.addEventListener("updatefound", function () {
          var newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", function () {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateNotice();
            }
          });
        });
      }).catch(function (error) {
        console.error("[PWA] Service worker registration failed:", error);
      });
    });
  }
})();
