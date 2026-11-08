import { createInstagramMediaHandler } from "@instaconnect/next/server";
import { getInstagramServerClient } from "@/lib/instagram";

export const GET = createInstagramMediaHandler({
  client: getInstagramServerClient()
});

