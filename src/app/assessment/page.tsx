"use client";

export default function AssessmentPage() {
  return (
    <>
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          background: #fff;
        }
      `}</style>

      <iframe
        src="https://cloudbases.in/cento/assesment/"
        title="Assessment"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          display: "block",
        }}
        allow="fullscreen"
      />
    </>
  );
}