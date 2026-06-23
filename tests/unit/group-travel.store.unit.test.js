import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useGroupTravelStore } from "../../src/stores/groupTravel";

function resetGroupStorage() {
  if (typeof localStorage?.removeItem !== "function") {
    return;
  }

  localStorage.removeItem("travel_os_group_trips_v1");
}

function ownerUser() {
  return {
    uid: "owner-1",
    email: "owner@example.com",
    displayName: "Owner"
  };
}

function createPlannerRecord() {
  return {
    destination: "Goa",
    summary: "3 day beach + local food plan",
    days: 3,
    style: "Balanced",
    travelMode: "Car",
    budget: {
      total: 1500
    },
    itinerary: [
      { day: 1, theme: "Beach hop" },
      { day: 2, theme: "Old Goa walk" }
    ]
  };
}

describe("group travel store", () => {
  beforeEach(() => {
    resetGroupStorage();
    setActivePinia(createPinia());
  });

  it("creates a group from planner record", () => {
    const store = useGroupTravelStore();
    store.initForUser(ownerUser());

    const group = store.createFromPlanner({
      record: createPlannerRecord(),
      user: ownerUser(),
      name: "Goa Crew"
    });

    expect(group.id).toBeTruthy();
    expect(store.totalGroups).toBe(1);
    expect(store.activeGroup?.name).toBe("Goa Crew");
    expect(store.activeGroup?.itinerarySnapshot?.destination).toBe("Goa");
    expect(store.activeGroup?.members?.[0]?.role).toBe("owner");
  });

  it("invites members and tracks join by invite code", () => {
    const store = useGroupTravelStore();
    store.initForUser(ownerUser());

    store.createFromPlanner({
      record: createPlannerRecord(),
      user: ownerUser(),
      name: "Goa Crew"
    });

    const groupId = store.activeGroup?.id;
    const inviteCode = store.activeGroup?.inviteCode;

    store.inviteMember({
      groupId,
      email: "friend@example.com",
      inviterUser: ownerUser()
    });

    expect(store.activeGroup?.invites?.length).toBe(1);

    const joined = store.joinByCode({
      code: inviteCode,
      user: {
        uid: "friend-1",
        email: "friend@example.com",
        displayName: "Friend"
      }
    });

    expect(joined.members.some((member) => member.uid === "friend-1")).toBe(true);
  });

  it("creates poll and records vote", () => {
    const store = useGroupTravelStore();
    store.initForUser(ownerUser());

    store.createFromPlanner({
      record: createPlannerRecord(),
      user: ownerUser(),
      name: "Goa Crew"
    });

    const groupId = store.activeGroup?.id;

    store.createPoll({
      groupId,
      question: "Which plan should we lock?",
      options: ["Budget", "Balanced", "Premium"],
      createdBy: ownerUser()
    });

    const poll = store.activeGroup?.polls?.[0];
    const optionId = poll?.options?.[1]?.id;

    store.castVote({
      groupId,
      pollId: poll?.id,
      optionId,
      voterUser: {
        uid: "friend-2",
        email: "friend2@example.com",
        displayName: "Friend Two"
      }
    });

    const refreshedPoll = store.activeGroup?.polls?.find((item) => item.id === poll?.id);
    const chosenOption = refreshedPoll?.options?.find((option) => option.id === optionId);

    expect(chosenOption?.voterIds).toContain("friend-2");
    expect(store.activeGroup?.members?.some((member) => member.uid === "friend-2")).toBe(true);
  });
});
