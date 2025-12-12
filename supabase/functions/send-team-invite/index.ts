import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamInviteRequest {
  name: string;
  email: string;
  role: string;
  appUrl: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  cleaner: "Limpeza",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-team-invite function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, role, appUrl }: TeamInviteRequest = await req.json();
    console.log("Sending invite to:", email, "Role:", role);

    const roleLabel = roleLabels[role] || role;

    const emailResponse = await resend.emails.send({
      from: "Equipe <onboarding@resend.dev>",
      to: [email],
      subject: "Você foi adicionado à equipe!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #1a1a1a; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
            .role-badge { display: inline-block; background: #3b82f6; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; }
            .info-row { margin: 16px 0; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { color: #6b7280; font-size: 14px; }
            .info-value { color: #1a1a1a; font-weight: 500; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; }
            .instructions { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-top: 20px; }
            .instructions h3 { margin-top: 0; color: #1a1a1a; }
            .instructions ol { margin: 0; padding-left: 20px; }
            .instructions li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo à Equipe!</h1>
            </div>
            
            <div class="content">
              <p>Olá <strong>${name}</strong>,</p>
              <p>Você foi adicionado à equipe de gestão de propriedades.</p>
              
              <div class="info-row">
                <div class="info-label">Sua função:</div>
                <div><span class="role-badge">${roleLabel}</span></div>
              </div>
              
              <div class="instructions">
                <h3>📋 Instruções de Acesso</h3>
                <ol>
                  <li>Acesse o sistema clicando no botão abaixo</li>
                  <li>Clique em <strong>"Criar conta"</strong> na tela de login</li>
                  <li>Use este email (<strong>${email}</strong>) para criar sua conta</li>
                  <li>Defina uma senha segura</li>
                  <li>Após criar a conta, você terá acesso às funcionalidades da sua função</li>
                </ol>
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}" class="button">Acessar Sistema</a>
              </div>
            </div>
            
            <div class="footer">
              <p>Se você não esperava este email, pode ignorá-lo com segurança.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
