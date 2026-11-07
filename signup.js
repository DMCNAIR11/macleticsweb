/*
  Waitlist and product-update signups. Shared by macletics.com (assets/signup.js)
  and mindofmart.com (signup.js). Keep the two copies identical.

  Posts to the API: POST https://api2.macletics.com/public/waitlist
    { email, interest: "ios_launch" | "updates", source, company }
  `company` is a honeypot: hidden from people, filled in by form bots.
  The API stores email, interest, source and timestamps only.

  Two ways to use it in a page:
    1. Any element with data-signup opens the dialog:
         <button data-signup data-interest="ios_launch" data-source="macletics-appstore-hero">
    2. An inline form with data-signup-form:
         <form data-signup-form data-interest="updates" data-source="macletics-footer">
           <input type="email" name="email"> <button>Sign up</button>
         </form>

  `source` names the placement, so the admin export shows which button works.
  Lowercase letters, digits, "-" and "_" only, 40 characters at most.
*/
(function () {
  var API = "https://api2.macletics.com/public/waitlist";
  var FALLBACK = "marketing@mindofmart.com";
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PRIVACY = "https://macletics.com/privacy";

  var COPY = {
    ios_launch: {
      title: "Get notified when it's on the App Store",
      body: "Mac's Sports Playground is on Google Play now. Leave your email and we'll send you a note the day the iPhone version is ready.",
      button: "Notify me",
      done: "You're on the list. We'll email you the day it's on the App Store."
    },
    updates: {
      title: "Get product updates",
      body: "Launch news, new features and new leagues from Mac's Sports Playground and Mind of Mart. Only product news, never spam.",
      button: "Sign me up",
      done: "You're on the list. Thanks for following along."
    }
  };

  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  function send(email, interest, source, honeypot) {
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, interest: interest, source: source, company: honeypot || "" })
    }).then(function (r) {
      if (r.ok) return { ok: true };
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 429) return { ok: false, msg: "Too many tries from here. Please wait a few minutes and try again." };
        var d = j && j.detail;
        return { ok: false, msg: (d && d.message) || "That didn't work. Please check the address and try again." };
      });
    }).catch(function () {
      return { ok: false, msg: "We couldn't reach the list just now. Email " + FALLBACK + " and we'll add you by hand." };
    });
  }

  function submitInto(form, interest, source, status, onDone) {
    var input = form.querySelector('input[type="email"]');
    var trap = form.querySelector('input[name="company"]');
    var btn = form.querySelector('button[type="submit"], button:not([type])');
    var email = (input.value || "").trim();
    status.className = "signup-status";
    if (!EMAIL_RE.test(email)) {
      status.textContent = "Please enter a valid email address.";
      status.classList.add("err");
      input.focus();
      return;
    }
    if (btn) { btn.disabled = true; }
    status.textContent = "Adding you…";
    send(email, interest, source, trap && trap.value).then(function (res) {
      if (btn) { btn.disabled = false; }
      if (res.ok) {
        store("signup:" + interest, "1");
        onDone(email);
      } else {
        status.textContent = res.msg;
        status.classList.add("err");
      }
    });
  }

  // ---------- Dialog ----------
  var dlg, dlgForm, dlgTitle, dlgBody, dlgStatus, dlgBtn, dlgDone, current = {};

  function buildDialog() {
    dlg = document.createElement("dialog");
    dlg.className = "signup-dialog";
    dlg.setAttribute("aria-labelledby", "signup-title");
    dlg.innerHTML =
      '<button type="button" class="signup-close" aria-label="Close">&times;</button>' +
      '<h2 id="signup-title"></h2>' +
      '<p class="signup-body"></p>' +
      '<form class="signup-form" novalidate>' +
        '<label class="signup-label" for="signup-email">Email address</label>' +
        '<div class="signup-row">' +
          '<input id="signup-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>' +
          '<button type="submit" class="btn btn-primary"></button>' +
        '</div>' +
        '<input type="text" name="company" tabindex="-1" autocomplete="off" class="signup-trap" aria-hidden="true">' +
        '<p class="signup-status" role="status" aria-live="polite"></p>' +
        '<p class="signup-fine">We only use your email for these updates. See our <a href="' + PRIVACY + '">Privacy Policy</a>.</p>' +
      '</form>' +
      '<p class="signup-done" hidden></p>';
    document.body.appendChild(dlg);
    dlgForm = dlg.querySelector("form");
    dlgTitle = dlg.querySelector("h2");
    dlgBody = dlg.querySelector(".signup-body");
    dlgStatus = dlg.querySelector(".signup-status");
    dlgBtn = dlg.querySelector('button[type="submit"]');
    dlgDone = dlg.querySelector(".signup-done");
    dlg.querySelector(".signup-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlgForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submitInto(dlgForm, current.interest, current.source, dlgStatus, function () {
        dlgForm.hidden = true;
        dlgDone.hidden = false;
        dlgDone.textContent = COPY[current.interest].done;
        markJoined();
      });
    });
  }

  function openDialog(interest, source) {
    if (!COPY[interest]) interest = "updates";
    if (!dlg) buildDialog();
    current = { interest: interest, source: source || "unknown" };
    var c = COPY[interest];
    dlgTitle.textContent = c.title;
    dlgBody.textContent = c.body;
    dlgBtn.textContent = c.button;
    dlgStatus.textContent = "";
    dlgStatus.className = "signup-status";
    dlgForm.hidden = false;
    dlgDone.hidden = true;
    if (typeof dlg.showModal === "function") { dlg.showModal(); } else { dlg.setAttribute("open", ""); }
    setTimeout(function () { var i = dlg.querySelector("input[type=email]"); if (i) i.focus(); }, 30);
  }

  // Buttons that already led to a signup on this device say so.
  function markJoined() {
    var nodes = document.querySelectorAll("[data-signup][data-joined-label]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (store("signup:" + (el.getAttribute("data-interest") || "updates")) === "1") {
        var lbl = el.querySelector("[data-signup-label]");
        if (lbl) lbl.textContent = el.getAttribute("data-joined-label");
      }
    }
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-signup]") : null;
    if (!el) return;
    e.preventDefault();
    openDialog(el.getAttribute("data-interest") || "updates", el.getAttribute("data-source"));
  });

  // ---------- Inline forms ----------
  var forms = document.querySelectorAll("form[data-signup-form]");
  for (var i = 0; i < forms.length; i++) {
    (function (form) {
      var status = form.querySelector(".signup-status");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var interest = form.getAttribute("data-interest") || "updates";
        submitInto(form, interest, form.getAttribute("data-source") || "unknown", status, function () {
          form.classList.add("is-done");
          status.className = "signup-status ok";
          status.textContent = (COPY[interest] || COPY.updates).done;
          var input = form.querySelector('input[type="email"]');
          if (input) input.value = "";
        });
      });
    })(forms[i]);
  }

  markJoined();
})();
