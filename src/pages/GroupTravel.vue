<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { useAuthStore } from "../stores/auth";
import { useGroupTravelStore } from "../stores/groupTravel";
import { usePlannerSessionStore } from "../stores/plannerSession";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const groupTravelStore = useGroupTravelStore();
const plannerSessionStore = usePlannerSessionStore();

const joinCode = ref("");
const inviteEmail = ref("");
const pollQuestion = ref("");
const pollOptionsInput = ref("Budget, Balanced, Premium");
const commentInput = ref("");
const taskInput = ref("");
const assigneeUidInput = ref("");
const itineraryDayInput = ref(1);
const itineraryTitleInput = ref("");
const itineraryNotesInput = ref("");
const sharedBudgetInput = ref(0);
const uiMessage = ref({
  type: "",
  text: ""
});

const activeGroup = computed(() => groupTravelStore.activeGroup);
const groups = computed(() => groupTravelStore.groups);
const plannerContext = computed(() => plannerSessionStore.activeContext);
const hasPlannerContext = computed(() => Boolean(plannerContext.value?.destination));
const canCreateGroupFromContext = computed(() => hasPlannerContext.value && !groupTravelStore.loading);
const sharedItinerary = computed(() => (activeGroup.value?.sharedItinerary || []).slice().sort((a, b) => Number(a.day || 0) - Number(b.day || 0)));
const sharedComments = computed(() => activeGroup.value?.comments || []);
const sharedTasks = computed(() => activeGroup.value?.tasks || []);
const openTasksCount = computed(() => sharedTasks.value.filter((task) => task.status !== "done").length);

function showMessage(type, text) {
  uiMessage.value = {
    type,
    text: String(text || "").trim()
  };

  setTimeout(() => {
    uiMessage.value = { type: "", text: "" };
  }, 2200);
}

function contextToRecord() {
  const context = plannerContext.value;
  if (!context?.destination) {
    return null;
  }

  return {
    destination: context.destination,
    summary: context.summary,
    days: Number(context.days || 0),
    style: context.style,
    travelMode: context.travelMode,
    budget: {
      total: Number(context.budgetTotal || 0)
    },
    itinerary: Array.isArray(context.itineraryPreview)
      ? context.itineraryPreview.map((theme, idx) => ({
          day: idx + 1,
          theme
        }))
      : []
  };
}

function voteCount(option) {
  return Array.isArray(option?.voterIds) ? option.voterIds.length : 0;
}

function isMyVote(option) {
  const userId = String(authStore.user?.uid || "").trim();
  return Array.isArray(option?.voterIds) ? option.voterIds.includes(userId) : false;
}

async function createGroupFromPlannerContext() {
  const record = contextToRecord();
  if (!record) {
    showMessage("error", "Planner context missing. Generate a plan first.");
    return;
  }

  try {
    const group = await groupTravelStore.createFromPlanner({
      record,
      user: authStore.user,
      name: `${record.destination} Crew`
    });

    router.replace({ path: "/group-trips", query: { group: group.id } });
    showMessage("success", "Group created from planner context.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to create group.");
  }
}

async function joinGroupByCode() {
  if (!joinCode.value.trim()) {
    return;
  }

  try {
    const group = await groupTravelStore.joinByCode({
      code: joinCode.value,
      user: authStore.user
    });

    joinCode.value = "";
    router.replace({ path: "/group-trips", query: { group: group.id } });
    showMessage("success", "Joined group successfully.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to join group.");
  }
}

async function sendInvite() {
  if (!activeGroup.value?.id || !inviteEmail.value.trim()) {
    return;
  }

  try {
    await groupTravelStore.inviteMember({
      groupId: activeGroup.value.id,
      email: inviteEmail.value,
      inviterUser: authStore.user
    });

    inviteEmail.value = "";
    showMessage("success", "Invite added.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to invite member.");
  }
}

async function createPoll() {
  if (!activeGroup.value?.id) {
    return;
  }

  const question = String(pollQuestion.value || "").trim();
  const options = String(pollOptionsInput.value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!question || options.length < 2) {
    showMessage("error", "Poll question and at least two options are required.");
    return;
  }

  try {
    await groupTravelStore.createPoll({
      groupId: activeGroup.value.id,
      question,
      options,
      createdBy: authStore.user
    });

    pollQuestion.value = "";
    pollOptionsInput.value = "Budget, Balanced, Premium";
    showMessage("success", "Poll created.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to create poll.");
  }
}

