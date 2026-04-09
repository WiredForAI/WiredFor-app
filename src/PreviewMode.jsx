import { useState, useEffect } from "react";
import { GuidedReveal } from "./CareerMatch.jsx";

export default function PreviewMode() {
  const [result, setResult]       = useState(null);
  const [step, setStep]           = useState(0);
  const [resumeData, setResumeData] = useState(null);
  const [careerPaths, setCareerPaths] = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("careermatch_result");
    if (!stored) {
      setError("No test profile found — generate one from the admin panel.");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.resumeData)  setResumeData(parsed.resumeData);
      if (parsed.careerPaths) setCareerPaths(parsed.careerPaths);
      setResult(parsed);
    } catch {
      setError("Test profile data is corrupted — generate a new one from the admin panel.");
    }
  }, []);

  if (error) return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0A0A0A", color: "#9B9B9B",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", fontSize: 15, textAlign: "center",
      padding: "0 24px",
    }}>
      {error}
    </div>
  );

  if (!result) return null;

  return (
    <GuidedReveal
      result={result}
      step={step}
      wfId={localStorage.getItem("careermatch_wf_id") || "preview"}
      onNext={() => setStep(s => s + 1)}
      onComplete={() => {}}
      jobs={[]}
      jobsLoading={false}
      jobsError={null}
      resumeData={resumeData}
      resumeUploading={false}
      resumeError={null}
      resumeFileName={null}
      onResumeUpload={() => {}}
    />
  );
}
