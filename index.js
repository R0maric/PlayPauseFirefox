//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

// TODO: YouTube observer
// TODO: iHeartRadio "buffering" class as playing
// TODO: investigate close button bug
// TODO: fix SoundCloud embedded delayed load
// TODO: detect tab tear-off/merge events

(function() {
  "use strict";

  const { viewFor } = require("sdk/view/core");
  const { getTabId } = require("sdk/tabs/utils");
  const simplePrefs = require("sdk/simple-prefs");

  const playSymbol = "▶";
  const pauseSymbol = "❚❚";
  const playSymbolAlt = "▶︎";
  const playSymbolLarge = "►";
  const stopSymbol = "◼";
  const stripSymbols = [playSymbol, playSymbolAlt, playSymbolLarge, stopSymbol];

  const fixTabAttributes = ["pinned", "selected", "visuallyselected"];

  const experimentalSupport = [/.*allmusic\.com.*/, /.*facebook\.com.*/];

  let workers = {}; // workers cache
  let pageMod = null;

  function getPlayPauseElement(xulTab) {
    return xulTab.ownerDocument.getAnonymousElementByAttribute(xulTab, "anonid", "play-pause");
  }

  function getTabLabelElement(xulTab) {
    return xulTab.ownerDocument.getAnonymousElementByAttribute(xulTab, "anonid", "tab-label");
  }

  function addPlayPauseSymbol(xulTab) {
    let playPause = getPlayPauseElement(xulTab);

    if (!playPause) {
      let chromeDocument = xulTab.ownerDocument;
      let worker = workers[getTabId(xulTab)];

      playPause = chromeDocument.createElement("div");
      playPause.setAttribute("anonid", "play-pause");
      playPause.style.pointerEvents = "all";
      playPause.style.cursor = "default";
      playPause.style.marginRight = "0.25em";

      playPause.addEventListener("mousedown", function (event) {
        // Make sure it's a single LMB click.
        if (event.button !== 0 || event.detail !== 1) {
          return;
        }
        worker.port.emit("toggle");
        event.stopPropagation();
      }, true);

      let tabContent = chromeDocument.getAnonymousElementByAttribute(xulTab, "class", "tab-content");
      let tabLabel = getTabLabelElement(xulTab);
      if (tabLabel) {
        tabContent.insertBefore(playPause, tabLabel);
      } else {
        tabContent.appendChild(playPause);
      }

      worker.port.emit("query");
    }
  }

  function removePlayPauseSymbol(xulTab) {
    let playPause = getPlayPauseElement(xulTab);
    if (playPause) {
      playPause.remove();
    }
  }

  function stripSymbolsFromLabel(label) {
    let tokenArray = label.split(" ");
    for (let idx = 0; idx < tokenArray.length; idx++) {
      if (stripSymbols.indexOf(tokenArray[idx]) === -1) {
        return tokenArray.slice(idx).join(" ");
      }
    }
    return label;
  }

  function setTabLabelValueForTab(xulTab, value, shouldStrip) {
    let tabLabel = getTabLabelElement(xulTab);
    if (tabLabel) {
      if (shouldStrip) {
        value = stripSymbolsFromLabel(value);
      }
      tabLabel.value = value;
    }
  }

  function tabMoveHandler(event) {
    let xulTab = event.target;
    setTabLabelValueForTab(xulTab, xulTab.label, true);
    addPlayPauseSymbol(xulTab);
  }

  function tabModifiedHandler(event) {
    let xulTab = event.target;
    let chromeDocument = xulTab.ownerDocument;

    setTabLabelValueForTab(xulTab, xulTab.label, true);

    let closeButton = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "close-button");
    if (!closeButton) {
      // Check if "Tab Mix Plus" Close button is present.
      closeButton = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "tmp-close-button");
    }
    if (!closeButton) {
      return;
    }

    fixTabAttributes.forEach(function(attribute) {
      if (xulTab.getAttribute(attribute)) {
        closeButton.setAttribute(attribute, "true");
      } else {
        closeButton.removeAttribute(attribute);
      }
    });
  }

  function addEventBindings(xulTab) {
    xulTab.addEventListener("TabMove", tabMoveHandler);
    xulTab.addEventListener("TabPinned", tabModifiedHandler);
    xulTab.addEventListener("TabUnpinned", tabModifiedHandler);
    xulTab.addEventListener("TabAttrModified", tabModifiedHandler);
  }

  function removeEventBindings(xulTab) {
    xulTab.removeEventListener("TabMove", tabMoveHandler);
    xulTab.removeEventListener("TabPinned", tabModifiedHandler);
    xulTab.removeEventListener("TabUnpinned", tabModifiedHandler);
    xulTab.removeEventListener("TabAttrModified", tabModifiedHandler);
  }

  function startListening(worker) {
    let sdkTab = worker.tab;
    if (!sdkTab) {
      worker.destroy();
      return;
    }
    let xulTab = viewFor(sdkTab);
    let id = sdkTab.id;

    workers[id] = worker;

    worker.port.once("options", function () {
      worker.port.emit("options", {
        doEmbeds: simplePrefs.prefs["do-embeds"]
      });
    });
    worker.port.once("init", function () {
      setTabLabelValueForTab(xulTab, xulTab.label, true);
      addPlayPauseSymbol(xulTab);
      addEventBindings(xulTab);
      worker.port.emit("query");
    });
    worker.port.on("stateChanged", function (id) {
      worker.port.emit("query", id);
    });
    worker.port.on("paused", function (paused) {
      let playPause = getPlayPauseElement(xulTab);
      if (playPause) {
        playPause.textContent = paused ? pauseSymbol : playSymbol;
      }
    });
    worker.on("detach", function () {
      if (xulTab) {
        removeEventBindings(xulTab);
        removePlayPauseSymbol(xulTab);
        try {
          setTabLabelValueForTab(xulTab, sdkTab.title, false);
        } catch (e) {
          // should happen for tab/browser closing; do nothing
        }
        xulTab = null;
      }
      delete workers[id];
    });
    worker.port.once("disable", function () {
      worker.destroy();
    });
  }

  function createPageMod() {
    pageMod = require("sdk/page-mod").PageMod({
        include: "*", // Match everything
        exclude: experimentalSupport,
        attachTo: ["existing", "top"],
        contentScriptFile: [
          "./play-pause-base.js",
          "./buttonless-html5-player.js",
          "./multibutton-html5-player.js",
          "./single-button-generic-player.js",
          "./two-button-generic-player.js",
          "./direct-access-flash-player.js",
          "./play-pause-detect.js",
          "./content-script.js"
        ],
        onAttach: startListening
      });
  }

  function resetPageMod() {
    if (pageMod) {
      pageMod.destroy();
      createPageMod();
    }
  }

  exports.main = function() {
    simplePrefs.on("do-embeds", resetPageMod);
    createPageMod();
  };
})();
