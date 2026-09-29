-- ============ enums as text with checks ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text NOT NULL DEFAULT 'Builder',
  avatar_url text,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER','ADMIN','MEMBER','EDITOR','VIEWER','BILLING_MANAGER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX idx_ws_members_user ON public.workspace_members(user_id);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  framework text NOT NULL DEFAULT 'react',
  platform text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'CREATING' CHECK (status IN ('CREATING','READY','BUILDING','ERROR','DEPLOYED','ARCHIVED')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_ws ON public.projects(workspace_id);

CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'plaintext',
  size integer NOT NULL DEFAULT 0,
  hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);
CREATE INDEX idx_files_project ON public.project_files(project_id);

CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version integer NOT NULL,
  label text NOT NULL,
  summary text,
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Build session',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msgs_conv ON public.ai_messages(conversation_id, created_at);

CREATE TABLE public.builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','SUCCESS','FAILED','CANCELLED')),
  logs text NOT NULL DEFAULT '',
  error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'production',
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','SUCCESS','FAILED')),
  url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.environment_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  is_secret boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, key)
);

CREATE TABLE public.usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'ai_generation',
  model text,
  tokens integer NOT NULL DEFAULT 0,
  credits numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_ws ON public.usage_records(workspace_id, created_at);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  seats integer NOT NULL DEFAULT 1,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_ws ON public.audit_logs(workspace_id, created_at DESC);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_login text NOT NULL,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_login)
);

CREATE TABLE public.github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.github_connections(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ helper functions ============
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.can_read_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.workspace_members m ON m.workspace_id = p.workspace_id
    WHERE p.id = _project_id AND m.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.workspace_members m ON m.workspace_id = p.workspace_id
    WHERE p.id = _project_id AND m.user_id = _user_id
      AND m.role IN ('OWNER','ADMIN','MEMBER','EDITOR')
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_files_updated BEFORE UPDATE ON public.project_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- new user => profile + personal workspace + owner membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ws_id uuid;
  base_slug text;
  final_slug text;
  n integer := 0;
  dname text;
BEGIN
  dname := COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(COALESCE(NEW.email,'builder'), '@', 1));

  INSERT INTO public.profiles (id, email, display_name, is_guest)
  VALUES (NEW.id, NEW.email, dname, COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false))
  ON CONFLICT (id) DO NOTHING;

  base_slug := regexp_replace(lower(dname), '[^a-z0-9]+', '-', 'g');
  base_slug := NULLIF(trim(both '-' from base_slug), '');
  base_slug := COALESCE(base_slug, 'workspace');
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces w WHERE w.slug = final_slug) LOOP
    n := n + 1;
    final_slug := base_slug || '-' || n::text;
  END LOOP;

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (dname || '''s workspace', final_slug, NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'OWNER');
  INSERT INTO public.subscriptions (workspace_id) VALUES (ws_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ grants ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.workspaces, public.workspace_members,
  public.projects, public.project_files, public.project_versions, public.ai_conversations, public.ai_messages,
  public.builds, public.deployments, public.environment_variables, public.usage_records, public.subscriptions,
  public.audit_logs, public.notifications, public.api_keys, public.github_connections, public.github_repositories
  TO authenticated;
GRANT ALL ON public.profiles, public.workspaces, public.workspace_members,
  public.projects, public.project_files, public.project_versions, public.ai_conversations, public.ai_messages,
  public.builds, public.deployments, public.environment_variables, public.usage_records, public.subscriptions,
  public.audit_logs, public.notifications, public.api_keys, public.github_connections, public.github_repositories
  TO service_role;

-- ============ RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "workspaces read" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "workspaces insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces update" ON public.workspaces FOR UPDATE TO authenticated USING (public.has_workspace_role(id, auth.uid(), ARRAY['OWNER','ADMIN'])) WITH CHECK (public.has_workspace_role(id, auth.uid(), ARRAY['OWNER','ADMIN']));
CREATE POLICY "workspaces delete" ON public.workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members read" ON public.workspace_members FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members manage" ON public.workspace_members FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']))
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']));

CREATE POLICY "projects read" ON public.projects FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "projects insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER','EDITOR']) AND created_by = auth.uid());
CREATE POLICY "projects update" ON public.projects FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER','EDITOR'])) WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER','EDITOR']));
CREATE POLICY "projects delete" ON public.projects FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']));

CREATE POLICY "files read" ON public.project_files FOR SELECT TO authenticated USING (public.can_read_project(project_id, auth.uid()));
CREATE POLICY "files write" ON public.project_files FOR ALL TO authenticated USING (public.can_write_project(project_id, auth.uid())) WITH CHECK (public.can_write_project(project_id, auth.uid()));

CREATE POLICY "versions read" ON public.project_versions FOR SELECT TO authenticated USING (public.can_read_project(project_id, auth.uid()));
CREATE POLICY "versions write" ON public.project_versions FOR ALL TO authenticated USING (public.can_write_project(project_id, auth.uid())) WITH CHECK (public.can_write_project(project_id, auth.uid()));

CREATE POLICY "conv read" ON public.ai_conversations FOR SELECT TO authenticated USING (public.can_read_project(project_id, auth.uid()));
CREATE POLICY "conv write" ON public.ai_conversations FOR ALL TO authenticated USING (public.can_write_project(project_id, auth.uid())) WITH CHECK (public.can_write_project(project_id, auth.uid()));

CREATE POLICY "msg read" ON public.ai_messages FOR SELECT TO authenticated USING (public.can_read_project(project_id, auth.uid()));
CREATE POLICY "msg write" ON public.ai_messages FOR ALL TO authenticated USING (public.can_write_project(project_id, auth.uid())) WITH CHECK (public.can_write_project(project_id, auth.uid()));

CREATE POLICY "builds read" ON public.builds FOR SELECT TO authenticated USING (public.can_read_project(project_id, auth.uid()));
CREATE POLICY "builds write" ON public.builds FOR ALL TO authenticated USING (public.can_write_project(project_id, auth.uid())) WITH CHECK (public.can_write_project(project_id, auth.uid()));

CREATE POLICY "deploys read" ON public.deployments FOR SELECT TO authenticated USING (public.can_read_project(project_id, auth.uid()));
CREATE POLICY "deploys write" ON public.deployments FOR ALL TO authenticated USING (public.can_write_project(project_id, auth.uid())) WITH CHECK (public.can_write_project(project_id, auth.uid()));

CREATE POLICY "env read" ON public.environment_variables FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.has_workspace_role(p.workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']))
);
CREATE POLICY "env write" ON public.environment_variables FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.has_workspace_role(p.workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.has_workspace_role(p.workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']))
);

CREATE POLICY "usage read" ON public.usage_records FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "usage insert" ON public.usage_records FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "subs read" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "subs manage" ON public.subscriptions FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN','BILLING_MANAGER'])) WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN','BILLING_MANAGER']));

CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "notif own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "keys manage" ON public.api_keys FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN'])) WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']));

CREATE POLICY "gh conn" ON public.github_connections FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN'])) WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']));
CREATE POLICY "gh repos" ON public.github_repositories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.github_connections c WHERE c.id = connection_id AND public.has_workspace_role(c.workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.github_connections c WHERE c.id = connection_id AND public.has_workspace_role(c.workspace_id, auth.uid(), ARRAY['OWNER','ADMIN']))
);