"use client";
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TemplateEditorView from "../TemplateEditorView";

function TemplateEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId") || searchParams.get("id") || undefined;
  const ratio = (searchParams.get("ratio") as any) || undefined;

  const handleNavigate = (view: string) => {
    if (view === "dashboard") {
      router.push("/store_user");
    } else {
      router.push(`/store_user?view=${view}`);
    }
  };

  return (
    <TemplateEditorView
      onNavigate={handleNavigate}
      initialTemplateId={templateId}
      initialRatio={ratio}
    />
  );
}

export default function TemplateEditorPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", maxHeight: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Suspense fallback={<div style={{ padding: 40, color: "#fff", background: "#051419", minHeight: "100vh" }}>Loading Studio...</div>}>
        <TemplateEditorContent />
      </Suspense>
    </div>
  );
}
