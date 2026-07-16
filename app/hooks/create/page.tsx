import { Suspense } from "react";
import { CreateHookWorkspace } from "@/components/studio/hooks/CreateHookWorkspace";
import { Loader2 } from "lucide-react";

function CreateHookFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" />
    </div>
  );
}

export default function CreateHookPage() {
  return (
    <Suspense fallback={<CreateHookFallback />}>
      <CreateHookWorkspace />
    </Suspense>
  );
}
