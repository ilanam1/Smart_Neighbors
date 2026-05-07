-- 1. פונקציה שתרוץ כטריגר ותעדכן את המטרד בהתאם לסטטוס הקריאה של העובד
-- שימוש ב-SECURITY DEFINER מבטיח שהפונקציה תעקוף את חוקי ה-RLS ותעדכן את הטבלה
CREATE OR REPLACE FUNCTION sync_disturbance_status_on_job_done()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DONE' AND OLD.status != 'DONE' THEN
    UPDATE disturbance_reports
    SET status = 'RESOLVED', updated_at = NOW()
    WHERE id = NEW.report_id;
  END IF;
  
  IF NEW.status = 'IN_PROGRESS' AND OLD.status != 'IN_PROGRESS' THEN
    UPDATE disturbance_reports
    SET status = 'IN_PROGRESS', updated_at = NOW()
    WHERE id = NEW.report_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. יצירת הטריגר על טבלת הקריאות של העובדים
DROP TRIGGER IF EXISTS trg_sync_disturbance_status ON employee_job_requests;

CREATE TRIGGER trg_sync_disturbance_status
AFTER UPDATE ON employee_job_requests
FOR EACH ROW
EXECUTE FUNCTION sync_disturbance_status_on_job_done();

-- 3. עדכון כל המטרדים הישנים שכבר טופלו על ידי העובד אך נשארו פתוחים בגלל בעיית ההרשאות (RLS)
UPDATE disturbance_reports
SET status = 'RESOLVED', updated_at = NOW()
WHERE id IN (
  SELECT report_id 
  FROM employee_job_requests 
  WHERE status = 'DONE'
);
