import * as React from 'react';

interface EmailConfirmacaoAgendaProps {
    nome: string;
    titulo: string;
    data: string;
    hora: string;
    pastor: string;
}

export function EmailConfirmacaoAgenda({ nome, titulo, data, hora, pastor }: EmailConfirmacaoAgendaProps) {
    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0a0a0a', color: '#ffffff', padding: '40px', borderRadius: '16px', maxWidth: '600px', margin: '0 auto', border: '1px solid #222' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <span style={{ color: '#84cc16', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                    Gabinete Pastoral
                </span>
                <h1 style={{ fontSize: '24px', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', margin: '10px 0 0 0', color: '#ffffff' }}>
                    Marcação <span style={{ color: '#666' }}>Confirmada.</span>
                </h1>
            </div>

            <p style={{ fontSize: '16px', lineHeight: '1.5', color: '#eaeaea' }}>
                Olá, <strong>{nome}</strong>!
            </p>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#a1a1aa' }}>
                O seu pedido de agenda para <strong>{titulo}</strong> com o <strong>{pastor}</strong> foi aceite e confirmado pela nossa equipa.
            </p>

            {/* CAIXA DE DETALHES */}
            <div style={{ backgroundColor: '#111', padding: '24px', borderRadius: '12px', marginTop: '30px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', marginBottom: '12px' }}>
                    <strong style={{ color: '#84cc16', width: '80px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data:</strong>
                    <span style={{ fontSize: '14px' }}>{data}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '12px' }}>
                    <strong style={{ color: '#84cc16', width: '80px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hora:</strong>
                    <span style={{ fontSize: '14px' }}>{hora}</span>
                </div>
                <div style={{ display: 'flex' }}>
                    <strong style={{ color: '#84cc16', width: '80px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Local:</strong>
                    <span style={{ fontSize: '14px' }}>Presencial (Igreja ADMVC)</span>
                </div>
            </div>

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #222', textAlign: 'center' }}>
                <p style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Se precisar de cancelar, por favor contacte a secretaria.
                </p>
            </div>
            
        </div>
    );
}