async function vote(pollId, optionId) {
  if (!activeGroup.value?.id) {
    return;
  }

  try {
    await groupTravelStore.castVote({
      groupId: activeGroup.value.id,
      pollId,
      optionId,
      voterUser: authStore.user
    });

    showMessage("success", "Vote submitted.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to submit vote.");
  }
}

async function updateSharedBudget() {
  if (!activeGroup.value?.id) {
    return;
  }

  const nextBudget = Math.max(0, Number(sharedBudgetInput.value || 0));

  try {
    await groupTravelStore.updateBudget({
      groupId: activeGroup.value.id,
      budgetTotal: nextBudget,
      user: authStore.user
    });
    showMessage("success", "Shared budget updated.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to update budget.");
  }
}

async function submitComment() {
  if (!activeGroup.value?.id || !commentInput.value.trim()) {
    return;
  }

  try {
    await groupTravelStore.addComment({
      groupId: activeGroup.value.id,
      text: commentInput.value,
      user: authStore.user
    });

    commentInput.value = "";
    showMessage("success", "Comment added.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to add comment.");
  }
}

async function submitTask() {
  if (!activeGroup.value?.id || !taskInput.value.trim()) {
    return;
  }

  try {
    await groupTravelStore.addTask({
      groupId: activeGroup.value.id,
      title: taskInput.value,
      assigneeUid: assigneeUidInput.value,
      creatorUser: authStore.user
    });

    taskInput.value = "";
    assigneeUidInput.value = "";
    showMessage("success", "Task added.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to add task.");
  }
}

async function toggleTask(taskId) {
  if (!activeGroup.value?.id || !taskId) {
    return;
  }

  try {
    await groupTravelStore.toggleTask({
      groupId: activeGroup.value.id,
      taskId,
      user: authStore.user
    });
  } catch (error) {
    showMessage("error", error?.message || "Unable to update task.");
  }
}

async function addItineraryItem() {
  if (!activeGroup.value?.id || !itineraryTitleInput.value.trim()) {
    return;
  }

  try {
    await groupTravelStore.addItineraryItem({
      groupId: activeGroup.value.id,
      day: itineraryDayInput.value,
      title: itineraryTitleInput.value,
      notes: itineraryNotesInput.value,
      user: authStore.user
    });

    itineraryTitleInput.value = "";
    itineraryNotesInput.value = "";
    itineraryDayInput.value = 1;
    showMessage("success", "Shared itinerary item added.");
  } catch (error) {
    showMessage("error", error?.message || "Unable to add itinerary item.");
  }
}

async function updateItineraryItem(item, patch) {
  if (!activeGroup.value?.id || !item?.id) {
    return;
  }

  try {
    await groupTravelStore.updateItineraryItem({
      groupId: activeGroup.value.id,
      itemId: item.id,
      patch,
      user: authStore.user
    });
  } catch (error) {
    showMessage("error", error?.message || "Unable to update itinerary item.");
  }
}

function openGroup(groupId) {
  groupTravelStore.openGroup(groupId);
  router.replace({ path: "/group-trips", query: { group: groupId } });
}

onMounted(async () => {
  await authStore.initAuth();
  if (!authStore.user?.uid) {
    router.replace({ path: "/login", query: { redirect: "/group-trips" } });
    return;
  }

  groupTravelStore.initForUser(authStore.user);

  const queryGroup = String(route.query.group || "").trim();
  if (queryGroup) {
    groupTravelStore.openGroup(queryGroup);
  }
});

watch(
  () => authStore.user?.uid,
  (nextUserId) => {
    if (!nextUserId) {
      return;
    }

    groupTravelStore.initForUser(authStore.user);

    const queryGroup = String(route.query.group || "").trim();
    if (queryGroup) {
      groupTravelStore.openGroup(queryGroup);
    }
  }
);

watch(
  () => route.query.group,
  (nextGroupId) => {
    const targetId = String(nextGroupId || "").trim();
    if (targetId) {
      groupTravelStore.openGroup(targetId);
    }
  }
);

watch(
  () => activeGroup.value?.id,
  () => {
    sharedBudgetInput.value = Number(activeGroup.value?.itinerarySnapshot?.budgetTotal || 0);
  },
  { immediate: true }
);
</script>

