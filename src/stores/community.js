import { defineStore } from "pinia";
import {
  addCommunityComment,
  addCommunityPost,
  addDestinationReview,
  getCommunityPulse,
  listCommunityPosts,
  listDestinationReviews,
  togglePostLike,
  toggleReviewHelpful
} from "../modules/community/service";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUser(user = {}) {
  return {
    uid: normalizeText(user?.uid) || "guest",
    email: normalizeText(user?.email || ""),
    displayName: normalizeText(user?.displayName || user?.email || "Traveler") || "Traveler"
  };
}

export const useCommunityStore = defineStore("community", {
  state: () => ({
    userId: "guest",
    destination: "Global",
    posts: [],
    reviews: [],
    pulse: null,
    loading: false,
    error: ""
  }),
  getters: {
    totalPosts(state) {
      return state.posts.length;
    },
    totalReviews(state) {
      return state.reviews.length;
    }
  },
  actions: {
    initForUser(user) {
      const normalized = normalizeUser(user || {});
      this.userId = normalized.uid || "guest";
      this.error = "";
    },

    loadForDestination(destination = "Global") {
      this.loading = true;
      this.error = "";

      try {
        const target = normalizeText(destination) || "Global";
        this.destination = target;
        this.posts = listCommunityPosts({ destination: target, limit: 80 });
        this.reviews = listDestinationReviews({ destination: target, limit: 80 });
        this.pulse = getCommunityPulse({ destination: target });
      } catch (error) {
        this.error = error?.message || "Unable to load community feed.";
      } finally {
        this.loading = false;
      }
    },

    createPost({ destination, text, tags, user }) {
      this.loading = true;
      this.error = "";

      try {
        addCommunityPost({
          destination: destination || this.destination,
          text,
          tags,
          user: normalizeUser(user || { uid: this.userId })
        });
        this.loadForDestination(destination || this.destination);
      } catch (error) {
        this.error = error?.message || "Unable to publish post.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    commentOnPost({ postId, text, user }) {
      this.loading = true;
      this.error = "";

      try {
        addCommunityComment({
          postId,
          text,
          user: normalizeUser(user || { uid: this.userId })
        });
        this.loadForDestination(this.destination);
      } catch (error) {
        this.error = error?.message || "Unable to add comment.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    toggleLikeOnPost({ postId, userId }) {
      this.loading = true;
      this.error = "";

      try {
        togglePostLike({ postId, userId: normalizeText(userId || this.userId) });
        this.loadForDestination(this.destination);
      } catch (error) {
        this.error = error?.message || "Unable to update post reaction.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    createReview({ destination, rating, title, body, costLevel, visitType, user }) {
      this.loading = true;
      this.error = "";

      try {
        addDestinationReview({
          destination: destination || this.destination,
          rating,
          title,
          body,
          costLevel,
          visitType,
          user: normalizeUser(user || { uid: this.userId })
        });
        this.loadForDestination(destination || this.destination);
      } catch (error) {
        this.error = error?.message || "Unable to submit review.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    toggleReviewHelpfulVote({ reviewId, userId }) {
      this.loading = true;
      this.error = "";

      try {
        toggleReviewHelpful({ reviewId, userId: normalizeText(userId || this.userId) });
        this.loadForDestination(this.destination);
      } catch (error) {
        this.error = error?.message || "Unable to update review reaction.";
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
