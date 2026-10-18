"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { UploadSimple, Image as ImageIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface DropzoneProps {
  onFileChosen: (file: File) => void;
}

export function Dropzone({ onFileChosen }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileChosen(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-line bg-paper-warm px-6 py-16 text-center transition-colors",
        isDragActive && "border-teal bg-teal-tint"
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-tint text-teal">
        {isDragActive ? <ImageIcon size={26} weight="regular" /> : <UploadSimple size={26} weight="regular" />}
      </span>
      <div>
        <p className="text-base font-medium text-ink">
          Drag a photo here, or click to choose one
        </p>
        <p className="mt-1 text-sm text-ink-muted">JPG, PNG, or WebP · up to 10 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileChosen(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
