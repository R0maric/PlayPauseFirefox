//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let html5Selectors = [
    ".play-btn, .playbutton, .item_link_play" // Bandcamp
  ];

  let flashPlayers = [
    { regex: /.*\.pandora\.com.*/, create: createPandoraPseudoPlayer() }
  ];

  function createPandoraPseudoPlayer(stateCallback) {
    let playButton = document.querySelector(".playButton");
    let pauseButton = document.querySelector(".pauseButton");
    if (!playButton || !pauseButton) {
      return null;
    }

    let observer = new MutationObserver(stateCallback);
    observer.observe(playButton, { attributes: true, attributeFilter: ["style"] });

    return {
      play: function() { playButton.click(); },
      pause: function() { pauseButton.click(); },
      get paused() { return playButton.style.display == "none"; },
      destroy: function() { observer.disconnect(); }
    }
  }

  function createHtml5PseudoPlayer(selector) {
    let button = document.querySelector(selector);
    if (!button) {
      return null;
    }

    let clickFunc = function() {
      this.paused = !this.paused;
      button.click();
    };
    return {
      play: clickFunc,
      pause: clickFunc,
      paused: true,
      destroy: function() {}
    };
  }

  function detectHtml5() {
    for (let i = 0; i < html5Selectors.length; i++) {
      let player = createHtml5PseudoPlayer(html5Selectors[i]);
      if (player) {
        return player;
      }
    }
    return null;
  }

  function detectFlash() {
    return null;
  }

  window.PseudoPlayers = {
    detectHtml5: detectHtml5,
    detectFlash: detectFlash
  }
})();
