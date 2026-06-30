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

<style scoped src="./styles/ApiKeys.css"></style>