<template>
  <div class="group-page container animate-fade-in" style="padding-top: 100px;">
    <div class="group-head">
      <span class="group-badge">GROUP TRAVEL</span>
      <h1>Collaborative Trip Workspace</h1>
      <p>Invite members, collect decisions with quick voting, and keep one shared trip context.</p>
    </div>

    <div class="group-actions mt-6">
      <button type="button" class="btn btn-primary" :disabled="!canCreateGroupFromContext" @click="createGroupFromPlannerContext">
        Create From Planner Context
      </button>
      <button type="button" class="btn btn-outline" @click="router.push('/planner')">Open Planner</button>
      <button type="button" class="btn btn-outline" @click="router.push('/saved-trips')">Saved Trips</button>
    </div>

    <div v-if="uiMessage.text" class="status-msg mt-3" :class="uiMessage.type">
      {{ uiMessage.text }}
    </div>

    <section class="join-card glass-card mt-6">
      <h3>Join With Invite Code</h3>
      <div class="join-row mt-3">
        <input v-model="joinCode" class="form-input" placeholder="Enter invite code" />
        <button type="button" class="btn btn-outline" :disabled="groupTravelStore.loading || !joinCode.trim()" @click="joinGroupByCode">
          Join Group
        </button>
      </div>
    </section>

    <div class="group-layout mt-6">
      <aside class="group-list-card glass-card">
        <div class="list-head">
          <h3>Your Group Trips</h3>
          <span>{{ groupTravelStore.totalGroups }}</span>
        </div>

        <p v-if="groups.length === 0" class="empty-copy mt-3">No group trip yet. Create one from planner context.</p>

        <div v-else class="group-list mt-3">
          <button
            v-for="group in groups"
            :key="group.id"
            type="button"
            class="group-item"
            :class="{ active: activeGroup?.id === group.id }"
            @click="openGroup(group.id)"
          >
            <strong>{{ group.name }}</strong>
            <small>{{ group.destination }} | {{ group.members.length }} members</small>
          </button>
        </div>
      </aside>

      <section class="group-main-card glass-card" v-if="activeGroup">
        <div class="main-head">
          <div>
            <h2>{{ activeGroup.name }}</h2>
            <p>{{ activeGroup.summary }}</p>
          </div>
          <span class="invite-code">Code: {{ activeGroup.inviteCode }}</span>
        </div>

        <div class="snapshot-grid mt-4">
          <article class="snapshot-cell">
            <span>Destination</span>
            <strong>{{ activeGroup.itinerarySnapshot?.destination }}</strong>
          </article>
          <article class="snapshot-cell">
            <span>Days</span>
            <strong>{{ activeGroup.itinerarySnapshot?.days }}</strong>
          </article>
          <article class="snapshot-cell">
            <span>Travel Mode</span>
            <strong>{{ activeGroup.itinerarySnapshot?.travelMode }}</strong>
          </article>
          <article class="snapshot-cell">
            <span>Budget</span>
            <strong>{{ formatPrice(activeGroup.itinerarySnapshot?.budgetTotal || 0) }}</strong>
          </article>
        </div>

        <div class="collab-grid mt-4">
          <article class="shared-budget-card">
            <h3>Shared Budget</h3>
            <p>Collaborative budget target for all members.</p>
            <div class="budget-editor mt-3">
              <input
                v-model.number="sharedBudgetInput"
                type="number"
                min="0"
                step="50"
                class="form-input"
                placeholder="Enter budget"
              />
              <button type="button" class="btn btn-outline btn-xs" :disabled="groupTravelStore.loading" @click="updateSharedBudget">
                Update
              </button>
            </div>
          </article>

          <article class="shared-itinerary-card">
            <div class="section-head">
              <h3>Shared Itinerary</h3>
              <small>{{ sharedItinerary.length }} item(s)</small>
            </div>

            <div class="itinerary-list mt-3" v-if="sharedItinerary.length > 0">
              <div class="itinerary-item" v-for="item in sharedItinerary" :key="item.id">
                <div class="itinerary-row">
                  <input
                    type="number"
                    min="1"
                    class="form-input day-input"
                    :value="item.day"
                    @change="updateItineraryItem(item, { day: Number($event.target.value || item.day) })"
                  />
                  <input
                    class="form-input"
                    :value="item.title"
                    @change="updateItineraryItem(item, { title: $event.target.value })"
                  />
                </div>
                <textarea
                  class="form-input mt-2"
                  rows="2"
                  :value="item.notes"
                  placeholder="Notes for members"
                  @change="updateItineraryItem(item, { notes: $event.target.value })"
                ></textarea>
              </div>
            </div>

            <div class="add-itinerary-form mt-4">
              <div class="itinerary-row">
                <input v-model.number="itineraryDayInput" type="number" min="1" class="form-input day-input" placeholder="Day" />
                <input v-model="itineraryTitleInput" class="form-input" placeholder="Add itinerary item" />
              </div>
              <textarea v-model="itineraryNotesInput" class="form-input mt-2" rows="2" placeholder="Notes (optional)"></textarea>
              <button type="button" class="btn btn-outline btn-xs mt-2" :disabled="groupTravelStore.loading || !itineraryTitleInput.trim()" @click="addItineraryItem">
                Add Item
              </button>
            </div>
          </article>
        </div>

        <div class="collab-grid mt-4">
          <article class="comments-card">
            <div class="section-head">
              <h3>Comments</h3>
              <small>{{ sharedComments.length }}</small>
            </div>

            <div class="comment-list mt-3" v-if="sharedComments.length > 0">
              <div class="comment-item" v-for="comment in sharedComments.slice(0, 20)" :key="comment.id">
                <strong>{{ comment.authorName }}</strong>
                <p>{{ comment.text }}</p>
                <small>{{ new Date(comment.createdAt).toLocaleString() }}</small>
              </div>
            </div>

            <div class="comment-form mt-3">
              <textarea v-model="commentInput" class="form-input" rows="3" placeholder="Share update with group"></textarea>
              <button type="button" class="btn btn-outline btn-xs mt-2" :disabled="groupTravelStore.loading || !commentInput.trim()" @click="submitComment">
                Post Comment
              </button>
            </div>
          </article>

          <article class="tasks-card">
            <div class="section-head">
              <h3>Tasks</h3>
              <small>{{ openTasksCount }} open</small>
            </div>

            <div class="task-list mt-3" v-if="sharedTasks.length > 0">
              <label class="task-item" v-for="task in sharedTasks.slice(0, 30)" :key="task.id">
                <input type="checkbox" :checked="task.status === 'done'" @change="toggleTask(task.id)" />
                <div>
                  <strong :class="{ done: task.status === 'done' }">{{ task.title }}</strong>
                  <small>
                    Assignee: {{ task.assigneeUid || 'unassigned' }} • {{ task.status }}
                  </small>
                </div>
              </label>
            </div>

            <div class="task-form mt-3">
              <input v-model="taskInput" class="form-input" placeholder="Create task" />
              <input v-model="assigneeUidInput" class="form-input mt-2" placeholder="Assignee user id (optional)" />
              <button type="button" class="btn btn-outline btn-xs mt-2" :disabled="groupTravelStore.loading || !taskInput.trim()" @click="submitTask">
                Add Task
              </button>
            </div>
          </article>
        </div>

        <div class="members-grid mt-4">
          <article class="members-card">
            <h3>Members</h3>
            <div class="member-list mt-3">
              <div v-for="member in activeGroup.members" :key="member.uid" class="member-item">
                <strong>{{ member.displayName }}</strong>
                <small>{{ member.role }}</small>
              </div>
            </div>

            <div class="invite-form mt-4">
              <input v-model="inviteEmail" class="form-input" placeholder="Invite by email" />
              <button type="button" class="btn btn-outline btn-xs" :disabled="groupTravelStore.loading || !inviteEmail.trim()" @click="sendInvite">
                Add Invite
              </button>
            </div>

            <div class="invite-list mt-3" v-if="activeGroup.invites?.length">
              <small v-for="invite in activeGroup.invites" :key="invite.id" class="invite-item">Pending: {{ invite.email }}</small>
            </div>
          </article>

          <article class="polls-card">
            <h3>Voting</h3>
            <div class="poll-list mt-3" v-if="activeGroup.polls?.length">
              <article class="poll-item" v-for="poll in activeGroup.polls" :key="poll.id">
                <h4>{{ poll.question }}</h4>
                <div class="poll-options mt-2">
                  <button
                    type="button"
                    class="poll-option"
                    v-for="option in poll.options"
                    :key="option.id"
                    :class="{ mine: isMyVote(option) }"
                    @click="vote(poll.id, option.id)"
                  >
                    <span>{{ option.label }}</span>
                    <strong>{{ voteCount(option) }}</strong>
                  </button>
                </div>
              </article>
            </div>

            <div class="create-poll mt-4">
              <input v-model="pollQuestion" class="form-input" placeholder="Poll question" />
              <input v-model="pollOptionsInput" class="form-input mt-2" placeholder="Option A, Option B" />
              <button
                type="button"
                class="btn btn-outline btn-xs mt-2"
                :disabled="groupTravelStore.loading || !pollQuestion.trim()"
                @click="createPoll"
              >
                Create Poll
              </button>
            </div>
          </article>
        </div>

        <article class="activity-card mt-4" v-if="activeGroup.activity?.length">
          <h3>Recent Activity</h3>
          <div class="activity-list mt-3">
            <div class="activity-item" v-for="event in activeGroup.activity.slice(0, 8)" :key="event.id">
              <strong>{{ event.actorName }}</strong>
              <span>{{ event.detail }}</span>
              <small>{{ new Date(event.createdAt).toLocaleString() }}</small>
            </div>
          </div>
        </article>
      </section>

      <section class="group-main-card glass-card" v-else>
        <h3>No Active Group</h3>
        <p class="empty-copy">Create or join a group to begin collaboration.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.group-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 28px;
}

