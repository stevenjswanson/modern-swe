/**
 * Talk-notification sign-up (/notifications/).
 *
 * Apps Script will not tell a script who a visitor is unless that visitor is
 * inside the ucsd.edu Workspace, so a Gmail user signing in there is anonymous as
 * far as the server is concerned. This page therefore signs the visitor in with
 * Google directly: the browser receives an ID token — a JWT signed by Google that
 * states a verified email address — and posts it to the Apps Script endpoint,
 * which checks it with Google before writing anything.
 *
 * That is what buys us one-click sign-up with no confirmation email, for any
 * Google account. The address is never typed and never taken from this page.
 *
 * Configure both values in _data/course.yml; until they are set the page says so
 * rather than failing silently.
 */
(function () {
  'use strict';

  var root = document.getElementById('signup');
  if (!root) return;

  var clientId = (root.getAttribute('data-client-id') || '').trim();
  var endpoint = (root.getAttribute('data-endpoint') || '').trim();

  var leadEl = document.getElementById('signup-lead');
  var buttonEl = document.getElementById('signup-button');
  var noticeEl = document.getElementById('notice');
  var errorEl = document.getElementById('error');

  var idToken = null;      // held only in memory, for the length of the visit
  var busy = false;

  function show(el, message) {
    el.textContent = message;
    el.classList.remove('is-hidden');
  }
  function hide(el) {
    el.textContent = '';
    el.classList.add('is-hidden');
  }
  function clearMessages() { hide(noticeEl); hide(errorEl); }

  function setLead(text) { leadEl.textContent = text; }

  if (!clientId || !endpoint) {
    setLead('Sign-up is not configured yet. Please email the organizers and they ' +
            'will add you to the list by hand.');
    return;
  }

  /** POST as text/plain so the browser sends no CORS preflight. */
  function send(action) {
    busy = true;
    clearMessages();
    return fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: action, idToken: idToken })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        busy = false;
        if (!data || data.ok !== true) {
          throw new Error((data && data.error) || 'Something went wrong.');
        }
        return data;
      })
      .catch(function (err) {
        busy = false;
        show(errorEl, err && err.message ? err.message : 'Something went wrong. Please try again.');
        throw err;
      });
  }

  function renderState(data) {
    buttonEl.textContent = '';

    var action = document.createElement('button');
    action.type = 'button';

    if (data.subscribed) {
      setLead('You are on the list. We will email ' + data.email +
              ' before each talk in this series.');
      action.className = 'signup__action signup__action--quiet';
      action.textContent = 'Take me off the list';
      action.addEventListener('click', function () {
        if (busy) return;
        action.disabled = true;
        send('unsubscribe').then(function (next) {
          renderState(next);
          if (next.notice) show(noticeEl, next.notice);
        }, function () { action.disabled = false; });
      });
    } else {
      setLead('Click below to receive notifications about future talks in this ' +
              'series at ' + data.email + '.');
      action.className = 'signup__action';
      action.textContent = 'Yes, email me about future talks';
      action.addEventListener('click', function () {
        if (busy) return;
        action.disabled = true;
        send('subscribe').then(function (next) {
          renderState(next);
          if (next.notice) show(noticeEl, next.notice);
        }, function () { action.disabled = false; });
      });
    }

    buttonEl.appendChild(action);
  }

  /** Google hands us the signed token here. */
  window.handleNotificationSignIn = function (response) {
    idToken = response && response.credential;
    if (!idToken) {
      show(errorEl, 'That sign-in did not complete. Please try again.');
      return;
    }
    setLead('Checking your account…');
    send('status').then(renderState, function () {
      setLead('Sign in with Google so we know where to send them.');
      renderGoogleButton();
    });
  };

  function renderGoogleButton() {
    if (!window.google || !google.accounts || !google.accounts.id) return false;
    buttonEl.textContent = '';
    google.accounts.id.initialize({
      client_id: clientId,
      callback: window.handleNotificationSignIn,
      ux_mode: 'popup',
      auto_select: false
    });
    google.accounts.id.renderButton(buttonEl, {
      theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill'
    });
    return true;
  }

  // The Google script loads async; wait for it rather than racing it.
  var tries = 0;
  (function waitForGoogle() {
    if (renderGoogleButton()) return;
    if (++tries > 60) {
      setLead('Google sign-in could not be loaded. If you block third-party ' +
              'scripts, email the organizers and we will add you by hand.');
      return;
    }
    setTimeout(waitForGoogle, 250);
  })();
})();
