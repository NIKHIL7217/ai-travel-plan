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
const feedTab = ref("posts");
const composerMode = ref("tip");
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

const posts = computed(() => communityStore.posts || []);
const reviews = computed(() => communityStore.reviews || []);
const pulse = computed(() => communityStore.pulse || null);

const trendingTags = computed(() => {
  const scores = new Map();
  for (const post of posts.value) {
    for (const tag of post.tags || []) {
      const clean = String(tag || "").trim();
      if (!clean) continue;
      scores.set(clean, (scores.get(clean) || 0) + 1);
    }
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
});

const reviewBuckets = computed(() => {
  const buckets = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: 0
  }));

  for (const review of reviews.value) {
    const rating = Math.max(1, Math.min(5, Number(review.rating || 0)));
    const bucket = buckets.find((item) => item.rating === rating);
    if (bucket) {
      bucket.count += 1;
    }
  }

  const total = reviews.value.length || 1;
  return buckets.map((bucket) => ({
    ...bucket,
    percentage: Math.round((bucket.count / total) * 100)
  }));
});

const topContributors = computed(() => {
  const score = new Map();

  for (const post of posts.value) {
    const name = String(post.authorName || "Traveler").trim() || "Traveler";
    score.set(name, (score.get(name) || 0) + 1);
  }

  for (const review of reviews.value) {
    const name = String(review.authorName || "Traveler").trim() || "Traveler";
    score.set(name, (score.get(name) || 0) + 2);
  }

  return [...score.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([name, points]) => ({ name, points }));
});

const scamRiskClass = computed(() => {
  const level = String(scamPreview.value?.level || "").toLowerCase();
  if (level === "high") return "status-high";
  if (level === "moderate") return "status-medium";
  return "status-low";
});

const averageReview = computed(() => {
  if (!reviews.value.length) {
    return 0;
  }

  const total = reviews.value.reduce((sum, row) => sum + Number(row.rating || 0), 0);
  return Number((total / reviews.value.length).toFixed(1));
});

function mediaForPost(post) {
  const destination = String(destinationInput.value || "travel").trim() || "travel";
  const seed = String(post?.id || post?.text || destination);
  const theme = (post?.tags || []).slice(0, 2).join(" ") || "travel stories";
  return `https://source.unsplash.com/1200x900/?${encodeURIComponent(`${destination} ${theme} ${seed}`)}`;
}

function mediaForReview(review) {
  const destination = String(destinationInput.value || "travel").trim() || "travel";
  const theme = `${review?.visitType || "trip"} ${review?.costLevel || "moderate"}`;
  return `https://source.unsplash.com/1200x900/?${encodeURIComponent(`${destination} ${theme} travel`)}`;
}

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
  }, 2600);
}

async function loadCommunityData() {
  const destination = String(destinationInput.value || "").trim() || "Global";
  loading.value = true;
  pageError.value = "";

  try {
    communityStore.loadForDestination(destination);
    await loadDestinationInsights(destination);
  } catch (error) {
    pageError.value = getFriendlyErrorMessage(error, "Unable to load community feed right now.");
  } finally {
    loading.value = false;
  }
}

