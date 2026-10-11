"use client";

import { useState } from "react";

export default function FotoUpload({ defaultValue }: { defaultValue?: string }) {
    const [preview, setPreview] = useState(defaultValue);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreview(URL.createObjectURL(file)); // Gera preview temporário
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-bg rounded-2xl border-2 border-dashed border-soft">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-soft bg-bg2 flex items-center justify-center">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-4xl text-soft">👤</span>
                )}
            </div>

            <label className="cursor-pointer bg-figueira text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                Selecionar Foto
                <input
                    type="file"
                    name="avatar_file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </label>
            <p className="text-[9px] text-muted uppercase font-bold">JPG ou PNG (Máx. 2MB)</p>
        </div>
    );
}