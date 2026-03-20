import Link from "next/link";
import { Button } from "../ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { getAppUserFromServer } from "@/lib/auth/app-user";

export async function AuthButton() {
  const supabase = await createClient();
  const user = await getAppUserFromServer(supabase);
  const email = user?.email ?? null;

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {email ?? 'User'}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
