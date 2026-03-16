/**
 * Unified database interface using MongoDB.
 * Single code path — no mode switching.
 */

import { getDb } from "./mongodb";
import { getCurrentUser } from "./auth";

// ============================================================================
// DOCUMENT TYPES (for typed collection access)
// ============================================================================

/** Shape of documents in the researchTasks collection */
export interface ResearchTaskDoc {
  _id: any;
  userId: string;
  deepresearchId: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  status: string;
  anonymousId: string | null;
  isPublic: boolean;
  shareToken: string | null;
  sharedAt: Date | null;
  locationImages: string | null;
  researchOutput: any | null;
  sources: any[] | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  [key: string]: any; // allow extra fields
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function getUser() {
  const user = await getCurrentUser();
  if (!user) return { data: { user: null }, error: null };
  return { data: { user: { id: user.id, email: user.email } }, error: null };
}

export async function getSession() {
  const user = await getCurrentUser();
  if (!user) return { data: { session: null }, error: null };
  return {
    data: {
      session: {
        user: { id: user.id, email: user.email },
        access_token: "authenticated",
      },
    },
    error: null,
  };
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export async function getUserProfile(userId: string) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: userId as any });
  return { data: user || null, error: null };
}

// ============================================================================
// RATE LIMIT FUNCTIONS
// ============================================================================

export async function getUserRateLimit(userId: string) {
  const db = await getDb();
  const rateLimit = await db.collection("userRateLimits").findOne({ userId });
  return { data: rateLimit || null, error: null };
}

export async function updateUserRateLimit(
  userId: string,
  updates: { usage_count?: number; reset_date?: string; last_request_at?: Date }
) {
  const db = await getDb();
  const setFields: any = {};
  if (updates.usage_count !== undefined) setFields.usageCount = updates.usage_count;
  if (updates.reset_date !== undefined) setFields.resetDate = updates.reset_date;
  if (updates.last_request_at !== undefined) setFields.lastRequestAt = updates.last_request_at;

  await db.collection("userRateLimits").updateOne(
    { userId },
    { $set: setFields }
  );
  return { error: null };
}


// ============================================================================
// RESEARCH TASK FUNCTIONS
// ============================================================================

export async function getResearchTasks(userId: string) {
  const db = await getDb();
  const tasks = await db
    .collection<ResearchTaskDoc>("researchTasks")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return { data: tasks.map((t) => ({ ...t, id: t._id })), error: null };
}

export async function getResearchTask(taskId: string) {
  const db = await getDb();
  const task = await db.collection<ResearchTaskDoc>("researchTasks").findOne({ _id: taskId as any });
  if (!task) return { data: null, error: null };
  return { data: { ...task, id: task._id }, error: null };
}

export async function createResearchTask(task: {
  id: string;
  user_id: string;
  deepresearch_id: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  status: string;
  anonymous_id?: string;
  research_output?: any;
  sources?: any[];
  images?: string[];
}) {
  const db = await getDb();
  const now = new Date();
  await db.collection("researchTasks").insertOne({
    _id: task.id as any,
    userId: task.user_id,
    deepresearchId: task.deepresearch_id,
    locationName: task.location_name,
    locationLat: task.location_lat,
    locationLng: task.location_lng,
    status: task.status,
    anonymousId: task.anonymous_id || null,
    isPublic: false,
    shareToken: null,
    sharedAt: null,
    locationImages: task.images ? JSON.stringify(task.images) : null,
    researchOutput: task.research_output || null,
    sources: task.sources || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  });
  return { error: null };
}

export async function updateResearchTask(
  taskId: string,
  updates: {
    status?: string;
    completed_at?: Date;
    location_images?: any;
    research_output?: any;
    sources?: any[];
    interleaved_parts?: any[];
    language?: string;
  }
) {
  const db = await getDb();
  const setFields: any = { updatedAt: new Date() };
  if (updates.status !== undefined) setFields.status = updates.status;
  if (updates.completed_at !== undefined) setFields.completedAt = updates.completed_at;
  if (updates.location_images !== undefined) setFields.locationImages = JSON.stringify(updates.location_images);
  if (updates.research_output !== undefined) setFields.researchOutput = updates.research_output;
  if (updates.sources !== undefined) setFields.sources = updates.sources;
  if (updates.interleaved_parts !== undefined) setFields.interleavedParts = updates.interleaved_parts;
  if (updates.language !== undefined) setFields.language = updates.language;

  await db.collection("researchTasks").updateOne(
    { _id: taskId as any },
    { $set: setFields }
  );
  return { error: null };
}

export async function deleteResearchTask(taskId: string, userId: string) {
  const db = await getDb();
  const result = await db.collection("researchTasks").deleteOne({
    _id: taskId as any,
    userId,
  });
  if (result.deletedCount === 0) return { error: "Task not found" };
  return { error: null };
}

export async function updateResearchTaskByDeepResearchId(
  deepresearchId: string,
  updates: {
    status?: string;
    completed_at?: Date;
  }
) {
  const db = await getDb();
  const setFields: any = { updatedAt: new Date() };
  if (updates.status !== undefined) setFields.status = updates.status;
  if (updates.completed_at !== undefined) setFields.completedAt = updates.completed_at;

  await db.collection("researchTasks").updateOne(
    { deepresearchId },
    { $set: setFields }
  );
  return { error: null };
}

// ============================================================================
// SHARE FUNCTIONS
// ============================================================================

function createLocationSlug(locationName: string): string {
  return locationName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export async function shareResearchTask(taskId: string, userId: string) {
  const db = await getDb();
  const task = await db.collection<ResearchTaskDoc>("researchTasks").findOne({
    _id: taskId as any,
    userId,
  });

  if (!task) return { data: null, error: "Task not found" };

  // If already shared, return existing token
  if (task.isPublic && task.shareToken) {
    return { data: { shareToken: task.shareToken }, error: null };
  }

  const slug = createLocationSlug(task.locationName as string);
  const shortId = crypto.randomUUID().substring(0, 8);
  const shareToken = `${slug}-${shortId}`;

  await db.collection("researchTasks").updateOne(
    { _id: taskId as any },
    {
      $set: {
        isPublic: true,
        shareToken,
        sharedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return { data: { shareToken }, error: null };
}

export async function unshareResearchTask(taskId: string, userId: string) {
  const db = await getDb();
  const result = await db.collection("researchTasks").updateOne(
    { _id: taskId as any, userId },
    {
      $set: {
        isPublic: false,
        shareToken: null,
        sharedAt: null,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return { error: "Task not found or does not belong to user" };
  }
  return { error: null };
}

export async function getPublicResearchTask(shareToken: string) {
  const db = await getDb();
  const task = await db.collection<ResearchTaskDoc>("researchTasks").findOne({
    shareToken,
    isPublic: true,
  });

  if (!task) return { data: null, error: "Not found" };
  return { data: { ...task, id: task._id }, error: null };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse locationImages from its stored JSON string format.
 * Handles double-stringified values defensively.
 */
export function parseLocationImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return JSON.parse(parsed);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
