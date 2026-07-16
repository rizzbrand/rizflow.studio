import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <AuthPageLayout alternateHref="/sign-in" alternateLabel="Sign in">
      <Suspense
        fallback={
          <div className="text-sm text-white/45">Loading sign-up…</div>
        }
      >
        <SignUpForm />
      </Suspense>
    </AuthPageLayout>
  );
}
