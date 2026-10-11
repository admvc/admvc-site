"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useToast } from '@/components/ui/ConfirmDialog';

interface FotoUploadProps {
    defaultValue?: string | null;
    onUploadComplete: (url: string) => void; // Callback para o form pai
}

export default function FotoUploadBlob({ defaultValue, onUploadComplete }: FotoUploadProps) {
    const toast = useToast();
    const [preview, setPreview] = useState(defaultValue);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Validar tamanho (ex: 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast("A imagem deve ter no máximo 2MB.", 'aviso');
            return;
        }

        try {
            setUploading(true);

            // 2. Faz o upload direto para o Vercel Blob
            // O SDK cuida de chamar a rota de autenticação automaticamente
            const newBlob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/avatar/upload', // Rota que vamos criar
            });

            // 3. Atualiza o preview e avisa o formulário pai
            setPreview(newBlob.url);
            onUploadComplete(newBlob.url);
            setUploading(false);
        } catch (error) {
            console.error("ERRO DETALHADO DO BLOB:", error); // Olhe o console do navegador (F12)
            toast("Falha ao enviar a foto: " + error.message, 'erro');
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-5 p-8 bg-bg rounded-[3rem] border-2 border-dashed border-soft shadow-inner w-full max-w-sm">
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-soft bg-bg2 flex items-center justify-center shadow-lg">
                {preview ? (
                    <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-5xl text-soft font-black">👤</span>
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <div className="w-6 h-6 border-4 border-figueira border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${uploading ? 'bg-soft text-muted' : 'bg-figueira text-white hover:scale-105 hover:shadow-figueira/30'
                    }`}
            >
                {uploading ? "A enviar..." : preview ? "Alterar Foto" : "Adicionar Foto"}
            </button>

            {/* Input escondido */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            <p className="text-[9px] text-muted uppercase font-bold text-center tracking-tight">
                Formatos aceitos: JPG, PNG, WEBP.<br /> Tamanho máximo de 2MB.
            </p>
        </div>
    );
}