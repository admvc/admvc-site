export function gerarLinkWhatsapp(telefone: string, mensagem: string) {
    // Remove tudo que não for número
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Adiciona o DDI 55 se não tiver (ajuste se necessário)
    const numeroFinal = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;

    return `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`;
}