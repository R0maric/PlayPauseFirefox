//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: handle rearrange/move properly
// TODO: test with major sites
// TODO: research bandcamp src fix

(function() {
  "use strict";

  const { viewFor } = require("sdk/view/core");
  const simplePrefs = require("sdk/simple-prefs");

  const playSymbol = "▶︎";
  const pauseSymbol = "❚❚";
  const playSymbolAlt = "▶";
  const stripSymbols = [playSymbol, playSymbolAlt];

  const noiseIndicatorAnonid = "noise-indicator";
  const closeButtonAnonid = "close-button";
  const tmpCloseButtonAnonid = "tmp-close-button";
  const playPauseAnonid = "play-pause";

  // We will add Play/Pause symbol to the left of the first of these that exists.
  // In order of priority: "Noise Control" indicator, standard Close button, "Tab Mix Plus" Close button
  const addBeforeAnonids = [noiseIndicatorAnonid, closeButtonAnonid, tmpCloseButtonAnonid];

  let workers = {}; // workers cache

  function readdPlayPauseSymbol(event) {
    let xulTab = event.target;
    removePlayPauseSymbol(xulTab);
    addPlayPauseSymbol(xulTab, function(){}/*callback*/); // TODO: this does not work
  }

  function fixCloseButton(event) {
    let xulTab = event.target;
    let chromeDocument = xulTab.ownerDocument;

    let closeButton = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", closeButtonAnonid);
    if (!closeButton) {
      // Check if "Tab Mix Plus" Close button is present.
      closeButton = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", tmpCloseButtonAnonid);
    }
    if (!closeButton) {
      return;
    }

    if (xulTab.pinned) {
      closeButton.setAttribute("pinned", "true");
    } else {
      closeButton.removeAttribute("pinned");
    }
  }

  function addPlayPauseSymbol(xulTab, callback) {
    let chromeDocument = xulTab.ownerDocument;
    let playPause = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", playPauseAnonid);

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

      xulTab.addEventListener("TabMove", readdPlayPauseSymbol, false);
      xulTab.addEventListener("TabPinned", fixCloseButton, false);
      xulTab.addEventListener("TabUnpinned", fixCloseButton, false);
    }

    return playPause;
  }

  function removePlayPauseSymbol(xulTab) {
    let chromeDocument = xulTab.ownerDocument;
    let playPause = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", playPauseAnonid);

    if (playPause) {
      playPause.remove();
      xulTab.removeEventListener("TabMove", readdPlayPauseSymbol, false);
      xulTab.removeEventListener("TabPinned", fixCloseButton, false);
      xulTab.removeEventListener("TabUnpinned", fixCloseButton, false);
    }
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
    let xulTab = event.target;
    stripSymbolsFromLabel(xulTab);
  }

  function addRemoveTitleObserver(xulTab, shouldAdd, storedTitle) {
    if (shouldAdd) {
      stripSymbolsFromLabel(xulTab);
      xulTab.addEventListener("TabAttrModified", tabAttrModifiedHandler, false);
    } else {
      xulTab.removeEventListener("TabAttrModified", tabAttrModifiedHandler, false);
      xulTab.label = storedTitle;
    }
  }

  function startListening(worker) {
    let sdkTab = worker.tab;
    let xulTab = viewFor(sdkTab);
    let id = sdkTab.id;
    let playPause = null;

    workers[id] = worker;

    worker.on("detach", function () {
      if (simplePrefs.prefs["strip-symbols"]) {
        addRemoveTitleObserver(xulTab, false, sdkTab.title);
      }
      removePlayPauseSymbol(xulTab);
      xulTab = null;
      delete workers[id];
    });
    worker.port.on("paused", function (paused) {
      if (playPause) {
        playPause.innerHTML = paused ? pauseSymbol : playSymbol;
      }
    });
    worker.port.once("init", function () {
      playPause = addPlayPauseSymbol(xulTab, function() { worker.port.emit("toggle"); });
      if (simplePrefs.prefs["strip-symbols"]) {
        addRemoveTitleObserver(xulTab, true);
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
