import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateOwnerPayload {
  email: string;
  password: string;
  name: string;
  document_type: "cpf" | "cnpj";
  document_number: string;
  legal_name: string;
  trade_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_cep?: string;
  notes?: string;
  plan_id?: string;
  plan_expires_at?: string; // ISO date
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function validate(payload: Partial<CreateOwnerPayload>): string | null {
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
    return "Email inválido";
  if (!payload.password || payload.password.length < 8)
    return "Senha deve ter pelo menos 8 caracteres";
  if (!payload.name || payload.name.trim().length < 2)
    return "Nome inválido";
  if (!payload.document_type || !["cpf", "cnpj"].includes(payload.document_type))
    return "Tipo de documento inválido";
  const doc = (payload.document_number || "").replace(/\D/g, "");
  if (payload.document_type === "cpf" && doc.length !== 11)
    return "CPF deve ter 11 dígitos";
  if (payload.document_type === "cnpj" && doc.length !== 14)
    return "CNPJ deve ter 14 dígitos";
  if (!payload.legal_name || payload.legal_name.trim().length < 2)
    return "Razão social / nome completo é obrigatório";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Validate JWT and verify caller is superadmin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);

    if (claimsErr || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    const callerId = claimsData.claims.sub;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const isSuperadmin = roleRows?.some((r) => r.role === "superadmin");
    if (!isSuperadmin) {
      return jsonResponse({ error: "Apenas superadmin pode criar proprietários" }, 403);
    }

    // 2. Validate payload
    const payload = (await req.json()) as Partial<CreateOwnerPayload>;
    const validationError = validate(payload);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    const cleanedDoc = payload.document_number!.replace(/\D/g, "");

    // Check duplicate document
    const { data: existingDoc } = await admin
      .from("owner_profiles")
      .select("id")
      .eq("document_type", payload.document_type!)
      .eq("document_number", cleanedDoc)
      .maybeSingle();
    if (existingDoc) {
      return jsonResponse({ error: "Já existe um proprietário com este documento" }, 409);
    }

    // 3. Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: payload.email!,
      password: payload.password!,
      email_confirm: true,
      user_metadata: { name: payload.name },
    });

    if (createErr || !created.user) {
      return jsonResponse(
        { error: createErr?.message || "Falha ao criar usuário" },
        400,
      );
    }

    const newUserId = created.user.id;
    const cleanups: Array<() => Promise<unknown>> = [
      () => admin.auth.admin.deleteUser(newUserId),
    ];

    const rollback = async () => {
      for (const fn of cleanups.reverse()) {
        try {
          await fn();
        } catch (e) {
          console.error("rollback step failed", e);
        }
      }
    };

    try {
      // 4. Ensure profile exists with name (trigger may have created it)
      await admin
        .from("profiles")
        .upsert(
          {
            id: newUserId,
            email: payload.email!,
            name: payload.name!,
            onboarding_completed: false,
          },
          { onConflict: "id" },
        );

      // 5. Insert admin role
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role: "admin" });
      if (roleErr) throw new Error(`role: ${roleErr.message}`);

      // 6. Insert owner_profile
      const { error: ownerErr } = await admin.from("owner_profiles").insert({
        user_id: newUserId,
        document_type: payload.document_type!,
        document_number: cleanedDoc,
        legal_name: payload.legal_name!,
        trade_name: payload.trade_name || null,
        billing_email: payload.billing_email || payload.email || null,
        billing_phone: payload.billing_phone || null,
        billing_address: payload.billing_address || null,
        billing_city: payload.billing_city || null,
        billing_state: payload.billing_state || null,
        billing_cep: payload.billing_cep || null,
        notes: payload.notes || null,
      });
      if (ownerErr) throw new Error(`owner_profile: ${ownerErr.message}`);

      // 7. Optional subscription
      if (payload.plan_id) {
        const { error: subErr } = await admin.from("subscriptions").insert({
          user_id: newUserId,
          plan_id: payload.plan_id,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: payload.plan_expires_at || null,
        });
        if (subErr) throw new Error(`subscription: ${subErr.message}`);
      }

      // 8. Audit log
      await admin.from("security_audit_logs").insert({
        user_id: callerId,
        action: "superadmin_created_owner",
        resource_type: "owner_profile",
        resource_id: newUserId,
        details: {
          email: payload.email,
          document_type: payload.document_type,
          plan_id: payload.plan_id || null,
        },
      });

      return jsonResponse({
        success: true,
        user_id: newUserId,
        message: "Proprietário criado com sucesso",
      });
    } catch (err) {
      console.error("Error during owner setup, rolling back:", err);
      await rollback();
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      return jsonResponse({ error: `Falha ao configurar proprietário: ${message}` }, 500);
    }
  } catch (err) {
    console.error("superadmin-create-owner fatal:", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return jsonResponse({ error: message }, 500);
  }
});