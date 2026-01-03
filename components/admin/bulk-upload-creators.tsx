"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Download, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"
import { generateSampleCSV, generateSampleJSON, UploadResult } from "@/lib/creator-upload"

export function BulkUploadCreators() {
  const [uploadContent, setUploadContent] = useState("")
  const [uploadFormat, setUploadFormat] = useState<"csv" | "json">("csv")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  const handleDownloadTemplate = () => {
    const content = uploadFormat === "csv" ? generateSampleCSV() : generateSampleJSON()
    const blob = new Blob([content], { type: uploadFormat === "csv" ? "text/csv" : "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `creator-upload-template.${uploadFormat}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Template downloaded as ${uploadFormat.toUpperCase()}`)
  }

  const handleUpload = async () => {
    if (!uploadContent.trim()) {
      toast.error("Please paste your upload content first")
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const response = await fetch("/api/admin/bulk-upload-creators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: uploadContent,
          format: uploadFormat,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setUploadResult(data)
      
      if (data.success) {
        toast.success(`Successfully created ${data.created} creator(s)`)
        if (data.errors.length > 0) {
          toast.error(`${data.errors.length} error(s) occurred`)
        }
      } else {
        toast.error("Upload failed. Check the results below.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
      setUploadResult({
        success: false,
        created: 0,
        errors: [{ row: 0, tag: "", error: error instanceof Error ? error.message : "Unknown error" }],
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setUploadContent(content)
      
      // Auto-detect format from file extension
      if (file.name.endsWith(".json")) {
        setUploadFormat("json")
      } else if (file.name.endsWith(".csv")) {
        setUploadFormat("csv")
      }
      
      toast.success("File loaded successfully")
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Creators</CardTitle>
          <CardDescription>
            Upload multiple creator shows at once with all their metadata including RSS feeds, community links, and subdomains.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={uploadFormat} onValueChange={(value) => setUploadFormat(value as "csv" | "json")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV Format</TabsTrigger>
              <TabsTrigger value="json">JSON Format</TabsTrigger>
            </TabsList>
            
            <TabsContent value="csv" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>CSV Format</AlertTitle>
                <AlertDescription>
                  Use pipe (|) to separate multiple RSS feeds. Each row represents one creator.
                  Required fields: tag, name. Optional: category, subdomain, feeds, and community links.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>JSON Format</AlertTitle>
                <AlertDescription>
                  Upload an array of creator objects. Each object can include all metadata fields.
                  Required fields: tag, name. All other fields are optional.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button onClick={handleDownloadTemplate} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download {uploadFormat.toUpperCase()} Template
            </Button>
            <div className="flex-1">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md border border-input">
                  <Upload className="h-4 w-4" />
                  Upload File
                </div>
              </Label>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-content">Paste Your {uploadFormat.toUpperCase()} Content</Label>
            <Textarea
              id="upload-content"
              value={uploadContent}
              onChange={(e) => setUploadContent(e.target.value)}
              placeholder={`Paste your ${uploadFormat.toUpperCase()} content here...`}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleUpload} disabled={isUploading || !uploadContent.trim()} className="w-full">
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Processing..." : "Upload Creators"}
          </Button>
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Upload Results
            </CardTitle>
            <CardDescription>
              Created: {uploadResult.created} | Errors: {uploadResult.errors.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label>Errors and Warnings:</Label>
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-2">
                  {uploadResult.errors.map((error, index) => (
                    <Alert key={index} variant={error.error.startsWith("Warning") ? "default" : "destructive"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>
                        Row {error.row} {error.tag && `(${error.tag})`}
                      </AlertTitle>
                      <AlertDescription>{error.error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
            
            {uploadResult.created > 0 && (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Successfully created {uploadResult.created} creator show{uploadResult.created !== 1 ? "s" : ""}.
                  Refresh the page to see them in the tags list.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
