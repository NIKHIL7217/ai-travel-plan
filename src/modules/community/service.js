const STORAGE_KEY = "travel_os_community_v1";
let memoryState = null;

const DEFAULT_STATE = {
  posts: [
    {
      id: "seed_post_1",
      destination: "Goa",
      text: "Best way to avoid crowd at popular beaches is early 7 to 9 AM window. Parking also gets easier.",
      tags: ["crowd", "timing"],
      authorId: "system",
      authorName: "Local Explorer",
      likesBy: [],
      comments: [
        {
          id: "seed_comment_1",
          text: "Confirmed. Sunset slot is beautiful but much denser.",
          authorId: "system2",
          authorName: "Roadtrip Crew",
          createdAt: Date.now() - 86400000
        }
      ],
      createdAt: Date.now() - 172800000
    }
  ],
  reviews: [
    {
      id: "seed_review_1",
      destination: "Goa",
      rating: 4,
      title: "Great for mixed travel style",
      body: "Balanced plan worked best. Mid-range stays gave better value than beachfront premium options.",
      costLevel: "moderate",
      visitType: "friends",
      authorId: "system",
      authorName: "Travel Collective",
      helpfulBy: [],
      createdAt: Date.now() - 259200000
    }
  ]
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDestination(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) {
    return "Global";
  }

  return cleaned
    .split(",")[0]
    .trim()
    .replace(/\s+/g, " ");
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeUser(user = {}) {
  return {
    uid: normalizeText(user?.uid) || "guest",
    displayName: normalizeText(user?.displayName || user?.email || "Traveler") || "Traveler",
    email: normalizeText(user?.email || "")
  };
}

function cloneState(state) {
  return {
    posts: Array.isArray(state?.posts) ? [...state.posts] : [],
    reviews: Array.isArray(state?.reviews) ? [...state.reviews] : []
  };
}

function ensureSeeded(state) {
  const next = cloneState(state);
  if (next.posts.length === 0) {
    next.posts = [...DEFAULT_STATE.posts];
  }
  if (next.reviews.length === 0) {
    next.reviews = [...DEFAULT_STATE.reviews];
  }
  return next;
}

function readState() {
  if (typeof localStorage === "undefined") {
    if (!memoryState) {
      memoryState = ensureSeeded(DEFAULT_STATE);
    }
    return cloneState(memoryState);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = ensureSeeded(DEFAULT_STATE);
      memoryState = seeded;
      return cloneState(seeded);
    }

    const parsed = JSON.parse(raw);
    const state = ensureSeeded(parsed);
    memoryState = state;
    return cloneState(state);
  } catch (_error) {
    const fallback = ensureSeeded(memoryState || DEFAULT_STATE);
    memoryState = fallback;
    return cloneState(fallback);
  }
}

function writeState(state) {
  const normalized = ensureSeeded(state || DEFAULT_STATE);
  memoryState = normalized;

  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (_error) {
    // Best-effort persistence only.
  }
}

function toTags(input) {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeText(item).toLowerCase()).filter(Boolean).slice(0, 8);
  }

  return normalizeText(input)
    .split(/[|,]/g)
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function byMostRecent(items = []) {
  return [...items].sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
}

function byDestination(items = [], destination) {
  const normalized = normalizeDestination(destination).toLowerCase();
  if (!normalized || normalized === "global") {
    return items;
  }

  return items.filter((item) => normalizeDestination(item.destination).toLowerCase() === normalized);
}

export function listCommunityPosts({ destination = "", limit = 40 } = {}) {
  const state = readState();
  const filtered = byDestination(state.posts, destination);
  return byMostRecent(filtered).slice(0, Math.max(1, Number(limit || 40)));
}

export function addCommunityPost({ destination, text, tags, user } = {}) {
  const content = normalizeText(text);
  if (!content) {
    throw new Error("Post text is required.");
  }

  const state = readState();
  const actor = normalizeUser(user);
  const nextPost = {
    id: createId("post"),
    destination: normalizeDestination(destination),
    text: content,
    tags: toTags(tags),
    authorId: actor.uid,
    authorName: actor.displayName,
    likesBy: [],
    comments: [],
    createdAt: Date.now()
  };

  writeState({
    ...state,
    posts: [nextPost, ...state.posts]
  });

  return nextPost;
}

