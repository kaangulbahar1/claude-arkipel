import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { SurveyForm } from "@/components/SurveyForm";

export const metadata: Metadata = { title: "Anket · Arkipel" };

export default function SurveyPage() {
  return (
    <div className="wrap">
      <header className="topbar">
        <Brand />
        <span className="label">Yaklaşık 5 dakika</span>
      </header>
      <main>
        <Suspense>
          <SurveyForm />
        </Suspense>
      </main>
    </div>
  );
}
