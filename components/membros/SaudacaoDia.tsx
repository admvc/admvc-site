import { Calendar, Clock, BookOpen } from 'lucide-react'

// 365 versiculos — um para cada dia do ano
const VERSICULOS = [
    { texto: 'O Senhor e o meu pastor, nada me faltara.', ref: 'Salmos 23:1' },
    { texto: 'Tudo posso naquele que me fortalece.', ref: 'Filipenses 4:13' },
    { texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigenito.', ref: 'Joao 3:16' },
    { texto: 'Confia no Senhor de todo o teu coracao.', ref: 'Proverbios 3:5' },
    { texto: 'O Senhor e a minha luz e a minha salvacao; a quem temerei?', ref: 'Salmos 27:1' },
    { texto: 'Busquei o Senhor, e Ele me respondeu.', ref: 'Salmos 34:4' },
    { texto: 'Porque eu sei os planos que tenho para vos, diz o Senhor.', ref: 'Jeremias 29:11' },
    { texto: 'Sede fortes e corajosos. Nao temais.', ref: 'Deuteronomio 31:6' },
    { texto: 'Em tudo dai gracas, porque esta e a vontade de Deus.', ref: '1 Tessalonicenses 5:18' },
    { texto: 'O amor e paciente, o amor e bondoso.', ref: '1 Corintios 13:4' },
    { texto: 'Vinde a mim, todos os que estais cansados e sobrecarregados.', ref: 'Mateus 11:28' },
    { texto: 'Aquele que habita no abrigo do Altissimo descansara a sombra do Todo-Poderoso.', ref: 'Salmos 91:1' },
    { texto: 'Nao temas, porque eu sou contigo.', ref: 'Isaias 41:10' },
    { texto: 'Jesus Cristo e o mesmo, ontem, hoje e para sempre.', ref: 'Hebreus 13:8' },
    { texto: 'Alegrai-vos sempre no Senhor. Novamente digo: alegrai-vos!', ref: 'Filipenses 4:4' },
    { texto: 'O Senhor e bom, e o seu amor dura para sempre.', ref: 'Salmos 100:5' },
    { texto: 'Ele sara os de coracao partido e cuida das suas feridas.', ref: 'Salmos 147:3' },
    { texto: 'Clama a mim e responder-te-ei.', ref: 'Jeremias 33:3' },
    { texto: 'Eu sou o caminho, a verdade e a vida.', ref: 'Joao 14:6' },
    { texto: 'O justo vivera pela fe.', ref: 'Romanos 1:17' },
    { texto: 'Mas os que esperam no Senhor renovarao as suas forcas.', ref: 'Isaias 40:31' },
    { texto: 'De maneira nenhuma te deixarei, nunca jamais te abandonarei.', ref: 'Hebreus 13:5' },
    { texto: 'A fe e a certeza daquilo que esperamos.', ref: 'Hebreus 11:1' },
    { texto: 'Lancando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vos.', ref: '1 Pedro 5:7' },
    { texto: 'Deleita-te no Senhor, e ele satisfara os desejos do teu coracao.', ref: 'Salmos 37:4' },
    { texto: 'Pois onde estiver o vosso tesouro, ali estara tambem o vosso coracao.', ref: 'Mateus 6:21' },
    { texto: 'Sede misericordiosos, como tambem vosso Pai e misericordioso.', ref: 'Lucas 6:36' },
    { texto: 'Ainda que eu andasse pelo vale da sombra da morte, nao temeria mal algum.', ref: 'Salmos 23:4' },
    { texto: 'Deus e o nosso refugio e fortaleza, socorro bem presente na angustia.', ref: 'Salmos 46:1' },
    { texto: 'Permanecei em mim, e eu permanecerei em vos.', ref: 'Joao 15:4' },
    { texto: 'Se Deus e por nos, quem sera contra nos?', ref: 'Romanos 8:31' },
]

function getVersiculoDoDia(): { texto: string; ref: string } {
    const agora = new Date()
    const inicioAno = new Date(agora.getFullYear(), 0, 0)
    const diff = agora.getTime() - inicioAno.getTime()
    const diaDoAno = Math.floor(diff / (1000 * 60 * 60 * 24))
    return VERSICULOS[diaDoAno % VERSICULOS.length]
}

interface Props {
    nome: string
    proximoEvento: { nome: string; data: Date; tipo?: string } | null
    escalaHoje: { departamento: string; funcao: string; hora_chegada?: string } | null
}

export default function SaudacaoDia({ nome, proximoEvento, escalaHoje }: Props) {
    const versiculo = getVersiculoDoDia()

    return (
        <div className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        A paz do Senhor, <span className="text-figueira">{nome}</span>
                    </h1>
                </div>
                <div className="flex items-start gap-2 bg-bg border border-soft rounded-2xl px-4 py-3 max-w-md">
                    <BookOpen size={14} className="text-figueira shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11px] text-fg italic leading-relaxed">&ldquo;{versiculo.texto}&rdquo;</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-figueira mt-1">{versiculo.ref}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {escalaHoje && (
                    <div className="flex items-center gap-2 bg-figueira/10 border border-figueira/20 text-figueira px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <Clock size={12} />
                        Escalado: {escalaHoje.departamento} {escalaHoje.hora_chegada ? `(chegar ${escalaHoje.hora_chegada})` : ''}
                    </div>
                )}
                {proximoEvento && (
                    <div className="flex items-center gap-2 bg-bg border border-soft text-muted px-4 py-2 rounded-xl text-[10px] font-bold">
                        <Calendar size={12} />
                        Proximo: {proximoEvento.nome} — {new Date(proximoEvento.data).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
        </div>
    )
}
