//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const siteSpecificFixes = ".play-btn, .playbutton, .item_link_play"; // Bandcamp

  let currentPlayer = null;
  let currentPausedState = null;
  let titleObserver = null;

  function PseudoPlayer(button) {
    let clickFunc = function() {
      this.paused = !this.paused;
      button.click();
    };
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

  function createTitleObserver() {
    const titleElement = document.querySelector('head > title');
    let observer = new window.MutationObserver(function() { self.port.emit("title", titleElement.text); });
    observer.observe(titleElement, { subtree: true, characterData: true, childList: true });
    return observer;
  }

  function doAttach() {
    let player = document.querySelector("audio[src]:not([src='']), video[src]:not([src=''])");
    if (!player && document.querySelector("audio, video")) {
      let playButton = document.querySelector(siteSpecificFixes);
      if (playButton) {
        player = new PseudoPlayer(playButton);
      }
    }
    if (player) {
      setCurrentPlayer(player);
    }

    window.addEventListener("playing", mediaEventHandler, true);
    window.addEventListener("pause", mediaEventHandler, true);
    titleObserver = createTitleObserver();

    self.port.on("toggle", togglePausedState);
    self.port.on("query", emitPausedState);
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
