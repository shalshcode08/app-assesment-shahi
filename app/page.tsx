import { LoginForm } from "@/features/auth/components/login-form";

export default function Home() {
  return (
    <main className="flex w-full flex-1 items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
