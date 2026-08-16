import { connection } from "next/server";

import { LoginForm } from "@/features/auth/components/login-form";
import { getLoginLocations } from "@/features/locations/data/get-login-locations";

export default async function Home() {
  await connection();
  const locations = await getLoginLocations();

  return (
    <main className="flex w-full flex-1 items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          backendMessage={locations.message}
          backendReady={locations.backendReady}
          regions={locations.regions}
        />
      </div>
    </main>
  );
}
