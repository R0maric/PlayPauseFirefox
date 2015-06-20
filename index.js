//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: analyze player "playability" by src
// TODO: handle pin, unpin, rearrange
// TODO: options: "consume" site's indicator, show on pinned tabs
// TODO: localization: options

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
      let tab = worker.tab;
      let storedTitle = null;
      let playPause = tabClick.addPlayPauseSymbol(worker);
      worker.on("detach", function () {
        if (storedTitle !== null) {
          tab.title = storedTitle;
        }
        if (playPause) {
          playPause.remove();
        }
      });
      worker.port.on("paused", function (paused) {
        if (playPause) {
          playPause.innerHTML = paused ? pauseSymbol : playSymbol;
        }
      });
      worker.port.on("title", function () {
        storedTitle = tab.title;
        tab.title = stripSymbolsFromTitle(tab.title);
      });
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