async function loadDestinationInsights(destination) {
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
        limit: 4
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
    feedTab.value = "posts";
    composerMode.value = "tip";
    showMessage("success", "Tip published to feed.");
  } catch (error) {
    showMessage("error", getFriendlyErrorMessage(error, "Unable to publish tip right now."));
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
    feedTab.value = "reviews";
    composerMode.value = "review";
    showMessage("success", "Review shared.");
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

function openPlanner() {
  const destination = String(destinationInput.value || "").trim();
  router.push({ path: "/planner", query: destination ? { destination } : undefined });
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
      <div class="hero-main">
        <span class="hero-badge">TRAVEL COMMUNITY</span>
        <h1>Community Intelligence Hub</h1>
        <p>Destination-first traveler insights: practical tips, trusted reviews, safety watch, and hidden local finds in one focused feed.</p>
        <div class="hero-stats-row">
          <article class="hero-stat">
            <span>Posts</span>
            <strong>{{ pulse?.totalPosts || 0 }}</strong>
          </article>
          <article class="hero-stat">
            <span>Reviews</span>
            <strong>{{ pulse?.totalReviews || 0 }}</strong>
          </article>
          <article class="hero-stat">
            <span>Avg Rating</span>
            <strong>{{ averageReview || pulse?.avgRating || 0 }}</strong>
          </article>
          <article class="hero-stat">
            <span>Contributors</span>
            <strong>{{ topContributors.length }}</strong>
          </article>
        </div>
      </div>

      <div class="hero-controls">
        <label class="control-label" for="community-destination">Destination Focus</label>
        <input id="community-destination" v-model="destinationInput" class="form-input" placeholder="Destination, e.g. Goa" />
        <div class="hero-actions">
          <button type="button" class="btn btn-outline" :disabled="loading" @click="loadCommunityData">Refresh Feed</button>
          <button type="button" class="btn btn-primary" @click="openPlanner">Plan This Place</button>
        </div>
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

    <section v-else class="community-workspace mt-6">
      <main class="workspace-main">
        <article class="glass-card composer-card">
          <div class="composer-head">
            <div>
              <span class="stream-label">Contribute</span>
              <h3>Share For {{ destinationInput || "This Destination" }}</h3>
              <p>Tip is for quick practical intel. Review is for full structured trip feedback.</p>
            </div>
            <div class="composer-switcher">
              <button
                type="button"
                class="btn btn-outline btn-xs"
                :class="{ active: composerMode === 'tip' }"
                @click="composerMode = 'tip'"
              >
                Share Tip
              </button>
              <button
                type="button"
                class="btn btn-outline btn-xs"
                :class="{ active: composerMode === 'review' }"
                @click="composerMode = 'review'"
              >
                Write Review
              </button>
            </div>
          </div>

          <div v-if="composerMode === 'tip'" class="composer-body mt-3">
            <textarea
              v-model="postText"
              class="form-input"
              rows="4"
              placeholder="Share practical intel: crowd windows, food hacks, safe routes, hidden corners."
            ></textarea>
            <input v-model="postTags" class="form-input mt-2" placeholder="Tags, e.g. crowd,safety,budget" />
            <div class="composer-actions mt-3">
              <button type="button" class="btn btn-primary" @click="createPost">Publish Tip</button>
            </div>
          </div>

          <div v-else class="composer-body mt-3">
            <input v-model="reviewTitle" class="form-input" placeholder="Review title" />
            <textarea
              v-model="reviewBody"
              class="form-input mt-2"
              rows="4"
              placeholder="Tell travelers what worked, what to avoid, and where to go."
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
                <span>Cost</span>
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

            <div class="composer-actions mt-3">
              <button type="button" class="btn btn-primary" @click="submitReview">Submit Review</button>
            </div>
          </div>
        </article>

        <article class="glass-card stream-head-card mt-4">
          <div>
            <span class="stream-label">Live Stream</span>
            <h2>{{ destinationInput }} Feed</h2>
          </div>
          <div class="feed-switcher">
            <button type="button" class="btn btn-outline btn-xs" :class="{ active: feedTab === 'posts' }" @click="feedTab = 'posts'">
              Tips ({{ posts.length }})
            </button>
            <button type="button" class="btn btn-outline btn-xs" :class="{ active: feedTab === 'reviews' }" @click="feedTab = 'reviews'">
              Reviews ({{ reviews.length }})
            </button>
          </div>
        </article>

        <article v-if="loading" class="glass-card feed-placeholder mt-4">
          <p>Loading live community stream...</p>
        </article>

        <template v-else>
          <article v-if="feedTab === 'posts' && posts.length === 0" class="glass-card feed-placeholder mt-4">
            <p>No tips yet. Share the first community intel.</p>
          </article>

          <div v-if="feedTab === 'posts'" class="feed-list mt-4">
            <article v-for="post in posts" :key="post.id" class="glass-card feed-item">
              <img :src="mediaForPost(post)" :alt="post.authorName" class="feed-media" loading="lazy" />
              <div class="feed-head">
                <div>
                  <strong>{{ post.authorName }}</strong>
                  <small>{{ formatRelativeTime(post.createdAt) }}</small>
                </div>
                <button type="button" class="btn btn-outline btn-xs" @click="toggleLike(post.id)">
                  Helpful {{ post.likesBy?.length || 0 }}
                </button>
              </div>

              <p class="feed-text mt-3">{{ post.text }}</p>
              <p class="feed-tags" v-if="post.tags?.length">#{{ post.tags.join(" #") }}</p>

              <div class="comment-box mt-3">
                <input v-model="commentDrafts[post.id]" class="form-input" placeholder="Reply with your tip" />
                <button type="button" class="btn btn-outline btn-xs" @click="addComment(post.id)">Comment</button>
              </div>

              <ul v-if="post.comments?.length" class="comment-list mt-3">
                <li v-for="comment in post.comments" :key="comment.id">
                  <strong>{{ comment.authorName }}</strong>
                  <span>{{ comment.text }}</span>
                </li>
              </ul>
            </article>
          </div>

          <article v-if="feedTab === 'reviews' && reviews.length === 0" class="glass-card feed-placeholder mt-4">
            <p>No reviews yet. Share the first destination review.</p>
          </article>

          <div v-if="feedTab === 'reviews'" class="feed-list mt-4">
            <article v-for="review in reviews" :key="review.id" class="glass-card feed-item">
              <img :src="mediaForReview(review)" :alt="review.title" class="feed-media" loading="lazy" />
              <div class="feed-head">
                <div>
                  <strong>{{ review.title }}</strong>
                  <small>{{ review.rating }}/5</small>
                </div>
                <button type="button" class="btn btn-outline btn-xs" @click="toggleHelpful(review.id)">
                  Helpful {{ review.helpfulBy?.length || 0 }}
                </button>
              </div>

              <p class="feed-text mt-3">{{ review.body }}</p>
              <p class="feed-meta">{{ review.authorName }} | {{ review.costLevel }} | {{ review.visitType }} | {{ formatRelativeTime(review.createdAt) }}</p>
            </article>
          </div>
        </template>
      </main>

      <aside class="workspace-side">
        <article class="glass-card signal-card">
          <h3>Scam Watch</h3>
          <div v-if="loadingInsights" class="panel-empty mt-3">Refreshing safety signal...</div>
          <template v-else-if="scamPreview">
            <div class="risk-row mt-3">
              <span class="risk-pill" :class="scamRiskClass">{{ scamPreview.level }} Risk</span>
              <small>{{ scamPreview.riskScore }}/100</small>
            </div>
            <ul class="insight-list mt-3">
              <li v-for="alert in (scamPreview.alerts || []).slice(0, 3)" :key="alert.id">
                <strong>{{ alert.title }}</strong>
                <span>{{ alert.hotspot }}</span>
              </li>
            </ul>
          </template>
          <div v-else class="panel-empty mt-3">Safety signal unavailable.</div>
        </article>

        <article class="glass-card signal-card mt-4">
          <h3>Hidden Gems</h3>
          <div v-if="loadingInsights" class="panel-empty mt-3">Collecting gems...</div>
          <ul v-else-if="hiddenGemsPreview?.gems?.length" class="insight-list mt-3">
            <li v-for="gem in hiddenGemsPreview.gems" :key="gem.id">
              <strong>{{ gem.name }}</strong>
              <span>{{ gem.relevanceScore }}/100 | {{ gem.bestWindow }}</span>
            </li>
          </ul>
          <div v-else class="panel-empty mt-3">No hidden gems found yet.</div>
        </article>

        <article class="glass-card metrics-card mt-4">
          <h3>Destination Pulse</h3>
          <ul class="metric-list mt-3">
            <li><span>Total Tips</span><strong>{{ pulse?.totalPosts || 0 }}</strong></li>
            <li><span>Total Reviews</span><strong>{{ pulse?.totalReviews || 0 }}</strong></li>
            <li><span>Average Rating</span><strong>{{ averageReview || pulse?.avgRating || 0 }}</strong></li>
            <li><span>Contributors</span><strong>{{ topContributors.length }}</strong></li>
          </ul>
        </article>

        <article class="glass-card metrics-card mt-4">
          <h3>Top Contributors</h3>
          <div v-if="topContributors.length === 0" class="panel-empty mt-3">Contributors appear as community activity grows.</div>
          <ul v-else class="metric-list mt-3">
            <li v-for="item in topContributors" :key="item.name">
              <span>{{ item.name }}</span>
              <strong>{{ item.points }} pts</strong>
            </li>
          </ul>
        </article>

        <article class="glass-card metrics-card mt-4">
          <h3>Trending Tags</h3>
          <div v-if="trendingTags.length === 0" class="panel-empty mt-3">Tags appear as people post.</div>
          <div v-else class="tag-grid mt-3">
            <span v-for="item in trendingTags" :key="item.tag" class="tag-pill">#{{ item.tag }} ({{ item.count }})</span>
          </div>
        </article>

        <article class="glass-card metrics-card mt-4">
          <h3>Rating Mix</h3>
          <div class="rating-bars mt-3">
            <div v-for="bucket in reviewBuckets" :key="bucket.rating" class="rating-row">
              <span>{{ bucket.rating }} stars</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: `${bucket.percentage}%` }"></div>
              </div>
              <small>{{ bucket.count }}</small>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.community-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 48px;
}

