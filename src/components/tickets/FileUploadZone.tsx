import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import imageCompression from "browser-image-compression";

export interface FileWithPreview {
  file: File;
  preview?: string;
  id: string;
  originalSize?: number;
  compressedSize?: number;
  isCompressing?: boolean;
}

interface FileUploadZoneProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  compressionOptions?: {
    enabled?: boolean;
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
  };
}

export function FileUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
  compressionOptions = {
    enabled: true,
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    quality: 0.8,
  },
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Keep latest files in a ref to avoid stale closures inside async callbacks
  const filesRef = useRef<FileWithPreview[]>(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const updateFiles = useCallback(
    (updater: (prev: FileWithPreview[]) => FileWithPreview[]) => {
      const next = updater(filesRef.current);
      filesRef.current = next;
      onFilesChange(next);
    },
    [onFilesChange]
  );

  const compressImageFile = async (file: File): Promise<File> => {
    if (!compressionOptions.enabled) return file;

    const options = {
      maxSizeMB: compressionOptions.maxSizeMB || 1,
      maxWidthOrHeight: compressionOptions.maxWidthOrHeight || 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: compressionOptions.quality || 0.8,
      alwaysKeepResolution: false,
    };

    try {
      console.log(`🖼️ Comprimindo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const compressedFile = await imageCompression(file, options);
      
      const originalSizeMB = file.size / 1024 / 1024;
      const compressedSizeMB = compressedFile.size / 1024 / 1024;
      const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      
      console.log(
        `✅ Compressão concluída: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${reduction}% menor)`
      );
      
      return compressedFile;
    } catch (error) {
      console.error('❌ Erro ao comprimir imagem:', error);
      return file;
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
    }
    return null;
  };

  const processFiles = useCallback(
    async (fileList: FileList) => {
      for (const file of Array.from(fileList)) {
        const error = validateFile(file);
        if (error) {
          console.error(`❌ ${file.name}: ${error}`);
          continue;
        }

        const fileId = `${Date.now()}-${Math.random()}`;
        const originalSize = file.size;

        if (file.type.startsWith("image/")) {
          const tempFileWithPreview: FileWithPreview = {
            file,
            id: fileId,
            originalSize,
            isCompressing: true,
          };

          updateFiles((prev) => [...prev, tempFileWithPreview]);

          try {
            const processedFile = await compressImageFile(file);
            const preview = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve((e.target?.result as string) ?? "");
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(processedFile);
            });

            const updatedFile: FileWithPreview = {
              file: processedFile,
              preview,
              id: fileId,
              originalSize,
              compressedSize: processedFile.size,
              isCompressing: false,
            };

            updateFiles((prev) =>
              prev.map((f) => (f.id === fileId ? updatedFile : f))
            );
          } catch (err) {
            console.error(`❌ Falha ao processar imagem ${file.name}:`, err);
            // Keep the original file so the user doesn't silently lose it
            updateFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { file, id: fileId, originalSize, isCompressing: false }
                  : f
              )
            );
          }
        } else {
          updateFiles((prev) => [
            ...prev,
            { file, id: fileId, originalSize },
          ]);
        }
      }
    },
    [updateFiles, compressImageFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (filesRef.current.length >= maxFiles) {
        console.error(`❌ Máximo de ${maxFiles} arquivos atingido`);
        return;
      }

      processFiles(e.dataTransfer.files);
    },
    [maxFiles, processFiles]
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
          accept="*/*"
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
        <div className="space-y-4">
          {files.some(f => f.isCompressing) && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Comprimindo imagens para otimizar o upload...
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((fileItem) => (
              <Card key={fileItem.id} className="p-3 relative group">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={() => removeFile(fileItem.id)}
                  disabled={fileItem.isCompressing}
                >
                  <X className="h-3 w-3" />
                </Button>

                <div className="aspect-square mb-2 rounded overflow-hidden bg-muted flex items-center justify-center relative">
                  {fileItem.preview ? (
                    <>
                      <img
                        src={fileItem.preview}
                        alt={fileItem.file.name}
                        className={`w-full h-full object-cover ${
                          fileItem.isCompressing ? 'opacity-50' : ''
                        }`}
                      />
                      {fileItem.isCompressing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                          <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                          <span className="text-xs text-white font-medium">
                            Comprimindo...
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                <p className="text-xs font-medium truncate" title={fileItem.file.name}>
                  {fileItem.file.name}
                </p>
                
                {fileItem.compressedSize && fileItem.originalSize ? (
                  <div className="mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.compressedSize)}
                      <span className="text-green-600 dark:text-green-400 ml-1">
                        (-{((1 - fileItem.compressedSize / fileItem.originalSize) * 100).toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(fileItem.file.size)}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {files.some(f => f.compressedSize) && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Economia de Storage
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tamanho Original:</p>
                  <p className="font-semibold">
                    {formatFileSize(
                      files.reduce((sum, f) => sum + (f.originalSize || f.file.size), 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Após Compressão:</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatFileSize(
                      files.reduce((sum, f) => sum + f.file.size, 0)
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                Você economizou{' '}
                {(
                  (1 -
                    files.reduce((sum, f) => sum + f.file.size, 0) /
                    files.reduce((sum, f) => sum + (f.originalSize || f.file.size), 0)) *
                  100
                ).toFixed(1)}
                % de espaço no storage!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