.group-head h1 {
  margin: 8px 0;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
}

.group-head p {
  color: var(--color-text-secondary);
  max-width: 760px;
}

.group-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.9);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.mt-6 {
  margin-top: 24px;
}

.mt-4 {
  margin-top: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}

.group-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-msg {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-size: 0.8rem;
}

.status-msg.success {
  border-color: rgba(5, 150, 105, 0.25);
  background: rgba(209, 250, 229, 0.7);
  color: #047857;
}

.status-msg.error {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(254, 226, 226, 0.7);
  color: #b91c1c;
}

.join-card {
  background: #ffffff !important;
}

.join-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.group-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
}

.group-list-card,
.group-main-card {
  background: #ffffff !important;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-head span {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 4px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.empty-copy {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.group-list {
  display: grid;
  gap: 8px;
}

.group-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  padding: 9px 10px;
  display: grid;
  gap: 4px;
  text-align: left;
  cursor: pointer;
}

.group-item strong {
  font-size: 0.84rem;
}

.group-item small {
  color: var(--color-text-muted);
  font-size: 0.72rem;
}

.group-item.active {
  border-color: rgba(37, 99, 235, 0.4);
  background: rgba(239, 246, 255, 0.8);
}

.main-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.main-head h2 {
  font-size: 1.12rem;
}

