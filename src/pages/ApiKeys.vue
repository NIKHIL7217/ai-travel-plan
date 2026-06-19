<template>
  <div class="support-page container animate-fade-in" style="padding-top: 100px;">
    <div class="support-header">
      <span class="badge">API KEYS</span>
      <h1>API Configuration Guide</h1>
      <p>Configure required environment variables to enable live AI and location intelligence.</p>
    </div>

    <section class="api-card glass-card mt-6">
      <h3>Required for Live AI</h3>
      <pre class="env-block">VITE_GEMINI_API_KEY=your_key_here</pre>

      <h3 class="mt-5">Optional Integrations</h3>
      <pre class="env-block">VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_OPENWEATHER_API_KEY=your_key_here
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_value
VITE_FIREBASE_PROJECT_ID=your_value
VITE_FIREBASE_STORAGE_BUCKET=your_value
VITE_FIREBASE_MESSAGING_SENDER_ID=your_value
VITE_FIREBASE_APP_ID=your_value</pre>

      <h3 class="mt-5">Notes</h3>
      <ul>
        <li>Add variables in root .env file.</li>
        <li>Restart dev server after key updates.</li>
        <li>Never commit real secrets to git.</li>
      </ul>
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

.api-card {
  padding: 20px;
}

.env-block {
  margin-top: 8px;
  margin-bottom: 12px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: var(--radius-md);
  padding: 12px;
  white-space: pre-wrap;
  font-size: 0.85rem;
  line-height: 1.6;
}

.api-card ul {
  margin-top: 8px;
  padding-left: 18px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.mt-6 {
  margin-top: 24px;
}

.mt-5 {
  margin-top: 20px;
}
</style>
