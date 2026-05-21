-- create_chat_notifications_trigger.sql
-- Run this in the Supabase SQL editor for your project.

CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_auth_uid uuid;
    v_sender_first_name text;
    v_sender_last_name text;
    v_sender_full_name text;
    v_is_group boolean;
    v_chat_name text;
    v_recipient_profile record;
    v_notification_title text;
    v_notification_message text;
BEGIN
    -- 1. Fetch sender profile details
    SELECT auth_uid, first_name, last_name 
    INTO v_sender_auth_uid, v_sender_first_name, v_sender_last_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    v_sender_full_name := COALESCE(v_sender_first_name || ' ' || v_sender_last_name, v_sender_first_name, 'שכן');

    -- 2. Fetch conversation type
    SELECT is_group INTO v_is_group
    FROM public.conversations
    WHERE id = NEW.conversation_id;

    -- 3. Set notification template
    IF v_is_group THEN
        v_notification_title := 'הודעה חדשה בקבוצת הבניין 🏢';
        v_notification_message := v_sender_full_name || ' שלח/ה הודעה חדשה בשיחת הבניין.';
        v_chat_name := 'שיחת הבניין';
    ELSE
        v_notification_title := 'הודעה חדשה מ-' || v_sender_full_name || ' 💬';
        v_notification_message := 'לחץ כאן כדי לצפות בהודעה.';
        v_chat_name := v_sender_full_name;
    END IF;

    -- 4. Find all participants except the sender
    FOR v_recipient_profile IN 
        SELECT p.auth_uid
        FROM public.conversation_participants cp
        JOIN public.profiles p ON cp.profile_id = p.id
        WHERE cp.conversation_id = NEW.conversation_id AND cp.profile_id != NEW.sender_id
    LOOP
        -- Avoid creating notification if recipient has no auth_uid
        IF v_recipient_profile.auth_uid IS NOT NULL THEN
            INSERT INTO public.app_notifications (
                recipient_id,
                sender_id,
                title,
                message,
                type,
                related_data
            ) VALUES (
                v_recipient_profile.auth_uid::text,
                v_sender_auth_uid::text,
                v_notification_title,
                v_notification_message,
                'chat_message',
                jsonb_build_object(
                    'conversation_id', NEW.conversation_id,
                    'is_group', v_is_group,
                    'chat_name', v_chat_name,
                    'chat_user_id', v_sender_auth_uid::text
                )
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_chat_message ON public.messages;

CREATE TRIGGER trigger_notify_on_new_chat_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_chat_message();
