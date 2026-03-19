export function getCurrentHolidayContext(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // MVP פשוט - טווחים מקורבים
  // אפשר לשפר בהמשך עם לוח שנה עברי אמיתי

  // פסח - בערך מרץ/אפריל
  if ((month === 3 && day >= 20) || (month === 4 && day <= 25)) {
    return {
      key: "passover",
      label: "לקראת פסח",
      reason: "ציוד שיכול לעזור לקראת ניקיון וסידור הבית",
    };
  }

  // סוכות - בערך ספטמבר/אוקטובר
  if ((month === 9 && day >= 20) || (month === 10 && day <= 20)) {
    return {
      key: "sukkot",
      label: "לקראת סוכות",
      reason: "ציוד שמתאים לאירוח, חוץ וישיבה משותפת",
    };
  }

  // חנוכה - בערך דצמבר
  if (month === 12) {
    return {
      key: "hanukkah",
      label: "לקראת חנוכה",
      reason: "ציוד שיכול להתאים לבישול, אירוח והיערכות ביתית",
    };
  }

  return null;
}


export function getCurrentWeatherContext(date = new Date()) {
  const month = date.getMonth() + 1;

  // קיץ
  if (month >= 6 && month <= 9) {
    return {
      key: "summer",
      label: "מתאים לימים חמים",
      reason: "המערכת זיהתה תקופה חמה ולכן מוצע ציוד עונתי רלוונטי",
    };
  }

  // חורף
  if (month === 12 || month === 1 || month === 2) {
    return {
      key: "winter",
      label: "מתאים לימים קרים",
      reason: "המערכת זיהתה תקופה חורפית ולכן מוצע ציוד מתאים לעונה",
    };
  }

  // אביב / מזג אוויר נעים
  if (month >= 3 && month <= 5) {
    return {
      key: "pleasant",
      label: "מתאים למזג אוויר נעים",
      reason: "המערכת זיהתה מזג אוויר נעים ולכן מוצע ציוד חוץ וגינון",
    };
  }

  // סתיו
  return {
    key: "pleasant",
    label: "מתאים לעונה הנוכחית",
    reason: "המערכת מציעה ציוד רלוונטי לתקופה הנוכחית",
  };
}