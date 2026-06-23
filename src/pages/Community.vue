<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useCommunityStore } from "../stores/community";
import { getScamAlerts } from "../modules/scam-alerts/service";
import { getHiddenGems } from "../modules/hidden-gems/service";
import { getFriendlyErrorMessage } from "../core/errors";

const router = useRouter();
const authStore = useAuthStore();
const communityStore = useCommunityStore();

const destinationInput = ref("Goa");
const postText = ref("");
const postTags = ref("crowd, food");
const commentDrafts = ref({});
const reviewTitle = ref("");
const reviewBody = ref("");
const reviewRating = ref(4);
const reviewCostLevel = ref("moderate");
const reviewVisitType = ref("solo");

const loading = ref(true);
const loadingInsights = ref(false);
const uiMessage = ref({ type: "", text: "" });
const pageError = ref("");
const scamPreview = ref(null);
const hiddenGemsPreview = ref(null);

const posts = computed(() => communityStore.posts);
const reviews = computed(() => communityStore.reviews);
const pulse = computed(() => communityStore.pulse);

const scamRiskClass = computed(() => {
  const level = String(scamPreview.value?.level || "").toLowerCase();
  if (level === "high") return "status-high";
  if (level === "moderate") return "status-medium";
  return "status-low";
});

function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - Number(timestamp || Date.now());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function showMessage(type, text) {
  uiMessage.value = {
    type,
    text: String(text || "").trim()
  };

  window.setTimeout(() => {
    uiMessage.value = { type: "", text: "" };
  }, 2400);
}

async function loadCommunityData() {
  const destination = String(destinationInput.value || "").trim() || "Global";
  loading.value = true;
  pageError.value = "";

  try {
    communityStore.loadForDestination(destination);
    await loadPhaseThreeInsights(destination);
  } catch (error) {
    pageError.value = getFriendlyErrorMessage(error, "Unable to load community feed right now.");
  } finally {
    loading.value = false;
  }
}

async function loadPhaseThreeInsights(destination) {
  loadingInsights.value = true;

  try {
    const [scamData, gemsData] = await Promise.all([
      getScamAlerts({
        destinationName: destination,
        destinationLocation: destination,
        travelMode: "general",
        timeBand: "auto"
      }),
      getHiddenGems({
        destinationName: destination,
        destinationLocation: destination,
        budgetPreference: "balanced",
        crowdPreference: "low",
        limit: 3
      })
    ]);

    scamPreview.value = scamData;
    hiddenGemsPreview.value = gemsData;
  } catch (_error) {
    scamPreview.value = null;
    hiddenGemsPreview.value = null;
  } finally {
    loadingInsights.value = false;
  }
}

function createPost() {
  const destination = String(destinationInput.value || "").trim() || "Global";
  if (!postText.value.trim()) {
    showMessage("error", "Post text is required.");
    return;
  }

  try {
    communityStore.createPost({
      destination,
      text: postText.value,
      tags: postTags.value,
      user: authStore.user
    });

    postText.value = "";
    showMessage("success", "Post published.");
  } catch (error) {
    showMessage("error", getFriendlyErrorMessage(error, "Unable to publish post right now."));
  }
}

function toggleLike(postId) {
  try {
    communityStore.toggleLikeOnPost({
      postId,
      userId: authStore.user?.uid
    });
  } catch (error) {
    showMessage("error", getFriendlyErrorMessage(error, "Unable to update reaction right now."));
  }
}

function addComment(postId) {
  const content = String(commentDrafts.value[postId] || "").trim();
  if (!content) {
    return;
  }

  try {
    communityStore.commentOnPost({
      postId,
      text: content,
      user: authStore.user
    });

    commentDrafts.value = {
      ...commentDrafts.value,
      [postId]: ""
    };
  } catch (error) {
    showMessage("error", getFriendlyErrorMessage(error, "Unable to add comment right now."));
  }
}

