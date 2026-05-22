-- create_global_notification_rpc.sql
-- Run this in your Supabase SQL editor to create the RPC function.

CREATE OR REPLACE FUNCTION public.send_global_notification_as_admin(
  p_sender_id text,
  p_title text,
  p_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  recipient_record record;
  admin_exists boolean;
begin
  -- 1. Check if sender exists in admins table
  select exists(
    select 1 from public.admins 
    where id::text = p_sender_id or admin_number = p_sender_id
  ) into admin_exists;

  if not admin_exists then
    raise exception 'Unauthorized: Only administrators can send global notifications.';
  end if;

  -- 2. Insert notifications for all profiles
  for recipient_record in 
    select auth_uid from public.profiles where auth_uid is not null 
  loop
    insert into public.app_notifications (
      recipient_id, 
      sender_id, 
      title, 
      message, 
      type, 
      related_data
    )
    values (
      recipient_record.auth_uid, 
      p_sender_id, 
      p_title, 
      p_message, 
      'global_announcement', 
      '{"global": true}'::jsonb
    );
  end loop;

  return true;
end;
$$;

-- Enable Realtime for app_notifications (just in case they haven't run it yet)
alter publication supabase_realtime add table public.app_notifications;
