// src/API/moderationApi.js

import { getSupabase } from '../DataBase/supabase';

export const moderateMessage = async ({
  text,
  conversationId,
  senderProfileId,
  saveEvent = true,
}) => {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase.functions.invoke('moderate-message', {
      body: {
        text,
        conversationId,
        senderProfileId,
        saveEvent,
      },
    });

    if (error) {
      console.error('Moderation function error:', error);

      // החלטה בטוחה לפרויקט:
      // אם המודל נפל, לא נחסום את הצ'אט, אבל נחזיר שהבדיקה נכשלה
      return {
        allowed: true,
        shouldWarn: false,
        shouldBlock: false,
        toxicityScore: 0,
        label: 'moderation_failed',
        action: 'allow',
        reason: 'בדיקת התוכן נכשלה, ההודעה נשלחת ללא סינון',
      };
    }

    return data;
  } catch (error) {
    console.error('Error moderating message:', error);

    return {
      allowed: true,
      shouldWarn: false,
      shouldBlock: false,
      toxicityScore: 0,
      label: 'moderation_failed',
      action: 'allow',
      reason: 'בדיקת התוכן נכשלה, ההודעה נשלחת ללא סינון',
    };
  }
};