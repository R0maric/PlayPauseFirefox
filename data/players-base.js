//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  // Wait for element defined by targetSelector under rootElem
  // When the element appears, call callback() function on it and stop waiting (if once flag is true).
  function waitForElement(targetSelector, callback, once, rootElem) {
    rootElem = rootElem || document.body;

    let observer = new MutationObserver(function (mutations, obs) {
      mutations.some(function (mutation) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          let target = mutation.addedNodes[i].querySelector(targetSelector);
          if (target) {
            callback(target);
            if (once) {
              obs.disconnect();
              return true;
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

  window.PseudoPlayers = window.PseudoPlayers || {};
  window.PseudoPlayers.waitForElement = waitForElement;
  window.PseudoPlayers.waitForElementPromise = waitForElementPromise;
})();
