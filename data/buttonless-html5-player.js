//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  function ButtonlessHtml5Player(id, win, selector) {
    this._playFuncName = "play";
    this._pauseFuncName = "pause";

    this._win = win;
    this._paused = true;
    this._players = win.document.querySelectorAll(selector);
    this._currentPlayer = this._players[0];

    let that = this;
    this._initEvents(function(event) {
      let player = event.target;
      if (player) {
        that._paused = player.paused;
        PseudoPlayers.emitStateChanged(id);
        if (!that._paused) {
          that._currentPlayer = player;
        }
      }
    });

    // if one of the media is playing, make it the current player
    let players = this._players;
    for (let i = 0; i < players.length; i++) {
      if (!players[i].paused) {
        this._currentPlayer = players[i];
        this._paused = false;
        break;
      }
    }
  }

  ButtonlessHtml5Player.prototype._initEvents = function(handler) {
    this._mediaEventHandler = handler;
    this._win.addEventListener("playing", handler, true);
    this._win.addEventListener("pause", handler, true);
  };
  ButtonlessHtml5Player.prototype._removeEvents = function() {
    this._win.removeEventListener("playing", this._mediaEventHandler, true);
    this._win.removeEventListener("pause", this._mediaEventHandler, true);
  };

  ButtonlessHtml5Player.preCondition = (win, selector) => !!win.document.querySelector(selector);
  Object.defineProperty(ButtonlessHtml5Player.prototype, "paused", { get: function() { return this._paused; } } );
  ButtonlessHtml5Player.prototype.play = function() {
    if (this.paused) {
      this._currentPlayer[this._playFuncName]();
    }
  };
  ButtonlessHtml5Player.prototype.pause = function() {
    if (!this.paused) {
      this._currentPlayer[this._pauseFuncName]();
    }
  };
  ButtonlessHtml5Player.prototype.destroy = function(reason) { if (reason) { this._removeEvents(); } };

  window.PseudoPlayers = window.PseudoPlayers || {};
  window.PseudoPlayers.ButtonlessHtml5Player = ButtonlessHtml5Player;
})();
