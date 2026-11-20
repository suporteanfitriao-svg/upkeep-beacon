import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_APP_ORIGINS = ['https://limpeza.superhostlab.com.br', 'https://upkeep-beacon.lovable.app'];
function isAllowedAppUrl(u: string): boolean {
  try {
    const o = new URL(u);
    return ALLOWED_APP_ORIGINS.includes(o.origin) || /^https:\/\/[a-z0-9-]+--64f4d3ea-6dbf-48c6-abef-31d672075244\.lovable\.app$/.test(o.origin);
  } catch { return false; }
}

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

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

    // Service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the caller's JWT using the service role client (bypasses session requirement)
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({
          error: userError?.name === "AuthSessionMissingError"
            ? "Sessão expirada. Faça login novamente."
            : "Token inválido ou expirado",
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const callerUserId = userData.user.id;
    const callerEmail = userData.user.email;

    // Check if user has admin or manager role
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", callerUserId);
    const callerRoles = (roleRows || []).map((r: { role: string }) => r.role);
    if (!callerRoles.some((r) => ["admin", "manager", "superadmin"].includes(r))) {
      return new Response(
        JSON.stringify({ error: "Permissão negada. Apenas admin ou manager podem enviar reset de senha." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { teamMemberId, appUrl: rawAppUrl }: PasswordResetRequest = await req.json();
    const appUrl = rawAppUrl && isAllowedAppUrl(rawAppUrl) ? new URL(rawAppUrl).origin : ALLOWED_APP_ORIGINS[0];

    if (!teamMemberId) {
      return new Response(
        JSON.stringify({ error: "Email e ID do membro são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Load the target member and make sure it belongs to the caller's organization
    const { data: target } = await supabase.from("team_members")
      .select("id, name, email, role, owner_user_id").eq("id", teamMemberId).maybeSingle();
    if (!target?.email) {
      return new Response(JSON.stringify({ error: "Membro não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    let allowed = callerRoles.includes("superadmin") || (callerRoles.includes("admin") && target.owner_user_id === callerUserId);
    if (!allowed && callerRoles.includes("manager") && target.role === "cleaner") {
      const { data: me } = await supabase.from("team_members").select("owner_user_id")
        .eq("user_id", callerUserId).eq("is_active", true).maybeSingle();
      allowed = !!me?.owner_user_id && me.owner_user_id === target.owner_user_id;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Permissão negada para este membro." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const email: string = target.email;
    const teamMemberName = escapeHtml(target.name || "");

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

    console.log("Password reset email sent");

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
