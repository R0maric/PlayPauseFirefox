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
      create: PlayPause.TwoButtonGenericPlayer
    },
    { // SoundCloud on-site
      regex: /.*soundcloud\.com.*/,
      selector: "button.playControl",
      create: PlayPause.SingleButtonGenericPlayer
    },
    { // Hype Machine
      regex: /.*hypem\.com.*/,
      selector: "#playerPlay",
      playingClass: "pause",
      create: PlayPause.SingleButtonGenericPlayer
    },
    { // Amazon Music
      regex: /.*amazon\..*/,
      selector: ".acs-mp3-play, .acs-mp3-pause, div.sample-button",
      create: PlayPause.MultiButtonHtml5Player
    },
    { // AllMusic
      regex: /.*allmusic\.com.*/,
      selector: "a.audio-player",
      create: PlayPause.SingleButtonGenericPlayer
    },
    { // Rdio
      regex: /.*rdio\.com.*/,
      selector: "button.play_pause",
      waitForButton: true,
      create: PlayPause.SingleButtonGenericPlayer
    },
    { // 8tracks
      regex: /.*8tracks\.com.*/,
      playButtonSelector: "#player_play_button",
      pauseButtonSelector: "#player_pause_button",
      waitForButton: true,
      create: PlayPause.TwoButtonGenericPlayer
    },
    {  // Twitch.tv on-site
      regex: /.*twitch\.tv.*/,
      selector: "object, embed",
      srcRegex: /.*TwitchPlayer\.swf.*/,
      stateGetterName: "isPaused",
      playStateValue: false,
      containerSelector: "div.content",
      create: PlayPause.DirectAccessFlashPlayer
    },
    { // MySpace
      regex: /.*myspace\.com.*/,
      selector: "button.play",
      create: PlayPause.SingleButtonGenericPlayer
    },
    { // Silver.ru
      regex: /.*silver\.ru.*/,
      selector: "div.js-play-pause",
      create: PlayPause.MultiButtonHtml5Player
    },
    {  // Bandcamp
      selector: "a.play-btn, div.playbutton, span.item_link_play",
      create: PlayPause.MultiButtonHtml5Player
    }
  ];

  const nonEmbedPlayers = [
    {  // YouTube HTML5 on-site (or on Last.fm, or on Songza)
      regex: /.*(youtube\.com|last\.fm|songza\.com).*/,
      selector: ".ytp-play-button",
      create: PlayPause.MultiButtonHtml5Player
    },
    {  // YouTube Flash on-site (or on Last.fm)
      regex: /.*(youtube\.com|last\.fm).*/,
      selector: "object, embed",
      srcRegex: /.*\.youtube\.com.*/,
      stateGetterName: "getPlayerState",
      playStateValue: 1,
      create: PlayPause.DirectAccessFlashPlayer
    }
  ];

  const embedPlayers = [
    {  // YouTube HTML5 embedded
      selector: ".ytp-play-button",
      create: PlayPause.MultiButtonHtml5Player
    },
    {  // YouTube Flash embedded
      selector: "object, embed",
      srcRegex: /.*\.youtube\.com.*/,
      stateGetterName: "getPlayerState",
      playStateValue: 1,
      create: PlayPause.DirectAccessFlashPlayer
    },
    {  // Twitch.tv embedded
      selector: "object, embed",
      srcRegex: /.*TwitchPlayer\.swf.*/,
      stateGetterName: "isPaused",
      playStateValue: false,
      create: PlayPause.DirectAccessFlashPlayer
    },
    {  // Ooyala Flash embedded
      selector: "object, embed",
      srcRegex: /.*player\.ooyala\.com.*/,
      stateGetterName: "getState",
      playStateValue: "playing",
      playFuncName: "playMovie",
      pauseFuncName: "pauseMovie",
      create: PlayPause.DirectAccessFlashPlayer
    },
    { // SoundCloud embedded
      selector: "button.playButton", // TODO: very bad condition, too generic
      create: PlayPause.SingleButtonGenericPlayer
    },
    {  // Generic catch-all HTML5 media
      selector: PlayPause.mediaSelector,
      create: PlayPause.ButtonlessHtml5Player
    }
  ];

  function detectPlayer(id, win) {
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

    let playerDataList = generalPlayers.concat(PlayPause.options.doEmbeds ? embedPlayers : nonEmbedPlayers);
    for (let i = 0; i < playerDataList.length; i++) {
      let playerData = playerDataList[i];
      let player = null;
      if (!playerData.regex || playerData.regex.test(win.location.href)) {
        player = playerData.create.preCondition(win, playerData.selector, playerData) ?
          new playerData.create(id, win, playerData.selector, playerData) :
          null;
      }
      if (player) {
        return player;
      }
    }
    return null;
  }

  window.PlayPause = window.PlayPause || {};
  window.PlayPause.options = {};
  window.PlayPause.detectPlayer = detectPlayer;
})();
