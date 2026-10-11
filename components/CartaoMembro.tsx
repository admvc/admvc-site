// components/CartaoMembro.tsx

export function CartaoMembroDigital({ membro }: { membro: any }) {
    if (!membro) return null; // Proteção extra

    return (
        <div className="relative w-full max-w-[320px] mx-auto aspect-[1/1.58] bg-[#1a1a1a] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 p-8">
            <div className="text-center space-y-4">
                <h3 className="text-white font-black italic text-2xl">ADMVC</h3>
                <div className="w-32 h-32 mx-auto rounded-3xl border-2 border-figueira p-1">
                    <div className="w-full h-full bg-white/5 rounded-2xl flex items-center justify-center text-figueira text-4xl font-black">
                        {membro.first_name?.[0] || "?"}
                    </div>
                </div>
                <h4 className="text-white text-xl font-black uppercase tracking-tighter">
                    {membro.first_name} {membro.last_name}
                </h4>
                <div className="pt-4 border-t border-white/10 text-left">
                    <p className="text-[8px] text-muted uppercase font-bold">Membro ID</p>
                    <p className="text-white font-mono text-sm">#{String(membro.id).padStart(5, '0')}</p>
                </div>
            </div>
        </div>
    );
}