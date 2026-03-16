import * as db from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing share token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { data: task, error } = await db.getPublicResearchTask(token);

  if (error || !task) {
    return new Response(JSON.stringify({ error: "Research not found or is not shared" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Parse locationImages if stored as JSON string
  const images = db.parseLocationImages(task.locationImages as string);

  return new Response(JSON.stringify({
    task: {
      ...task,
      id: task.id || task._id,
      locationImages: images,
      researchOutput: task.researchOutput || null,
      sources: task.sources || null,
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
