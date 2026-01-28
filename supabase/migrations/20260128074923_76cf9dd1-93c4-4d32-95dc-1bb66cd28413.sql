-- ========================================
-- User Permission System (Comprehensive)
-- ========================================

-- 1. جدول user_permissions: صلاحيات دقيقة على مستوى الصفحات والعمليات
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- صلاحيات الصفحات/الوحدات (Modules)
  can_access_dashboard BOOLEAN DEFAULT true,
  can_access_admission BOOLEAN DEFAULT true,
  can_access_discharge BOOLEAN DEFAULT true,
  can_access_medical_procedures BOOLEAN DEFAULT true,
  can_access_loans BOOLEAN DEFAULT true,
  can_access_patient_search BOOLEAN DEFAULT true,
  can_access_records BOOLEAN DEFAULT true,
  can_access_unified_database BOOLEAN DEFAULT false,
  can_access_reports BOOLEAN DEFAULT true,
  
  -- صلاحيات العمليات (Operations)
  can_create_records BOOLEAN DEFAULT true,
  can_update_records BOOLEAN DEFAULT true,
  can_delete_records BOOLEAN DEFAULT false,
  can_export_excel BOOLEAN DEFAULT true,
  can_import_excel BOOLEAN DEFAULT false,
  
  -- صلاحيات حساسة (Special/Critical)
  can_manage_master_data BOOLEAN DEFAULT false,  -- Lookup tables
  can_view_audit_logs BOOLEAN DEFAULT false,
  can_delete_patient_records BOOLEAN DEFAULT false,  -- Unified DB deletion
  can_manage_users BOOLEAN DEFAULT false,
  can_bypass_department_restriction BOOLEAN DEFAULT false,  -- للـ admin/records_clerk
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_permissions IS 'صلاحيات دقيقة لكل مستخدم على مستوى الصفحات والعمليات';

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all permissions
CREATE POLICY "Admins manage permissions"
  ON public.user_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS: Users can view their own permissions
CREATE POLICY "Users view own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. جدول app_settings: إعدادات عامة للنظام (تفعيل/إيقاف Login)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

COMMENT ON TABLE public.app_settings IS 'إعدادات عامة للنظام (مثل: تفعيل/إيقاف Login)';

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
  ('authentication_mode', '{"enabled": false, "require_login": false}'::jsonb),
  ('default_permissions', '{
    "can_access_dashboard": true,
    "can_access_admission": true,
    "can_access_discharge": true,
    "can_access_medical_procedures": true,
    "can_access_loans": true,
    "can_access_patient_search": true,
    "can_access_records": true,
    "can_access_unified_database": false,
    "can_access_reports": true,
    "can_create_records": true,
    "can_update_records": true,
    "can_delete_records": false,
    "can_export_excel": true,
    "can_import_excel": false,
    "can_manage_master_data": false,
    "can_view_audit_logs": false,
    "can_delete_patient_records": false,
    "can_manage_users": false,
    "can_bypass_department_restriction": false
  }'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read settings
CREATE POLICY "Anyone can read settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- RLS: Only admins can update settings
CREATE POLICY "Admins update settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Function: Get user permissions (with defaults for public access mode)
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  can_access_dashboard BOOLEAN,
  can_access_admission BOOLEAN,
  can_access_discharge BOOLEAN,
  can_access_medical_procedures BOOLEAN,
  can_access_loans BOOLEAN,
  can_access_patient_search BOOLEAN,
  can_access_records BOOLEAN,
  can_access_unified_database BOOLEAN,
  can_access_reports BOOLEAN,
  can_create_records BOOLEAN,
  can_update_records BOOLEAN,
  can_delete_records BOOLEAN,
  can_export_excel BOOLEAN,
  can_import_excel BOOLEAN,
  can_manage_master_data BOOLEAN,
  can_view_audit_logs BOOLEAN,
  can_delete_patient_records BOOLEAN,
  can_manage_users BOOLEAN,
  can_bypass_department_restriction BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_enabled BOOLEAN;
  default_perms JSONB;
BEGIN
  -- Check if authentication is enabled
  SELECT (setting_value->>'enabled')::boolean 
  INTO auth_enabled
  FROM public.app_settings 
  WHERE setting_key = 'authentication_mode';
  
  -- If auth is disabled, return default permissions for everyone
  IF NOT COALESCE(auth_enabled, false) THEN
    SELECT setting_value 
    INTO default_perms
    FROM public.app_settings 
    WHERE setting_key = 'default_permissions';
    
    RETURN QUERY SELECT 
      _user_id,
      (default_perms->>'can_access_dashboard')::boolean,
      (default_perms->>'can_access_admission')::boolean,
      (default_perms->>'can_access_discharge')::boolean,
      (default_perms->>'can_access_medical_procedures')::boolean,
      (default_perms->>'can_access_loans')::boolean,
      (default_perms->>'can_access_patient_search')::boolean,
      (default_perms->>'can_access_records')::boolean,
      (default_perms->>'can_access_unified_database')::boolean,
      (default_perms->>'can_access_reports')::boolean,
      (default_perms->>'can_create_records')::boolean,
      (default_perms->>'can_update_records')::boolean,
      (default_perms->>'can_delete_records')::boolean,
      (default_perms->>'can_export_excel')::boolean,
      (default_perms->>'can_import_excel')::boolean,
      (default_perms->>'can_manage_master_data')::boolean,
      (default_perms->>'can_view_audit_logs')::boolean,
      (default_perms->>'can_delete_patient_records')::boolean,
      (default_perms->>'can_manage_users')::boolean,
      (default_perms->>'can_bypass_department_restriction')::boolean;
    RETURN;
  END IF;
  
  -- If auth is enabled, return user-specific permissions
  RETURN QUERY
  SELECT 
    up.user_id,
    up.can_access_dashboard,
    up.can_access_admission,
    up.can_access_discharge,
    up.can_access_medical_procedures,
    up.can_access_loans,
    up.can_access_patient_search,
    up.can_access_records,
    up.can_access_unified_database,
    up.can_access_reports,
    up.can_create_records,
    up.can_update_records,
    up.can_delete_records,
    up.can_export_excel,
    up.can_import_excel,
    up.can_manage_master_data,
    up.can_view_audit_logs,
    up.can_delete_patient_records,
    up.can_manage_users,
    up.can_bypass_department_restriction
  FROM public.user_permissions up
  WHERE up.user_id = _user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_permissions IS 'جلب صلاحيات المستخدم (مع الدعم للوضع العام بدون Login)';

-- 4. Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_permissions_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_permissions_timestamp
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permissions_timestamp();

CREATE TRIGGER update_app_settings_timestamp
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permissions_timestamp();