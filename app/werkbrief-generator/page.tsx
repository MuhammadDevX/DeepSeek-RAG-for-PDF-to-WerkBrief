"use client";
import React, { useState } from "react";
import { Description } from "./_components/Description";
import PDFUpload from "@/components/ui/pdf-upload";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";

type Werkbrief = z.infer<typeof WerkbriefSchema>



const WerkBriefHome = () => {
  const [description, setDescription] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Werkbrief | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('description', description)
      if (pdfFile) {
        formData.append('pdf', pdfFile)
      }

      const res = await fetch("/api/werkbrief", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to generate")

      console.log("API Response:", data) // Debug log

      const parsed = WerkbriefSchema.safeParse(data)
      if (!parsed.success) {
        console.error("Schema validation failed:", parsed.error)
        throw new Error(`Invalid response shape: ${parsed.error.message}`)
      }
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
      <div className="flex flex-col items-center align-middle justify-center gap-4 w-full">
        <PDFUpload onFileSelect={setPdfFile} selectedFile={pdfFile} />
        <div className="flex flex-col items-center align-middle justify-center gap-3">
          <Button onClick={onGenerate} disabled={loading || !description.trim()}>
            {loading ? "Generating..." : "Generate Werkbrief"}
          </Button>
        </div>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {result && result.fields && result.fields.length > 0 && (
        <div className="w-full border rounded-md p-4 text-sm space-y-4">
          <div className="text-lg font-semibold">Generated Werkbrief</div>
          <div className="space-y-4">
            {result.fields.map((field, index) => (
              <div key={index} className="border rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><strong>Number:</strong> {field.Number}</div>
                  <div><strong>GOEDEREN CODE:</strong> {field["GOEDEREN CODE"]}</div>
                </div>
                <div><strong>GOEDEREN OMSCHRIJVING:</strong> {field["GOEDEREN OMSCHRIJVING"]}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><strong>CTNS:</strong> {field.CTNS}</div>
                  <div><strong>STKS:</strong> {field.STKS}</div>
                  <div><strong>BRUTO:</strong> {field.BRUTO} kg</div>
                  <div><strong>FOB:</strong> {field.FOB}</div>
                </div>
                {field["AWB - 392754819969-1"] && (
                  <div><strong>AWB:</strong> {field["AWB - 392754819969-1"]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WerkBriefHome;