---
layout: default
title: Talk Notifications
permalink: /notifications/
---

<section class="wrap section">
<h1 class="page-title">Talk Notifications</h1>

<p class="page-lead">We will advertise the talks using CSE department mailing
lists. If you're not in CSE and would like to receive announcements, click
below.</p>

<div class="signup" id="signup"
     data-client-id="{{ site.data.course.notifications.client_id }}"
     data-endpoint="{{ site.data.course.notifications.endpoint }}">
  <p class="signup__lead" id="signup-lead">Sign in with Google so we know where to
  send them. We use the address on your Google account, so there is nothing to type
  and nothing to confirm by email.</p>

  <div id="signup-button"></div>

  <noscript>
    <p class="signup__lead">This page needs JavaScript to sign you in. If you would
    rather not enable it, email the organizers and we will add you by hand.</p>
  </noscript>
</div>

<p class="notice notice--ok is-hidden" id="notice" role="status"></p>
<p class="notice notice--bad is-hidden" id="error" role="alert"></p>

<div class="prose">
<p class="page-aside">Signing in tells us your email address and nothing else. We
use the address only for notifications about this series, and removing yourself
deletes it from our list rather than just flagging it.</p>
</div>

</section>

<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="{{ '/assets/js/notifications.js' | relative_url }}" defer></script>
