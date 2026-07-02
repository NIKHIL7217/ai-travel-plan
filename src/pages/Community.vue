<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useCommunityStore } from "../stores/community";
import { getScamAlerts } from "../modules/scam-alerts/service";
import { getHiddenGems } from "../modules/hidden-gems/service";
import { getFriendlyErrorMessage } from "../core/errors";
import { destinationImageUrl } from "../utils/destinationImage";

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
  return destinationImageUrl(`${destination} ${theme}`, { width: 1200, height: 900, seed });
}

function mediaForReview(review) {
  const destination = String(destinationInput.value || "travel").trim() || "travel";
  const theme = `${review?.visitType || "trip"} ${review?.costLevel || "moderate"}`;
  return destinationImageUrl(`${destination} ${theme} travel`, { width: 1200, height: 900, seed: review?.id });
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

<style scoped src="./styles/Community.css"></style>