export function addCommunityComment({ postId, text, user } = {}) {
  const targetPostId = normalizeText(postId);
  const content = normalizeText(text);
  if (!targetPostId) {
    throw new Error("Post id is required.");
  }
  if (!content) {
    throw new Error("Comment text is required.");
  }

  const state = readState();
  const actor = normalizeUser(user);
  let found = false;

  const nextPosts = state.posts.map((post) => {
    if (post.id !== targetPostId) {
      return post;
    }

    found = true;
    const nextComment = {
      id: createId("comment"),
      text: content,
      authorId: actor.uid,
      authorName: actor.displayName,
      createdAt: Date.now()
    };

    return {
      ...post,
      comments: [...(post.comments || []), nextComment]
    };
  });

  if (!found) {
    throw new Error("Post not found.");
  }

  writeState({ ...state, posts: nextPosts });
  return nextPosts.find((post) => post.id === targetPostId) || null;
}

export function togglePostLike({ postId, userId } = {}) {
  const targetPostId = normalizeText(postId);
  const actorId = normalizeText(userId);
  if (!targetPostId || !actorId) {
    throw new Error("Post id and user id are required.");
  }

  const state = readState();
  let found = false;

  const nextPosts = state.posts.map((post) => {
    if (post.id !== targetPostId) {
      return post;
    }

    found = true;
    const likesBy = Array.isArray(post.likesBy) ? [...post.likesBy] : [];
    const alreadyLiked = likesBy.includes(actorId);

    return {
      ...post,
      likesBy: alreadyLiked ? likesBy.filter((id) => id !== actorId) : [...likesBy, actorId]
    };
  });

  if (!found) {
    throw new Error("Post not found.");
  }

  writeState({ ...state, posts: nextPosts });
  return nextPosts.find((post) => post.id === targetPostId) || null;
}

export function listDestinationReviews({ destination = "", limit = 40 } = {}) {
  const state = readState();
  const filtered = byDestination(state.reviews, destination);
  return byMostRecent(filtered).slice(0, Math.max(1, Number(limit || 40)));
}

export function addDestinationReview({ destination, rating, title, body, costLevel, visitType, user } = {}) {
  const reviewTitle = normalizeText(title);
  const reviewBody = normalizeText(body);
  if (!reviewTitle) {
    throw new Error("Review title is required.");
  }
  if (!reviewBody) {
    throw new Error("Review body is required.");
  }

  const normalizedRating = Math.max(1, Math.min(5, Number(rating || 0)));
  if (!Number.isFinite(normalizedRating) || normalizedRating < 1) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const actor = normalizeUser(user);
  const state = readState();

  const review = {
    id: createId("review"),
    destination: normalizeDestination(destination),
    rating: normalizedRating,
    title: reviewTitle,
    body: reviewBody,
    costLevel: normalizeText(costLevel || "moderate").toLowerCase() || "moderate",
    visitType: normalizeText(visitType || "solo").toLowerCase() || "solo",
    authorId: actor.uid,
    authorName: actor.displayName,
    helpfulBy: [],
    createdAt: Date.now()
  };

  writeState({
    ...state,
    reviews: [review, ...state.reviews]
  });

  return review;
}

export function toggleReviewHelpful({ reviewId, userId } = {}) {
  const targetReviewId = normalizeText(reviewId);
  const actorId = normalizeText(userId);
  if (!targetReviewId || !actorId) {
    throw new Error("Review id and user id are required.");
  }

  const state = readState();
  let found = false;

  const nextReviews = state.reviews.map((review) => {
    if (review.id !== targetReviewId) {
      return review;
    }

    found = true;
    const helpfulBy = Array.isArray(review.helpfulBy) ? [...review.helpfulBy] : [];
    const marked = helpfulBy.includes(actorId);

    return {
      ...review,
      helpfulBy: marked ? helpfulBy.filter((id) => id !== actorId) : [...helpfulBy, actorId]
    };
  });

  if (!found) {
    throw new Error("Review not found.");
  }

  writeState({ ...state, reviews: nextReviews });
  return nextReviews.find((review) => review.id === targetReviewId) || null;
}

export function getCommunityPulse({ destination = "" } = {}) {
  const posts = listCommunityPosts({ destination, limit: 200 });
  const reviews = listDestinationReviews({ destination, limit: 200 });

  const avgRating =
    reviews.length === 0
      ? 0
      : Number(
          (
            reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
            reviews.length
          ).toFixed(1)
        );

  return {
    destination: normalizeDestination(destination),
    totalPosts: posts.length,
    totalReviews: reviews.length,
    avgRating,
    topTags: Object.entries(
      posts.reduce((map, post) => {
        for (const tag of post.tags || []) {
          map[tag] = (map[tag] || 0) + 1;
        }
        return map;
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([tag]) => tag),
    updatedAt: Date.now()
  };
}

export function clearCommunityData() {
  writeState({ posts: [], reviews: [] });
}
