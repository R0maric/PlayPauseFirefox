//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const siteSpecificFixes = [
    ".play-btn, .playbutton, .item_link_play" // Bandcamp
  ];

  let currentPlayer = null;
  let currentPausedState = null;

  function PseudoPlayer(selector) {
    let button = document.querySelector(selector);
    let clickFunc = function() { button.click(); };
    return {
      play: clickFunc,
      pause: clickFunc,
      paused: true
    };
  }

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
    let player = document.querySelector("audio[src]:not([src='']), video[src]:not([src=''])");
    if (!player && document.querySelector("audio, video")) {
      let selector = siteSpecificFixes.find(function(elem) { return document.querySelector(elem); });
      if (selector) {
        player = new PseudoPlayer(selector);
      }
    }
    if (player) {
      setCurrentPlayer(player);
    }

    window.addEventListener("playing", mediaEventHandler, true);
    window.addEventListener("pause", mediaEventHandler, true);

    self.port.on("toggle", togglePausedState);
    self.port.on("query", emitPausedState);
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
