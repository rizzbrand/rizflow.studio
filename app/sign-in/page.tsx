import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { SignInForm } from "@/components/auth/SignInForm";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <AuthPageLayout alternateHref="/sign-up" alternateLabel="Create account">
      <Suspense
        fallback={
          <div className="text-sm text-white/45">Loading sign-in…</div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthPageLayout>
  );
}
