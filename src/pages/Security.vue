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

<style scoped>
.support-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 32px;
}

.support-header h1 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin: 8px 0;
}

.support-header p {
  color: var(--color-text-secondary);
}

.badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.security-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.security-card {
  padding: 18px;
}

.security-card p {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
}

.mt-6 {
  margin-top: 24px;
}

@media (max-width: 860px) {
  .security-list {
    grid-template-columns: 1fr;
  }
}
</style>
