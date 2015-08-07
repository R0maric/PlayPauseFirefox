//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const generalPlayers = [
    { // Pandora
      regex: /.*\.pandora\.com.*/,
      playButtonSelector: ".playButton",
      pauseButtonSelector: ".pauseButton",
      create: PseudoPlayers.TwoButtonGenericPlayer
    },
    { // SoundCloud on-site
      regex: /.*soundcloud\.com.*/,
      selector: "button.playControl",
      create: createSingleButtonPseudoPlayer
    },
    { // Hype Machine
      regex: /.*hypem\.com.*/,
      selector: "#playerPlay",
      playingClass: "pause",
      create: createSingleButtonPseudoPlayer
    },
    { // Amazon Music
      regex: /.*amazon\..*/,
      selector: ".acs-mp3-play, .acs-mp3-pause, div.sample-button",
      create: PseudoPlayers.MultiButtonHtml5Player
    },
    { // AllMusic
      regex: /.*allmusic\.com.*/,
      selector: "a.audio-player",
      create: createSingleButtonPseudoPlayer
    },
    { // Rdio
      regex: /.*rdio\.com.*/,
      selector: "button.play_pause",
      waitForButton: true,
      create: createSingleButtonPseudoPlayer
    },
    { // 8tracks
      regex: /.*8tracks\.com.*/,
      playButtonSelector: "#player_play_button",
      pauseButtonSelector: "#player_pause_button",
      waitForButton: true,
      create: PseudoPlayers.TwoButtonGenericPlayer
    },
    {  // Bandcamp
      selector: "a.play-btn, div.playbutton, span.item_link_play",
      create: PseudoPlayers.MultiButtonHtml5Player
    }
  ];

  const nonEmbedPlayers = [
    {  // YouTube HTML5 on-site (or on Last.fm, or on Songza)
      regex: /.*(youtube\.com|last\.fm|songza\.com).*/,
      selector: ".ytp-play-button",
      create: PseudoPlayers.MultiButtonHtml5Player
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
      selector: ".ytp-play-button",
      create: PseudoPlayers.MultiButtonHtml5Player
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
      create: createSingleButtonPseudoPlayer
    },
    {  // Generic catch-all HTML5 media
      selector: PseudoPlayers.mediaSelector,
      create: PseudoPlayers.ButtonlessHtml5Player
    }
  ];

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
          PseudoPlayers.emitStateChanged(id);
        }
      }
    }
    let timer = win.setInterval(stateChangeHandler, 500);

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

  function createSingleButtonPseudoPlayer(id, win, selector, playerData) {
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
      observer = new MutationObserver(() => { PseudoPlayers.emitStateChanged(id); });
      observer.observe(button, {attributes: true, attributeFilter: ["class"]});
    }

    if (waitForButton) {
      PseudoPlayers.waitForElementPromise(selector, win.document.body)
        .then(function(buttonElem) {
          button = buttonElem;
          initButtonObserver();
          PseudoPlayers.emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }

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
      let playerData = pseudoPlayers[i];
      let player = null;
      if (!playerData.regex || playerData.regex.test(win.location.href)) {
        let preCondition = playerData.create.preCondition;
        if (preCondition) {
          player = preCondition(win, playerData.selector, playerData) ?
            new playerData.create(id, win, playerData.selector, playerData) :
            null;
        } else {
          player = playerData.create(id, win, playerData.selector, playerData);
        }
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
