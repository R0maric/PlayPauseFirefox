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
          if (elem.nodeType === Node.ELEMENT_NODE) {
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
    return new Promise(function (resolve) {
      waitForElement(targetSelector, resolve, true, rootElem);
    });
  }

  function emitStateChanged(id) {
    self.port.emit("stateChanged", id);
  }

  function PlayerBase() { throw "PlayerBase is a base 'abstract' class. It is not meant to be instantiated."; }
  Object.defineProperty(PlayerBase.prototype, "paused", { get: function() { return this._paused; } } );
  PlayerBase.prototype.play = function() {
    if (this.paused) {
      this._currentPlayer[this._playFuncName]();
    }
  };
  PlayerBase.prototype.pause = function() {
    if (!this.paused) {
      this._currentPlayer[this._pauseFuncName]();
    }
  };

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.mediaSelector = mediaSelector;
  window.PlayPause.waitForElement = waitForElement;
  window.PlayPause.waitForElementPromise = waitForElementPromise;
  window.PlayPause.emitStateChanged = emitStateChanged;
  window.PlayPause.PlayerBase = PlayerBase;
})();
