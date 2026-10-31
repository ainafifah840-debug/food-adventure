/* =========================================================
   FOOD ADVENTURE! – application logic (vanilla JavaScript)
   ========================================================= */
(function () {
  "use strict";

  var D = window.FA_DATA;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var foodById = {};
  D.foods.forEach(function (f) { foodById[f.id] = f; });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function normalise(s) { return String(s || "").toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim(); }

  /* ---------------------------------------------------------
     Progress (saved in this browser only – no personal data)
     --------------------------------------------------------- */
  var STORE_KEY = "foodAdventureProgress.v1";
  function freshProgress() {
    return { flipped: [], guessed: [], checkpoint: null, match: [null, null], speaking: false, listening: null, quiz: null };
  }
  var progress = freshProgress();
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && typeof saved === "object") progress = Object.assign(freshProgress(), saved);
  } catch (e) { /* storage unavailable – keep in memory */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
    renderBadges();
  }

  var BADGES = [
    { key: "discovery", label: "Discovery Book", icon: "📖", done: function () { return progress.flipped.length >= D.foods.length; } },
    { key: "checkpoint", label: "Checkpoint", icon: "✅", done: function () { return progress.checkpoint !== null; } },
    { key: "matching", label: "Matching", icon: "🧩", done: function () { return progress.match[0] !== null && progress.match[1] !== null; } },
    { key: "speaking", label: "Speaking", icon: "🗣️", done: function () { return !!progress.speaking; } },
    { key: "listening", label: "Listening", icon: "🎧", done: function () { return progress.listening !== null; } },
    { key: "quiz", label: "Final Quiz", icon: "🏆", done: function () { return progress.quiz !== null; } }
  ];

  function renderBadges() {
    var count = 0;
    $("#badge-icons").innerHTML = BADGES.map(function (b) {
      var d = b.done(); if (d) count++;
      return '<span class="bdg' + (d ? " on" : "") + '" title="' + esc(b.label) + (d ? " – done" : "") + '">' + b.icon + "</span>";
    }).join("");
    $("#badge-text").textContent = "Badges: " + count + " of " + BADGES.length;
    $("#badge-meter").style.width = (count / BADGES.length * 100) + "%";

    $$("[data-status]").forEach(function (el) {
      var b = BADGES.filter(function (x) { return x.key === el.getAttribute("data-status"); })[0];
      if (!b) return;
      var done = b.done();
      var partial = "";
      if (b.key === "discovery" && progress.flipped.length) partial = "In progress · " + progress.flipped.length + "/10 cards";
      if (b.key === "matching" && (progress.match[0] !== null || progress.match[1] !== null)) partial = "In progress · 1 of 2 rounds";
      el.textContent = done ? "✓ Badge earned" : (partial || "Not started yet");
      el.classList.toggle("done", done);
    });
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function earnBadge(key, wasDone) {
    var b = BADGES.filter(function (x) { return x.key === key; })[0];
    if (b && !wasDone && b.done()) toast(b.icon + " New badge: " + b.label + "!");
  }
  function isDone(key) { return BADGES.filter(function (x) { return x.key === key; })[0].done(); }

  /* ---------------------------------------------------------
     Speech – recorded audio files first (if switched on in
     data.js), otherwise the most natural browser voice.
     --------------------------------------------------------- */
  var VOICE_KEY = "foodAdventureVoice.v1";
  var REC = D.audio || {};
  // File names follow a fixed pattern, listed in audio/README.md.
  var Rec = {
    word: function (f) { return REC.folder + "vocabulary/" + f.id + "-word.mp3"; },
    clues: function (f) { return REC.folder + "vocabulary/" + f.id + "-clues.mp3"; },
    sentence: function (f) { return REC.folder + "vocabulary/" + f.id + "-sentence.mp3"; },
    line: function (k) { return REC.folder + "interview/line-" + (k < 9 ? "0" : "") + (k + 1) + ".mp3"; }
  };
  // Novelty and old formant voices sound robotic or silly, so they are never offered.
  var ODD_VOICE = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|ralph|superstar|trinoids|whisper|wobble|zarvox|fred|kathy|princess|grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley/i;

  function readVoicePrefs() {
    try { return JSON.parse(localStorage.getItem(VOICE_KEY)) || {}; } catch (e) { return {}; }
  }

  var Speech = {
    supported: "speechSynthesis" in window && "SpeechSynthesisUtterance" in window,
    voices: [],
    voiceURI: readVoicePrefs().voiceURI || "",
    rate: readVoicePrefs().rate || 0.9,
    session: 0,
    missing: {},
    audio: null,
    finish: null,
    /* Higher score = warmer, more natural voice for a primary classroom. */
    score: function (v) {
      var n = v.name, s = 0;
      if (/en[-_]GB/i.test(v.lang)) s += 30;
      else if (/en[-_]US/i.test(v.lang)) s += 26;
      else if (/en[-_](AU|IE|NZ|CA)/i.test(v.lang)) s += 22;
      else s += 12;
      if (/natural|neural/i.test(n)) s += 60;
      else if (/online/i.test(n)) s += 45;
      if (/premium|enhanced/i.test(n)) s += 45;
      if (/google/i.test(n)) s += 35;
      if (/libby|sonia|maisie|ava|aria|jenny|emma|michelle|serena|samantha|kate|stephanie|martha|moira|tessa|karen|fiona|natasha|hazel|daniel|ryan|thomas|guy|andrew/i.test(n)) s += 12;
      if (/espeak|festival|pico/i.test(n + " " + v.voiceURI)) s -= 40;
      if (!v.localService) s += 4;
      if (v.default) s += 2;
      return s;
    },
    load: function () {
      if (!this.supported) return;
      var self = this;
      var english = (window.speechSynthesis.getVoices() || []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
      var good = english.filter(function (v) { return !ODD_VOICE.test(v.name); });
      this.voices = (good.length ? good : english).sort(function (a, b) { return self.score(b) - self.score(a); });
      var best = this.voices[0];
      var sel = $("#voice-select");
      var current = this.voiceURI;
      sel.innerHTML = '<option value="">Best voice on this device' + (best ? " (" + esc(best.name) + ")" : "") + "</option>" +
        this.voices.map(function (v, k) {
          return '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === current ? " selected" : "") + ">" +
            (k < 3 ? "★ " : "") + esc(v.name + " (" + v.lang + ")") + "</option>";
        }).join("");
      // A saved voice that is not on this device falls back to the automatic choice.
      if (current && sel.value !== current) sel.value = "";
    },
    pick: function () {
      var self = this;
      var chosen = this.voiceURI && this.voices.filter(function (v) { return v.voiceURI === self.voiceURI; })[0];
      return chosen || this.voices[0] || null;
    },
    savePrefs: function () {
      try { localStorage.setItem(VOICE_KEY, JSON.stringify({ voiceURI: this.voiceURI, rate: this.rate })); } catch (e) { /* private mode */ }
    },
    /* Stop whatever is playing and settle its promise, so old callbacks can never restart it. */
    halt: function () {
      if (this.finish) { var f = this.finish; this.finish = null; f(false); }
      if (this.audio) this.audio.pause();
      if (this.supported && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel();
    },
    stop: function () { this.session++; this.halt(); },
    /* Speak one piece of text (or play its recording). Resolves true when finished, false if stopped or failed. */
    say: function (text, opts) {
      opts = opts || {};
      var self = this, id = ++this.session;
      var busy = this.supported && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
      this.halt();
      return new Promise(function (resolve) {
        self.finish = resolve;
        var done = function (ok) { if (self.finish === resolve) self.finish = null; resolve(ok); };
        if (REC.useRecordings && opts.src && !self.missing[opts.src]) {
          self.playFile(opts.src, id, done, function () { self.speak(text, opts, id, done, false); });
        } else {
          self.speak(text, opts, id, done, busy);
        }
      });
    },
    playFile: function (src, id, done, fallback) {
      var self = this;
      var a = this.audio || (this.audio = new Audio());
      a.onended = function () { if (id === self.session) done(true); };
      a.onerror = function () { self.missing[src] = true; if (id === self.session) fallback(); };
      a.src = src;
      a.playbackRate = this.rate / 0.9;
      var p = a.play();
      if (p && p.catch) p.catch(function (e) { if (e && e.name !== "AbortError" && id === self.session) a.onerror(); });
    },
    speak: function (text, opts, id, done, afterCancel) {
      var self = this, synth = window.speechSynthesis;
      if (!this.supported) { toast("🔇 Sorry, this browser cannot speak. Ask your teacher to read it aloud."); done(false); return; }
      // Speaking sentence by sentence gives natural pauses and avoids Chrome cutting off long speech.
      var parts = String(text).match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) || [text];
      var v = this.pick();
      var next = function (k) {
        if (id !== self.session) return;
        if (k >= parts.length) { done(true); return; }
        var u = new SpeechSynthesisUtterance(parts[k].trim());
        if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-GB"; }
        u.rate = opts.rate || self.rate;
        u.pitch = opts.pitch || 1;
        var ended = false;
        var end = function (ok) {
          if (ended) return; ended = true; clearInterval(watch);
          if (id !== self.session) return;
          if (!ok) { done(false); return; }
          setTimeout(function () { next(k + 1); }, k + 1 < parts.length ? 320 : 0);
        };
        u.onend = function () { end(true); };
        u.onerror = function (e) { end(e && (e.error === "interrupted" || e.error === "canceled") ? false : k + 1 < parts.length); };
        self.utterance = u; // keeps a reference so Chrome does not drop the onend event
        synth.speak(u);
        if (synth.paused) synth.resume();
        // Safety net for browsers that sometimes forget to fire onend.
        var started = Date.now();
        var watch = setInterval(function () {
          if (Date.now() - started > 1500 && !synth.speaking && !synth.pending) end(true);
        }, 400);
      };
      // Chrome can silently drop speech queued straight after cancel(), so wait a moment in that case.
      if (afterCancel) setTimeout(function () { next(0); }, 90);
      else next(0);
    }
  };
  if (Speech.supported) {
    Speech.load();
    if ("onvoiceschanged" in window.speechSynthesis) window.speechSynthesis.onvoiceschanged = function () { Speech.load(); };
    else setTimeout(function () { Speech.load(); }, 600);
  }

  // Any element with data-say speaks its text when clicked (data-audio names an optional recording).
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-say]");
    if (!btn) return;
    e.preventDefault();
    Listening.reset();
    $$(".speaking").forEach(function (b) { b.classList.remove("speaking"); });
    btn.classList.add("speaking");
    Speech.say(btn.getAttribute("data-say"), { src: btn.getAttribute("data-audio") }).then(function () { btn.classList.remove("speaking"); });
  });


  /* ---------------------------------------------------------
     Chef Benny – original SVG mascot
     --------------------------------------------------------- */
  function benny(pose) {
    var face = pose === "face";
    var arms = "";
    var armL, armR;
    if (pose === "cheer") { armL = [60, 190, 24, 136]; armR = [140, 190, 176, 136]; }
    else if (pose === "wave") { armL = [62, 192, 46, 234]; armR = [140, 190, 174, 140]; }
    else if (pose === "point") { armL = [62, 192, 46, 234]; armR = [140, 194, 186, 186]; }
    if (!face) {
      [armL, armR].forEach(function (a) {
        arms += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + a[2] + '" y2="' + a[3] + '" stroke="#DCCFB8" stroke-width="24" stroke-linecap="round"/>' +
                '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + a[2] + '" y2="' + a[3] + '" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round"/>' +
                '<circle cx="' + a[2] + '" cy="' + a[3] + '" r="11" fill="#FFD7B5" stroke="#E9B48C" stroke-width="2"/>';
      });
    }
    var happyEyes = pose === "cheer"
      ? '<path d="M76 118 q8 -9 16 0" stroke="#3B2A20" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M108 118 q8 -9 16 0" stroke="#3B2A20" stroke-width="5" fill="none" stroke-linecap="round"/>'
      : '<ellipse cx="84" cy="118" rx="6.5" ry="8" fill="#3B2A20"/><ellipse cx="116" cy="118" rx="6.5" ry="8" fill="#3B2A20"/><circle cx="86" cy="115" r="2.3" fill="#fff"/><circle cx="118" cy="115" r="2.3" fill="#fff"/>';
    var mouth = pose === "cheer"
      ? '<path d="M86 146 q14 18 28 0 z" fill="#C8553D"/>'
      : '<path d="M88 146 q12 11 24 0" stroke="#3B2A20" stroke-width="4" fill="none" stroke-linecap="round"/>';
    var body = face ? "" :
      '<path d="M52 248 Q50 176 100 170 Q150 176 148 248 Z" fill="#FFFFFF" stroke="#DCCFB8" stroke-width="3"/>' +
      '<path d="M80 170 L120 170 L100 196 Z" fill="#F29B4B"/>' +
      '<circle cx="100" cy="210" r="4.5" fill="#356B48"/><circle cx="100" cy="230" r="4.5" fill="#356B48"/>';
    var vb = face ? "38 6 124 180" : "0 0 200 250";
    var label = face ? "" : ' role="img" aria-label="Chef Benny, a friendly cartoon chef' + (pose === "cheer" ? " celebrating with his arms in the air" : pose === "wave" ? " waving hello" : "") + '"';
    return '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg"' + (face ? ' aria-hidden="true" focusable="false"' : label) + ">" +
      arms + body +
      '<circle cx="100" cy="124" r="47" fill="#FFD7B5" stroke="#E9B48C" stroke-width="3"/>' +
      '<ellipse cx="54" cy="128" rx="7" ry="10" fill="#FFCBA4" stroke="#E9B48C" stroke-width="2"/><ellipse cx="146" cy="128" rx="7" ry="10" fill="#FFCBA4" stroke="#E9B48C" stroke-width="2"/>' +
      happyEyes +
      '<circle cx="72" cy="136" r="8" fill="#F7A6A0" opacity=".7"/><circle cx="128" cy="136" r="8" fill="#F7A6A0" opacity=".7"/>' +
      '<path d="M100 136 q-14 -2 -22 8 q12 2 22 -4 q10 6 22 4 q-8 -10 -22 -8z" fill="#7A4B2A"/>' +
      mouth +
      '<g stroke="#DCCFB8" stroke-width="3" fill="#FFFFFF">' +
      '<circle cx="70" cy="50" r="22"/><circle cx="130" cy="50" r="22"/><circle cx="100" cy="36" r="28"/>' +
      '<rect x="62" y="56" width="76" height="30" rx="8"/></g>' +
      '<rect x="62" y="74" width="76" height="8" fill="#B9DDBB"/>' +
      "</svg>";
  }
  $$("[data-benny]").forEach(function (el) { el.innerHTML = benny(el.getAttribute("data-benny")); });

  /* ---------------------------------------------------------
     Router & navigation
     --------------------------------------------------------- */
  var ROUTES = [
    { id: "welcome", label: "Welcome" },
    { id: "objectives", label: "Learning Objectives" },
    { id: "menu", label: "Main Menu", nav: "menu" },
    { id: "discovery", label: "Food Discovery Book", nav: "discovery" },
    { id: "checkpoint", label: "Vocabulary Checkpoint", nav: "discovery" },
    { id: "matching", label: "Food Matching Challenge", nav: "matching" },
    { id: "speaking", label: "Speaking Corner", nav: "speaking" },
    { id: "listening", label: "Listening Corner", nav: "listening" },
    { id: "quiz", label: "Final Food Explorer Quiz", nav: "quiz" },
    { id: "complete", label: "Congratulations!" }
  ];
  var firstLoad = true;

  function route() {
    var id = (location.hash || "#welcome").slice(1);
    var idx = -1;
    ROUTES.forEach(function (r, i) { if (r.id === id) idx = i; });
    if (idx === -1) { idx = 0; id = "welcome"; }
    var r = ROUTES[idx];

    Speech.stop();
    Listening.reset();

    $$(".screen").forEach(function (s) { s.hidden = s.getAttribute("data-route") !== id; });
    $$("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === r.nav) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("#current-section").textContent = r.label;
    document.title = r.label + " – Food Adventure!";

    var back = $("#journey-back"), next = $("#journey-next");
    var prev = ROUTES[idx - 1], nxt = ROUTES[idx + 1];
    back.classList.toggle("is-disabled", !prev);
    back.setAttribute("aria-disabled", String(!prev));
    back.href = prev ? "#" + prev.id : "#" + id;
    $(".jb-label", back).textContent = prev ? "Back: " + prev.label : "Back";
    next.href = nxt ? "#" + nxt.id : "#menu";
    $(".jn-label", next).textContent = nxt ? "Next: " + nxt.label : "Main Menu";
    $("#journey-step").textContent = "Page " + (idx + 1) + " of " + ROUTES.length;

    closeNav();
    if (id === "complete") renderSummary();
    if (id === "menu") renderBadges();

    if (!firstLoad) {
      window.scrollTo(0, 0);
      var h = $("#screen-" + id + " h1");
      if (h) h.focus({ preventScroll: true });
    }
    firstLoad = false;
  }
  $("#journey-back").addEventListener("click", function (e) { if (this.classList.contains("is-disabled")) e.preventDefault(); });

  var navToggle = $(".nav-toggle");
  function closeNav() { navToggle.setAttribute("aria-expanded", "false"); $("#main-nav").classList.remove("open"); }
  navToggle.addEventListener("click", function () {
    var open = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(open));
    $("#main-nav").classList.toggle("open", open);
  });

  /* ---------------------------------------------------------
     FOOD DISCOVERY BOOK – bilingual flashcards
     --------------------------------------------------------- */
  var Flash = {
    i: 0,
    flipped: false,
    guesses: {},
    el: $("#flashcard"),
    render: function () {
      var f = D.foods[this.i];
      var n = this.i + 1, total = D.foods.length;
      var guess = this.guesses[f.id] || "";
      var guessMsg = "";
      if (guess) {
        var ok = f.accept.indexOf(normalise(guess)) !== -1;
        guessMsg = ok
          ? '<p class="guess-result ok">🎉 Your guess “' + esc(guess) + '” is correct!</p>'
          : '<p class="guess-result try">You guessed “' + esc(guess) + '”. Good try! The meaning is <strong>' + esc(f.ms.toLowerCase()) + "</strong>.</p>";
      } else {
        guessMsg = '<p class="guess-result">Was your guess correct? Check the Malay word above.</p>';
      }

      this.el.innerHTML =
        '<div class="flashcard-inner' + (this.flipped ? " is-flipped" : "") + '">' +
        // FRONT
        '<div class="face front"' + (this.flipped ? ' inert aria-hidden="true"' : "") + ">" +
          '<div class="fc-top"><span class="tag tag-' + f.group.split(" ")[0].toLowerCase() + '">' + esc(f.group) + '</span><span class="fc-num">Card ' + n + " / " + total + "</span></div>" +
          '<div class="fc-body">' +
            '<div class="fc-picture" role="img" aria-label="Picture: ' + esc(f.alt) + '"><span aria-hidden="true">' + f.emoji + "</span></div>" +
            '<div class="fc-info">' +
              '<div class="fc-word-row"><h2 class="fc-word">' + esc(f.en.toUpperCase()) + '</h2>' +
                '<button type="button" class="audio-btn" data-say="' + esc(f.en) + '" data-audio="' + esc(Rec.word(f)) + '" aria-label="Listen: how to say ' + esc(f.en) + '">🔊</button></div>' +
              '<ol class="clues">' + f.clues.map(function (c, k) {
                return '<li><span class="clue-num">Clue ' + (k + 1) + "</span> " + esc(c) + "</li>";
              }).join("") + "</ol>" +
              '<button type="button" class="link-btn" data-say="' + esc(f.clues.join(" ")) + '" data-audio="' + esc(Rec.clues(f)) + '"><span aria-hidden="true">🔊</span> Read the clues to me</button>' +
              '<p class="fc-question">Can you guess what I am?</p>' +
              '<label class="guess-label" for="guess-input">My guess in Bahasa Melayu <small>(optional)</small></label>' +
              '<div class="guess-row"><input id="guess-input" type="text" autocomplete="off" spellcheck="false" placeholder="Type your guess…" value="' + esc(guess) + '">' +
              '<button type="button" class="btn btn-primary" id="fc-flip"><span aria-hidden="true">🔄</span> FLIP CARD</button></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
        // BACK
        '<div class="face back"' + (this.flipped ? "" : ' inert aria-hidden="true"') + ">" +
          '<div class="fc-top"><span class="tag tag-' + f.group.split(" ")[0].toLowerCase() + '">' + esc(f.group) + '</span><span class="fc-num">Card ' + n + " / " + total + "</span></div>" +
          '<div class="fc-body">' +
            '<div class="fc-picture" role="img" aria-label="Picture: ' + esc(f.alt) + '"><span aria-hidden="true">' + f.emoji + "</span></div>" +
            '<div class="fc-info">' +
              '<p class="answer-label">The answer is…</p>' +
              '<p class="answer"><span class="ans-en" lang="en">' + esc(f.en.toUpperCase()) + '</span><span class="ans-dash" aria-hidden="true">–</span><span class="ans-ms" lang="ms">' + esc(f.ms.toUpperCase()) + "</span></p>" +
              '<p class="answer-langs"><span>English</span><span>Bahasa Melayu</span></p>' +
              guessMsg +
              '<div class="example"><span class="ex-label">Example sentence</span><p>“' + esc(f.sentence) + '”</p>' +
                '<button type="button" class="audio-btn" data-say="' + esc(f.sentence) + '" data-audio="' + esc(Rec.sentence(f)) + '" aria-label="Listen to the example sentence">🔊</button></div>' +
              '<div class="back-actions">' +
                '<button type="button" class="btn btn-soft" id="fc-unflip"><span aria-hidden="true">↩</span> Back to Clues</button>' +
                (n < total
                  ? '<button type="button" class="btn btn-primary" id="fc-nextcard">NEXT CARD <span aria-hidden="true">▶</span></button>'
                  : '<a class="btn btn-primary" href="#checkpoint">Go to Checkpoint <span aria-hidden="true">▶</span></a>') +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>" +
        "</div>";

      $("#fc-counter").textContent = n + " / " + total;
      $("#fc-prev").disabled = this.i === 0;
      $("#fc-next").disabled = this.i === total - 1;
      this.renderProgress();
    },
    renderProgress: function () {
      var self = this;
      $("#fc-dots").innerHTML = D.foods.map(function (f, k) {
        var done = progress.flipped.indexOf(f.id) !== -1;
        return '<button type="button" class="dot' + (done ? " done" : "") + (k === self.i ? " current" : "") + '" data-card="' + k + '"' +
          (k === self.i ? ' aria-current="step"' : "") + ' aria-label="Card ' + (k + 1) + (done ? ", checked" : "") + '">' + (done ? f.emoji : k + 1) + "</button>";
      }).join("");
      var c = progress.flipped.length;
      $("#fc-checked").textContent = c;
      $("#fc-guess-count").textContent = progress.guessed.length;
      $("#fc-meter").style.width = (c / D.foods.length * 100) + "%";
      $("#fc-done").hidden = c < D.foods.length;
    },
    saveGuess: function () {
      var input = $("#guess-input");
      if (input) this.guesses[D.foods[this.i].id] = input.value.trim();
    },
    flip: function () {
      this.saveGuess();
      var f = D.foods[this.i];
      var wasDone = isDone("discovery");
      if (progress.flipped.indexOf(f.id) === -1) progress.flipped.push(f.id);
      var g = this.guesses[f.id];
      if (g && f.accept.indexOf(normalise(g)) !== -1 && progress.guessed.indexOf(f.id) === -1) progress.guessed.push(f.id);
      save();
      this.flipped = true;
      this.render();
      earnBadge("discovery", wasDone);
      var b = $("#fc-unflip"); if (b) b.focus({ preventScroll: true });
    },
    unflip: function () {
      this.flipped = false;
      this.render();
      var b = $("#fc-flip"); if (b) b.focus({ preventScroll: true });
    },
    go: function (k) {
      if (k < 0 || k >= D.foods.length) return;
      this.saveGuess();
      this.i = k; this.flipped = false;
      this.render();
    }
  };
  Flash.el.addEventListener("click", function (e) {
    if (e.target.closest("#fc-flip")) Flash.flip();
    else if (e.target.closest("#fc-unflip")) Flash.unflip();
    else if (e.target.closest("#fc-nextcard")) Flash.go(Flash.i + 1);
  });
  Flash.el.addEventListener("keydown", function (e) {
    if (e.target.id === "guess-input" && e.key === "Enter") { e.preventDefault(); Flash.flip(); }
  });
  $("#fc-prev").addEventListener("click", function () { Flash.go(Flash.i - 1); });
  $("#fc-next").addEventListener("click", function () { Flash.go(Flash.i + 1); });
  $("#fc-dots").addEventListener("click", function (e) {
    var d = e.target.closest("[data-card]"); if (d) Flash.go(+d.getAttribute("data-card"));
  });
  document.addEventListener("keydown", function (e) {
    if ($("#screen-discovery").hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight") Flash.go(Flash.i + 1);
    if (e.key === "ArrowLeft") Flash.go(Flash.i - 1);
  });

  /* ---------------------------------------------------------
     Reusable multiple-choice option markup (native radios)
     --------------------------------------------------------- */
  function optionsHTML(name, options, selected, state) {
    // state: null (answering) or { answer, locked }
    var letters = "ABCD";
    return '<div class="options" role="radiogroup" aria-label="Answer choices">' + options.map(function (o, k) {
      var cls = "option";
      var mark = "";
      if (state && state.locked) {
        if (k === state.answer) { cls += " is-correct"; mark = '<span class="opt-mark">✓ Correct answer</span>'; }
        else if (k === selected) { cls += " is-wrong"; mark = '<span class="opt-mark">✗ Your answer</span>'; }
      }
      return '<label class="' + cls + '"><input type="radio" name="' + name + '" value="' + k + '"' +
        (k === selected ? " checked" : "") + (state && state.locked ? " disabled" : "") + ">" +
        '<span class="opt-letter" aria-hidden="true">' + letters[k] + '</span><span class="opt-text">' + esc(o) + "</span>" + mark + "</label>";
    }).join("") + "</div>";
  }

  function stars(score, total) {
    var r = score / total;
    var n = r === 1 ? 3 : r >= 0.6 ? 2 : 1;
    return '<span class="stars" aria-label="' + n + ' out of 3 stars">' + "★★★".slice(0, n) + '<span class="dim">' + "★★★".slice(0, 3 - n) + "</span></span>";
  }

  /* ---------------------------------------------------------
     VOCABULARY CHECKPOINT
     --------------------------------------------------------- */
  var Check = {
    el: $("#checkpoint-app"),
    i: 0, selected: null, locked: false, score: 0, finished: false,
    reset: function () { this.i = 0; this.selected = null; this.locked = false; this.score = 0; this.finished = false; this.render(); },
    render: function () {
      var qs = D.checkpoint;
      if (this.finished) {
        var good = this.score >= 4;
        this.el.innerHTML =
          '<div class="result">' +
          '<div class="mascot mascot-sm">' + benny("cheer") + "</div>" +
          '<h2>You scored ' + this.score + " out of " + qs.length + "!</h2>" + stars(this.score, qs.length) +
          "<p>" + (good ? "Excellent! You know your food words very well!" : "Good try! Let's learn together. Look at the flashcards again and try once more.") + "</p>" +
          '<div class="cta-row">' +
          '<button type="button" class="btn btn-soft" id="ck-retry"><span aria-hidden="true">🔄</span> Try Again</button>' +
          (good ? "" : '<a class="btn btn-soft" href="#discovery"><span aria-hidden="true">📖</span> Review Flashcards</a>') +
          '<a class="btn btn-primary" href="#matching">Go to the Matching Challenge <span aria-hidden="true">▶</span></a>' +
          "</div></div>";
        return;
      }
      var q = qs[this.i];
      var correct = this.selected === q.answer;
      this.el.innerHTML =
        '<div class="q-head"><span class="q-count">Question ' + (this.i + 1) + " of " + qs.length + '</span><span class="q-score">Score: ' + this.score + "</span></div>" +
        '<div class="meter" aria-hidden="true"><span style="width:' + (this.i / qs.length * 100) + '%"></span></div>' +
        '<fieldset class="q-fieldset"><legend class="q-text">' + esc(q.q) +
        ' <button type="button" class="audio-btn sm" data-say="' + esc(q.q) + '" aria-label="Listen to the question">🔊</button></legend>' +
        optionsHTML("ck", q.options, this.selected, { answer: q.answer, locked: this.locked }) + "</fieldset>" +
        '<p class="feedback ' + (this.locked ? (correct ? "good" : "bad") : "") + '" role="status" aria-live="polite">' +
        (this.locked ? (correct ? "🎉 Excellent! You got it right!" : "💪 Good try! Let's learn together! The correct answer is <strong>" + esc(q.options[q.answer]) + "</strong>.") : "") + "</p>" +
        '<div class="q-actions">' +
        (this.locked
          ? '<button type="button" class="btn btn-primary" id="ck-next">' + (this.i < qs.length - 1 ? 'Next Question <span aria-hidden="true">▶</span>' : "See My Score 🏅") + "</button>"
          : '<button type="button" class="btn btn-primary" id="ck-check"' + (this.selected === null ? " disabled" : "") + ">Check Answer</button>") +
        "</div>";
    }
  };
  Check.el.addEventListener("change", function (e) {
    if (e.target.name === "ck" && !Check.locked) {
      Check.selected = +e.target.value;
      $("#ck-check").disabled = false;
    }
  });
  Check.el.addEventListener("click", function (e) {
    if (e.target.closest("#ck-check") && Check.selected !== null) {
      Check.locked = true;
      if (Check.selected === D.checkpoint[Check.i].answer) Check.score++;
      Check.render();
      $("#ck-next").focus();
    } else if (e.target.closest("#ck-next")) {
      if (Check.i < D.checkpoint.length - 1) { Check.i++; Check.selected = null; Check.locked = false; Check.render(); var r = $('input[name="ck"]', Check.el); if (r) r.focus(); }
      else {
        Check.finished = true;
        var was = isDone("checkpoint");
        progress.checkpoint = Math.max(progress.checkpoint || 0, Check.score);
        save(); earnBadge("checkpoint", was);
        Check.render();
      }
    } else if (e.target.closest("#ck-retry")) { Check.reset(); }
  });

  /* ---------------------------------------------------------
     FOOD MATCHING CHALLENGE (click / tap based)
     --------------------------------------------------------- */
  var Match = {
    round: 0, pic: null, word: null, matched: [], tries: 0, busy: false,
    start: function (r) {
      this.round = r; this.pic = null; this.word = null; this.matched = []; this.tries = 0; this.busy = false;
      var items = D.matchingRounds[r].items;
      this.picOrder = shuffle(items);
      this.wordOrder = shuffle(items);
      // make sure the two columns are not in the same order
      if (this.wordOrder.join() === this.picOrder.join()) this.wordOrder.push(this.wordOrder.shift());
      $$("[data-round]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-round") === r)); });
      $("#match-round-title").textContent = D.matchingRounds[r].title;
      $("#match-result").hidden = true;
      this.feedback("Start by clicking a picture.", "");
      this.render();
    },
    render: function () {
      var self = this;
      $("#match-pictures").innerHTML = this.picOrder.map(function (id, k) {
        var f = foodById[id], m = self.matched.indexOf(id) !== -1;
        return '<button type="button" class="m-card m-pic' + (m ? " matched" : "") + (self.pic === id ? " selected" : "") + '" data-pic="' + id + '"' +
          (m ? " disabled" : "") + ' aria-pressed="' + (self.pic === id) + '" aria-label="Picture ' + (k + 1) + ": " + esc(f.alt) + (m ? ", matched with " + esc(f.en) : "") + '">' +
          '<span class="m-emoji" aria-hidden="true">' + f.emoji + "</span>" + (m ? '<span class="m-check" aria-hidden="true">✓</span>' : "") + "</button>";
      }).join("");
      $("#match-words").innerHTML = this.wordOrder.map(function (id) {
        var f = foodById[id], m = self.matched.indexOf(id) !== -1;
        return '<button type="button" class="m-card m-word' + (m ? " matched" : "") + (self.word === id ? " selected" : "") + '" data-word="' + id + '"' +
          (m ? " disabled" : "") + ' aria-pressed="' + (self.word === id) + '">' +
          (m ? '<span class="m-mini" aria-hidden="true">' + f.emoji + "</span>" : "") + '<span class="m-text">' + esc(f.en.toUpperCase()) + "</span>" +
          (m ? '<span class="m-check" aria-hidden="true">✓</span>' : "") + "</button>";
      }).join("");
      $("#match-correct").textContent = this.matched.length;
      $("#match-tries").textContent = this.tries;
    },
    feedback: function (msg, kind) {
      var fb = $("#match-feedback");
      fb.innerHTML = msg;
      fb.className = "feedback " + (kind || "");
    },
    choose: function (type, id) {
      if (this.busy || this.matched.indexOf(id) !== -1) return;
      if (type === "pic") this.pic = this.pic === id ? null : id;
      else this.word = this.word === id ? null : id;
      if (this.pic && this.word) { this.check(); return; }
      this.render();
      this.feedback(this.pic ? "Now click the English word for this picture." : this.word ? "Now click the picture for this word." : "Click a picture.", "");
      var sel = $('[data-' + type + '="' + id + '"]'); if (sel) sel.focus();
    },
    check: function () {
      var self = this, pic = this.pic, word = this.word;
      this.tries++;
      if (pic === word) {
        this.matched.push(pic);
        var f = foodById[pic];
        this.pic = this.word = null;
        this.render();
        this.feedback("🎉 Excellent! That is <strong>" + esc(f.en) + "</strong> (" + esc(f.ms) + ").", "good");
        Speech.say(f.en);
        if (this.matched.length === this.picOrder.length) this.finish();
        else { var next = $(".m-pic:not(.matched)"); if (next) next.focus(); }
      } else {
        this.render();
        this.busy = true;
        $('[data-pic="' + pic + '"]').classList.add("wrong");
        $('[data-word="' + word + '"]').classList.add("wrong");
        this.feedback("💪 Good try! That is not a match. Look at the picture again and try another word.", "bad");
        setTimeout(function () {
          self.busy = false; self.pic = null; self.word = null; self.render();
          var p = $('[data-pic="' + pic + '"]'); if (p) p.focus();
        }, 1100);
      }
    },
    finish: function () {
      var total = this.picOrder.length, r = this.round;
      var was = isDone("matching");
      var best = progress.match[r];
      progress.match[r] = best === null ? this.tries : Math.min(best, this.tries);
      save(); earnBadge("matching", was);
      var accuracy = Math.round(total / this.tries * 100);
      var res = $("#match-result");
      res.innerHTML =
        "<h3>" + D.matchingRounds[r].title + " complete! " + stars(total, this.tries) + "</h3>" +
        "<p>Score: <strong>" + total + " / " + total + "</strong> correct matches in <strong>" + this.tries + "</strong> tries (" + accuracy + "% accuracy).</p>" +
        "<p>" + (this.tries === total ? "Perfect! Every match was right the first time!" : "Well done! Practice makes perfect.") + "</p>" +
        '<div class="cta-row">' +
        (r === 0
          ? '<button type="button" class="btn btn-primary" data-goround="1">Play ROUND TWO <span aria-hidden="true">▶</span></button>'
          : '<a class="btn btn-primary" href="#speaking">Go to the Speaking Corner <span aria-hidden="true">▶</span></a>') +
        '<button type="button" class="btn btn-soft" data-goround="' + r + '"><span aria-hidden="true">🔄</span> Play again</button></div>';
      res.hidden = false;
      var btn = $("button", res); if (btn) btn.focus();
    }
  };
  $("#match-pictures").addEventListener("click", function (e) { var b = e.target.closest("[data-pic]"); if (b) Match.choose("pic", b.getAttribute("data-pic")); });
  $("#match-words").addEventListener("click", function (e) { var b = e.target.closest("[data-word]"); if (b) Match.choose("word", b.getAttribute("data-word")); });
  $$("[data-round]").forEach(function (b) { b.addEventListener("click", function () { Match.start(+b.getAttribute("data-round")); }); });
  $("#match-restart").addEventListener("click", function () { Match.start(Match.round); });
  $("#match-result").addEventListener("click", function (e) { var b = e.target.closest("[data-goround]"); if (b) Match.start(+b.getAttribute("data-goround")); });

  /* ---------------------------------------------------------
     SPEAKING CORNER
     --------------------------------------------------------- */
  (function speaking() {
    $("#speak-questions").innerHTML = D.speakingQuestions.map(function (q, k) {
      return '<li class="q-bubble">' +
        '<span class="qb-emoji" aria-hidden="true">' + q.emoji + "</span>" +
        '<div class="qb-body"><p class="qb-text"><span class="qb-num">' + (k + 1) + ".</span> " + esc(q.q) + "</p>" +
        '<div class="qb-actions"><button type="button" class="audio-btn sm" data-say="' + esc(q.q) + '" aria-label="Listen to question ' + (k + 1) + '">🔊</button>' +
        '<button type="button" class="link-btn" aria-expanded="false" data-example="' + k + '">💡 Example answer</button></div>' +
        '<ul class="examples" id="ex-' + k + '" hidden>' + q.examples.map(function (x) {
          return '<li><span>' + esc(x) + '</span> <button type="button" class="audio-btn xs" data-say="' + esc(x) + '" aria-label="Listen to example answer">🔊</button></li>';
        }).join("") + "</ul></div></li>";
    }).join("");
    $("#speak-questions").addEventListener("click", function (e) {
      var b = e.target.closest("[data-example]"); if (!b) return;
      var list = $("#ex-" + b.getAttribute("data-example"));
      list.hidden = !list.hidden;
      b.setAttribute("aria-expanded", String(!list.hidden));
    });

    $("#speak-starters").innerHTML = D.sentenceStarters.map(function (s) {
      return '<li><button type="button" class="starter" data-say="' + esc(s.replace(/\.\.\./g, "").replace(/\s+/g, " ")) + '">' + esc(s) + ' <span aria-hidden="true">🔊</span></button></li>';
    }).join("");

    $("#speak-vocab").innerHTML = D.speakingVocab.map(function (v) {
      return '<li><span class="v-emoji" aria-hidden="true">' + v.emoji + '</span><span class="v-en" lang="en">' + esc(v.en) + '</span><span class="v-ms" lang="ms">' + esc(v.ms) +
        '</span><button type="button" class="audio-btn xs" data-say="' + esc(v.en) + '" aria-label="Listen: ' + esc(v.en) + '">🔊</button></li>';
    }).join("");

    // Pair interview stepper
    var step = 0;
    var roles = [
      "🎤 <strong>Student A</strong> is asking · 🙋 <strong>Student B</strong> is answering",
      "🎤 <strong>Student A</strong> is asking · 🙋 <strong>Student B</strong> is answering",
      "🔄 Swap! 🎤 <strong>Student B</strong> is asking · 🙋 <strong>Student A</strong> is answering",
      "📣 Everyone shares: “My partner usually eats…”"
    ];
    function renderStep() {
      $$("#pair-steps li").forEach(function (li) {
        var s = +li.getAttribute("data-step");
        li.classList.toggle("current", s === step);
        li.classList.toggle("past", s < step);
        if (s === step) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      $("#role-banner").innerHTML = roles[step];
      $("#step-prev").disabled = step === 0;
      $("#step-next").disabled = step === 3;
    }
    $("#step-prev").addEventListener("click", function () { if (step > 0) { step--; renderStep(); } });
    $("#step-next").addEventListener("click", function () { if (step < 3) { step++; renderStep(); } });
    renderStep();

    // Questions asked tracker
    $("#asked-list").innerHTML = D.speakingQuestions.map(function (q, k) {
      return '<li><label><input type="checkbox" value="' + k + '"> <span>' + esc(q.q) + "</span></label></li>";
    }).join("");
    $("#asked-list").addEventListener("change", function () {
      var n = $$("#asked-list input:checked").length;
      var fb = $("#asked-feedback");
      if (n >= 3) { fb.innerHTML = "🎉 Great! You asked " + n + " questions. Now swap roles!"; fb.className = "feedback good"; }
      else { fb.textContent = "You asked " + n + " question" + (n === 1 ? "" : "s") + ". Ask " + (3 - n) + " more."; fb.className = "feedback"; }
    });

    // Share sentence builder
    $("#share-food").innerHTML = D.shareFoods.map(function (f) { return "<option>" + esc(f) + "</option>"; }).join("");
    $("#share-meal").innerHTML = D.shareMeals.map(function (m) { return "<option>" + esc(m) + "</option>"; }).join("");
    $("#share-say").addEventListener("click", function () {
      Speech.say("My partner usually eats " + $("#share-food").value + " for " + $("#share-meal").value + ".");
    });

    // Confidence checklist
    function confidence() {
      var boxes = $$("#confidence-list input");
      var n = boxes.filter(function (b) { return b.checked; }).length;
      var fb = $("#confidence-feedback");
      if (n === boxes.length) {
        var was = isDone("speaking");
        progress.speaking = true; save(); earnBadge("speaking", was);
        fb.innerHTML = "🌟 Super! You are a confident speaker!"; fb.className = "feedback good";
      } else {
        fb.textContent = n ? n + " of 3 ticked. Keep practising!" : ""; fb.className = "feedback";
      }
    }
    $("#confidence-list").addEventListener("change", confidence);
  })();

  /* ---------------------------------------------------------
     LISTENING CORNER – interview player + True/False
     --------------------------------------------------------- */
  var Listening = {
    line: 0, playing: false, token: 0, count: 0,
    lines: D.interview,
    setSpeaker: function (who) {
      $$(".speaker").forEach(function (s) { s.classList.toggle("talking", s.id === "spk-" + who); });
      $("#sound-wave").classList.toggle("on", !!who);
    },
    ui: function () {
      $("#audio-play").disabled = this.playing;
      $("#audio-pause").disabled = !this.playing;
      $("#audio-meter").style.width = (this.line / this.lines.length * 100) + "%";
      $$("#transcript li").forEach(function (li, k) { li.classList.toggle("now", Listening.playing && k === Listening.line); });
    },
    play: function () {
      if (!Speech.supported && !REC.useRecordings) { toast("🔇 This browser cannot play the voice. Please use the transcript."); return; }
      if (this.playing) return;
      if (this.line >= this.lines.length) this.line = 0;
      if (this.line === 0) { this.count++; $("#listen-count").textContent = this.count; }
      this.playing = true;
      this.speakLine(++this.token);
    },
    speakLine: function (tok) {
      var self = this;
      if (tok !== this.token || !this.playing) return;
      if (this.line >= this.lines.length) {
        this.playing = false; this.setSpeaker(null); this.ui();
        $("#now-playing").textContent = "✅ The interview has finished. Answer the questions, or press REPLAY to listen again.";
        return;
      }
      var l = this.lines[this.line];
      this.setSpeaker(l.who);
      this.ui();
      $("#now-playing").textContent = (l.who === "Sarah" ? "👧 Sarah" : "🎤 Interviewer") + " is speaking… (part " + (this.line + 1) + " of " + this.lines.length + ")";
      Speech.say(l.text, { src: Rec.line(this.line), pitch: l.who === "Sarah" ? 1.3 : 0.95, keepQueue: false }).then(function (ok) {
        if (tok !== self.token || !self.playing) return;
        self.line++;
        setTimeout(function () { self.speakLine(tok); }, ok ? 350 : 0);
      });
    },
    pause: function () {
      if (!this.playing) return;
      this.playing = false; this.token++;
      Speech.stop();
      this.setSpeaker(null); this.ui();
      $("#now-playing").textContent = "⏸ Paused at part " + (this.line + 1) + " of " + this.lines.length + ". Press PLAY to continue.";
    },
    replay: function () {
      this.token++; this.playing = false; Speech.stop();
      this.line = 0;
      this.play();
    },
    reset: function () {
      if (!this.playing) return;
      this.playing = false; this.token++;
      this.setSpeaker(null); this.ui();
      $("#now-playing").textContent = "⏸ Paused. Press PLAY to continue.";
    }
  };
  $("#audio-play").addEventListener("click", function () { Listening.play(); });
  $("#audio-pause").addEventListener("click", function () { Listening.pause(); });
  $("#audio-replay").addEventListener("click", function () { Listening.replay(); });
  $("#tf-replay-audio").addEventListener("click", function () { Listening.replay(); $("#audio-play").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#voice-select").addEventListener("change", function () { Speech.voiceURI = this.value; });
  $("#rate-select").addEventListener("change", function () { Speech.rate = parseFloat(this.value); });

  $("#transcript").innerHTML = D.interview.map(function (l) {
    return '<li class="t-' + l.who.toLowerCase() + '"><strong>' + esc(l.who.toUpperCase()) + ":</strong> " + esc(l.text) + "</li>";
  }).join("");
  function unlockTranscript() {
    $("#transcript-toggle").disabled = false;
    $("#transcript-lock").hidden = true;
  }
  $("#transcript-toggle").addEventListener("click", function () {
    var t = $("#transcript");
    t.hidden = !t.hidden;
    this.setAttribute("aria-expanded", String(!t.hidden));
    this.innerHTML = '<span aria-hidden="true">📄</span> ' + (t.hidden ? "Show transcript" : "Hide transcript");
  });
  if (!Speech.supported) {
    $("#tts-warning").hidden = false;
    $("#audio-play").disabled = true;
    $("#audio-replay").disabled = true;
    unlockTranscript();
  }

  var TF = {
    submitted: false,
    render: function (answers) {
      var self = this;
      $("#tf-list").innerHTML = D.trueFalse.map(function (item, k) {
        var a = answers ? answers[k] : null;
        var status = "";
        if (self.submitted) {
          var ok = a === item.answer;
          status = '<p class="tf-result ' + (ok ? "good" : "bad") + '">' + (ok ? "✓ Correct!" : "✗ The answer is " + (item.answer ? "TRUE" : "FALSE") + ".") +
            ' <span class="evidence">' + esc(item.evidence) + "</span></p>";
        }
        function opt(val, label) {
          var cls = "tf-opt tf-" + label.toLowerCase();
          if (self.submitted && item.answer === val) cls += " is-correct";
          else if (self.submitted && a === val) cls += " is-wrong";
          return '<label class="' + cls + '"><input type="radio" name="tf' + k + '" value="' + val + '"' + (a === val ? " checked" : "") + (self.submitted ? " disabled" : "") + ">" +
            "<span>" + (val ? "👍 " : "👎 ") + label + "</span></label>";
        }
        return '<li class="tf-item"><fieldset><legend><span class="tf-num">' + (k + 1) + "</span> " + esc(item.s) +
          ' <button type="button" class="audio-btn xs" data-say="' + esc(item.s) + '" aria-label="Listen to statement ' + (k + 1) + '">🔊</button></legend>' +
          '<div class="tf-opts">' + opt(true, "TRUE") + opt(false, "FALSE") + "</div>" + status + "</fieldset></li>";
      }).join("");
    },
    read: function () {
      return D.trueFalse.map(function (_, k) {
        var c = $('input[name="tf' + k + '"]:checked');
        return c ? c.value === "true" : null;
      });
    }
  };
  TF.render(null);
  $("#tf-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (TF.submitted) return;
    var answers = TF.read();
    var missing = answers.map(function (a, k) { return a === null ? k + 1 : null; }).filter(Boolean);
    var fb = $("#tf-feedback");
    if (missing.length) {
      fb.textContent = "Please answer every sentence first. Missing: number " + missing.join(", ") + ".";
      fb.className = "feedback bad";
      $('input[name="tf' + (missing[0] - 1) + '"]').focus();
      return;
    }
    var score = answers.filter(function (a, k) { return a === D.trueFalse[k].answer; }).length;
    TF.submitted = true;
    TF.render(answers);
    fb.innerHTML = "<strong>Your score: " + score + " / 5</strong> " + stars(score, 5) + "<br>" +
      (score === 5 ? "🎉 Excellent! You listened very carefully!" : score >= 3 ? "👍 Well done! Read the transcript to check the tricky parts." : "💪 Good try! Let's learn together. Listen again and press RETRY.");
    fb.className = "feedback " + (score >= 3 ? "good" : "bad");
    $("#tf-submit").hidden = true;
    $("#tf-retry").hidden = false;
    unlockTranscript();
    var was = isDone("listening");
    progress.listening = Math.max(progress.listening || 0, score);
    save(); earnBadge("listening", was);
    fb.setAttribute("tabindex", "-1"); fb.focus();
  });
  $("#tf-retry").addEventListener("click", function () {
    TF.submitted = false; TF.render(null);
    $("#tf-feedback").textContent = ""; $("#tf-feedback").className = "feedback";
    $("#tf-submit").hidden = false; this.hidden = true;
    $('input[name="tf0"]').focus();
  });

  /* ---------------------------------------------------------
     FINAL FOOD EXPLORER QUIZ
     --------------------------------------------------------- */
  var Quiz = {
    el: $("#quiz-app"),
    i: 0, answers: [], submitted: false, reviewing: false, warn: "",
    reset: function () { this.i = 0; this.answers = D.quiz.map(function () { return null; }); this.submitted = false; this.reviewing = false; this.warn = ""; this.render(); },
    score: function () { var self = this; return this.answers.filter(function (a, k) { return a === self.correctIndex(D.quiz[k]); }).length; },
    optionList: function (q) { return q.type === "tf" ? ["TRUE", "FALSE"] : q.options; },
    // tf answers are stored as index: 0 = TRUE, 1 = FALSE
    correctIndex: function (q) { return q.type === "tf" ? (q.answer ? 0 : 1) : q.answer; },
    render: function () {
      var self = this, qs = D.quiz;
      if (this.submitted && !this.reviewing) {
        var s = this.score();
        var msg = s === 10 ? "Outstanding! You are a true Food Explorer! 🏆"
          : s >= 8 ? "Excellent work! You learned a lot today!"
          : s >= 5 ? "Well done! Review your answers to learn even more."
          : "Good try! Let's learn together. Review the answers and try again.";
        this.el.innerHTML =
          '<div class="result">' +
          '<div class="mascot mascot-sm">' + benny("cheer") + "</div>" +
          "<h2>Your score: " + s + " / 10</h2>" + stars(s, 10) +
          '<p class="big-msg">' + msg + "</p>" +
          '<div class="cta-row">' +
          '<button type="button" class="btn btn-soft" id="qz-review"><span aria-hidden="true">🔍</span> REVIEW ANSWERS</button>' +
          '<button type="button" class="btn btn-soft" id="qz-retake"><span aria-hidden="true">🔄</span> RETAKE THE QUIZ</button>' +
          '<a class="btn btn-primary" href="#complete">Finish the Adventure <span aria-hidden="true">🎉</span></a>' +
          "</div></div>";
        return;
      }
      if (this.reviewing) {
        this.el.innerHTML = '<h2 class="review-title">Review Your Answers · Score ' + this.score() + " / 10</h2>" +
          '<ol class="review-list">' + qs.map(function (q, k) {
            var opts = self.optionList(q), ci = self.correctIndex(q), a = self.answers[k];
            var ok = a === ci;
            return '<li class="review-item ' + (ok ? "good" : "bad") + '"><p class="rv-q"><span class="rv-mark" aria-hidden="true">' + (ok ? "✓" : "✗") + "</span> " +
              (q.picture ? '<span class="rv-pic" role="img" aria-label="' + esc(q.pictureAlt) + '">' + q.picture + "</span> " : "") + esc(q.q) + "</p>" +
              "<p>Your answer: <strong>" + (a === null ? "No answer" : esc(opts[a])) + "</strong>" + (ok ? " – Correct!" : " · Correct answer: <strong>" + esc(opts[ci]) + "</strong>") + "</p>" +
              '<p class="rv-explain">' + esc(q.explain) + "</p></li>";
          }).join("") + "</ol>" +
          '<div class="cta-row"><button type="button" class="btn btn-soft" id="qz-back-results">◀ Back to My Score</button>' +
          '<button type="button" class="btn btn-soft" id="qz-retake"><span aria-hidden="true">🔄</span> RETAKE THE QUIZ</button>' +
          '<a class="btn btn-primary" href="#complete">Finish the Adventure <span aria-hidden="true">🎉</span></a></div>';
        return;
      }
      var q = qs[this.i], last = this.i === qs.length - 1;
      var answeredCount = this.answers.filter(function (a) { return a !== null; }).length;
      this.el.innerHTML =
        '<div class="q-head"><span class="q-count">Question ' + (this.i + 1) + " of " + qs.length + '</span><span class="q-skill">' + esc(q.skill) + (q.type === "tf" ? " · True or False" : "") + "</span></div>" +
        '<div class="q-dots" role="group" aria-label="Go to question">' + qs.map(function (_, k) {
          return '<button type="button" class="dot sm' + (self.answers[k] !== null ? " answered" : "") + (k === self.i ? " current" : "") + '" data-q="' + k + '"' +
            (k === self.i ? ' aria-current="step"' : "") + ' aria-label="Question ' + (k + 1) + (self.answers[k] !== null ? ", answered" : ", not answered") + '">' + (k + 1) + "</button>";
        }).join("") + "</div>" +
        '<p class="q-answered">Answered: ' + answeredCount + " / " + qs.length + "</p>" +
        (q.picture ? '<div class="q-picture" role="img" aria-label="Picture: ' + esc(q.pictureAlt) + '"><span aria-hidden="true">' + q.picture + "</span></div>" : "") +
        '<fieldset class="q-fieldset"><legend class="q-text">' + esc(q.q) +
        ' <button type="button" class="audio-btn sm" data-say="' + esc(q.q) + '" aria-label="Listen to the question">🔊</button></legend>' +
        optionsHTML("qz", this.optionList(q), this.answers[this.i], null) + "</fieldset>" +
        '<p class="feedback bad" role="status" aria-live="polite">' + this.warn + "</p>" +
        '<div class="q-actions spread">' +
        '<button type="button" class="btn btn-soft" id="qz-prev"' + (this.i === 0 ? " disabled" : "") + '><span aria-hidden="true">◀</span> PREVIOUS QUESTION</button>' +
        (last
          ? '<button type="button" class="btn btn-primary" id="qz-submit">SUBMIT QUIZ <span aria-hidden="true">✔</span></button>'
          : '<button type="button" class="btn btn-primary" id="qz-next">NEXT QUESTION <span aria-hidden="true">▶</span></button>') +
        "</div>";
      this.warn = "";
    },
    goTo: function (k) { this.i = k; this.render(); var r = $('input[name="qz"]', this.el); if (r) r.focus(); }
  };
  Quiz.el.addEventListener("change", function (e) {
    if (e.target.name === "qz") {
      Quiz.answers[Quiz.i] = +e.target.value;
      var dot = $('[data-q="' + Quiz.i + '"]', Quiz.el);
      if (dot) dot.classList.add("answered");
      var n = Quiz.answers.filter(function (a) { return a !== null; }).length;
      $(".q-answered", Quiz.el).textContent = "Answered: " + n + " / " + D.quiz.length;
    }
  });
  Quiz.el.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("#qz-next")) Quiz.goTo(Quiz.i + 1);
    else if (t.closest("#qz-prev")) Quiz.goTo(Quiz.i - 1);
    else if (t.closest("[data-q]")) Quiz.goTo(+t.closest("[data-q]").getAttribute("data-q"));
    else if (t.closest("#qz-submit")) {
      var missing = Quiz.answers.map(function (a, k) { return a === null ? k : null; }).filter(function (x) { return x !== null; });
      if (missing.length) {
        Quiz.warn = "Please answer every question before you submit. Not answered yet: question " + missing.map(function (k) { return k + 1; }).join(", ") + ".";
        Quiz.i = missing[0]; Quiz.render();
        var r = $('input[name="qz"]', Quiz.el); if (r) r.focus();
        return;
      }
      Quiz.submitted = true;
      var was = isDone("quiz");
      progress.quiz = Math.max(progress.quiz || 0, Quiz.score());
      save(); earnBadge("quiz", was);
      Quiz.render();
      $("#qz-review").focus();
    }
    else if (t.closest("#qz-review")) { Quiz.reviewing = true; Quiz.render(); window.scrollTo(0, 0); $(".review-title", Quiz.el).setAttribute("tabindex", "-1"); $(".review-title", Quiz.el).focus(); }
    else if (t.closest("#qz-back-results")) { Quiz.reviewing = false; Quiz.render(); }
    else if (t.closest("#qz-retake")) { Quiz.reset(); var r2 = $('input[name="qz"]', Quiz.el); if (r2) r2.focus(); }
  });

  /* ---------------------------------------------------------
     COMPLETION PAGE
     --------------------------------------------------------- */
  function renderSummary() {
    var p = progress;
    var items = [
      { icon: "📖", title: "Food Discovery Book", skill: "Vocabulary",
        text: "Cards checked: " + p.flipped.length + " / 10 · Correct guesses: " + p.guessed.length +
          (p.checkpoint !== null ? " · Checkpoint: " + p.checkpoint + " / 5" : ""),
        done: isDone("discovery"), href: "#discovery" },
      { icon: "🧩", title: "Food Matching Challenge", skill: "Vocabulary",
        text: [0, 1].map(function (r) { return D.matchingRounds[r].title + ": " + (p.match[r] === null ? "not played" : "done in " + p.match[r] + " tries"); }).join(" · "),
        done: isDone("matching"), href: "#matching" },
      { icon: "🗣️", title: "Speaking Corner", skill: "Speaking",
        text: p.speaking ? "You ticked every confidence box. Keep speaking English!" : "Practise with a partner and tick your confidence checklist.",
        done: isDone("speaking"), href: "#speaking" },
      { icon: "🎧", title: "Listening Corner", skill: "Listening",
        text: p.listening !== null ? "Best True/False score: " + p.listening + " / 5" : "Listen to Sarah's interview and answer True or False.",
        done: isDone("listening"), href: "#listening" }
    ];
    $("#summary-grid").innerHTML = items.map(function (it) {
      return '<li class="summary-card' + (it.done ? " done" : "") + '"><span class="sc-icon" aria-hidden="true">' + it.icon + "</span>" +
        "<div><h3>" + esc(it.title) + '</h3><span class="sc-skill">' + it.skill + "</span><p>" + esc(it.text) + "</p>" +
        '<span class="sc-status">' + (it.done ? "✓ Badge earned" : '<a href="' + it.href + '">Try this activity →</a>') + "</span></div></li>";
    }).join("") +
      '<li class="summary-card wide' + (isDone("quiz") ? " done" : "") + '"><span class="sc-icon" aria-hidden="true">🏆</span><div><h3>Final Food Explorer Quiz</h3>' +
      "<p>" + (p.quiz !== null ? "Best score: " + p.quiz + " / 10" : "Not taken yet.") + "</p>" +
      '<span class="sc-status">' + (isDone("quiz") ? "✓ Badge earned" : '<a href="#quiz">Take the quiz →</a>') + "</span></div></li>";
  }
  $("#repeat-all").addEventListener("click", function () {
    progress = freshProgress(); save();
    Flash.guesses = {}; Flash.i = 0; Flash.flipped = false; Flash.render();
    Check.reset(); Match.start(0); Quiz.reset();
    TF.submitted = false; TF.render(null); $("#tf-feedback").textContent = ""; $("#tf-submit").hidden = false; $("#tf-retry").hidden = true;
    $$("#confidence-list input, #asked-list input").forEach(function (b) { b.checked = false; });
    $("#confidence-feedback").textContent = ""; $("#asked-feedback").textContent = "Ask at least 3 questions."; $("#asked-feedback").className = "feedback";
    toast("🔄 Fresh start! Your adventure begins again.");
    location.hash = "#discovery";
  });

  // Confetti for the completion page
  (function confetti() {
    var c = $(".confetti"), foods = ["🍎", "🍌", "🥕", "🥦", "🍊", "🥛", "🍞", "⭐", "🎉"], html = "";
    for (var k = 0; k < 18; k++) {
      html += '<span style="left:' + (k * 5.5 + Math.random() * 3) + "%;animation-delay:" + (Math.random() * 4).toFixed(2) + "s;animation-duration:" + (5 + Math.random() * 4).toFixed(2) + 's">' + foods[k % foods.length] + "</span>";
    }
    c.innerHTML = html;
  })();

  /* ---------------------------------------------------------
     Start
     --------------------------------------------------------- */
  Flash.render();
  Check.reset();
  Match.start(0);
  Quiz.reset();
  renderBadges();
  window.addEventListener("hashchange", route);
  route();
})();
