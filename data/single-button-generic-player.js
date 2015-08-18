//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  // TODO: generalize single- and two-button generic players

  function SingleButtonGenericPlayer(id, win, selector, playerData) {
    this._playFuncName = "click";
    this._pauseFuncName = "click";

    this._currentPlayer = win.document.querySelector(selector);
    this._observer = null;
    this._playingClass = playerData.playingClass || "playing";

    let that = this;
    function initButtonObserver() {
      that._observer = new MutationObserver(() => { PlayPause.emitStateChanged(id); });
      that._observer.observe(that._currentPlayer, {attributes: true, attributeFilter: ["class"]});
    }

    if (!this._currentPlayer) {
      PlayPause.waitForElementPromise(selector, win.document.body)
        .then(function(buttonElem) {
          that._currentPlayer = buttonElem;
          initButtonObserver();
          PlayPause.emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }
  }

  SingleButtonGenericPlayer.preCondition = function(win, selector, playerData) {
    return playerData.waitForButton || !!win.document.querySelector(selector);
  };
  SingleButtonGenericPlayer.prototype = Object.create(PlayPause.PlayerBase.prototype);

  Object.defineProperty(
    SingleButtonGenericPlayer.prototype,
    "paused",
    {
      get: function() {
        return this._currentPlayer && this._currentPlayer.className.indexOf("disabled") === -1 ?
          this._currentPlayer.className.indexOf(this._playingClass) === -1 : null;
      }
    }
  );
  SingleButtonGenericPlayer.prototype.destroy = function() { if (this._observer) { this._observer.disconnect(); } };

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.SingleButtonGenericPlayer = SingleButtonGenericPlayer;
})();