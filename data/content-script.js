//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let currentPlayer = null;
  let currentPausedState = null;
  let titleObserver = null;

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
    let player = null;
    let html5PlayerDetected = document.querySelector("audio, video");

    if (html5PlayerDetected) {
      player = document.querySelector("audio[src]:not([src='']), video[src]:not([src=''])");
      player = player || window.PseudoPlayers.detectHtml5();
    } else {
      player = window.PseudoPlayers.detectFlash();
      if (!player) {
        return false;
      }
    }

    setCurrentPlayer(player);

    if (html5PlayerDetected) {
      window.addEventListener("playing", mediaEventHandler, true);
      window.addEventListener("pause", mediaEventHandler, true);
    }

    titleObserver = createTitleObserver();

    self.port.on("toggle", togglePausedState);
    self.port.on("query", emitPausedState);
    self.port.on("detach", doDetach);

    return true;
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

  if (!doAttach()) {
    //self.port.emit("disable");
  }
})();
