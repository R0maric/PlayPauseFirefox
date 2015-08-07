//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const mediaSelector = "audio, video";

  // Wait for element defined by targetSelector under rootElem
  // When the element appears, call callback() function on it and stop waiting (if once flag is true).
  function waitForElement(targetSelector, callback, once, rootElem) {
    rootElem = rootElem || document.body;

    let observer = new MutationObserver(function (mutations, obs) {
      mutations.some(function (mutation) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          let elem = mutation.addedNodes[i];
          if (elem.nodeType == Node.ELEMENT_NODE) {
            let target = elem.matches(targetSelector) ? elem : elem.querySelector(targetSelector);
            if (target) {
              callback(target);
              if (once) {
                obs.disconnect();
                return true;
              }
            }
          }
        }
        return false;
      });
    });

    observer.observe(rootElem, {childList: true, subtree: true});
    return observer;
  }

  function waitForElementPromise(targetSelector, rootElem) {
    //noinspection JSUnusedLocalSymbols
    return new Promise(function (resolve, reject) {
      waitForElement(targetSelector, resolve, true, rootElem);
    });
  }

  function emitStateChanged(id) {
    self.port.emit("stateChanged", id);
  }

  window.PseudoPlayers = window.PseudoPlayers || {};
  window.PseudoPlayers.mediaSelector = mediaSelector;
  window.PseudoPlayers.waitForElement = waitForElement;
  window.PseudoPlayers.waitForElementPromise = waitForElementPromise;
  window.PseudoPlayers.emitStateChanged = emitStateChanged;
})();
