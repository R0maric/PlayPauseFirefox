//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: xulTab title mutation observer
// TODO: handle pin, unpin, rearrange
// TODO: options: "consume" site's indicator, show on pinned tabs
// TODO: localization: options

(function() {
  "use strict";

  const tabClick = require("./tab-click.js");

  const playSymbol = "▶︎";
  const pauseSymbol = "❚❚";

  function startListening(worker) {
    worker.port.once("init", function () {
      let tab = worker.tab;
      let playPause = tabClick.addPlayPauseSymbol(worker);

      worker.on("detach", function () {
        tabClick.removeTitleObserver(tab);
        if (playPause) {
          playPause.remove();
        }
      });
      worker.port.on("paused", function (paused) {
        if (playPause) {
          playPause.innerHTML = paused ? pauseSymbol : playSymbol;
        }
      });

      tabClick.addTitleObserver(tab);
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
