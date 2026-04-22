import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "superadmin" | "admin" | "manager" | "cleaner";

interface SetPasswordRequest {
  teamMemberId: string;
  newPassword: string;
}

const validatePassword = (p: string) => typeof p === "string" && p.length >= 8 && p.length <= 128;

/**
 * Hierarchical permission rules:
 *  - superadmin    → can change ANY user's password
 *  - admin (owner) → can change passwords of manager/cleaner that belong to him (owner_user_id = caller.id)
 *  - manager (host)→ can change passwords of cleaner that belong to the same owner_user_id
 *  - cleaner       → cannot change anyone's password
 */
function canChange(callerRoles: AppRole[], targetRole: AppRole, sameOwner: boolean, isSelf: boolean): { ok: boolean; reason?: string } {
  if (isSelf) return { ok: false, reason: "Use a alteração de senha do próprio perfil." };
  if (callerRoles.includes("superadmin")) return { ok: true };

  if (callerRoles.includes("admin")) {
    if (!sameOwner) return { ok: false, reason: "Este usuário não pertence à sua organização." };
    if (targetRole === "manager" || targetRole === "cleaner") return { ok: true };
    return { ok: false, reason: "Proprietário só pode alterar senha de Anfitrião ou Cleaner." };
  }

  if (callerRoles.includes("manager")) {
    if (!sameOwner) return { ok: false, reason: "Este usuário não pertence à sua organização." };
    if (targetRole === "cleaner") return { ok: true };
    return { ok: false, reason: "Anfitrião só pode alterar senha de Cleaner." };
  }

  return { ok: false, reason: "Sem permissão para alterar senhas." };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const callerUserId = claimsData.claims.sub as string;

    const body = (await req.json()) as SetPasswordRequest;
    const { teamMemberId, newPassword } = body || ({} as SetPasswordRequest);

    if (!teamMemberId || !newPassword) {
      return new Response(JSON.stringify({ error: "teamMemberId e newPassword são obrigatórios" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!validatePassword(newPassword)) {
      return new Response(JSON.stringify({ error: "Senha deve ter entre 8 e 128 caracteres" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Caller roles
    const { data: callerRolesRows, error: callerRolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId);
    if (callerRolesErr) {
      console.error("roles error", callerRolesErr);
      return new Response(JSON.stringify({ error: "Erro ao validar permissões" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const callerRoles = (callerRolesRows || []).map((r) => r.role as AppRole);
    if (callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Usuário sem permissões" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Caller's owner_user_id (admin = self, manager = team_member.owner_user_id)
    let callerOwnerUserId: string | null = null;
    if (callerRoles.includes("admin")) {
      callerOwnerUserId = callerUserId;
    } else if (callerRoles.includes("manager")) {
      const { data: tm } = await admin
        .from("team_members")
        .select("owner_user_id")
        .eq("user_id", callerUserId)
        .eq("is_active", true)
        .maybeSingle();
      callerOwnerUserId = tm?.owner_user_id ?? null;
    }

    // Target team member
    const { data: target, error: targetErr } = await admin
      .from("team_members")
      .select("id, name, email, role, user_id, owner_user_id, is_active")
      .eq("id", teamMemberId)
      .maybeSingle();

    if (targetErr || !target) {
      return new Response(JSON.stringify({ error: "Membro não encontrado" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!target.is_active) {
      return new Response(JSON.stringify({ error: "Não é possível alterar senha de membro inativo" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!target.user_id) {
      return new Response(JSON.stringify({ error: "Membro ainda não ativou a conta (sem login criado)" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const sameOwner = !!callerOwnerUserId && callerOwnerUserId === target.owner_user_id;
    const isSelf = target.user_id === callerUserId;
    const verdict = canChange(callerRoles, target.role as AppRole, sameOwner, isSelf);

    if (!verdict.ok) {
      console.warn("[set-team-member-password] denied", { callerUserId, callerRoles, target: target.id, reason: verdict.reason });
      return new Response(JSON.stringify({ error: verdict.reason || "Permissão negada" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update password via Admin API
    const { error: updateErr } = await admin.auth.admin.updateUserById(target.user_id, {
      password: newPassword,
    });

    if (updateErr) {
      console.error("[set-team-member-password] update error", updateErr);
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha: " + updateErr.message }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Audit log (best-effort)
    await admin.from("team_member_audit_logs").insert({
      team_member_id: target.id,
      user_id: callerUserId,
      action: "password_changed_by_supervisor",
      details: {
        target_email: target.email,
        target_role: target.role,
        caller_roles: callerRoles,
      },
    });

    return new Response(JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("[set-team-member-password] unexpected", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);