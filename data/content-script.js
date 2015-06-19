//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let titleObserver = null;
  let currentPlayer = null;
  let currentPausedStatus = null;

  function emitPausedStatus() {
    if (currentPlayer) {
      self.port.emit("paused", currentPausedStatus);
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
    currentPausedStatus = player.paused;
    emitPausedStatus();
  }

  function mediaEventHandler(e) {
    if (e && e.target) {
      setCurrentPlayer(e.target);
    }
  }

  function createTitleObserver() {
    let observer = new window.MutationObserver(emitPausedStatus);
    observer.observe(document.querySelector('head > title'), { subtree: true, characterData: true, childList: true });
    return observer;
  }

  function doAttach() {
    let players = document.querySelectorAll("audio, video");
    if (players.length > 0) {
      setCurrentPlayer(players[0]);
    }

    window.addEventListener("playing", mediaEventHandler, true);
    window.addEventListener("pause", mediaEventHandler, true);
    titleObserver = createTitleObserver();

    self.port.on("detach", doDetach);
  }

  function doDetach(reason) {
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (reason) {
      window.removeEventListener("playing", mediaEventHandler, true);
      window.removeEventListener("pause", mediaEventHandler, true);
    }
  }

  doAttach();
})();
