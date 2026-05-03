import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

const LOAD_THRESHOLDS = {
  requestsPerBuilding24h: 8,
  disturbancesPerBuilding24h: 6,
  equipmentLoansPerBuilding24h: 8,
  openRequestsPerBuilding: 10,
  openDisturbancesPerBuilding: 8,
  requestsPerUser24h: 4,
  disturbancesPerUser24h: 3,
  equipmentLoansPerUser24h: 4,
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
    if (!key) return acc;
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

function getDayKey(dateValue) {
  const d = new Date(dateValue);
  return d.toISOString().slice(0, 10);
}

function getDayLabel(dateValue) {
  const d = new Date(dateValue);
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getHourLabel(dateValue) {
  const d = new Date(dateValue);
  const hour = d.getHours();
  return `${String(hour).padStart(2, "0")}:00`;
}

function countByStatus(items, statusField = "status") {
  return items.reduce((acc, item) => {
    const status = item?.[statusField] || "UNKNOWN";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

function normalizeAction({ type, created_at, building_id, auth_user_id, weight = 1 }) {
  return {
    type,
    created_at,
    building_id,
    auth_user_id,
    weight,
  };
}

function buildPerformanceInsights({
  requests,
  disturbances,
  equipmentLoans,
  allActions,
  buildingLoad,
  suspiciousUsers,
  usageByType,
  usageByHour,
}) {
  const insights = [];

  const totalActions = allActions.length;
  const topType = [...usageByType].sort((a, b) => b.count - a.count)[0];
  const topBuilding = [...buildingLoad].sort((a, b) => b.totalActions7d - a.totalActions7d)[0];
  const peakHour = [...usageByHour].sort((a, b) => b.count - a.count)[0];

  if (totalActions === 0) {
    insights.push({
      type: "empty",
      severity: "LOW",
      title: "אין עדיין מספיק נתוני שימוש",
      message: "לא נמצאה פעילות משמעותית בטווח הזמן שנבחר. לאחר שימוש נוסף במערכת יוצגו תובנות ביצועים.",
    });

    return insights;
  }

  if (topType) {
    insights.push({
      type: "top_action_type",
      severity: "INFO",
      title: "סוג הפעילות המרכזי במערכת",
      message: `הפעילות הנפוצה ביותר היא ${topType.label}, עם ${topType.count} פעולות בטווח הזמן שנבחר.`,
    });
  }

  if (topBuilding && topBuilding.totalActions7d > 0) {
    insights.push({
      type: "top_building_activity",
      severity: topBuilding.isOverloaded ? "HIGH" : "INFO",
      title: "הבניין הפעיל ביותר",
      message: `הבניין ${topBuilding.buildingName} מוביל בכמות הפעילות עם ${topBuilding.totalActions7d} פעולות. ${
        topBuilding.isOverloaded
          ? "מומלץ לבדוק עומסים ותהליכים פתוחים בבניין זה."
          : "כרגע הפעילות נראית תקינה."
      }`,
    });
  }

  if (peakHour && peakHour.count >= 3) {
    insights.push({
      type: "peak_hour",
      severity: peakHour.count >= 10 ? "MEDIUM" : "INFO",
      title: "שעת פעילות מרכזית",
      message: `נראה ששעת הפעילות הבולטת היא ${peakHour.hour}, עם ${peakHour.count} פעולות. ניתן להשתמש בזה כדי להבין מתי יש עומס על המערכת.`,
    });
  }

  const openRequests = requests.filter((r) => r.status === "OPEN").length;
  const openDisturbances = disturbances.filter(
    (d) => d.status === "OPEN" || d.status === "IN_PROGRESS"
  ).length;

  if (openRequests + openDisturbances >= 10) {
    insights.push({
      type: "open_items",
      severity: "MEDIUM",
      title: "כמות משימות פתוחות גבוהה",
      message: `יש ${openRequests} בקשות פתוחות ו-${openDisturbances} מטרדים פתוחים/בטיפול. מומלץ לעודד ועד בית לטפל בפניות פתוחות.`,
    });
  }

  if (suspiciousUsers.length > 0) {
    insights.push({
      type: "suspicious_users",
      severity: "HIGH",
      title: "זוהתה פעילות משתמשים חריגה",
      message: `נמצאו ${suspiciousUsers.length} משתמשים עם פעילות גבוהה במיוחד ב-24 השעות האחרונות. מומלץ לבדוק האם מדובר בשימוש תקין או בעומס חריג.`,
    });
  }

  if (equipmentLoans.length > requests.length && equipmentLoans.length > disturbances.length) {
    insights.push({
      type: "equipment_usage",
      severity: "INFO",
      title: "השאלת ציוד היא אזור שימוש משמעותי",
      message: "נראה שמודול השאלת הציוד פעיל במיוחד. מומלץ לבדוק זמינות פריטים וקטגוריות פופולריות.",
    });
  }

  return insights;
}

export async function getAdminLoadMonitoringData(adminUser, daysBack = 7) {
  requireAdmin(adminUser);

  const since = getDateDaysAgo(daysBack);
  const since24h = getDateDaysAgo(1);

  const [
    requestsRes,
    disturbancesRes,
    equipmentLoansRes,
    profilesRes,
    buildingsRes,
  ] = await Promise.all([
    supabase
      .from("requests")
      .select("id, auth_user_id, building_id, title, category, urgency, status, created_at, closed_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),

    supabase
      .from("disturbance_reports")
      .select("id, auth_user_id, building_id, type, severity, status, created_at, occurred_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),

    supabase
      .from("equipment_loans")
      .select("id, building_id, equipment_id, owner_id, borrower_id, status, created_at, start_date, end_date")
      .gte("created_at", since)
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
  if (equipmentLoansRes.error) throw new Error("שגיאה בשליפת השאלות ציוד לאדמין");
  if (profilesRes.error) throw new Error("שגיאה בשליפת פרופילים לאדמין");
  if (buildingsRes.error) throw new Error("שגיאה בשליפת בניינים לאדמין");

  const requests = requestsRes.data || [];
  const disturbances = disturbancesRes.data || [];
  const equipmentLoans = equipmentLoansRes.data || [];
  const profiles = profilesRes.data || [];
  const buildings = buildingsRes.data || [];

  const profilesMap = Object.fromEntries(profiles.map((p) => [p.auth_uid, p]));
  const buildingsMap = Object.fromEntries(buildings.map((b) => [b.id, b]));

  const openRequests = requests.filter((r) => r.status === "OPEN");
  const openDisturbances = disturbances.filter(
    (d) => d.status === "OPEN" || d.status === "IN_PROGRESS"
  );

  const requests24h = requests.filter((r) => new Date(r.created_at) >= new Date(since24h));
  const disturbances24h = disturbances.filter((d) => new Date(d.created_at) >= new Date(since24h));
  const equipmentLoans24h = equipmentLoans.filter((l) => new Date(l.created_at) >= new Date(since24h));

  const requestActions = requests.map((r) =>
    normalizeAction({
      type: "request",
      created_at: r.created_at,
      building_id: r.building_id,
      auth_user_id: r.auth_user_id,
      weight: 2,
    })
  );

  const disturbanceActions = disturbances.map((d) =>
    normalizeAction({
      type: "disturbance",
      created_at: d.created_at,
      building_id: d.building_id,
      auth_user_id: d.auth_user_id,
      weight: 2.5,
    })
  );

  const equipmentLoanActions = equipmentLoans.map((l) =>
    normalizeAction({
      type: "equipment_loan",
      created_at: l.created_at,
      building_id: l.building_id,
      auth_user_id: l.borrower_id,
      weight: 1.5,
    })
  );

  const allActions = [
    ...requestActions,
    ...disturbanceActions,
    ...equipmentLoanActions,
  ].filter((x) => x.created_at);

  const allActions24h = allActions.filter((a) => new Date(a.created_at) >= new Date(since24h));

  const usageByType = [
    {
      type: "request",
      label: "בקשות שכנים",
      count: requests.length,
      count24h: requests24h.length,
      weight: 2,
    },
    {
      type: "disturbance",
      label: "דיווחי מטרדים",
      count: disturbances.length,
      count24h: disturbances24h.length,
      weight: 2.5,
    },
    {
      type: "equipment_loan",
      label: "השאלות ציוד",
      count: equipmentLoans.length,
      count24h: equipmentLoans24h.length,
      weight: 1.5,
    },
  ].map((item) => ({
    ...item,
    percent:
      allActions.length > 0
        ? Math.round((item.count / allActions.length) * 100)
        : 0,
  }));

  const actionsByDay = groupBy(allActions, (a) => getDayKey(a.created_at));
  const usageByDay = Object.entries(actionsByDay)
    .map(([day, items]) => ({
      day,
      label: getDayLabel(day),
      count: items.length,
      loadScore: Number(items.reduce((sum, x) => sum + (x.weight || 1), 0).toFixed(1)),
      requests: items.filter((x) => x.type === "request").length,
      disturbances: items.filter((x) => x.type === "disturbance").length,
      equipmentLoans: items.filter((x) => x.type === "equipment_loan").length,
    }))
    .sort((a, b) => new Date(a.day) - new Date(b.day));

  const actionsByHour = groupBy(allActions, (a) => getHourLabel(a.created_at));
  const usageByHour = Object.entries(actionsByHour)
    .map(([hour, items]) => ({
      hour,
      count: items.length,
      loadScore: Number(items.reduce((sum, x) => sum + (x.weight || 1), 0).toFixed(1)),
    }))
    .sort((a, b) => Number(a.hour.slice(0, 2)) - Number(b.hour.slice(0, 2)));

  const requestsByBuilding24h = groupBy(
    requests24h.filter((r) => r.building_id),
    (r) => r.building_id
  );

  const disturbancesByBuilding24h = groupBy(
    disturbances24h.filter((d) => d.building_id),
    (d) => d.building_id
  );

  const equipmentLoansByBuilding24h = groupBy(
    equipmentLoans24h.filter((l) => l.building_id),
    (l) => l.building_id
  );

  const openRequestsByBuilding = groupBy(
    openRequests.filter((r) => r.building_id),
    (r) => r.building_id
  );

  const openDisturbancesByBuilding = groupBy(
    openDisturbances.filter((d) => d.building_id),
    (d) => d.building_id
  );

  const actionsByBuilding = groupBy(
    allActions.filter((a) => a.building_id),
    (a) => a.building_id
  );

  const buildingLoad = buildings
    .map((building) => {
      const req24 = requestsByBuilding24h[building.id]?.length || 0;
      const dist24 = disturbancesByBuilding24h[building.id]?.length || 0;
      const loan24 = equipmentLoansByBuilding24h[building.id]?.length || 0;
      const openReq = openRequestsByBuilding[building.id]?.length || 0;
      const openDist = openDisturbancesByBuilding[building.id]?.length || 0;
      const buildingActions = actionsByBuilding[building.id] || [];
      const loadScore = Number(
        buildingActions.reduce((sum, x) => sum + (x.weight || 1), 0).toFixed(1)
      );

      return {
        buildingId: building.id,
        buildingName: building.name || building.address || "בניין ללא שם",
        city: building.city,
        address: building.address,
        requests24h: req24,
        disturbances24h: dist24,
        equipmentLoans24h: loan24,
        openRequests: openReq,
        openDisturbances: openDist,
        totalOpen: openReq + openDist,
        totalActions7d: buildingActions.length,
        loadScore,
        isOverloaded:
          req24 >= LOAD_THRESHOLDS.requestsPerBuilding24h ||
          dist24 >= LOAD_THRESHOLDS.disturbancesPerBuilding24h ||
          loan24 >= LOAD_THRESHOLDS.equipmentLoansPerBuilding24h ||
          openReq >= LOAD_THRESHOLDS.openRequestsPerBuilding ||
          openDist >= LOAD_THRESHOLDS.openDisturbancesPerBuilding,
      };
    })
    .sort((a, b) => b.loadScore - a.loadScore);

  const topBuildingsByActivity = buildingLoad
    .filter((b) => b.totalActions7d > 0)
    .slice(0, 5);

  const allUserActions24h = allActions24h.filter((x) => x.auth_user_id);
  const actionsByUser = groupBy(allUserActions24h, (x) => x.auth_user_id);

  const suspiciousUsers = Object.entries(actionsByUser)
    .map(([authUid, items]) => {
      const profile = profilesMap[authUid];
      const requestsCount = items.filter((x) => x.type === "request").length;
      const disturbancesCount = items.filter((x) => x.type === "disturbance").length;
      const equipmentLoansCount = items.filter((x) => x.type === "equipment_loan").length;
      const total = items.length;
      const building = buildingsMap[profile?.building_id];

      return {
        auth_uid: authUid,
        name: fullName(profile),
        email: profile?.email || "",
        buildingName: building?.name || "לא ידוע",
        requests24h: requestsCount,
        disturbances24h: disturbancesCount,
        equipmentLoans24h: equipmentLoansCount,
        total24h: total,
        is_flagged: !!profile?.is_flagged,
        is_blocked: !!profile?.is_blocked,
      };
    })
    .filter(
      (u) =>
        u.requests24h >= LOAD_THRESHOLDS.requestsPerUser24h ||
        u.disturbances24h >= LOAD_THRESHOLDS.disturbancesPerUser24h ||
        u.equipmentLoans24h >= LOAD_THRESHOLDS.equipmentLoansPerUser24h ||
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

    if (b.equipmentLoans24h >= LOAD_THRESHOLDS.equipmentLoansPerBuilding24h) {
      alerts.push({
        type: "building_equipment_loans_spike",
        severity: "MEDIUM",
        title: `עומס בהשאלות ציוד`,
        message: `בבניין ${b.buildingName} נפתחו ${b.equipmentLoans24h} בקשות השאלת ציוד ב-24 שעות.`,
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

  const performanceInsights = buildPerformanceInsights({
    requests,
    disturbances,
    equipmentLoans,
    allActions,
    buildingLoad,
    suspiciousUsers,
    usageByType,
    usageByHour,
  });

  const totalLoadScore = Number(
    allActions.reduce((sum, x) => sum + (x.weight || 1), 0).toFixed(1)
  );

  return {
    kpis: {
      totalActions: allActions.length,
      totalActions24h: allActions24h.length,
      totalLoadScore,
      openRequests: openRequests.length,
      openDisturbances: openDisturbances.length,
      requests24h: requests24h.length,
      disturbances24h: disturbances24h.length,
      equipmentLoans24h: equipmentLoans24h.length,
      suspiciousUsers: suspiciousUsers.length,
      overloadedBuildings: buildingLoad.filter((b) => b.isOverloaded).length,
      activeBuildings: buildingLoad.filter((b) => b.totalActions7d > 0).length,
    },
    usageByType,
    usageByDay,
    usageByHour,
    topBuildingsByActivity,
    buildingLoad,
    suspiciousUsers,
    alerts,
    performanceInsights,
    statusBreakdown: {
      requests: countByStatus(requests),
      disturbances: countByStatus(disturbances),
      equipmentLoans: countByStatus(equipmentLoans),
    },
    raw: {
      requests,
      disturbances,
      equipmentLoans,
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