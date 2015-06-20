//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: analyze player "playability" by src
// TODO: handle pin, unpin, rearrange
// TODO: options: "consume" site's indicator, show on pinned tabs

(function() {
  "use strict";

  const tabClick = require("./tab-click.js");

  const playSymbol = "▶︎";
  const pauseSymbol = "❚❚";
  const playSymbolAlt = "▶";
  const allSymbols = [playSymbol, pauseSymbol, playSymbolAlt];

  function stripSymbolsFromTitle(title) {
    let tokenArray = title.split(" ");
    for (let idx = 0; idx < tokenArray.length; idx++) {
      if (allSymbols.indexOf(tokenArray[idx]) == -1) {
        return tokenArray.slice(idx).join(" ");
      }
    }
    return title;
  }

  function startListening(worker) {
    worker.port.once("init", function () {
      let playPause = tabClick.addPlayPauseSymbol(worker);
      if (playPause) {
        worker.on("detach", function () {
          playPause.remove();
        });
        worker.port.on("paused", function (paused) {
          worker.tab.title = stripSymbolsFromTitle(worker.tab.title);
          playPause.innerHTML = (paused ? pauseSymbol : playSymbol);
        });
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
