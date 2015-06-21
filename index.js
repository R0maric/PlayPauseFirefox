//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: handle pin, unpin, rearrange
// TODO: options: show on pinned tabs

(function() {
  "use strict";

  const { viewFor } = require("sdk/view/core");
  const simplePrefs = require("sdk/simple-prefs");

  const playSymbol = "▶︎";
  const pauseSymbol = "❚❚";
  const playSymbolAlt = "▶";
  const stripSymbols = [playSymbol, playSymbolAlt];

  // We will add Play/Pause symbol to the left of the first of these that exists.
  // In order of priority: "Noise Control" indicator, standard Close button, "Tab Mix Plus" Close button
  const addBeforeAnonids = ["noise-indicator", "close-button", "tmp-close-button"];

  let workers = {}; // workers cache

  function addPlayPauseSymbol(sdkTab, callback) {
    let xulTab = viewFor(sdkTab);
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
        callback();
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

  function stripSymbolsFromLabel(xulTab) {
    let tokenArray = xulTab.label.split(" ");
    for (let idx = 0; idx < tokenArray.length; idx++) {
      if (stripSymbols.indexOf(tokenArray[idx]) == -1) {
        xulTab.label = tokenArray.slice(idx).join(" ");
        break;
      }
    }
  }

  function tabAttrModifiedHandler(event) {
    stripSymbolsFromLabel(event.target);
  }

  function addRemoveTitleObserver(sdkTab, shouldAdd) {
    let xulTab = viewFor(sdkTab);
    if (shouldAdd) {
      stripSymbolsFromLabel(xulTab);
      xulTab.addEventListener("TabAttrModified", tabAttrModifiedHandler, false);
    } else {
      xulTab.removeEventListener("TabAttrModified", tabAttrModifiedHandler, false);
      xulTab.label = sdkTab.title;
    }
  }

  function startListening(worker) {
    let sdkTab = worker.tab;
    let id = sdkTab.id;
    let playPause = null;

    workers[id] = worker;

    worker.on("detach", function () {
      if (simplePrefs.prefs["strip-symbols"]) {
        addRemoveTitleObserver(sdkTab, false);
      }
      if (playPause) {
        playPause.remove();
      }
      delete workers[id];
    });
    worker.port.on("paused", function (paused) {
      if (playPause) {
        playPause.innerHTML = paused ? pauseSymbol : playSymbol;
      }
    });
    worker.port.once("init", function () {
      playPause = addPlayPauseSymbol(sdkTab, function() { worker.port.emit("toggle"); });
      if (simplePrefs.prefs["strip-symbols"]) {
        addRemoveTitleObserver(sdkTab, true);
      }
    });
  }

  exports.main = function () {
    simplePrefs.on("strip-symbols", function () {
      for (let id in workers) {
        addRemoveTitleObserver(workers[id].tab, simplePrefs.prefs["strip-symbols"]);
      }
    });

    require("sdk/page-mod").PageMod({
      include: "*", // Match everything
      attachTo: ["existing", "top"],
      contentScriptFile: require("sdk/self").data.url("content-script.js"),
      onAttach: startListening
    });
  };
})();
