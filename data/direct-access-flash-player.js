//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  function DirectAccessFlashPlayer(id, win, selector, playerData) {
    this._playFuncName = "playVideo";
    this._pauseFuncName = "pauseVideo";

    this._win = win;
    this._paused = null;
    this._currentPlayer = null;

    const srcRegex = playerData.srcRegex;
    const stateGetterName = playerData.stateGetterName;
    const playStateValue = playerData.playStateValue;

    let flash = win.document.querySelectorAll(selector);
    let players = [];
    for (let i = 0; i < flash.length; i++) {
      let sourceUrl = flash[i].tagName == "OBJECT" ? flash[i].data : flash[i].src;
      if (sourceUrl && srcRegex.test(sourceUrl) && flash[i].wrappedJSObject) {
        players.push(flash[i].wrappedJSObject);
      }
    }
    this._currentPlayer = players[0];

    // if one of the media is playing, make it the current player
    for (let i = 0; i < players.length; i++) {
      if (players[i][stateGetterName]) {
        this._paused = true;
        if (players[i][stateGetterName]() == playStateValue) {
          this._currentPlayer = players[i];
          this._paused = false;
          break;
        }
      }
    }

    let that = this;
    // "onStateChange" either isn't fired or fails to reach our code; thus, a workaround
    // TODO: account for multiple players, change _currentPlayer accordingly
    function stateChangeHandler() {
      if (that._currentPlayer[stateGetterName]) {
        let newState = (that._currentPlayer[stateGetterName]() != playStateValue);
        if (newState != that._paused) {
          that._paused = newState;
          PlayPause.emitStateChanged(id);
        }
      }
    }
    this._timer = win.setInterval(stateChangeHandler, 500);
  }

  DirectAccessFlashPlayer.preCondition = (win, selector) => !!win.document.querySelector(selector);
  DirectAccessFlashPlayer.prototype = Object.create(PlayPause.PlayerBase.prototype);
  DirectAccessFlashPlayer.prototype.destroy = function(reason) {
    if (reason) {
      this._win.clearInterval(this._timer);
    }
  };

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.DirectAccessFlashPlayer = DirectAccessFlashPlayer;
})();