"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuestionnaireRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push("/questionnaire/new");
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-[#111] text-white">
            <p>Redirecting to Questionnaire...</p>
        </div>
    );
}
