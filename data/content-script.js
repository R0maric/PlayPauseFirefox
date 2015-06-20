//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let currentPlayer = null;
  let currentPausedState = null;

  function emitPausedState() {
    if (currentPlayer) {
      self.port.emit("paused", currentPausedState);
    }
  }

  function togglePausedState() {
    if (currentPlayer) {
      if (currentPausedState) {
        currentPlayer.play();
      } else {
        currentPlayer.pause();
      }
    }
  }

  function setCurrentPlayer(player) {
    if (!player) {
      return;
    }
    if (!currentPlayer) {
      self.port.emit("init");
    }
    currentPlayer = player;
    currentPausedState = player.paused;
    emitPausedState();
  }

  function mediaEventHandler(event) {
    if (event && event.target) {
      setCurrentPlayer(event.target);
    }
  }

  function doAttach() {
    let players = document.querySelectorAll("audio[src]:not([src='']), video[src]:not([src=''])");
    if (players.length > 0) {
      setCurrentPlayer(players[0]);
    }

    window.addEventListener("playing", mediaEventHandler, true);
    window.addEventListener("pause", mediaEventHandler, true);

    self.port.on("toggle", togglePausedState);
    self.port.on("detach", doDetach);
  }

  function doDetach(reason) {
    if (reason) {
      window.removeEventListener("playing", mediaEventHandler, true);
      window.removeEventListener("pause", mediaEventHandler, true);
    }
  }

  doAttach();
})();
