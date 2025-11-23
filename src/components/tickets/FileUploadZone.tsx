import { useState, useCallback } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface FileWithPreview {
  file: File;
  preview?: string;
  id: string;
}

interface FileUploadZoneProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function FileUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Tipo de arquivo não permitido";
    }

    return null;
  };

  const processFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: FileWithPreview[] = [];

      Array.from(fileList).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          console.error(`❌ ${file.name}: ${error}`);
          return;
        }

        const fileWithPreview: FileWithPreview = {
          file,
          id: `${Date.now()}-${Math.random()}`,
        };

        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileWithPreview.preview = e.target?.result as string;
            onFilesChange([...files, fileWithPreview]);
          };
          reader.readAsDataURL(file);
        } else {
          newFiles.push(fileWithPreview);
        }
      });

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (files.length >= maxFiles) {
        console.error(`❌ Máximo de ${maxFiles} arquivos atingido`);
        return;
      }

      processFiles(e.dataTransfer.files);
    },
    [files, maxFiles, processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-2">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Máximo: {maxFiles} arquivos de {maxSizeMB}MB cada
        </p>
        <input
          type="file"
          id="file-upload"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={handleFileInput}
          className="hidden"
          disabled={files.length >= maxFiles}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={files.length >= maxFiles}
        >
          Selecionar Arquivos
        </Button>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((fileItem) => (
            <Card key={fileItem.id} className="p-3 relative group">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => removeFile(fileItem.id)}
              >
                <X className="h-3 w-3" />
              </Button>

              <div className="aspect-square mb-2 rounded overflow-hidden bg-muted flex items-center justify-center">
                {fileItem.preview ? (
                  <img
                    src={fileItem.preview}
                    alt={fileItem.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              <p className="text-xs font-medium truncate" title={fileItem.file.name}>
                {fileItem.file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileItem.file.size)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
