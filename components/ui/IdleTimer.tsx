"use client"
import { useEffect } from 'react'
import { logoutAdmin } from '@/actions/auth-actions'

export default function IdleTimer() {
    const TEMPO_LIMITE = 30 * 60 * 1000; // 30 Minutos

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                console.log("Inatividade detectada. Fazendo logoff...");
                logoutAdmin();
            }, TEMPO_LIMITE);
        };

        // Eventos que reiniciam o cronômetro
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);
        window.addEventListener('scroll', resetTimer);
        window.addEventListener('click', resetTimer);

        resetTimer(); // Inicia o timer ao montar

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
            window.removeEventListener('scroll', resetTimer);
            window.removeEventListener('click', resetTimer);
            clearTimeout(timer);
        };
    }, []);

    return null; // Componente invisível
}