import { denyUnlessOwner } from "@/lib/auth";
import { deleteBrick } from "@/lib/db";

/** Studio: take a brick out of the wall. The live wall drops it for every visitor. */
export async function DELETE(_: Request, { params }: RouteContext<"/api/studio/bricks/[id]">) {
  const denied = await denyUnlessOwner();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "No such brick." }, { status: 404 });
  await deleteBrick(id);
  return new Response(null, { status: 204 });
}
