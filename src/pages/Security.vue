<template>
  <div class="support-page container animate-fade-in" style="padding-top: 100px;">
    <div class="support-header">
      <span class="badge">SECURITY</span>
      <h1>Security and Privacy</h1>
      <p>How AI Travel Planner handles keys, account sessions, and saved trip data.</p>
    </div>

    <section class="security-list mt-6">
      <article class="security-card glass-card">
        <h3>API Keys</h3>
        <p>Use environment variables for all keys. Never expose secrets in code or public repositories.</p>
      </article>

      <article class="security-card glass-card">
        <h3>User Authentication</h3>
        <p>Account sessions are mapped to each user profile. Saved plans are scoped by user identity.</p>
      </article>

      <article class="security-card glass-card">
        <h3>Data Scope</h3>
        <p>Live features use geolocation and public APIs for route and weather context. Disable location access any time from your browser settings.</p>
      </article>

      <article class="security-card glass-card">
        <h3>Recommended Setup</h3>
        <p>Keep .env files out of git, rotate API keys periodically, and use least-privilege API restrictions where possible.</p>
      </article>
    </section>
  </div>
</template>

<style scoped src="./styles/Security.css"></style>
