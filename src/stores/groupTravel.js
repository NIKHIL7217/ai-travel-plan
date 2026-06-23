import { defineStore } from "pinia";
import {
  castGroupVote,
  createGroupPoll,
  createGroupTrip,
  getGroupTripById,
  inviteMemberToGroup,
  joinGroupTripByCode,
  listGroupTripsForUser
} from "../modules/group-travel/service";

function normalizeUser(user) {
  return {
    uid: String(user?.uid || "").trim(),
    email: String(user?.email || "").trim(),
    displayName: String(user?.displayName || user?.email || "Traveler").trim() || "Traveler"
  };
}

function toSnapshotFromRecord(record = {}) {
  return {
    destination: String(record.destination || "").trim(),
    summary: String(record.summary || record.tagline || "").trim(),
    days: Number(record.days || 0),
    style: String(record.style || "Balanced").trim() || "Balanced",
    travelMode: String(record.travelMode || "Car").trim() || "Car",
    budgetTotal: Number(record?.budget?.total || 0),
    itineraryPreview: Array.isArray(record.itinerary)
      ? record.itinerary.map((day) => day.theme).filter(Boolean).slice(0, 6)
      : []
  };
}

export const useGroupTravelStore = defineStore("groupTravel", {
  state: () => ({
    userId: "guest",
    groups: [],
    activeGroupId: "",
    loading: false,
    error: ""
  }),
  getters: {
    activeGroup(state) {
      if (!state.activeGroupId) {
        return state.groups[0] || null;
      }

      return state.groups.find((group) => group.id === state.activeGroupId) || state.groups[0] || null;
    },
    totalGroups(state) {
      return state.groups.length;
    }
  },
  actions: {
    clearError() {
      this.error = "";
    },

    initForUser(user) {
      const normalized = normalizeUser(user || {});
      this.userId = normalized.uid || "guest";
      this.groups = listGroupTripsForUser(this.userId);

      if (this.groups.length > 0) {
        if (!this.activeGroupId || !this.groups.some((group) => group.id === this.activeGroupId)) {
          this.activeGroupId = this.groups[0].id;
        }
      } else {
        this.activeGroupId = "";
      }
    },

    refreshGroups() {
      this.groups = listGroupTripsForUser(this.userId);

      if (this.groups.length === 0) {
        this.activeGroupId = "";
        return;
      }

      if (!this.activeGroupId || !this.groups.some((group) => group.id === this.activeGroupId)) {
        this.activeGroupId = this.groups[0].id;
      }
    },

    openGroup(groupId) {
      const target = getGroupTripById(groupId);
      if (!target) {
        this.error = "Group not found.";
        return;
      }

      this.activeGroupId = target.id;
      this.refreshGroups();
    },

    createFromPlanner({ record, user, name }) {
      const normalizedUser = normalizeUser(user || {});
      if (!normalizedUser.uid) {
        throw new Error("Login required to create group trip.");
      }

      this.loading = true;
      this.error = "";

      try {
        const group = createGroupTrip({
          ownerUser: normalizedUser,
          name,
          snapshot: toSnapshotFromRecord(record)
        });

        this.initForUser(normalizedUser);
        this.activeGroupId = group.id;
        return group;
      } catch (error) {
        this.error = error?.message || "Unable to create group trip.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    joinByCode({ code, user }) {
      const normalizedUser = normalizeUser(user || {});
      if (!normalizedUser.uid) {
        throw new Error("Login required to join group trip.");
      }

      this.loading = true;
      this.error = "";

      try {
        const group = joinGroupTripByCode({
          inviteCode: code,
          user: normalizedUser
        });

        this.initForUser(normalizedUser);
        this.activeGroupId = group.id;
        return group;
      } catch (error) {
        this.error = error?.message || "Unable to join group.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    inviteMember({ groupId, email, inviterUser }) {
      this.loading = true;
      this.error = "";

      try {
        const group = inviteMemberToGroup({
          groupId,
          email,
          inviterUser: normalizeUser(inviterUser || {})
        });

        this.refreshGroups();
        this.activeGroupId = group.id;
        return group;
      } catch (error) {
        this.error = error?.message || "Unable to invite member.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    createPoll({ groupId, question, options, createdBy }) {
      this.loading = true;
      this.error = "";

      try {
        const group = createGroupPoll({
          groupId,
          question,
          options,
          createdBy: normalizeUser(createdBy || {})
        });

        this.refreshGroups();
        this.activeGroupId = group.id;
        return group;
      } catch (error) {
        this.error = error?.message || "Unable to create poll.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    castVote({ groupId, pollId, optionId, voterUser }) {
      this.loading = true;
      this.error = "";

      try {
        const group = castGroupVote({
          groupId,
          pollId,
          optionId,
          voterUser: normalizeUser(voterUser || {})
        });

        this.refreshGroups();
        this.activeGroupId = group.id;
        return group;
      } catch (error) {
        this.error = error?.message || "Unable to cast vote.";
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
