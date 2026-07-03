import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  backendTrackAuthEvent,
  backendTrackTripRevenue,
  backendDeleteTrip,
  backendListTrips,
  backendSaveTrip,
  backendUpsertUserProfile,
  isBackendEnabled
} from "./api/backendClient";
import { inferUserRole } from "../utils/adminAccess";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let db = null;
let useFirebase = false;
let auth = null;
let useFirebaseAuth = false;

if (firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    useFirebase = true;
    useFirebaseAuth = true;
    console.log("Firebase initialized successfully.");
  } catch (e) {
    console.warn("Firebase initialization failed, falling back to LocalStorage:", e);
  }
} else {
  console.log("No Firebase Project ID found. Operating in local mode (LocalStorage).");
}

const LOCAL_AUTH_SESSION_KEY = "roam_auth_session";
const LOCAL_AUTH_USERS_KEY = "roam_auth_users";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPasswordWithSalt(password, salt) {
  const normalizedSalt = String(salt || "").trim();
  const source = `${normalizedSalt}:${String(password || "")}`;
  const encoder = new TextEncoder();

  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(source));
    return toHex(digest);
  }

  return source;
}

async function createPasswordRecord(password) {
  const salt = randomSalt();
  const hash = await hashPasswordWithSalt(password, salt);
  return {
    passwordSalt: salt,
    passwordHash: hash
  };
}

async function verifyPasswordRecord(user, password) {
  if (user?.passwordHash && user?.passwordSalt) {
    const hash = await hashPasswordWithSalt(password, user.passwordSalt);
    return hash === user.passwordHash;
  }

  // Legacy fallback for old local accounts created before hashing.
  return user?.password === password;
}

export function isAuthEnabled() {
  return useFirebaseAuth;
}

export function getAuthSession() {
  const localUser = getLocalSessionUser();
  if (localUser) {
    return normalizeAuthUser(localUser);
  }

  if (auth?.currentUser) {
    return normalizeAuthUser(auth.currentUser);
  }

  return null;
}

export function observeAuthSession(callback) {
  if (useFirebaseAuth && auth) {
    return onAuthStateChanged(auth, (user) => {
      callback(normalizeAuthUser(user));
    });
  }

  callback(getLocalSessionUser());
  return () => {};
}

export async function loginWithEmail(email, password) {
  if (useFirebaseAuth && auth) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const sessionUser = normalizeAuthUser(credential.user);

    if (sessionUser) {
      const syncedUser = await backendUpsertUserProfile(sessionUser, {
        isVerified: true,
        status: "active",
        role: sessionUser.role || "member"
      });
      sessionUser.role = inferUserRole(syncedUser || sessionUser);
      saveLocalSessionUser(sessionUser);

      await backendTrackAuthEvent({
        type: "login",
        userId: sessionUser.uid,
        email: sessionUser.email,
        displayName: sessionUser.displayName
      });
    }

    return sessionUser;
  }

  const users = getLocalUsers();
  const normalizedEmail = String(email).toLowerCase();
  const matchedUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!matchedUser || !(await verifyPasswordRecord(matchedUser, password))) {
    throw new Error("Invalid email or password.");
  }

  if (!matchedUser.passwordHash || !matchedUser.passwordSalt) {
    const migratedRecord = await createPasswordRecord(password);
    matchedUser.passwordHash = migratedRecord.passwordHash;
    matchedUser.passwordSalt = migratedRecord.passwordSalt;
    delete matchedUser.password;
    saveLocalUsers(users);
  }

  const sessionUser = {
    uid: matchedUser.uid,
    email: matchedUser.email,
    displayName: matchedUser.displayName || "Traveler",
    role: inferUserRole({
      role: matchedUser.role,
      email: matchedUser.email
    })
  };

  saveLocalSessionUser(sessionUser);

  await backendUpsertUserProfile(sessionUser, {
    isVerified: true,
    status: "active",
    role: sessionUser.role
  });
  await backendTrackAuthEvent({
    type: "login",
    userId: sessionUser.uid,
    email: sessionUser.email,
    displayName: sessionUser.displayName
  });

  return sessionUser;
}

export async function signupWithEmail({ name, email, password }) {
  if (useFirebaseAuth && auth) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name?.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    const sessionUser = normalizeAuthUser(auth.currentUser || credential.user);

    if (sessionUser) {
      const syncedUser = await backendUpsertUserProfile(sessionUser, {
        isVerified: true,
        status: "active",
        role: sessionUser.role || "member",
        signupSource: "signup"
      });
      sessionUser.role = inferUserRole(syncedUser || sessionUser);
      saveLocalSessionUser(sessionUser);

      await backendTrackAuthEvent({
        type: "signup",
        userId: sessionUser.uid,
        email: sessionUser.email,
        displayName: sessionUser.displayName
      });
    }

    return sessionUser;
  }

  const users = getLocalUsers();
  const alreadyExists = users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (alreadyExists) {
    throw new Error("This email is already registered. Please login.");
  }

  const passwordRecord = await createPasswordRecord(password);

  const newUser = {
    uid: `local_user_${Date.now()}`,
    email,
    passwordHash: passwordRecord.passwordHash,
    passwordSalt: passwordRecord.passwordSalt,
    displayName: name?.trim() || "Traveler",
    role: "member",
    createdAt: Date.now()
  };

  users.push(newUser);
  saveLocalUsers(users);

  const sessionUser = {
    uid: newUser.uid,
    email: newUser.email,
    displayName: newUser.displayName,
    role: newUser.role
  };

  saveLocalSessionUser(sessionUser);

  await backendUpsertUserProfile(sessionUser, {
    isVerified: true,
    status: "active",
    role: sessionUser.role,
    signupSource: "signup"
  });
  await backendTrackAuthEvent({
    type: "signup",
    userId: sessionUser.uid,
    email: sessionUser.email,
    displayName: sessionUser.displayName
  });

  return sessionUser;
}

