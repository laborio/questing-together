import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type NotifyRequest = {
  roomId?: string;
  sceneId?: string;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment variables' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing authorization header' });
  }

  const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await requesterClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse(401, { error: userError?.message ?? 'Not authenticated' });
  }

  let payload: NotifyRequest;
  try {
    payload = (await request.json()) as NotifyRequest;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const roomId = payload.roomId?.trim();
  const sceneId = payload.sceneId?.trim();

  if (!roomId || !sceneId) {
    return jsonResponse(400, { error: 'roomId and sceneId are required' });
  }

  const { count: memberCount, error: memberError } = await requesterClient
    .from('room_players')
    .select('user_id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .eq('user_id', user.id);
  if (memberError) {
    return jsonResponse(500, { error: memberError.message });
  }
  if (!memberCount) {
    return jsonResponse(403, { error: 'Not a room member' });
  }

  const { data: advanceEvents, error: advanceError } = await serviceClient
    .from('room_events')
    .select('id')
    .eq('room_id', roomId)
    .eq('type', 'scene_advance')
    .filter('payload_json->>sceneId', 'eq', sceneId)
    .order('id', { ascending: false })
    .limit(1);
  if (advanceError) {
    return jsonResponse(500, { error: advanceError.message });
  }
  const eventId = advanceEvents?.[0]?.id;
  if (!eventId) {
    return jsonResponse(200, { ok: true, skipped: 'scene_not_advanced', sent: 0 });
  }

  // Deduplicate sends per resolved scene event id.
  const { error: dispatchError } = await serviceClient.from('push_notification_dispatches').insert({
    event_id: eventId,
    room_id: roomId,
    scene_id: sceneId,
  });
  if (dispatchError) {
    if (dispatchError.code === '23505') {
      return jsonResponse(200, { ok: true, deduped: true, sent: 0 });
    }
    return jsonResponse(500, { error: dispatchError.message });
  }

  const { data: members, error: membersError } = await serviceClient
    .from('room_players')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('is_connected', true);
  if (membersError) {
    return jsonResponse(500, { error: membersError.message });
  }

  const userIds = Array.from(new Set((members ?? []).map((member) => member.user_id).filter(Boolean)));
  if (!userIds.length) {
    return jsonResponse(200, { ok: true, sent: 0 });
  }

  const { data: subscriptions, error: subscriptionsError } = await serviceClient
    .from('push_subscriptions')
    .select('expo_push_token')
    .in('user_id', userIds);
  if (subscriptionsError) {
    return jsonResponse(500, { error: subscriptionsError.message });
  }

  const tokens = Array.from(
    new Set(
      (subscriptions ?? [])
        .map((subscription) => subscription.expo_push_token)
        .filter((token): token is string => typeof token === 'string' && token.length > 0)
    )
  );

  if (!tokens.length) {
    return jsonResponse(200, { ok: true, sent: 0 });
  }

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: 'Questing Together',
    body: 'Le temps est ecoule. La scene continue.',
    channelId: 'default',
    priority: 'high',
    data: {
      type: 'timed_scene_complete',
      roomId,
      sceneId,
      eventId,
    },
  }));

  for (const batch of chunkArray(messages, 100)) {
    const response = await fetch(EXPO_PUSH_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const responseText = await response.text();
      return jsonResponse(502, {
        error: 'Expo push gateway error',
        status: response.status,
        details: responseText,
      });
    }
  }

  return jsonResponse(200, { ok: true, sent: messages.length });
});
