// lib/mail.ts
import { Resend } from 'resend';

export async function enviarEmailNotificacaoEquipa(dados: { nome: string, telefone: string, pedido: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Lógica para identificar a origem e ajustar Subject e Cores
  const isContactoSite = dados.pedido?.includes('[CONTACTO SITE]') ?? false;

  const config = {
    subject: isContactoSite
      ? `✉️ Mensagem do Site: ${dados.nome}`
      : `🌱 Novo Visitante: ${dados.nome}`,
    headerColor: isContactoSite
      ? '#1a202c' // Cor mais escura para Contactos Gerais
      : '#3F6B4F', // Verde Figueira para Novos Visitantes
    title: isContactoSite
      ? 'Contacto Geral'
      : 'Novo Acolhimento'
  };

  const telefoneLimpo = dados.telefone.replace(/\D/g, '');
  const linkWhatsapp = `https://wa.me/${telefoneLimpo}`;
  const linkDashboard = `https://igrejaadmvc.org/departamentos/acolhimento`;

  try {
    const destinatario = process.env.NOTIFICATION_EMAIL || 'admvcff@gmail.com';

    const { data, error } = await resend.emails.send({
      from: 'Sistema ADMVC <acolhimento@igrejaadmvc.org>',
      to: destinatario,
      subject: config.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
          
          <div style="background-color: ${config.headerColor}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; font-style: italic; font-weight: 900;">
              ${config.title}
            </h1>
          </div>

          <div style="padding: 30px; color: #1a202c;">
            <p style="font-size: 16px; line-height: 1.6;">
              Olá equipa! Alguém acabou de contactar a nossa casa através da página de <strong>${isContactoSite ? 'Contacto' : 'Boas-vindas'}</strong>.
            </p>

            <div style="background-color: #f8fafc; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #edf2f7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <span style="font-size: 10px; font-weight: 800; color: ${config.headerColor}; text-transform: uppercase; letter-spacing: 1px;">Nome</span><br />
                    <strong style="font-size: 18px;">${dados.nome}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <span style="font-size: 10px; font-weight: 800; color: ${config.headerColor}; text-transform: uppercase; letter-spacing: 1px;">Contacto</span><br />
                    <span style="font-size: 14px;">${dados.telefone}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size: 10px; font-weight: 800; color: ${config.headerColor}; text-transform: uppercase; letter-spacing: 1px;">Mensagem / Pedido</span><br />
                    <p style="font-size: 14px; color: #4a5568; font-style: italic; margin-top: 5px; line-height: 1.5; white-space: pre-line;">
                      "${dados.pedido || 'Sem pedido de oração'}"
                    </p>
                  </td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${linkWhatsapp}" target="_blank" style="display: block; background-color: #25D366; color: #ffffff; padding: 15px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; text-align: center;">
                Falar no WhatsApp agora
              </a>
              
              <a href="${linkDashboard}" target="_blank" style="display: block; background-color: #1a202c; color: #ffffff; padding: 15px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                Ver na Dashboard do Acolhimento
              </a>
            </div>
          </div>

          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b;">
            <p style="margin: 0;">Este é um aviso automático do Sistema ADMVC.</p>
            <p style="margin: 5px 0 0 0; font-weight: bold;">"Sê muito bem-vindo, fica para sempre!"</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error(`[MAIL] Erro Resend [${config.title}]:`, error);
      return { ok: false, error: error.message };
    }

    console.log(`[MAIL] Notificação [${config.title}] enviada para ${destinatario}`);
    return { ok: true };
  } catch (err) {
    console.error("[MAIL] Erro ao enviar notificação equipa:", err);
    return { ok: false, error: String(err) };
  }
}

// ── EMAIL DE BOAS-VINDAS (primeiro login) ────────────────────────────────────
export async function enviarEmailBoasVindas(nome: string, email: string, senha?: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const linkDashboard = 'https://app.igrejaadmvc.org/membros/login';

  try {
    const { data, error } = await resend.emails.send({
      from: 'Igreja ADMVC <acolhimento@igrejaadmvc.org>',
      to: email,
      subject: `Bem-vindo(a) a Igreja ADMVC, ${nome}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff;">

          <div style="background-color: #3F6B4F; padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">
              Bem-vindo(a)!
            </h1>
            <p style="color: #d4edda; margin: 10px 0 0 0; font-size: 14px;">
              Igreja Assembleia de Deus Ministerio Vida Crista
            </p>
          </div>

          <div style="padding: 30px; color: #1a202c;">
            <p style="font-size: 16px; line-height: 1.8;">
              Ola <strong>${nome}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.8;">
              O seu acesso ao sistema da igreja foi criado com sucesso.
              A partir de agora pode acompanhar escalas, eventos, grupos e muito mais pela sua area de membro.
            </p>

            ${senha ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; margin: 20px 0;">
              <p style="font-size: 10px; font-weight: 800; color: #3F6B4F; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">As suas credenciais</p>
              <p style="font-size: 14px; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="font-size: 14px; margin: 5px 0;"><strong>Senha:</strong> ${senha}</p>
              <p style="font-size: 11px; color: #64748b; margin: 10px 0 0 0;">Recomendamos que altere a senha apos o primeiro acesso.</p>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkDashboard}" target="_blank" style="display: inline-block; background-color: #3F6B4F; color: #ffffff; padding: 15px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                Aceder a minha area
              </a>
            </div>

            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Caso tenha alguma duvida, fale com a equipa de acolhimento ou responda a este email.
            </p>
          </div>

          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b;">
            <p style="margin: 0;">Este e um email automatico do Sistema ADMVC.</p>
            <p style="margin: 5px 0 0 0; font-weight: bold;">"Se muito bem-vindo, fica para sempre!"</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('[BOAS-VINDAS] Erro Resend:', error);
      return { ok: false };
    }

    console.log(`[BOAS-VINDAS] Email enviado para ${email}`);
    return { ok: true };
  } catch (err) {
    console.error('[BOAS-VINDAS] Erro ao enviar email:', err);
    return { ok: false };
  }
}