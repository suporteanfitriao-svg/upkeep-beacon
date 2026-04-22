import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  teamMemberId: string;
  teamMemberName: string;
  email: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use anon client with caller's token to validate identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const callerUserId = claimsData.claims.sub;
    const callerEmail = claimsData.claims.email;

    // Service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin or manager role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .single();

    if (roleError || !roleData || !["admin", "manager"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Permissão negada. Apenas admin ou manager podem enviar reset de senha." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { teamMemberId, teamMemberName, email, appUrl }: PasswordResetRequest = await req.json();

    if (!email || !teamMemberId) {
      return new Response(
        JSON.stringify({ error: "Email e ID do membro são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password reset link using Supabase Auth
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${appUrl}/auth?reset=true`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de reset. Verifique se o email está cadastrado." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with Resend
    const emailResponse = await resend.emails.send({
      from: "Limpeza <onboarding@resend.dev>",
      to: [email],
      subject: "Redefinição de Senha",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Olá, ${teamMemberName}!</h1>
          <p>Você recebeu uma solicitação para redefinir sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetData.properties?.action_link}" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Redefinir Senha
          </a>
          <p style="color: #666; font-size: 14px;">
            Este link expira em 60 minutos. Se você não solicitou esta redefinição, ignore este email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            Este email foi enviado automaticamente pelo sistema de gestão de limpeza.
          </p>
        </div>
      `,
    });

    console.log("Password reset email sent:", emailResponse);

    // Log audit event
    await supabase.from("team_member_audit_logs").insert({
      team_member_id: teamMemberId,
      user_id: callerUserId,
      action: "enviou_reset_senha",
      details: { email, sent_by: callerEmail },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email de redefinição enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