export async function logoutCurrentUser() {
  const activeSession = getAuthSession();

  if (useFirebaseAuth && auth) {
    await signOut(auth);
    clearLocalSessionUser();
    if (activeSession) {
      await backendTrackAuthEvent({
        type: "logout",
        userId: activeSession.uid,
        email: activeSession.email,
        displayName: activeSession.displayName
      });
    }
    return;
  }

  clearLocalSessionUser();
  if (activeSession) {
    await backendTrackAuthEvent({
      type: "logout",
      userId: activeSession.uid,
      email: activeSession.email,
      displayName: activeSession.displayName
    });
  }
}

/**
 * Saves a generated trip to database (Firestore or LocalStorage fallback)
 * @param {Object} trip 
 */
export async function saveTripToDb(trip, userId = "guest") {
  const normalizedUserId = userId || "guest";

  if (isBackendEnabled()) {
    const saved = await backendSaveTrip(trip, normalizedUserId);
    if (saved) {
      await backendTrackTripRevenue({
        userId: normalizedUserId,
        tripId: saved.id,
        destination: String(trip?.destination || ""),
        amount: Number(trip?.budget?.total || 0)
      });

      return {
        id: saved.id,
        savedAt: new Date(saved.savedAt || Date.now()).toLocaleDateString(),
        userId: normalizedUserId,
        ...trip
      };
    }
  }

  if (useFirebase && db) {
    try {
      const docRef = await addDoc(collection(db, "trips"), {
        ...trip,
        userId: normalizedUserId,
        savedAt: new Date().toLocaleDateString(),
        createdAt: Date.now()
      });
      return {
        id: docRef.id,
        ...trip,
        userId: normalizedUserId,
        savedAt: new Date().toLocaleDateString()
      };
    } catch (e) {
      console.error("Failed to save to Firestore, writing locally:", e);
    }
  }

  const trips = getLocalTrips(normalizedUserId);
  const newTrip = {
    id: "local_" + Date.now(),
    savedAt: new Date().toLocaleDateString(),
    userId: normalizedUserId,
    ...trip
  };
  trips.push(newTrip);
  saveLocalTrips(trips, normalizedUserId);

  await backendTrackTripRevenue({
    userId: normalizedUserId,
    tripId: newTrip.id,
    destination: String(trip?.destination || ""),
    amount: Number(trip?.budget?.total || 0)
  });

  return newTrip;
}

/**
 * Retrieves saved travel plans
 * @returns {Promise<Array>}
 */
export async function getSavedTripsFromDb(userId = "guest") {
  const normalizedUserId = userId || "guest";

  if (isBackendEnabled()) {
    const records = await backendListTrips(normalizedUserId);
    if (records) {
      return records.map((record) => ({
        id: record.id,
        savedAt: new Date(record.savedAt || Date.now()).toLocaleDateString(),
        userId: record.userId || normalizedUserId,
        ...(record.data && typeof record.data === "object" ? record.data : {})
      }));
    }
  }

  if (useFirebase && db) {
    try {
      const tripsQuery = query(collection(db, "trips"), where("userId", "==", normalizedUserId));
      const querySnapshot = await getDocs(tripsQuery);
      const trips = [];
      querySnapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() });
      });
      return trips;
    } catch (e) {
      console.error("Failed to fetch from Firestore, returning local:", e);
    }
  }

  return getLocalTrips(normalizedUserId);
}

/**
 * Deletes a saved plan by ID
 * @param {string} id 
 */
export async function deleteTripFromDb(id, userId = "guest") {
  const normalizedUserId = userId || "guest";

  if (isBackendEnabled() && !String(id).startsWith("local_")) {
    const removed = await backendDeleteTrip(id);
    if (removed) {
      return true;
    }
  }

  if (useFirebase && db && !String(id).startsWith("local_")) {
    try {
      await deleteDoc(doc(db, "trips", id));
      return true;
    } catch (e) {
      console.error("Failed to delete from Firestore:", e);
    }
  }

  const trips = getLocalTrips(normalizedUserId);
  const updated = trips.filter(t => t.id !== id);
  saveLocalTrips(updated, normalizedUserId);
  return true;
}

// LocalStorage Persistence Helpers
function getLocalTrips(userId = "guest") {
  try {
    const data = localStorage.getItem(getTripStorageKey(userId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalTrips(trips, userId = "guest") {
  localStorage.setItem(getTripStorageKey(userId), JSON.stringify(trips));
}

function getTripStorageKey(userId) {
  return `roam_saved_trips_light_${userId || "guest"}`;
}

function normalizeAuthUser(user) {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email?.split("@")[0] || "Traveler",
    role: inferUserRole(user)
  };
}

function getLocalUsers() {
  try {
    const data = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
}

function getLocalSessionUser() {
  try {
    const data = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
    return data ? normalizeAuthUser(JSON.parse(data)) : null;
  } catch (e) {
    return null;
  }
}

function saveLocalSessionUser(user) {
  localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(normalizeAuthUser(user)));
}

function clearLocalSessionUser() {
  localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
}
