//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: handle pin, unpin, rearrange
// TODO: options: "consume" site's indicator, show on pinned tabs
// TODO: localization: options

(function() {
  "use strict";

  const { viewFor } = require("sdk/view/core");

  const playSymbol = "▶︎";
  const pauseSymbol = "❚❚";
  const playSymbolAlt = "▶";
  const allSymbols = [playSymbol, pauseSymbol, playSymbolAlt];

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

  function stripSymbolsFromLabel(label) {
    let tokenArray = label.value.split(" ");
    for (let idx = 0; idx < tokenArray.length; idx++) {
      if (allSymbols.indexOf(tokenArray[idx]) == -1) {
        label.value = tokenArray.slice(idx).join(" ");
        break;
      }
    }
  }

  function valueModifiedHandler(event) {
    if (event.attrName != "value") {
      return;
    }
    stripSymbolsFromLabel(event.target);
  }

  function addTitleObserver(sdkTab) {
    let xulTab = viewFor(sdkTab);
    let chromeDocument = xulTab.ownerDocument;
    let tabTitle = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "tab-label");

    if (tabTitle) {
      stripSymbolsFromLabel(tabTitle);
      tabTitle.addEventListener("DOMAttrModified", valueModifiedHandler, true);
    }
  }

  function removeTitleObserver(sdkTab) {
    let xulTab = viewFor(sdkTab);
    let chromeDocument = xulTab.ownerDocument;
    let tabTitle = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "tab-label");

    if (tabTitle) {
      tabTitle.removeEventListener("DOMAttrModified", valueModifiedHandler, true);
      tabTitle.value = sdkTab.title;
    }
  }

  function startListening(worker) {
    worker.port.once("init", function () {
      let tab = worker.tab;
      let playPause = addPlayPauseSymbol(worker);

      worker.on("detach", function () {
        removeTitleObserver(tab);
        if (playPause) {
          playPause.remove();
        }
      });
      worker.port.on("paused", function (paused) {
        if (playPause) {
          playPause.innerHTML = paused ? pauseSymbol : playSymbol;
        }
      });

      addTitleObserver(tab);
    });
  }

  exports.main = function () {
    let self = require("sdk/self");

    require("sdk/page-mod").PageMod({
      include: "*", // Match everything
      attachTo: ["existing", "top"],
      contentScriptFile: self.data.url("content-script.js"),
      onAttach: startListening
    });
  };
})();
