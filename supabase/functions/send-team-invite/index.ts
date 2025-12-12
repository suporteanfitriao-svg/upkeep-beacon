import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Simple HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

// Validate input data
function validateInput(data: any): { valid: boolean; error?: string; parsed?: TeamInviteRequest } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { name, email, role, appUrl } = data;

  // Validate name
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    return { valid: false, error: 'Name must be between 1 and 100 characters' };
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
    return { valid: false, error: 'Invalid email address' };
  }

  // Validate role
  const validRoles = ['admin', 'manager', 'cleaner'];
  if (!role || !validRoles.includes(role)) {
    return { valid: false, error: 'Role must be admin, manager, or cleaner' };
  }

  // Validate appUrl
  if (!appUrl || typeof appUrl !== 'string') {
    return { valid: false, error: 'Invalid app URL' };
  }

  try {
    const url = new URL(appUrl);
    if (url.protocol !== 'https:') {
      return { valid: false, error: 'App URL must use HTTPS' };
    }
  } catch {
    return { valid: false, error: 'Invalid app URL format' };
  }

  return { 
    valid: true, 
    parsed: { name: name.trim(), email: email.trim().toLowerCase(), role, appUrl } 
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-team-invite function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error("User is not an admin:", roleError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validation = validateInput(requestBody);
    
    if (!validation.valid || !validation.parsed) {
      console.error("Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, role, appUrl } = validation.parsed;
    console.log("Sending invite to:", email, "Role:", role);

    const roleLabel = roleLabels[role] || role;
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);

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
              <p>Olá <strong>${escapedName}</strong>,</p>
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
                  <li>Use este email (<strong>${escapedEmail}</strong>) para criar sua conta</li>
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
