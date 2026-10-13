// Bloco da data como no LouveApp: dia grande, mes e hora.
import { diaEMes, hora } from './datas'

export default function BlocoData({ iso }: { iso: string }) {
    const { dia, mes } = diaEMes(iso)
    return (
        <span className="flex w-[76px] shrink-0 flex-col items-center justify-center rounded-[16px] py-3 leading-tight"
            style={{ background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }}>
            <span className="text-[26px] font-bold">{dia}</span>
            <span className="text-[16px] font-semibold capitalize">{mes}</span>
            <span className="mt-1 text-[15px]">{hora(iso)}</span>
        </span>
    )
}
