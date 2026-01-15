import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  teamMemberId?: string;
}

// Input validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  }
  if (password.length > 128) {
    errors.push("Senha deve ter no máximo 128 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password)) {
    errors.push("Senha deve conter pelo menos um caractere especial");
  }
  
  return { valid: errors.length === 0, errors };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify caller is authenticated admin or manager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with caller's token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
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

    // Verify caller has admin or manager role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .single();

    if (roleError || !roleData || !["admin", "manager"].includes(roleData.role)) {
      console.error("Permission denied for user:", callerUserId);
      return new Response(
        JSON.stringify({ error: "Permissão negada. Apenas admin ou manager podem criar usuários." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, password, teamMemberId }: CreateUserRequest = await req.json();

    // Input validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.log("Password validation failed:", passwordValidation.errors);
      return new Response(
        JSON.stringify({ 
          error: "Senha não atende aos requisitos de segurança", 
          details: passwordValidation.errors 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate teamMemberId if provided (UUID format)
    if (teamMemberId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamMemberId)) {
      return new Response(
        JSON.stringify({ error: "ID do membro inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user with admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If teamMemberId provided, link the user
    if (teamMemberId && userData.user) {
      const { error: updateError } = await supabaseAdmin
        .from("team_members")
        .update({ user_id: userData.user.id })
        .eq("id", teamMemberId);

      if (updateError) {
        console.error("Error linking team member:", updateError);
      }

      // Also create user_roles entry
      const { data: teamMember } = await supabaseAdmin
        .from("team_members")
        .select("role")
        .eq("id", teamMemberId)
        .maybeSingle();

      if (teamMember) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: userData.user.id,
          role: teamMember.role,
        });
      }

      // Audit log
      await supabaseAdmin.from("team_member_audit_logs").insert({
        team_member_id: teamMemberId,
        user_id: callerUserId,
        action: "usuario_criado",
        details: { created_email: email, created_by: callerUserId },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userData.user?.id,
        message: "Usuário criado com sucesso" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in create-user-with-password:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
