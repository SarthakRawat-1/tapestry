import * as db from '@/lib/db';

export async function GET(req: Request) {
  const { data: { user } } = await db.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const url = new URL(req.url);
  const deepresearchId = url.searchParams.get('deepresearchId');

  // If a specific deepresearchId is requested, return full task with research output
  if (deepresearchId) {
    const { data: tasks } = await db.getResearchTasks(user.id);
    const task = tasks?.find((t: any) => t.deepresearchId === deepresearchId);

    if (!task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Parse locationImages if stored as JSON string
    const images = db.parseLocationImages(task.locationImages as string);

    return new Response(JSON.stringify({
      task: {
        id: task.id || task._id,
        deepresearchId: task.deepresearchId,
        locationName: task.locationName,
        locationLat: task.locationLat,
        locationLng: task.locationLng,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        researchOutput: task.researchOutput || null,
        sources: task.sources || null,
        images,
        interleavedParts: task.interleavedParts || null,
        language: task.language || null,
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Otherwise return the list (without heavy researchOutput for performance)
  const { data: tasks, error } = await db.getResearchTasks(user.id);

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const normalizedTasks = tasks?.map((t: any) => ({
    id: t.id || t._id,
    deepresearchId: t.deepresearchId,
    locationName: t.locationName,
    locationLat: t.locationLat,
    locationLng: t.locationLng,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    completedAt: t.completedAt,
  })) || [];

  return new Response(JSON.stringify({ tasks: normalizedTasks }), {
    headers: { "Content-Type": "application/json" }
  });
}


export async function DELETE(req: Request) {
  const { data: { user } } = await db.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { taskId } = await req.json();

  if (!taskId) {
    return new Response(JSON.stringify({ error: "taskId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await db.deleteResearchTask(taskId, user.id);

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
