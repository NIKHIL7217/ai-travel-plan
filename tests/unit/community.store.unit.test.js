import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCommunityStore } from "../../src/stores/community";

function resetCommunityStorage() {
  if (typeof localStorage?.removeItem !== "function") {
    return;
  }

  localStorage.removeItem("travel_os_community_v1");
}

function testUser() {
  return {
    uid: "tester-1",
    email: "tester@example.com",
    displayName: "Tester"
  };
}

describe("community store", () => {
  beforeEach(() => {
    resetCommunityStorage();
    setActivePinia(createPinia());
  });

  it("loads seeded destination pulse and feed", () => {
    const store = useCommunityStore();
    store.initForUser(testUser());

    store.loadForDestination("Goa");

    expect(store.destination).toBe("Goa");
    expect(store.posts.length).toBeGreaterThan(0);
    expect(store.reviews.length).toBeGreaterThan(0);
    expect(store.pulse?.destination).toBe("Goa");
  });

  it("creates posts and comments on selected destination", () => {
    const store = useCommunityStore();
    store.initForUser(testUser());
    store.loadForDestination("Goa");

    store.createPost({
      destination: "Goa",
      text: "Early morning beach slot is calmer and safer.",
      tags: "crowd,safety",
      user: testUser()
    });

    const createdPost = store.posts[0];
    expect(createdPost.text).toContain("calmer and safer");

    store.commentOnPost({
      postId: createdPost.id,
      text: "Confirmed from my recent trip.",
      user: {
        uid: "tester-2",
        displayName: "Buddy"
      }
    });

    expect(store.posts[0].comments.length).toBeGreaterThan(0);
  });

  it("creates review and toggles reactions", () => {
    const store = useCommunityStore();
    store.initForUser(testUser());
    store.loadForDestination("Goa");

    store.createReview({
      destination: "Goa",
      rating: 5,
      title: "Solid destination planning quality",
      body: "Mix of local food clusters and quiet lanes worked well.",
      costLevel: "moderate",
      visitType: "friends",
      user: testUser()
    });

    const review = store.reviews[0];
    expect(review.title).toContain("planning quality");

    store.toggleReviewHelpfulVote({
      reviewId: review.id,
      userId: "tester-2"
    });

    store.toggleLikeOnPost({
      postId: store.posts[0].id,
      userId: "tester-2"
    });

    expect(store.reviews[0].helpfulBy).toContain("tester-2");
    expect(store.posts[0].likesBy).toContain("tester-2");
  });
});