.community-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  padding: 30px;
  border: 1px solid rgba(8, 145, 178, 0.26);
  background:
    radial-gradient(circle at 85% 20%, rgba(16, 185, 129, 0.14), transparent 46%),
    linear-gradient(140deg, rgba(236, 253, 245, 0.92), rgba(240, 249, 255, 0.92));
}

.hero-main {
  display: grid;
  gap: 12px;
  align-content: start;
}

.hero-badge {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: #0f766e;
  font-weight: 800;
  background: rgba(209, 250, 229, 0.82);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.community-hero h1 {
  margin-top: 8px;
  font-size: clamp(2rem, 4.2vw, 3.1rem);
  letter-spacing: -0.03em;
}

.community-hero p {
  margin-top: 4px;
  color: var(--color-text-secondary);
  max-width: 820px;
  line-height: 1.6;
}

.hero-controls {
  display: grid;
  gap: 10px;
  width: min(360px, 100%);
  align-content: start;
}

.control-label {
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.hero-stat {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.72);
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.hero-stat span {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.hero-stat strong {
  font-size: 1rem;
  color: var(--color-text);
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

.community-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.58fr) minmax(300px, 0.92fr);
  gap: 20px;
  align-items: start;
}

.workspace-main,
.workspace-side {
  min-width: 0;
}

.workspace-main {
  display: grid;
  gap: 12px;
}

.workspace-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.composer-card,
.signal-card,
.stream-head-card,
.metrics-card {
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.composer-card {
  border-color: rgba(14, 165, 233, 0.26);
}

.composer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.composer-head h3 {
  margin-top: 2px;
  font-size: 1.06rem;
}

.composer-head p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
}

.composer-switcher {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
}

.stream-head-card h2 {
  margin-top: 4px;
  font-size: 1.28rem;
}

.stream-subcopy {
  margin-top: 7px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.stream-label {
  display: inline-block;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: #0369a1;
  font-weight: 800;
}

.feed-switcher {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.btn-xs.active {
  border-color: rgba(8, 145, 178, 0.45);
  background: rgba(224, 242, 254, 0.72);
  color: #0369a1;
}

.feed-list {
  display: grid;
  gap: 12px;
}

.feed-item {
  overflow: hidden;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.feed-media {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-bottom: 10px;
}

.feed-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.feed-head strong {
  display: block;
  font-size: 0.84rem;
}

.feed-head small {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.feed-text {
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.feed-tags {
  margin-top: 8px;
  color: #0369a1;
  font-size: 0.76rem;
  font-weight: 700;
}

.feed-meta {
  margin-top: 8px;
  font-size: 0.76rem;
  color: var(--color-text-muted);
}

.feed-item .btn {
  white-space: nowrap;
}

.comment-box {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.comment-list li {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 7px 8px;
  display: grid;
  gap: 3px;
}

.comment-list strong {
  font-size: 0.74rem;
}

.comment-list span {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.review-grid label {
  display: grid;
  gap: 4px;
}

.review-grid span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.metric-list,
.insight-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.metric-list li,
.insight-list li {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 8px 9px;
}

.metric-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.metric-list span {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.metric-list strong {
  font-size: 0.82rem;
}

.insight-list strong {
  font-size: 0.74rem;
  display: block;
}

.insight-list span {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.risk-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.risk-pill {
  border-radius: var(--radius-full);
  padding: 5px 9px;
  font-size: 0.7rem;
  font-weight: 700;
}

.risk-pill.status-high {
  border: 1px solid rgba(220, 38, 38, 0.3);
  background: rgba(254, 226, 226, 0.72);
  color: #b91c1c;
}

.risk-pill.status-medium {
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(254, 243, 199, 0.84);
  color: #b45309;
}

.risk-pill.status-low {
  border: 1px solid rgba(5, 150, 105, 0.3);
  background: rgba(209, 250, 229, 0.7);
  color: #047857;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  border: 1px solid rgba(8, 145, 178, 0.26);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.74);
  color: #0369a1;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 10px;
}

.rating-bars {
  display: grid;
  gap: 7px;
}

.rating-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}

.rating-row span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.rating-row small {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.bar-track {
  height: 7px;
  border-radius: var(--radius-full);
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.8), rgba(16, 185, 129, 0.8));
}

.panel-empty {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.feed-placeholder {
  text-align: center;
  min-height: 130px;
  display: grid;
  place-content: center;
}

.feed-placeholder,
.panel-error {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
}

.panel-error {
  border: 1px solid rgba(220, 38, 38, 0.32);
}

@media (max-width: 1120px) {
  .community-workspace {
    grid-template-columns: 1fr;
  }

  .workspace-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .community-hero {
    flex-direction: column;
    padding: 22px;
    gap: 18px;
  }

  .hero-controls {
    width: 100%;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .composer-head {
    flex-direction: column;
  }

  .composer-switcher {
    width: 100%;
  }

  .composer-switcher .btn {
    flex: 1;
  }

  .workspace-side {
    grid-template-columns: 1fr;
  }

  .review-grid,
  .comment-box,
  .rating-row {
    grid-template-columns: 1fr;
  }

  .feed-media {
    height: 180px;
  }
}
</style>
