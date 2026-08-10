/* Class descriptions + click-to-popup. Wires timetable entries (.day-classes li)
   and the class-style cards (.cc ul li) on any page this script is included on. */
(function () {
  var C = {
    "signature flow": { t: "Signature Flow", b: "Left to your own devices you'd probably take it easier than this. Signature Flow is a set sequence: spiced-up sun salutations, standing postures and strength work, and it builds heat. The sequence repeats each week so your strength grows through repetition. Suitable for all levels." },
    "flow": { t: "Flow & Hot Flow", b: "Feeling stuck in a routine? Reconnect with your body, express yourself and feel free. Flow and Hot Flow move through flowing sequences, vinyasas and mindful breathwork. Hot Flow is in a studio heated to around 35°C. Some prior experience is recommended." },
    "mandala": { t: "Mandala", b: "Ready to bring some balance in and embrace the qualities of nature? Mandala Yoga explores the Earth, Water, Fire and Air elements through movement (yin and yang) and breathwork. You move 360° around the mat, build towards inversions and have moments of introspection. Best suited to those with some experience or a willingness to explore." },
    "spiritual warrior": { t: "Spiritual Warrior", b: "Most classes change every week, which can feel freeing but can also mean you never quite land anywhere. Spiritual Warrior runs the same sequence every time. This Jivamukti-style practice builds towards headstand, with meditation and a wind-down woven in. Not soft, not floaty." },
    "kundalini": { t: "Kundalini", b: "Feeling stuck and a bit dull? This practice is all about shifting your energy and raising your vibration up through the body. Classes balance heat and heart, so you leave feeling buzzed, blissed and on a real yoga high. All welcome." },
    "gentle": { t: "Gentle", b: "Aching joints and struggling to find a gentle, inclusive form of movement to stay active? Our Gentle Yoga is back-and-joint friendly and slower paced, with no fast transitions or scary shapes. Ideal if you're recovering from surgery, injury or illness, brand new to yoga, or not very active." },
    "yin": { t: "Yin", b: "If you feel stressed, are always rushing and never have a moment to be still, Yin Yoga gives you exactly that. Deeply meditative floor-based postures and long holds release tension and settle the nervous system. All welcome." },
    "relax & yoga nidra": { t: "Relax & Yoga Nidra", b: "Struggling to sleep and finding it hard to unwind? Get your pyjamas on: this class teaches you how to relax. It's half gentle movement and half guided relaxation and Yoga Nidra, finishing with a long, soothing savasana. All welcome." },
    "restorative": { t: "Restorative", b: "A 75-minute invitation to guide body and mind into deep relaxation and renewal. You're lovingly supported by bolsters, blankets and blocks in comfortable, effortless postures practised at floor level. Deep rest, mindful stillness, gentle healing and stress relief." },
    "foundations": { t: "Foundations", b: "New to yoga and want to take things steady to really feel into the positions? You'll find comfort in familiarity, with a similar sequence each week that helps you build your practice through repetition. Shoulder-friendly, with no vinyasas." },
    "forrest": { t: "Forrest Yoga", b: "Looking to ease physical and emotional pain? Forrest Yoga helps you discover resilience, guiding you through life's challenges with breath, strength, integrity and spirit. It's slow and introspective, giving you time to listen to your body's signals of ease and discomfort. All welcome." },
    "pilates": { t: "Pilates & Hot Pilates", b: "Want to feel stronger, fitter and more energised? Our Pilates and Hot Pilates give a full-body workout that builds core strength, tones muscles, improves posture and increases flexibility. Traditional Pilates focuses on controlled, mindful movement for all abilities. Hot Pilates is heated to around 35°C. All levels welcome." },
    "hot sequence": { t: "Hot Sequence", b: "Tight muscles, full of tension and an overactive mind? Step into the heat and create space in the body through a cardiovascular workout. At 38°C you can get a little deeper into the postures, raise your heart rate and enjoy a real mental challenge. All welcome." },
    "sculpt": { t: "Sculpt & Hot Sculpt", b: "Ready to sculpt a stronger, leaner you? Sculpt combines the precision of Pilates with the power of strength training. It's low-impact yet high-intensity, using curated movements to target and tone every muscle. Hot Sculpt runs at 28 to 30°C. Wrist weights (2lb) are recommended." },
    "barre": { t: "Barre", b: "Lacking strength, tone and the chance to work out without running or jumping? Barre uses a fixed ballet barre for a series of repetitive, low-impact movements at varying intensities, sculpting the body using your own body weight. All welcome." },
    "aerial yoga": { t: "Aerial Yoga", b: "Want some fun and to feel carefree like a child again? Swap your mat for a silk hammock suspended from the ceiling, for support through your practice and a good giggle. This dynamic class improves flexibility and strength, builds confidence, and lengthens and decompresses the spine. All welcome." },
    "pregnancy yoga": { t: "Pregnancy Yoga", b: "Led by Katie, this class is designed specifically for the pregnant body. It weaves together movement for birth preparation, breathwork, active birth positions and guided relaxations, plus an understanding of how hormones influence you. Above all it reframes birth as a powerful rite of passage to be celebrated, not feared." }
  };
  var ALIAS = {
    "hot flow": "flow", "hot pilates": "pilates", "hot sculpt": "sculpt",
    "relax": "relax & yoga nidra", "yoga nidra": "relax & yoga nidra", "relax & nidra": "relax & yoga nidra",
    "forrest yoga": "forrest", "aerial": "aerial yoga", "pregnancy": "pregnancy yoga"
  };
  function key(name) {
    var n = (name || "").toLowerCase().replace(/\s+/g, " ").trim();
    var tries = [
      n,
      n.replace(/\s*yoga$/, "").trim(),
      n.replace(/^(hot|warm)\s+/, "").trim(),
      n.replace(/^(hot|warm)\s+/, "").replace(/\s*yoga$/, "").trim()
    ];
    for (var i = 0; i < tries.length; i++) {
      var t = tries[i];
      if (C[t]) return t;
      if (ALIAS[t]) return ALIAS[t];
    }
    return null;
  }

  var modal = document.createElement("div");
  modal.className = "class-modal";
  modal.hidden = true;
  modal.innerHTML =
    '<div class="cm-backdrop" data-cm-close></div>' +
    '<div class="cm-panel" role="dialog" aria-modal="true" aria-labelledby="cmTitle">' +
    '<button class="cm-close" type="button" aria-label="Close" data-cm-close>&times;</button>' +
    '<h3 id="cmTitle"></h3><p id="cmBody"></p></div>';
  document.body.appendChild(modal);
  var cmTitle = modal.querySelector("#cmTitle"), cmBody = modal.querySelector("#cmBody");
  var lastFocus = null;
  function openModal(k, trigger) {
    var d = C[k]; if (!d) return;
    cmTitle.textContent = d.t; cmBody.textContent = d.b;
    lastFocus = trigger || document.activeElement;
    modal.hidden = false; document.body.style.overflow = "hidden";
    var cb = modal.querySelector(".cm-close"); if (cb) cb.focus();
  }
  function closeModal() {
    modal.hidden = true; document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  modal.addEventListener("click", function (e) { if (e.target.hasAttribute("data-cm-close")) closeModal(); });
  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") { closeModal(); return; }
    // only the close button is focusable in this dialog, so trap focus on it
    if (e.key === "Tab") { e.preventDefault(); var cb = modal.querySelector(".cm-close"); if (cb) cb.focus(); }
  });

  function wire(el, name) {
    var k = key(name); if (!k) return false;
    el.classList.add("class-clickable");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", function () { openModal(k, el); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(k, el); }
    });
    return true;
  }
  var ICON = '<span class="ci-info" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>';
  // Timetable entries
  document.querySelectorAll(".day-classes li").forEach(function (li) {
    var nm = li.querySelector(".name"); if (!nm) return;
    if (wire(li, nm.textContent)) nm.insertAdjacentHTML("beforeend", ICON);
  });
  // Class-style cards
  document.querySelectorAll(".cc ul li").forEach(function (li) {
    var s = li.querySelector("strong"); if (!s) return;
    var clone = s.cloneNode(true);
    var ht = clone.querySelector(".hot-tag"); if (ht) ht.remove();
    if (wire(li, clone.textContent)) s.insertAdjacentHTML("beforeend", ICON);
  });
})();