function submitReview() {
  const destination = String(destinationInput.value || "").trim() || "Global";
  if (!reviewTitle.value.trim() || !reviewBody.value.trim()) {
    showMessage("error", "Review title and details are required.");
    return;
  }

  try {
    communityStore.createReview({
      destination,
      rating: reviewRating.value,
      title: reviewTitle.value,
      body: reviewBody.value,
      costLevel: reviewCostLevel.value,
      visitType: reviewVisitType.value,
      user: authStore.user
    });

    reviewTitle.value = "";
    reviewBody.value = "";
    reviewRating.value = 4;
    reviewCostLevel.value = "moderate";
    reviewVisitType.value = "solo";
    showMessage("success", "Review submitted.");
  } catch (error) {
    showMessage("error", getFriendlyErrorMessage(error, "Unable to submit review right now."));
  }
}

function toggleHelpful(reviewId) {
  try {
    communityStore.toggleReviewHelpfulVote({
      reviewId,
      userId: authStore.user?.uid
    });
  } catch (error) {
    showMessage("error", getFriendlyErrorMessage(error, "Unable to update helpful vote right now."));
  }
}

onMounted(async () => {
  await authStore.initAuth();

  if (!authStore.user?.uid) {
    router.replace({ path: "/login", query: { redirect: "/community" } });
    return;
  }

  communityStore.initForUser(authStore.user);
  await loadCommunityData();
});
</script>

