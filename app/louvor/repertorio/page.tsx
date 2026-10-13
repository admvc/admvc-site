// O "Repertorio" antigo (lista de cultos) passou para a pagina de cada escala;
// o repertorio agora e a lista das musicas.
import { redirect } from 'next/navigation'

export default function RepertorioAntigo() {
    redirect('/louvor/musicas')
}