.main-head p {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.invite-code {
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: var(--radius-full);
  background: rgba(219, 234, 254, 0.68);
  color: #1d4ed8;
  padding: 5px 9px;
  font-size: 0.72rem;
  font-weight: 700;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 8px 10px;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.snapshot-cell {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #f8fafc;
}

.snapshot-cell span {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.snapshot-cell strong {
  margin-top: 4px;
  display: block;
  font-size: 0.86rem;
}

.collab-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.shared-budget-card,
.shared-itinerary-card,
.comments-card,
.tasks-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #ffffff;
}

.shared-budget-card p {
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.budget-editor {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.section-head small {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.itinerary-list,
.comment-list,
.task-list {
  display: grid;
  gap: 8px;
}

.itinerary-item,
.comment-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px;
}

.itinerary-row {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 8px;
}

.day-input {
  text-align: center;
}

.comment-item strong {
  font-size: 0.76rem;
}

.comment-item p {
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.comment-item small {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

.task-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px;
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 8px;
  align-items: flex-start;
}

.task-item strong {
  font-size: 0.8rem;
  color: var(--color-text);
}

.task-item strong.done {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.task-item small {
  display: block;
  margin-top: 3px;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.members-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.members-card,
.polls-card,
.activity-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #ffffff;
}

.member-list {
  display: grid;
  gap: 6px;
}

.member-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 9px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.member-item strong {
  font-size: 0.8rem;
}

.member-item small {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.invite-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.invite-list {
  display: grid;
  gap: 4px;
}

.invite-item {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.poll-list {
  display: grid;
  gap: 10px;
}

.poll-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 9px;
}

.poll-item h4 {
  font-size: 0.8rem;
}

.poll-options {
  display: grid;
  gap: 7px;
}

.poll-option {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 9px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.poll-option.mine {
  border-color: rgba(37, 99, 235, 0.35);
  background: rgba(239, 246, 255, 0.85);
}

.poll-option span {
  font-size: 0.78rem;
}

.poll-option strong {
  font-size: 0.8rem;
  color: var(--color-primary);
}

.activity-list {
  display: grid;
  gap: 7px;
}

.activity-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 9px;
  display: grid;
  gap: 3px;
}

.activity-item strong {
  font-size: 0.75rem;
}

.activity-item span {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.activity-item small {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

@media (max-width: 1020px) {
  .group-layout {
    grid-template-columns: 1fr;
  }

  .snapshot-grid,
  .collab-grid,
  .members-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .join-row,
  .invite-form {
    grid-template-columns: 1fr;
  }

  .main-head {
    flex-direction: column;
  }
}
</style>
