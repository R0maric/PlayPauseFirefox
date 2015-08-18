//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  //noinspection JSUnusedLocalSymbols, JSHint
  function TwoButtonGenericPlayer(id, win, selector, playerData) {
    this._playButton = win.document.querySelector(playerData.playButtonSelector);
    this._pauseButton = win.document.querySelector(playerData.pauseButtonSelector);
    this._observer = null;

    let that = this;
    function initButtonObserver() {
      that._observer = new MutationObserver(() => { PlayPause.emitStateChanged(id); });
      that._observer.observe(that._playButton, {attributes: true, attributeFilter: ["style"]});
    }

    if (!this._playButton || !this._pauseButton) {
      PlayPause.waitForElementPromise(playerData.playButtonSelector, win.document.body)
        .then(function(buttonElem) {
          that._playButton = buttonElem;
          that._pauseButton = that._playButton.parentNode.querySelector(playerData.pauseButtonSelector);
          initButtonObserver();
          PlayPause.emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }
  }

  TwoButtonGenericPlayer.preCondition = function(win, selector, playerData) { // jshint ignore:line
    return playerData.waitForButton ||
      !!( win.document.querySelector(playerData.playButtonSelector) &&
          win.document.querySelector(playerData.pauseButtonSelector) );
  };
  TwoButtonGenericPlayer.prototype = Object.create(PlayPause.PlayerBase.prototype);

  Object.defineProperty(
    TwoButtonGenericPlayer.prototype,
    "paused",
    { get: function() { return this._playButton ? this._playButton.style.display !== "none" : null; } }
  );
  TwoButtonGenericPlayer.prototype.play = function() { if (this.paused) { this._playButton.click(); } };
  TwoButtonGenericPlayer.prototype.pause = function() { if (!this.paused) { this._pauseButton.click(); } };
  TwoButtonGenericPlayer.prototype.destroy = function() { if (this._observer) { this._observer.disconnect(); } };

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.TwoButtonGenericPlayer = TwoButtonGenericPlayer;
})();
