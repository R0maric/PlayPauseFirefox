//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const playSymbol = "▶︎";
  const pauseSymbol = "❚❚";

  function startListening(worker) {
    worker.port.once("detect", function (tabHasPlayer) {
      if (tabHasPlayer) {
        // TODO: init click handler
        // TODO: init worker detach handler
        worker.port.on("paused", function (paused) {
          let title = worker.tab.title;
          //title = stripSymbolFromTitle(title);
          worker.tab.title = (paused ? pauseSymbol : playSymbol) + " " + title;
        });
      } else {
        worker.destroy();
      }
    });
  }

  exports.main = function () {
    let self = require("sdk/self");

    require("sdk/page-mod").PageMod({
      include: "*", // Match everything
      attachTo: ["existing", "top"],
      contentScriptFile: [
        self.data.url("content-script.js")
      ],
      onAttach: startListening
    });
  };
})();
