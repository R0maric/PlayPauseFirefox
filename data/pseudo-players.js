//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const mediaSelector = "audio, video";

  const generalPlayers = [
    { // Pandora
      regex: /.*\.pandora\.com.*/,
      playButtonSelector: ".playButton",
      pauseButtonSelector: ".pauseButton",
      create: createTwoButtonPseudoPlayer
    },
    { // SoundCloud on-site
      regex: /.*soundcloud\.com.*/,
      selector: "button.playControl",
      create: createGenericFlashPseudoPlayer
    },
    { // Hype Machine
      regex: /.*hypem\.com.*/,
      selector: "#playerPlay",
      playingClass: "pause",
      create: createGenericFlashPseudoPlayer
    },
    { // Amazon Music
      regex: /.*amazon\..*/,
      selector: ".acs-mp3-play, .acs-mp3-pause, div.sample-button",
      create: createSingleButtonPseudoPlayer
    },
    { // AllMusic
      regex: /.*allmusic\.com.*/,
      selector: "a.audio-player",
      create: createGenericFlashPseudoPlayer
    },
    { // Rdio
      regex: /.*rdio\.com.*/,
      selector: "button.play_pause",
      waitForButton: true,
      create: createGenericFlashPseudoPlayer
    },
    { // 8tracks
      regex: /.*8tracks\.com.*/,
      playButtonSelector: "#player_play_button",
      pauseButtonSelector: "#player_pause_button",
      waitForButton: true,
      create: createTwoButtonPseudoPlayer
    },
    {  // Bandcamp
      selector: "a.play-btn, div.playbutton, span.item_link_play",
      create: createSingleButtonPseudoPlayer
    }
  ];

  const nonEmbedPlayers = [
    {  // YouTube HTML5 on-site (or on Last.fm, or on Songza)
      regex: /.*(youtube\.com|last\.fm|songza\.com).*/,
      selector: ".ytp-button-play, .ytp-button-pause",
      create: createSingleButtonPseudoPlayer
    },
    {  // YouTube Flash on-site (or on Last.fm)
      regex: /.*(youtube\.com|last\.fm).*/,
      selector: "object, embed",
      srcRegex: /.*\.youtube\.com.*/,
      stateGetterName: "getPlayerState",
      playStateValue: 1,
      create: createFlashDirectAccessPseudoPlayer
    },
    {  // Twitch.tv on-site
      regex: /.*twitch\.tv.*/,
      selector: "object, embed",
      srcRegex: /.*TwitchPlayer\.swf.*/,
      stateGetterName: "isPaused",
      playStateValue: false,
      create: createFlashDirectAccessPseudoPlayer
    }
  ];

  const embedPlayers = [
    {  // YouTube HTML5
      selector: ".ytp-button-play, .ytp-button-pause",
      create: createSingleButtonPseudoPlayer
    },
    {  // YouTube Flash
      selector: "object, embed",
      srcRegex: /.*\.youtube\.com.*/,
      stateGetterName: "getPlayerState",
      playStateValue: 1,
      create: createFlashDirectAccessPseudoPlayer
    },
    {  // Twitch.tv
      selector: "object, embed",
      srcRegex: /.*TwitchPlayer\.swf.*/,
      stateGetterName: "isPaused",
      playStateValue: false,
      create: createFlashDirectAccessPseudoPlayer
    },
    { // SoundCloud embedded
      selector: "button.playButton",
      create: createGenericFlashPseudoPlayer
    },
    {  // Generic catch-all HTML5 media
      selector: mediaSelector,
      create: createGenericPseudoPlayer
    }
  ];

  function emitStateChanged(id) {
    self.port.emit("stateChanged", id);
  }

  function createSingleButtonPseudoPlayer(id, win, selector) {
    let buttons = win.document.querySelectorAll(selector);
    if (buttons.length == 0) {
      return null;
    }
    let paused = true;
    let currentButton = buttons[0];

    let clickHandler = function(event) {
      currentButton = event.target;
    };
    let mediaEventHandler = function(event) {
      let player = event.target;
      if (player) {
        paused = player.paused;
        emitStateChanged(id);
      }
    };

    let media = win.document.querySelectorAll(mediaSelector);
    if (buttons.length == 1) { // just one player on the page? if playing, update the state
      if (media.length == 1 && !media[0].paused) {
        paused = false;
      }
    } else { // multiple players on the page? if playing, unset the state; it will update on next click event
      for (let i = 0; i < media.length; i++) {
        if (!media[i].paused) {
          paused = null;
          break;
        }
      }
    }

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", clickHandler);
    }

    win.addEventListener("playing", mediaEventHandler, true);
    win.addEventListener("pause", mediaEventHandler, true);

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { if (this.paused) { currentButton.click(); } },
      pause: function() { if (!this.paused) { currentButton.click(); } },
      destroy: function(reason) {
        if (reason) {
          win.removeEventListener("playing", mediaEventHandler, true);
          win.removeEventListener("pause", mediaEventHandler, true);
        }
        for (let i = 0; i < buttons.length; i++) {
          let button = buttons[i];
          if (button) {
            button.removeEventListener("click", clickHandler);
          }
        }
      }
    };
  }

  //noinspection JSUnusedLocalSymbols
  function createTwoButtonPseudoPlayer(id, win, selector, playerData) {
    let waitForButton = false;
    let playButton = win.document.querySelector(playerData.playButtonSelector);
    let pauseButton = win.document.querySelector(playerData.pauseButtonSelector);
    if (!playButton || !pauseButton) {
      if (playerData.waitForButton) {
        waitForButton = true;
      } else {
        return null;
      }
    }
    let observer = null;

    function initButtonObserver() {
      observer = new MutationObserver(() => { emitStateChanged(id); });
      observer.observe(playButton, {attributes: true, attributeFilter: ["style"]});
    }

    if (waitForButton) {
      PseudoPlayers.waitForElementPromise(playerData.playButtonSelector, win.document.body)
        .then(function(buttonElem) {
          playButton = buttonElem;
          pauseButton = playButton.parentNode.querySelector(playerData.pauseButtonSelector);
          initButtonObserver();
          emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return playButton ? (playButton.style.display != "none") : null; },
      play: function() { if (this.paused) { playButton.click(); } },
      pause: function() { if (!this.paused) { pauseButton.click(); } },
      destroy: function() { if (observer) { observer.disconnect(); } }
    }
  }

  function createFlashDirectAccessPseudoPlayer(id, win, selector, playerData) {
    let flash = win.document.querySelectorAll(selector);
    if (flash.length == 0) {
      return null;
    }

    const srcRegex = playerData.srcRegex;
    const stateGetterName = playerData.stateGetterName;
    const playStateValue = playerData.playStateValue;

    let players = [];
    for (let i = 0; i < flash.length; i++) {
      let sourceUrl = flash[i].tagName == "OBJECT" ? flash[i].data : flash[i].src;
      if (sourceUrl && srcRegex.test(sourceUrl) && flash[i].wrappedJSObject) {
        players.push(flash[i].wrappedJSObject);
      }
    }
    if (players.length == 0) {
      return null;
    }

    let paused = null;
    let currentPlayer = players[0];

    // if one of the media is playing, make it the current player
    for (let i = 0; i < players.length; i++) {
      if (players[i][stateGetterName]) {
        paused = true;
        if (players[i][stateGetterName]() == playStateValue) {
          currentPlayer = players[i];
          paused = false;
          break;
        }
      }
    }

    // "onStateChange" either isn't fired or fails to reach our code; thus, a workaround
    function stateChangeHandler() {
      if (currentPlayer[stateGetterName]) {
        let newState = (currentPlayer[stateGetterName]() != playStateValue);
        if (newState != paused) {
          paused = newState;
          emitStateChanged(id);
        }
      }
    }
    let timer = win.setInterval(stateChangeHandler, 500);

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { currentPlayer.playVideo(); },
      pause: function() { currentPlayer.pauseVideo(); },
      destroy: function(reason) {
        if (reason) {
          win.clearInterval(timer);
        }
      }
    };
  }

  function createGenericFlashPseudoPlayer(id, win, selector, playerData) {
    let waitForButton = false;
    let button = win.document.querySelector(selector);
    if (!button) {
      if (playerData.waitForButton) {
        waitForButton = true;
      } else {
        return null;
      }
    }
    let observer = null;
    let playingClass = playerData.playingClass || "playing";

    function initButtonObserver() {
      observer = new MutationObserver(() => { emitStateChanged(id); });
      observer.observe(button, {attributes: true, attributeFilter: ["class"]});
    }

    if (waitForButton) {
      PseudoPlayers.waitForElementPromise(selector, win.document.body)
        .then(function(buttonElem) {
          button = buttonElem;
          initButtonObserver();
          emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() {
        return (button && button.className.indexOf("disabled") == -1) ?
          (button.className.indexOf(playingClass) == -1) :
          null;
      },
      play: function() { if (this.paused) { button.click(); } },
      pause: function() { if (!this.paused) { button.click(); } },
      destroy: function() { if (observer) { observer.disconnect(); } }
    }
  }

  function createGenericPseudoPlayer(id, win, selector) {
    let players = win.document.querySelectorAll(selector);
    if (players.length == 0) {
      return null;
    }
    let paused = true;
    let currentPlayer = players[0];
    let mediaEventHandler = function(event) {
      let player = event.target;
      if (player) {
        paused = player.paused;
        emitStateChanged(id);
      }
    };

    // if one of the media is playing, make it the current player
    for (let i = 0; i < players.length; i++) {
      if (!players[i].paused) {
        currentPlayer = players[i];
        paused = false;
        break;
      }
    }

    win.addEventListener("playing", mediaEventHandler, true);
    win.addEventListener("pause", mediaEventHandler, true);

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { currentPlayer.play(); },
      pause: function() { currentPlayer.pause(); },
      destroy: function(reason) {
        if (reason) {
          win.removeEventListener("playing", mediaEventHandler, true);
          win.removeEventListener("pause", mediaEventHandler, true);
        }
      }
    };
  }

  function detectPseudoPlayer(id, win) {
    // Test for win.document access, fail gracefully for unexpected iframes
    try {
      //noinspection JSUnusedLocalSymbols
      let dummy = win.document;
    } catch (exception) {
      if (exception.message.toLowerCase().indexOf('permission denied') !== -1) {
        return null;
      } else {
        throw exception;
      }
    }

    let pseudoPlayers = generalPlayers.concat(window.PseudoPlayers.options.doEmbeds ? embedPlayers : nonEmbedPlayers);
    for (let i = 0; i < pseudoPlayers.length; i++) {
      let pseudoPlayer = pseudoPlayers[i];
      let player = null;
      if (!pseudoPlayer.regex || pseudoPlayer.regex.test(win.location.href)) {
        player = pseudoPlayer.create(id, win, pseudoPlayer.selector, pseudoPlayer);
      }
      if (player) {
        return player;
      }
    }
    return null;
  }

  window.PseudoPlayers = window.PseudoPlayers || {};
  window.PseudoPlayers.options = {};
  window.PseudoPlayers.detectPseudoPlayer = detectPseudoPlayer;
})();
