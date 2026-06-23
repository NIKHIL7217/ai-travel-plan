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

export function getGroupTripById(groupId) {
  const targetId = normalizeText(groupId);
  if (!targetId) {
    return null;
  }

  return readGroups().find((group) => group.id === targetId) || null;
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

  return groupWithActivity;
}

export function joinGroupTripByCode({ user, inviteCode } = {}) {
  const code = normalizeText(inviteCode).toUpperCase();
  if (!code) {
    throw new Error("Invite code is required.");
  }

  const groups = readGroups();
  const index = groups.findIndex((group) => normalizeText(group.inviteCode).toUpperCase() === code);
  if (index === -1) {
    throw new Error("Group not found for this invite code.");
  }

  let nextGroup = ensureUserMember(groups[index], user, "member");
  nextGroup = appendActivity(nextGroup, "member_joined", user?.displayName, "Joined via invite code");
  nextGroup.updatedAt = Date.now();

  const nextGroups = [...groups];
  nextGroups[index] = nextGroup;
  writeGroups(nextGroups);

  return nextGroup;
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

  const groups = readGroups();
  const index = groups.findIndex((group) => group.id === targetId);
  if (index === -1) {
    throw new Error("Group not found.");
  }

  const group = groups[index];
  const alreadyMember = group.members.some((member) => normalizeEmail(member.email) === normalizedEmail);
  if (alreadyMember) {
    throw new Error("This member is already part of the group.");
  }

  const invites = Array.isArray(group.invites) ? group.invites : [];
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
    invites,
    updatedAt: Date.now()
  };
  nextGroup = appendActivity(nextGroup, "member_invited", inviterUser?.displayName, `Invited ${normalizedEmail}`);

  const nextGroups = [...groups];
  nextGroups[index] = nextGroup;
  writeGroups(nextGroups);

  return nextGroup;
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

export function clearGroupTravelData() {
  writeGroups([]);
}
