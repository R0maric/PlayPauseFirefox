//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const { viewFor } = require("sdk/view/core");

  // We will add Play/Pause symbol to the left of the first of these that exists.
  // In order of priority: "Noise Control" indicator, standard Close button, "Tab Mix Plus" Close button
  const addBeforeAnonids = ["noise-indicator", "close-button", "tmp-close-button"];

  function addPlayPauseSymbol(worker) {
    let xulTab = viewFor(worker.tab);
    let chromeDocument = xulTab.ownerDocument;
    let playPause = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "play-pause");

    if (!playPause) {
      playPause = chromeDocument.createElement("div");
      playPause.setAttribute("anonid", "play-pause");
      playPause.style.pointerEvents = "all";
      playPause.style.cursor = "default";

      playPause.addEventListener("mousedown", function (event) {
        // Make sure it's a single LMB click.
        if (event.button != 0 || event.detail != 1) {
          return;
        }
        worker.port.emit("toggle");
        event.stopPropagation();
      }, true);

      let addBefore = null;
      for (let i = 0; i < addBeforeAnonids.length; i++) {
        addBefore = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", addBeforeAnonids[i]);
        if (addBefore) {
          break;
        }
      }

      let tabContent = chromeDocument.getAnonymousElementByAttribute(xulTab, "class", "tab-content");
      if (addBefore) {
        tabContent.insertBefore(playPause, addBefore);
      } else {
        tabContent.appendChild(playPause);
      }
    }

    return playPause;
  }

  exports.addPlayPauseSymbol = addPlayPauseSymbol;
})();
