import { denyUnlessOwner } from "@/lib/auth";
import { deletePhoto } from "@/lib/db";
import { removeFile } from "@/lib/storage";

/** Studio: delete a photo, its row and its file. */
export async function DELETE(_: Request, { params }: RouteContext<"/api/studio/photos/[id]">) {
  const denied = await denyUnlessOwner();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "No such photo." }, { status: 404 });
  const key = await deletePhoto(id);
  if (key) await removeFile(key);
  return new Response(null, { status: 204 });
}
