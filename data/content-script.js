//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let currentPlayer = null;
  let currentPausedStatus = null;

  function setCurrentPlayer(player) {
    currentPlayer = player;
    currentPausedStatus = player.paused;
    self.port.emit("paused", currentPausedStatus);
  }

  function mediaEventHandler(e) {
    if (e && e.target) {
      setCurrentPlayer(e.target);
    }
  }

  function doDetach(reason) {
    if (reason) {
      window.removeEventListener("playing", mediaEventHandler, true);
      window.removeEventListener("pause", mediaEventHandler, true);
    }
  }

  function doAttach() {
    let players = document.querySelectorAll("audio, video");
    let hasMedia = players.length > 0;
    self.port.emit("detect", hasMedia);

    if (hasMedia) {
      setCurrentPlayer(players[0]);
      window.addEventListener("playing", mediaEventHandler, true);
      window.addEventListener("pause", mediaEventHandler, true);
      self.port.on("detach", doDetach);
    }
  }

  doAttach();
})();