<template>
  <div class="community-page container animate-fade-in" style="padding-top: 100px;">
    <section class="community-hero glass-card">
      <div>
        <span class="hero-badge">PHASE 3 COMMUNITY</span>
        <h1>Community Intelligence Hub</h1>
        <p>Share verified tips, learn from real traveler reviews, and track destination scam pressure before you plan.</p>
      </div>
      <div class="hero-controls">
        <input v-model="destinationInput" class="form-input" placeholder="Destination, e.g. Goa" />
        <button type="button" class="btn btn-outline" :disabled="loading" @click="loadCommunityData">Refresh</button>
      </div>
    </section>

    <div v-if="uiMessage.text" class="status-msg mt-4" :class="uiMessage.type">
      {{ uiMessage.text }}
    </div>

    <section v-if="pageError" class="glass-card panel-error mt-6">
      <h3>Community Feed Unavailable</h3>
      <p>{{ pageError }}</p>
      <button type="button" class="btn btn-primary mt-4" @click="loadCommunityData">Retry</button>
    </section>

    <template v-else>
      <section class="pulse-grid mt-6">
        <article class="glass-card pulse-card">
          <h3>Destination Pulse</h3>
          <ul>
            <li>Destination: {{ pulse?.destination || destinationInput }}</li>
            <li>Total Posts: {{ pulse?.totalPosts || 0 }}</li>
            <li>Total Reviews: {{ pulse?.totalReviews || 0 }}</li>
            <li>Avg Rating: {{ pulse?.avgRating || "N/A" }}</li>
            <li>Top Tags: {{ (pulse?.topTags || []).join(" | ") || "No tags yet" }}</li>
          </ul>
        </article>

        <article class="glass-card pulse-card">
          <h3>Live Scam Watch</h3>
          <div v-if="loadingInsights" class="panel-empty mt-3">
            <p>Refreshing live scam signals...</p>
          </div>
          <template v-else-if="scamPreview">
            <div class="risk-head mt-2">
              <span class="risk-pill" :class="scamRiskClass">{{ scamPreview.level }} Risk</span>
              <span class="risk-score">{{ scamPreview.riskScore }}/100</span>
            </div>
            <ul class="mt-3">
              <li v-for="alert in (scamPreview.alerts || []).slice(0, 3)" :key="alert.id">
                <strong>{{ alert.title }}</strong> - {{ alert.hotspot }}
              </li>
            </ul>
          </template>
          <div v-else class="panel-empty mt-3">
            <p>Scam watch data unavailable for this destination.</p>
          </div>
        </article>

        <article class="glass-card pulse-card">
          <h3>Hidden Gems Snapshot</h3>
          <div v-if="loadingInsights" class="panel-empty mt-3">
            <p>Collecting hidden gems...</p>
          </div>
          <ul v-else-if="hiddenGemsPreview?.gems?.length" class="mt-3">
            <li v-for="gem in hiddenGemsPreview.gems" :key="gem.id">
              <strong>{{ gem.name }}</strong> - {{ gem.relevanceScore }}/100
            </li>
          </ul>
          <div v-else class="panel-empty mt-3">
            <p>No hidden gem signal available.</p>
          </div>
        </article>
      </section>

      <section class="community-grid mt-6">
        <article class="glass-card composer-card">
          <h3>Publish Community Post</h3>
          <textarea
            v-model="postText"
            class="form-input mt-3"
            rows="4"
            placeholder="Share practical tip: crowd-safe windows, transport hacks, safe zones..."
          ></textarea>
          <input v-model="postTags" class="form-input mt-2" placeholder="Tags (comma separated), e.g. crowd,safety,budget" />
          <button type="button" class="btn btn-primary mt-3" @click="createPost">Publish Post</button>

          <h3 class="mt-6">Submit Review</h3>
          <input v-model="reviewTitle" class="form-input mt-3" placeholder="Review title" />
          <textarea
            v-model="reviewBody"
            class="form-input mt-2"
            rows="4"
            placeholder="Write experience and actionable recommendations"
          ></textarea>

          <div class="review-grid mt-2">
            <label>
              <span>Rating</span>
              <select v-model.number="reviewRating" class="form-select">
                <option :value="5">5</option>
                <option :value="4">4</option>
                <option :value="3">3</option>
                <option :value="2">2</option>
                <option :value="1">1</option>
              </select>
            </label>
            <label>
              <span>Cost Level</span>
              <select v-model="reviewCostLevel" class="form-select">
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              <span>Visit Type</span>
              <select v-model="reviewVisitType" class="form-select">
                <option value="solo">Solo</option>
                <option value="friends">Friends</option>
                <option value="family">Family</option>
                <option value="couple">Couple</option>
              </select>
            </label>
          </div>

          <button type="button" class="btn btn-primary mt-3" @click="submitReview">Submit Review</button>
        </article>

        <article class="glass-card feed-card">
          <h3>Community Posts</h3>
          <div v-if="loading" class="panel-empty mt-3">
            <p>Loading posts...</p>
          </div>

          <div v-else-if="!posts.length" class="panel-empty mt-3">
            <p>No posts yet for this destination.</p>
          </div>

          <div v-else class="feed-list mt-3">
            <article v-for="post in posts" :key="post.id" class="feed-item">
              <div class="feed-head">
                <strong>{{ post.authorName }}</strong>
                <small>{{ formatRelativeTime(post.createdAt) }}</small>
              </div>
              <p class="feed-text">{{ post.text }}</p>
              <p class="feed-tags" v-if="post.tags?.length">#{{ post.tags.join(" #") }}</p>

              <div class="feed-actions">
                <button type="button" class="btn btn-outline btn-xs" @click="toggleLike(post.id)">
                  Helpful {{ post.likesBy?.length || 0 }}
                </button>
              </div>

              <div class="comment-block mt-2">
                <input
                  v-model="commentDrafts[post.id]"
                  class="form-input"
                  placeholder="Add comment"
                />
                <button type="button" class="btn btn-outline btn-xs" @click="addComment(post.id)">Comment</button>
              </div>

              <ul v-if="post.comments?.length" class="comment-list mt-2">
                <li v-for="comment in post.comments" :key="comment.id">
                  <strong>{{ comment.authorName }}</strong>: {{ comment.text }}
                </li>
              </ul>
            </article>
          </div>
        </article>

        <article class="glass-card feed-card">
          <h3>Destination Reviews</h3>
          <div v-if="loading" class="panel-empty mt-3">
            <p>Loading reviews...</p>
          </div>

          <div v-else-if="!reviews.length" class="panel-empty mt-3">
            <p>No reviews yet for this destination.</p>
          </div>

          <div v-else class="feed-list mt-3">
            <article v-for="review in reviews" :key="review.id" class="feed-item">
              <div class="feed-head">
                <strong>{{ review.title }}</strong>
                <small>{{ review.rating }}/5</small>
              </div>
              <p class="feed-text">{{ review.body }}</p>
              <p class="feed-meta">{{ review.authorName }} | {{ review.costLevel }} | {{ review.visitType }} | {{ formatRelativeTime(review.createdAt) }}</p>
              <button type="button" class="btn btn-outline btn-xs" @click="toggleHelpful(review.id)">
                Helpful {{ review.helpfulBy?.length || 0 }}
              </button>
            </article>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.community-page {
  display: flex;
  flex-direction: column;
}

