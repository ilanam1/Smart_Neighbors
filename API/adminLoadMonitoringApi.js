import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

const LOAD_THRESHOLDS = {
  requestsPerBuilding24h: 8,
  disturbancesPerBuilding24h: 6,
  openRequestsPerBuilding: 10,
  openDisturbancesPerBuilding: 8,
  requestsPerUser24h: 4,
  disturbancesPerUser24h: 3,
  totalActionsPerUser24h: 6,
};

function requireAdmin(adminUser) {
  if (!adminUser || !adminUser.id) {
    throw new Error("אין אדמין מחובר");
  }

  return adminUser;
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function fullName(profile) {
  const first = profile?.first_name || "";
  const last = profile?.last_name || "";
  return `${first} ${last}`.trim() || profile?.email || "משתמש ללא שם";
}

export async function getAdminLoadMonitoringData(adminUser, daysBack = 7) {
  requireAdmin(adminUser);

  const since7d = getDateDaysAgo(daysBack);
  const since24h = getDateDaysAgo(1);

  const [
    requestsRes,
    disturbancesRes,
    profilesRes,
    buildingsRes,
  ] = await Promise.all([
    supabase
      .from("requests")
      .select("id, auth_user_id, building_id, title, category, urgency, status, created_at, closed_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false }),

    supabase
      .from("disturbance_reports")
      .select("id, auth_user_id, building_id, type, severity, status, created_at, occurred_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false }),

    supabase
      .from("profiles")
      .select("auth_uid, first_name, last_name, email, building_id, is_flagged, flagged_reason, is_blocked, blocked_reason"),

    supabase
      .from("buildings")
      .select("id, name, city, address"),
  ]);

  if (requestsRes.error) throw new Error("שגיאה בשליפת בקשות לאדמין");
  if (disturbancesRes.error) throw new Error("שגיאה בשליפת מטרדים לאדמין");
  if (profilesRes.error) throw new Error("שגיאה בשליפת פרופילים לאדמין");
  if (buildingsRes.error) throw new Error("שגיאה בשליפת בניינים לאדמין");

  const requests = requestsRes.data || [];
  const disturbances = disturbancesRes.data || [];
  const profiles = profilesRes.data || [];
  const buildings = buildingsRes.data || [];

  const profilesMap = Object.fromEntries(
    profiles.map((p) => [p.auth_uid, p])
  );

  const buildingsMap = Object.fromEntries(
    buildings.map((b) => [b.id, b])
  );

  const openRequests = requests.filter((r) => r.status === "OPEN");
  const openDisturbances = disturbances.filter(
    (d) => d.status === "OPEN" || d.status === "IN_PROGRESS"
  );

  const requests24h = requests.filter(
    (r) => new Date(r.created_at) >= new Date(since24h)
  );
  const disturbances24h = disturbances.filter(
    (d) => new Date(d.created_at) >= new Date(since24h)
  );

  const requestsByBuilding24h = groupBy(
    requests24h.filter((r) => r.building_id),
    (r) => r.building_id
  );

  const disturbancesByBuilding24h = groupBy(
    disturbances24h.filter((d) => d.building_id),
    (d) => d.building_id
  );

  const openRequestsByBuilding = groupBy(
    openRequests.filter((r) => r.building_id),
    (r) => r.building_id
  );

  const openDisturbancesByBuilding = groupBy(
    openDisturbances.filter((d) => d.building_id),
    (d) => d.building_id
  );

  const buildingLoad = buildings
    .map((building) => {
      const req24 = requestsByBuilding24h[building.id]?.length || 0;
      const dist24 = disturbancesByBuilding24h[building.id]?.length || 0;
      const openReq = openRequestsByBuilding[building.id]?.length || 0;
      const openDist = openDisturbancesByBuilding[building.id]?.length || 0;

      return {
        buildingId: building.id,
        buildingName: building.name,
        city: building.city,
        address: building.address,
        requests24h: req24,
        disturbances24h: dist24,
        openRequests: openReq,
        openDisturbances: openDist,
        totalOpen: openReq + openDist,
        isOverloaded:
          req24 >= LOAD_THRESHOLDS.requestsPerBuilding24h ||
          dist24 >= LOAD_THRESHOLDS.disturbancesPerBuilding24h ||
          openReq >= LOAD_THRESHOLDS.openRequestsPerBuilding ||
          openDist >= LOAD_THRESHOLDS.openDisturbancesPerBuilding,
      };
    })
    .sort((a, b) => b.totalOpen - a.totalOpen);

  const allUserActions24h = [
    ...requests24h.map((r) => ({
      auth_user_id: r.auth_user_id,
      type: "request",
      created_at: r.created_at,
      building_id: r.building_id,
    })),
    ...disturbances24h
      .filter((d) => d.auth_user_id)
      .map((d) => ({
        auth_user_id: d.auth_user_id,
        type: "disturbance",
        created_at: d.created_at,
        building_id: d.building_id,
      })),
  ].filter((x) => x.auth_user_id);

  const actionsByUser = groupBy(allUserActions24h, (x) => x.auth_user_id);

  const suspiciousUsers = Object.entries(actionsByUser)
    .map(([authUid, items]) => {
      const profile = profilesMap[authUid];
      const requestsCount = items.filter((x) => x.type === "request").length;
      const disturbancesCount = items.filter((x) => x.type === "disturbance").length;
      const total = items.length;
      const building = buildingsMap[profile?.building_id];

      return {
        auth_uid: authUid,
        name: fullName(profile),
        email: profile?.email || "",
        buildingName: building?.name || "לא ידוע",
        requests24h: requestsCount,
        disturbances24h: disturbancesCount,
        total24h: total,
        is_flagged: !!profile?.is_flagged,
        is_blocked: !!profile?.is_blocked,
      };
    })
    .filter(
      (u) =>
        u.requests24h >= LOAD_THRESHOLDS.requestsPerUser24h ||
        u.disturbances24h >= LOAD_THRESHOLDS.disturbancesPerUser24h ||
        u.total24h >= LOAD_THRESHOLDS.totalActionsPerUser24h
    )
    .sort((a, b) => b.total24h - a.total24h);

  const alerts = [];

  buildingLoad.forEach((b) => {
    if (b.requests24h >= LOAD_THRESHOLDS.requestsPerBuilding24h) {
      alerts.push({
        type: "building_requests_spike",
        severity: "HIGH",
        title: `עומס בקשות בבניין ${b.buildingName}`,
        message: `נפתחו ${b.requests24h} בקשות ב-24 השעות האחרונות.`,
      });
    }

    if (b.disturbances24h >= LOAD_THRESHOLDS.disturbancesPerBuilding24h) {
      alerts.push({
        type: "building_disturbances_spike",
        severity: "HIGH",
        title: `עומס מטרדים בבניין ${b.buildingName}`,
        message: `נפתחו ${b.disturbances24h} דיווחי מטרד ב-24 השעות האחרונות.`,
      });
    }

    if (b.openRequests >= LOAD_THRESHOLDS.openRequestsPerBuilding) {
      alerts.push({
        type: "building_open_requests_high",
        severity: "MEDIUM",
        title: `כמות בקשות פתוחות גבוהה`,
        message: `בבניין ${b.buildingName} יש ${b.openRequests} בקשות פתוחות.`,
      });
    }

    if (b.openDisturbances >= LOAD_THRESHOLDS.openDisturbancesPerBuilding) {
      alerts.push({
        type: "building_open_disturbances_high",
        severity: "MEDIUM",
        title: `כמות מטרדים פתוחים גבוהה`,
        message: `בבניין ${b.buildingName} יש ${b.openDisturbances} מטרדים פתוחים/בטיפול.`,
      });
    }
  });

  suspiciousUsers.forEach((u) => {
    alerts.push({
      type: "suspicious_user_activity",
      severity: u.total24h >= 8 ? "HIGH" : "MEDIUM",
      title: `פעילות חריגה של משתמש`,
      message: `${u.name} ביצע ${u.total24h} פעולות ב-24 השעות האחרונות.`,
      userId: u.auth_uid,
    });
  });

  return {
    kpis: {
      openRequests: openRequests.length,
      openDisturbances: openDisturbances.length,
      requests24h: requests24h.length,
      disturbances24h: disturbances24h.length,
      suspiciousUsers: suspiciousUsers.length,
      overloadedBuildings: buildingLoad.filter((b) => b.isOverloaded).length,
    },
    buildingLoad,
    suspiciousUsers,
    alerts,
    raw: {
      requests,
      disturbances,
    },
  };
}

export async function flagUserForReview(adminUser, authUid, reason = "") {
  const admin = requireAdmin(adminUser);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_flagged: true,
      flagged_reason: reason || null,
      flagged_at: new Date().toISOString(),
      flagged_by: admin.id,
    })
    .eq("auth_uid", authUid)
    .select()
    .single();

  if (error) {
    console.error("Error flagging user:", error.message);
    throw new Error("שגיאה בסימון המשתמש לבדיקה");
  }

  return data;
}

export async function unflagUser(adminUser, authUid) {
  requireAdmin(adminUser);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_flagged: false,
      flagged_reason: null,
      flagged_at: null,
      flagged_by: null,
    })
    .eq("auth_uid", authUid)
    .select()
    .single();

  if (error) {
    console.error("Error unflagging user:", error.message);
    throw new Error("שגיאה בהסרת הסימון מהמשתמש");
  }

  return data;
}

export async function blockUser(adminUser, authUid, reason = "") {
  const admin = requireAdmin(adminUser);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_blocked: true,
      blocked_reason: reason || "נחסם על ידי אדמין עקב פעילות חריגה",
      blocked_at: new Date().toISOString(),
      blocked_by: admin.id,
    })
    .eq("auth_uid", authUid)
    .select()
    .single();

  if (error) {
    console.error("Error blocking user:", error.message);
    throw new Error("שגיאה בחסימת המשתמש");
  }

  return data;
}

export async function unblockUser(adminUser, authUid) {
  requireAdmin(adminUser);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      blocked_by: null,
    })
    .eq("auth_uid", authUid)
    .select()
    .single();

  if (error) {
    console.error("Error unblocking user:", error.message);
    throw new Error("שגיאה בהסרת חסימת המשתמש");
  }

  return data;
}