"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PWAGate } from "@/components/pwa-gate";
import { Loader2 } from "lucide-react";
import { markFirstLogin } from "@/components/onboarding-tour";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Get user info
      setUserEmail(user.email);
      setUserName(user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0]);
      
      // Mark this as first login for the tour
      markFirstLogin();
      
      setLoading(false);
    }

    checkUser();
  }, [router]);

  const handleContinue = () => {
    // Redirect to dashboard/welcome
    router.push("/dashboard/welcome");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <PWAGate
      onContinue={handleContinue}
      userName={userName}
      userEmail={userEmail}
    />
  );
}
