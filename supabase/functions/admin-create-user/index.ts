import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, teamMemberId } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

      // Get team member role and create user_roles entry
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
    console.error("Error in admin-create-user:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
