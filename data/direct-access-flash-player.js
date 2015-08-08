//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  function getFlashPlayers(win, selector, srcRegex) {
    let flash = win.document.querySelectorAll(selector);
    let players = [];
    for (let i = 0; i < flash.length; i++) {
      let sourceUrl = flash[i].tagName == "OBJECT" ? flash[i].data : flash[i].src;
      if (sourceUrl && srcRegex.test(sourceUrl) && flash[i].wrappedJSObject) {
        players.push(flash[i].wrappedJSObject);
      }
    }
    return players
  }

  function DirectAccessFlashPlayer(id, win, selector, playerData) {
    this._playFuncName = playerData.playFuncName || "playVideo";
    this._pauseFuncName = playerData.pauseFuncName || "pauseVideo";

    this._win = win;
    this._paused = null;
    this._currentPlayer = null;
    this._observer = null;

    const srcRegex = playerData.srcRegex;
    const stateGetterName = playerData.stateGetterName;
    const playStateValue = playerData.playStateValue;

    let players = getFlashPlayers(win, selector, srcRegex);
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
    // TODO: account for multiple players, change _currentPlayer accordingly... maybe?
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

    let containerSelector = playerData.containerSelector;
    if (containerSelector) {
      let container = this._currentPlayer.parentNode;
      while (container && container.matches && !container.matches(containerSelector)) {
        container = container.parentNode;
      }
      if (container) {
        this._observer = new MutationObserver(function() {
          that._currentPlayer = getFlashPlayers(win, selector, srcRegex)[0];
        });
        this._observer.observe(container, {childList: true, subtree: true});
      }
    }
  }

  DirectAccessFlashPlayer.preCondition = function (win, selector, playerData) {
    return getFlashPlayers(win, selector, playerData.srcRegex).length > 0;
  };
  DirectAccessFlashPlayer.prototype = Object.create(PlayPause.PlayerBase.prototype);
  DirectAccessFlashPlayer.prototype.destroy = function(reason) {
    if (reason) {
      this._win.clearInterval(this._timer);
    }
    if (this._observer) {
      this._observer.disconnect();
    }
  };

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.DirectAccessFlashPlayer = DirectAccessFlashPlayer;
})();
