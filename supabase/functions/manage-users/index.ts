import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const callerClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: { user: caller }, error: callerError } =
    await callerClient.auth.getUser();

  if (callerError || !caller) return json({ error: "Sesi login tidak valid." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, store_id, is_active")
    .eq("id", caller.id)
    .eq("store_id", "sandikale")
    .single();

  if (
    profileError ||
    !callerProfile ||
    callerProfile.role !== "admin" ||
    callerProfile.is_active !== true
  ) {
    return json(
      { error: "Akses ditolak. Hanya Admin / Owner yang dapat mengelola pengguna." },
      403
    );
  }

  const body = await req.json();
  const action = body?.action;

  if (action === "upsert_user") {
    const name = String(body?.name || "").trim();
    const username = String(body?.username || "").trim().toLowerCase();
    const role = String(body?.role || "");
    const password = String(body?.password || "");

    if (!name || !username || !password) {
      return json(
        { error: "Nama, username internal, dan PIN/password wajib diisi." },
        400
      );
    }

    if (!["admin", "kasir", "produksi"].includes(role)) {
      return json({ error: "Role pengguna tidak valid." }, 400);
    }

    if (password.length < 4) {
      return json({ error: "PIN/password minimal 4 karakter." }, 400);
    }

    const email = username.includes("@")
      ? username
      : `${username}@sandikale.com`;

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, username")
      .eq("store_id", "sandikale")
      .eq("username", username)
      .maybeSingle();

    let userId: string;

    if (existingProfile?.id) {
      userId = existingProfile.id;

      const { error: updateAuthError } =
        await adminClient.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: {
            username,
            full_name: name,
            name,
            role,
            store_id: "sandikale",
          },
        });

      if (updateAuthError) return json({ error: updateAuthError.message }, 400);

      const { error: updateProfileError } = await adminClient
        .from("profiles")
        .update({ username, name, role, is_active: true })
        .eq("id", userId)
        .eq("store_id", "sandikale");

      if (updateProfileError) return json({ error: updateProfileError.message }, 400);
    } else {
      const { data: created, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            full_name: name,
            name,
            role,
            store_id: "sandikale",
          },
        });

      if (createError || !created.user) {
        return json(
          { error: createError?.message || "Gagal membuat akun Auth." },
          400
        );
      }

      userId = created.user.id;

      const { error: profileUpsertError } = await adminClient
        .from("profiles")
        .upsert(
          {
            id: userId,
            store_id: "sandikale",
            username,
            name,
            role,
            is_active: true,
          },
          { onConflict: "id" }
        );

      if (profileUpsertError) {
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: profileUpsertError.message }, 400);
      }
    }

    return json({
      success: true,
      user: { id: userId, username, name, role },
    });
  }

  if (action === "sync_existing") {
    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select("id, username, name, role, is_active")
      .eq("store_id", "sandikale");

    if (error) return json({ error: error.message }, 400);

    for (const profile of profiles || []) {
      await adminClient.auth.admin.updateUserById(profile.id, {
        user_metadata: {
          username: profile.username,
          full_name: profile.name,
          name: profile.name,
          role: profile.role,
          store_id: "sandikale",
        },
      });
    }

    return json({ success: true, synced: profiles?.length || 0 });
  }

  return json({ error: "Action tidak dikenal." }, 400);
});
