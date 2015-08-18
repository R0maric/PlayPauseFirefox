//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  function MultiButtonHtml5Player(id, win, selector) {
    this._playFuncName = "click";
    this._pauseFuncName = "click";

    this._win = win;
    this._paused = true;
    this._players = win.document.querySelectorAll(selector);
    this._currentPlayer = this._players[0];

    let that = this;
    this._initEvents(function(event) {
      let player = event.target;
      if (player) {
        that._paused = player.paused;
        PlayPause.emitStateChanged(id);
      }
    });

    this._clickHandler = function(event) {
      that._currentPlayer = event.target;
    };
    for (let i = 0; i < this._players.length; i++) {
      this._players[i].addEventListener("click", this._clickHandler);
    }

    let media = win.document.querySelectorAll(PlayPause.mediaSelector);
    if (this._players.length === 1) { // just one player on the page? if playing, update the state
      if (media.length === 1 && !media[0].paused) {
        this._paused = false;
      }
    } else { // multiple players on the page? if playing, unset the state; it will update on next click event
      for (let i = 0; i < media.length; i++) {
        if (!media[i].paused) {
          this._paused = null;
          break;
        }
      }
    }
  }
  MultiButtonHtml5Player.preCondition = PlayPause.ButtonlessHtml5Player.preCondition;
  MultiButtonHtml5Player.prototype = Object.create(PlayPause.ButtonlessHtml5Player.prototype);
  MultiButtonHtml5Player.prototype.destroy = function(reason) {
    for (let i = 0; i < this._players.length; i++) {
      let player = this._players[i];
      if (player) {
        player.removeEventListener("click", this._clickHandler);
      }
    }
    PlayPause.ButtonlessHtml5Player.prototype.destroy.call(reason);
  };

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.MultiButtonHtml5Player = MultiButtonHtml5Player;
})();
