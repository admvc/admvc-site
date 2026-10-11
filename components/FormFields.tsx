// components/FormFields.tsx

export function EditableField({ label, name, defaultValue, isSelect, options, isTextarea, type = "text" }: any) {
    const baseClass = "w-full rounded-2xl border border-soft bg-bg px-4 py-3 text-sm outline-none focus:border-figueira transition-all";
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted uppercase ml-2 tracking-tighter">{label}</label>
            {isSelect ? (
                <select name={name} defaultValue={defaultValue} className={baseClass}>
                    {options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : isTextarea ? (
                <textarea name={name} defaultValue={defaultValue} className={`${baseClass} h-32`} />
            ) : (
                <input name={name} type={type} defaultValue={defaultValue} className={baseClass} />
            )}
        </div>
    );
}

export function ReadOnlyField({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-4 bg-soft/5 border border-dashed border-soft rounded-2xl">
            <p className="text-[10px] font-bold text-muted uppercase tracking-tighter">{label}</p>
            <p className="text-sm font-bold text-fg/60">{value || '---'}</p>
        </div>
    );
}