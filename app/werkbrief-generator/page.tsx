"use client";
import React, { useState } from "react";
import { Description } from "./_components/Description";
import FileUpload from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { z } from "zod";

type Werkbrief = z.infer<typeof WerkbriefSchema>

const WerkbriefSchema = z.object({
  title: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  skills: z.array(z.string()),
  salaryRange: z.object({ min: z.number(), max: z.number(), currency: z.string().optional() }).optional(),
  benefits: z.array(z.string()).optional(),
});

const WerkBriefHome = () => {
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Werkbrief | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/werkbrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to generate")
      const parsed = WerkbriefSchema.safeParse(data)
      if (!parsed.success) throw new Error("Invalid response shape")
      setResult(parsed.data)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-3xl mx-auto">
      <Description />
      <textarea
        className="w-full min-h-32 p-3 border rounded-md bg-transparent"
        placeholder="Beschrijf de rol, verantwoordelijkheden, sector, senioriteit, etc."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex items-center align-middle justify-center gap-4 w-full">
        <FileUpload />
        <div className="flex flex-col items-center align-middle justify-center gap-3">
          <Button onClick={onGenerate} disabled={loading || !description.trim()}>
            {loading ? "Generating..." : "Generate Werkbrief"}
          </Button>
        </div>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {result && (
        <div className="w-full border rounded-md p-4 text-sm space-y-2">
          <div className="text-lg font-semibold">{result.title}</div>
          <div className="opacity-80">{result.summary}</div>
          <div>
            <div className="font-medium mt-2">Responsibilities</div>
            <ul className="list-disc pl-6">
              {result.responsibilities?.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mt-2">Skills</div>
            <ul className="list-disc pl-6">
              {result.skills?.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          {result.salaryRange && (
            <div className="opacity-80">
              Salaris: {result.salaryRange.min} - {result.salaryRange.max} {result.salaryRange.currency || "EUR"}
            </div>
          )}
          {result.benefits && result.benefits.length > 0 && (
            <div>
              <div className="font-medium mt-2">Benefits</div>
              <ul className="list-disc pl-6">
                {result.benefits.map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WerkBriefHome;