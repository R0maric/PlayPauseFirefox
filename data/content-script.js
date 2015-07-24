//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let playersList = null;
  let activePlayer = null;
  let titleObserver = null;
  let nextPlayerId = 0;

  function createTitleObserver() {
    const titleElement = document.querySelector('head > title');
    let observer = new MutationObserver(function() { self.port.emit("title", titleElement.text); });
    observer.observe(titleElement, { subtree: true, characterData: true, childList: true });
    return observer;
  }

  function togglePlayPause() {
    let paused = getPausedState();
    if (paused !== null) {
      if (paused) {
        activePlayer = activePlayer || playersList[0];
        activePlayer.play();
      } else {
        playersList.forEach(function(player) { player.pause(); });
      }
    }
  }

  function getPausedState() {
    if (playersList.length == 0) {
      return null;
    }
    // Accumulated 'paused' value:
    // null if all players are in null state,
    // true if all players are in paused state,
    // false otherwise
    return playersList.reduce(function(acc, player) {
      let paused = player.paused;
      if (paused === null) {
        return acc;
      }
      if (acc === null) {
        return paused;
      }
      return acc && paused;
    }, null);
  }

  function emitPausedState(id) {
    let paused = getPausedState();
    if (paused !== null) {
      if (!paused) {
        activePlayer = playersList[id];
      }
      self.port.emit("paused", paused);
    }
  }

  function doAttach(options) {
    PseudoPlayers.options = options;
    playersList = [];
    let player = PseudoPlayers.detectPseudoPlayer(nextPlayerId, window);
    if (player) {
      ++nextPlayerId;
      playersList.push(player);
    }
    let iframes = document.querySelectorAll("iframe");
    for (let i = 0; i < iframes.length; i++) {
      player = PseudoPlayers.detectPseudoPlayer(nextPlayerId, iframes[i].contentWindow);
      if (player) {
        ++nextPlayerId;
        playersList.push(player);
      }
    }
    if (playersList.length == 0) {
      self.port.emit("disable");
      return;
    }

    titleObserver = createTitleObserver();
    self.port.emit("init");

    self.port.on("toggle", togglePlayPause);
    self.port.on("query", emitPausedState);
    self.port.on("detach", doDetach);
  }

  function doDetach(reason) {
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (playersList) {
      playersList.forEach(function(player) { player.destroy(reason); });
      playersList = null;
    }
  }

  self.port.once("options", doAttach);
  self.port.emit("options");
})();
