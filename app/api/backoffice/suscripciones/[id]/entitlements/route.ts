import { fromUnknownError, success } from "@/lib/api/response";
import { getSuscripcionEntitlements } from "@/lib/services/backoffice";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await getSuscripcionEntitlements(id);
    return success(data);
  } catch (error) {
    return fromUnknownError(error);
  }
}