.community-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
}

.community-hero h1 {
  margin-top: 8px;
  font-size: clamp(1.5rem, 2.8vw, 2rem);
}

.community-hero p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  max-width: 720px;
}

.hero-badge {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: #1e3a8a;
  font-weight: 800;
}

.hero-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 280px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-4 {
  margin-top: 16px;
}

.mt-6 {
  margin-top: 24px;
}

.status-msg {
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 0.84rem;
  font-weight: 700;
}

.status-msg.success {
  border: 1px solid rgba(5, 150, 105, 0.3);
  background: rgba(209, 250, 229, 0.64);
  color: #047857;
}

.status-msg.error {
  border: 1px solid rgba(220, 38, 38, 0.3);
  background: rgba(254, 226, 226, 0.72);
  color: #b91c1c;
}

.pulse-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.pulse-card {
  padding: 16px;
}

.pulse-card h3 {
  font-size: 0.94rem;
}

.pulse-card ul {
  margin-top: 10px;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pulse-card li {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.risk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.risk-pill {
  border-radius: var(--radius-full);
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
}

.risk-pill.status-high {
  color: #991b1b;
  background: rgba(254, 202, 202, 0.8);
  border: 1px solid rgba(220, 38, 38, 0.35);
}

.risk-pill.status-medium {
  color: #92400e;
  background: rgba(254, 243, 199, 0.82);
  border: 1px solid rgba(245, 158, 11, 0.34);
}

.risk-pill.status-low {
  color: #047857;
  background: rgba(209, 250, 229, 0.76);
  border: 1px solid rgba(5, 150, 105, 0.35);
}

.risk-score {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
  font-weight: 700;
}

.community-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr;
  gap: 12px;
}

.composer-card,
.feed-card {
  padding: 16px;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.review-grid label {
  display: grid;
  gap: 6px;
}

.review-grid span {
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.feed-list {
  display: grid;
  gap: 10px;
}

.feed-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  padding: 10px;
}

.feed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.feed-head small {
  color: var(--color-text-muted);
  font-size: 0.74rem;
}

.feed-text {
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  line-height: 1.45;
}

.feed-tags,
.feed-meta {
  margin-top: 6px;
  color: var(--color-text-muted);
  font-size: 0.72rem;
}

.feed-actions {
  margin-top: 8px;
}

.comment-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-list {
  list-style: none;
  display: grid;
  gap: 6px;
}

.comment-list li {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.panel-error,
.panel-empty {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  background: #ffffff;
}

.panel-error p,
.panel-empty p {
  color: var(--color-text-secondary);
}

@media (max-width: 1100px) {
  .pulse-grid {
    grid-template-columns: 1fr;
  }

  .community-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .community-hero {
    flex-direction: column;
  }

  .hero-controls {
    width: 100%;
    min-width: 0;
  }

  .review-grid {
    grid-template-columns: 1fr;
  }

  .comment-block {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
