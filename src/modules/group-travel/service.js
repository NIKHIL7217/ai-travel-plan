const STORAGE_KEY = "travel_os_group_trips_v1";
let memoryGroups = [];

function readGroups() {
  if (typeof localStorage === "undefined") {
    return [...memoryGroups];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...memoryGroups];
    }

    const parsed = JSON.parse(raw);
    const groups = Array.isArray(parsed) ? parsed : [];
    memoryGroups = [...groups];
    return groups;
  } catch (_error) {
    return [...memoryGroups];
  }
}

function writeGroups(groups) {
  memoryGroups = Array.isArray(groups) ? [...groups] : [];

  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryGroups));
  } catch (_error) {
    // Best-effort persistence.
  }
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createInviteCode(existingGroups) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    let code = "";
    for (let idx = 0; idx < 6; idx += 1) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    const alreadyUsed = existingGroups.some((group) => group.inviteCode === code);
    if (!alreadyUsed) {
      return code;
    }
  }

  return `${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function createMember(user, role = "member") {
  const uid = normalizeText(user?.uid);
  if (!uid) {
    throw new Error("User id is required.");
  }

  const displayName = normalizeText(user?.displayName || user?.email || "Traveler");
  const email = normalizeEmail(user?.email || "");

  return {
    uid,
    displayName,
    email,
    role,
    joinedAt: Date.now()
  };
}

function ensureUserMember(group, user, role = "member") {
  const uid = normalizeText(user?.uid);
  if (!uid) {
    throw new Error("User id is required.");
  }

  const found = group.members.find((member) => member.uid === uid);
  if (found) {
    return {
      ...group,
      members: group.members.map((member) =>
        member.uid === uid
          ? {
              ...member,
              displayName: normalizeText(user?.displayName || member.displayName || "Traveler"),
              email: normalizeEmail(user?.email || member.email || ""),
              role: member.role || role
            }
          : member
      )
    };
  }

  return {
    ...group,
    members: [...group.members, createMember(user, role)]
  };
}

function createDefaultPoll(ownerUser) {
  return {
    id: generateId("poll"),
    question: "Which plan profile should we lock first?",
    options: [
      { id: "budget", label: "Budget", voterIds: [] },
      { id: "balanced", label: "Balanced", voterIds: [] },
      { id: "premium", label: "Premium", voterIds: [] }
    ],
    createdBy: normalizeText(ownerUser?.uid),
    createdAt: Date.now(),
    status: "open"
  };
}

function normalizeSnapshot(snapshot = {}) {
  return {
    destination: normalizeText(snapshot.destination || ""),
    summary: normalizeText(snapshot.summary || ""),
    days: Number(snapshot.days || 0),
    style: normalizeText(snapshot.style || "Balanced") || "Balanced",
    travelMode: normalizeText(snapshot.travelMode || "Car") || "Car",
    budgetTotal: Number(snapshot.budgetTotal || 0),
    itineraryPreview: Array.isArray(snapshot.itineraryPreview)
      ? snapshot.itineraryPreview.map((item) => normalizeText(item)).filter(Boolean).slice(0, 6)
      : []
  };
}

function appendActivity(group, type, actorName, detail) {
  return {
    ...group,
    activity: [
      {
        id: generateId("activity"),
        type,
        actorName: normalizeText(actorName || "System"),
        detail: normalizeText(detail || ""),
        createdAt: Date.now()
      },
      ...(group.activity || [])
    ].slice(0, 40)
  };
}

function createSharedItineraryFromSnapshot(snapshot = {}) {
  const preview = Array.isArray(snapshot?.itineraryPreview) ? snapshot.itineraryPreview : [];
  if (preview.length > 0) {
    return preview.map((title, index) => ({
      id: generateId("itinerary"),
      day: index + 1,
      title: normalizeText(title) || `Day ${index + 1} Plan`,
      notes: "",
      updatedAt: Date.now()
    }));
  }

  const days = Math.max(1, Number(snapshot?.days || 1));
  return Array.from({ length: days }).map((_, index) => ({
    id: generateId("itinerary"),
    day: index + 1,
    title: `Day ${index + 1} Plan`,
    notes: "",
    updatedAt: Date.now()
  }));
}

function normalizeGroup(group = {}) {
  const snapshot = normalizeSnapshot(group.itinerarySnapshot || {});

  return {
    ...group,
    itinerarySnapshot: snapshot,
    members: Array.isArray(group.members) ? group.members : [],
    invites: Array.isArray(group.invites) ? group.invites : [],
    polls: Array.isArray(group.polls) ? group.polls : [],
    comments: Array.isArray(group.comments) ? group.comments : [],
    tasks: Array.isArray(group.tasks) ? group.tasks : [],
    activity: Array.isArray(group.activity) ? group.activity : [],
    sharedItinerary: Array.isArray(group.sharedItinerary) && group.sharedItinerary.length > 0
      ? group.sharedItinerary
      : createSharedItineraryFromSnapshot(snapshot)
  };
}

function mutateGroup(groupId, mutator) {
  const targetId = normalizeText(groupId);
  if (!targetId) {
    throw new Error("Group id is required.");
  }

  const groups = readGroups();
  const index = groups.findIndex((group) => group.id === targetId);
  if (index === -1) {
    throw new Error("Group not found.");
  }

  const currentGroup = normalizeGroup(groups[index]);
  const mutated = mutator(currentGroup) || currentGroup;
  const nextGroup = normalizeGroup({
    ...mutated,
    updatedAt: Date.now()
  });

  const nextGroups = [...groups];
  nextGroups[index] = nextGroup;
  writeGroups(nextGroups);

  return nextGroup;
}

export function getGroupTripById(groupId) {
  const targetId = normalizeText(groupId);
  if (!targetId) {
    return null;
  }

  const group = readGroups().find((item) => item.id === targetId) || null;
  return group ? normalizeGroup(group) : null;
}

export function listGroupTripsForUser(userId) {
  const uid = normalizeText(userId);
  if (!uid) {
    return [];
  }

  return readGroups()
    .filter((group) =>
      group.ownerId === uid ||
      (Array.isArray(group.members) && group.members.some((member) => member.uid === uid))
    )
    .map((group) => normalizeGroup(group))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

export function createGroupTrip({ ownerUser, name, snapshot } = {}) {
  const owner = createMember(ownerUser, "owner");
  const normalizedSnapshot = normalizeSnapshot(snapshot || {});

  if (!normalizedSnapshot.destination) {
    throw new Error("Destination is required to create a group trip.");
  }

  const groups = readGroups();
  const inviteCode = createInviteCode(groups);

  const nextGroup = {
    id: generateId("group"),
    inviteCode,
    name:
      normalizeText(name) ||
      `${normalizedSnapshot.destination} Group Plan`,
    destination: normalizedSnapshot.destination,
    summary: normalizedSnapshot.summary || "Shared trip planning workspace",
    ownerId: owner.uid,
    ownerName: owner.displayName,
    status: "active",
    itinerarySnapshot: normalizedSnapshot,
    sharedItinerary: createSharedItineraryFromSnapshot(normalizedSnapshot),
    members: [owner],
    invites: [],
    polls: [createDefaultPoll(ownerUser)],
    comments: [],
    tasks: [],
    activity: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const groupWithActivity = appendActivity(
    nextGroup,
    "group_created",
    owner.displayName,
    "Created group workspace"
  );

  writeGroups([groupWithActivity, ...groups]);

  return normalizeGroup(groupWithActivity);
}

export function joinGroupTripByCode({ user, inviteCode } = {}) {
  const code = normalizeText(inviteCode).toUpperCase();
  if (!code) {
    throw new Error("Invite code is required.");
  }

  const groups = readGroups();
  const matched = groups.find((group) => normalizeText(group.inviteCode).toUpperCase() === code);
  if (!matched) {
    throw new Error("Group not found for this invite code.");
  }

  return mutateGroup(matched.id, (group) => {
    let nextGroup = ensureUserMember(group, user, "member");
    nextGroup = appendActivity(nextGroup, "member_joined", user?.displayName, "Joined via invite code");
    return nextGroup;
  });
}

export function inviteMemberToGroup({ groupId, email, inviterUser } = {}) {
  const targetId = normalizeText(groupId);
  const normalizedEmail = normalizeEmail(email);
  if (!targetId) {
    throw new Error("Group id is required.");
  }

  if (!normalizedEmail) {
    throw new Error("Invite email is required.");
  }

  return mutateGroup(targetId, (group) => {
    const alreadyMember = group.members.some((member) => normalizeEmail(member.email) === normalizedEmail);
    if (alreadyMember) {
      throw new Error("This member is already part of the group.");
    }

    const invites = Array.isArray(group.invites) ? [...group.invites] : [];
    if (!invites.some((invite) => normalizeEmail(invite.email) === normalizedEmail)) {
      invites.push({
        id: generateId("invite"),
        email: normalizedEmail,
        invitedBy: normalizeText(inviterUser?.uid),
        invitedAt: Date.now(),
        status: "pending"
      });
    }

    let nextGroup = {
      ...group,
      invites
    };
    nextGroup = appendActivity(nextGroup, "member_invited", inviterUser?.displayName, `Invited ${normalizedEmail}`);
    return nextGroup;
  });
}

export function createGroupPoll({ groupId, question, options, createdBy } = {}) {
  const targetId = normalizeText(groupId);
  const pollQuestion = normalizeText(question);
  if (!targetId) {
    throw new Error("Group id is required.");
  }

  if (!pollQuestion) {
    throw new Error("Poll question is required.");
  }

  const cleanedOptions = Array.isArray(options)
    ? options.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  if (cleanedOptions.length < 2) {
    throw new Error("At least two poll options are required.");
  }

  const groups = readGroups();
  const index = groups.findIndex((group) => group.id === targetId);
  if (index === -1) {
    throw new Error("Group not found.");
  }

  const newPoll = {
    id: generateId("poll"),
    question: pollQuestion,
    options: cleanedOptions.slice(0, 6).map((label) => ({
      id: generateId("option"),
      label,
      voterIds: []
    })),
    createdBy: normalizeText(createdBy?.uid || createdBy),
    createdAt: Date.now(),
    status: "open"
  };

  let nextGroup = {
    ...groups[index],
    polls: [newPoll, ...(groups[index].polls || [])],
    updatedAt: Date.now()
  };
  nextGroup = appendActivity(nextGroup, "poll_created", createdBy?.displayName, "Created a new vote poll");

  const nextGroups = [...groups];
  nextGroups[index] = nextGroup;
  writeGroups(nextGroups);

  return nextGroup;
}

export function castGroupVote({ groupId, pollId, optionId, voterUser } = {}) {
  const targetId = normalizeText(groupId);
  const targetPollId = normalizeText(pollId);
  const targetOptionId = normalizeText(optionId);
  const voterId = normalizeText(voterUser?.uid || voterUser);

  if (!targetId || !targetPollId || !targetOptionId || !voterId) {
    throw new Error("Group, poll, option, and voter are required.");
  }

  const groups = readGroups();
  const index = groups.findIndex((group) => group.id === targetId);
  if (index === -1) {
    throw new Error("Group not found.");
  }

  const groupWithMember = ensureUserMember(groups[index], voterUser, "member");

  const nextPolls = (groupWithMember.polls || []).map((poll) => {
    if (poll.id !== targetPollId) {
      return poll;
    }

    const nextOptions = (poll.options || []).map((option) => {
      if (option.id === targetOptionId) {
        const voterIds = Array.isArray(option.voterIds) ? option.voterIds : [];
        if (!voterIds.includes(voterId)) {
          return {
            ...option,
            voterIds: [...voterIds, voterId]
          };
        }
        return option;
      }

      return {
        ...option,
        voterIds: (option.voterIds || []).filter((item) => item !== voterId)
      };
    });

    return {
      ...poll,
      options: nextOptions
    };
  });

  let nextGroup = {
    ...groupWithMember,
    polls: nextPolls,
    updatedAt: Date.now()
  };
  nextGroup = appendActivity(nextGroup, "vote_cast", voterUser?.displayName, "Submitted a vote");

  const nextGroups = [...groups];
  nextGroups[index] = nextGroup;
  writeGroups(nextGroups);

  return nextGroup;
}

export function addGroupComment({ groupId, text, user } = {}) {
  const targetId = normalizeText(groupId);
  const content = normalizeText(text);
  if (!targetId) {
    throw new Error("Group id is required.");
  }
  if (!content) {
    throw new Error("Comment text is required.");
  }

  const actor = createMember(user || { uid: "guest", displayName: "Traveler" }, "member");

  return mutateGroup(targetId, (group) => {
    const comment = {
      id: generateId("comment"),
      text: content,
      authorId: actor.uid,
      authorName: actor.displayName,
      createdAt: Date.now()
    };

    let nextGroup = ensureUserMember(
      {
        ...group,
        comments: [comment, ...(group.comments || [])].slice(0, 120)
      },
      actor,
      "member"
    );
    nextGroup = appendActivity(nextGroup, "comment_added", actor.displayName, "Added a group comment");
    return nextGroup;
  });
}

export function addGroupTask({ groupId, title, assigneeUid = "", creatorUser } = {}) {
  const targetId = normalizeText(groupId);
  const taskTitle = normalizeText(title);
  if (!targetId) {
    throw new Error("Group id is required.");
  }
  if (!taskTitle) {
    throw new Error("Task title is required.");
  }

  const creator = createMember(creatorUser || { uid: "guest", displayName: "Traveler" }, "member");

  return mutateGroup(targetId, (group) => {
    const task = {
      id: generateId("task"),
      title: taskTitle,
      assigneeUid: normalizeText(assigneeUid),
      status: "open",
      createdByUid: creator.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    let nextGroup = ensureUserMember(
      {
        ...group,
        tasks: [task, ...(group.tasks || [])].slice(0, 120)
      },
      creator,
      "member"
    );

    nextGroup = appendActivity(nextGroup, "task_added", creator.displayName, `Added task: ${taskTitle}`);
    return nextGroup;
  });
}

export function toggleGroupTaskStatus({ groupId, taskId, user } = {}) {
  const targetId = normalizeText(groupId);
  const targetTaskId = normalizeText(taskId);
  if (!targetId || !targetTaskId) {
    throw new Error("Group id and task id are required.");
  }

  const actor = createMember(user || { uid: "guest", displayName: "Traveler" }, "member");

  return mutateGroup(targetId, (group) => {
    const nextTasks = (group.tasks || []).map((task) => {
      if (task.id !== targetTaskId) {
        return task;
      }

      return {
        ...task,
        status: task.status === "done" ? "open" : "done",
        updatedAt: Date.now()
      };
    });

    let nextGroup = ensureUserMember(
      {
        ...group,
        tasks: nextTasks
      },
      actor,
      "member"
    );
    nextGroup = appendActivity(nextGroup, "task_toggled", actor.displayName, "Updated task status");
    return nextGroup;
  });
}

export function addSharedItineraryItem({ groupId, day, title, notes = "", user } = {}) {
  const targetId = normalizeText(groupId);
  const itemTitle = normalizeText(title);
  const dayNumber = Math.max(1, Number(day || 1));

  if (!targetId) {
    throw new Error("Group id is required.");
  }
  if (!itemTitle) {
    throw new Error("Itinerary title is required.");
  }

  const actor = createMember(user || { uid: "guest", displayName: "Traveler" }, "member");

  return mutateGroup(targetId, (group) => {
    const nextItem = {
      id: generateId("itinerary"),
      day: dayNumber,
      title: itemTitle,
      notes: normalizeText(notes),
      updatedAt: Date.now()
    };

    const nextItinerary = [...(group.sharedItinerary || []), nextItem]
      .sort((left, right) => Number(left.day || 0) - Number(right.day || 0));

    let nextGroup = ensureUserMember(
      {
        ...group,
        sharedItinerary: nextItinerary
      },
      actor,
      "member"
    );
    nextGroup = appendActivity(nextGroup, "itinerary_added", actor.displayName, `Added itinerary: ${itemTitle}`);
    return nextGroup;
  });
}

export function updateSharedItineraryItem({ groupId, itemId, patch = {}, user } = {}) {
  const targetId = normalizeText(groupId);
  const targetItemId = normalizeText(itemId);
  if (!targetId || !targetItemId) {
    throw new Error("Group id and itinerary item id are required.");
  }

  const actor = createMember(user || { uid: "guest", displayName: "Traveler" }, "member");

  return mutateGroup(targetId, (group) => {
    const nextItinerary = (group.sharedItinerary || []).map((item) => {
      if (item.id !== targetItemId) {
        return item;
      }

      const nextDay = patch.day !== undefined ? Math.max(1, Number(patch.day || item.day || 1)) : item.day;
      return {
        ...item,
        day: nextDay,
        title: patch.title !== undefined ? normalizeText(patch.title) || item.title : item.title,
        notes: patch.notes !== undefined ? normalizeText(patch.notes) : item.notes,
        updatedAt: Date.now()
      };
    }).sort((left, right) => Number(left.day || 0) - Number(right.day || 0));

    let nextGroup = ensureUserMember(
      {
        ...group,
        sharedItinerary: nextItinerary
      },
      actor,
      "member"
    );
    nextGroup = appendActivity(nextGroup, "itinerary_updated", actor.displayName, "Updated shared itinerary");
    return nextGroup;
  });
}

export function updateGroupBudget({ groupId, budgetTotal, user } = {}) {
  const targetId = normalizeText(groupId);
  if (!targetId) {
    throw new Error("Group id is required.");
  }

  const actor = createMember(user || { uid: "guest", displayName: "Traveler" }, "member");
  const nextBudget = Math.max(0, Number(budgetTotal || 0));

  return mutateGroup(targetId, (group) => {
    let nextGroup = ensureUserMember(
      {
        ...group,
        itinerarySnapshot: {
          ...(group.itinerarySnapshot || {}),
          budgetTotal: nextBudget
        }
      },
      actor,
      "member"
    );
    nextGroup = appendActivity(nextGroup, "budget_updated", actor.displayName, `Updated shared budget to ${Math.round(nextBudget)}`);
    return nextGroup;
  });
}

export function clearGroupTravelData() {
  writeGroups([]);
}
