-- Schema for M2M Authentication Service Database Tables
-- To be executed in Supabase SQL Editor

-- Create a dedicated schema for identity provider functionality
CREATE SCHEMA IF NOT EXISTS org_identity_provider;

-- Enable service_role to access the custom schema
ALTER ROLE service_role SET search_path TO public, org_identity_provider;

-- Enable the anon and authenticated roles to access the custom schema through RLS policies
ALTER ROLE anon SET search_path TO public, org_identity_provider;
ALTER ROLE authenticated SET search_path TO public, org_identity_provider;

-- IMPORTANT: Grant permissions to service_role on the schema and all tables
GRANT USAGE ON SCHEMA org_identity_provider TO service_role;
GRANT ALL PRIVILEGES ON SCHEMA org_identity_provider TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA org_identity_provider TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA org_identity_provider TO service_role;

-- Also grant permissions to authenticated users (needed for RLS policies)
GRANT USAGE ON SCHEMA org_identity_provider TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA org_identity_provider TO authenticated;

-- Grant permissions to anon role for public access
GRANT USAGE ON SCHEMA org_identity_provider TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA org_identity_provider TO anon;

-- Clients table stores registered client applications
CREATE TABLE org_identity_provider.clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hashed_secret TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  service_type TEXT DEFAULT 'application',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX idx_clients_name ON org_identity_provider.clients(name);

-- Client scopes table defines what scopes each client is allowed to request
CREATE TABLE org_identity_provider.client_scopes (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES org_identity_provider.clients(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  UNIQUE(client_id, scope)
);

-- Create index on client_id for faster lookups
CREATE INDEX idx_client_scopes_client_id ON org_identity_provider.client_scopes(client_id);

-- Issued tokens table for tracking issued tokens and supporting revocation
CREATE TABLE org_identity_provider.issued_tokens (
  token_id TEXT PRIMARY KEY,
  client_id UUID REFERENCES org_identity_provider.clients(id) ON DELETE CASCADE,
  scopes TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on client_id for faster lookups
CREATE INDEX idx_issued_tokens_client_id ON org_identity_provider.issued_tokens(client_id);
-- Create index on expiration to help with token cleanup
CREATE INDEX idx_issued_tokens_expires_at ON org_identity_provider.issued_tokens(expires_at);
-- Create index on revoked status for faster token validation
CREATE INDEX idx_issued_tokens_revoked ON org_identity_provider.issued_tokens(revoked);

-- Standard scopes table to define available scopes
CREATE TABLE org_identity_provider.standard_scopes (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard scopes
INSERT INTO org_identity_provider.standard_scopes (scope, description, category) VALUES
-- Resource-based scopes
('api:read', 'Read-only access to all API resources', 'resource'),
('api:write', 'Write access to all API resources', 'resource'),
-- Functional scopes
('events:subscribe', 'Subscribe to events from a service', 'functional');

-- Services table catalogs available services and their required scopes
CREATE TABLE org_identity_provider.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  api_url TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT DEFAULT 'active',
  version TEXT DEFAULT '1.0.0',
  documentation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX idx_services_name ON org_identity_provider.services(name);
-- Create index on status for filtering active services
CREATE INDEX idx_services_status ON org_identity_provider.services(status);

-- Setup Row Level Security (RLS) Policies
-- Note: These are example policies and should be customized for your needs

-- Clients table policies
ALTER TABLE org_identity_provider.clients ENABLE ROW LEVEL SECURITY;

-- Only system admins can see client details (including hashed secrets)
-- First drop the policy if it exists
DROP POLICY IF EXISTS admin_all_clients ON org_identity_provider.clients;

CREATE POLICY admin_all_clients ON org_identity_provider.clients
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata')::jsonb -> 'role')::text = '"admin"');

-- Client scopes table policies
ALTER TABLE org_identity_provider.client_scopes ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage client scopes
-- First drop the policy if it exists
DROP POLICY IF EXISTS admin_all_client_scopes ON org_identity_provider.client_scopes;

CREATE POLICY admin_all_client_scopes ON org_identity_provider.client_scopes
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata')::jsonb -> 'role')::text = '"admin"');

-- Issued tokens table policies
ALTER TABLE org_identity_provider.issued_tokens ENABLE ROW LEVEL SECURITY;

-- Only system admins can see all issued tokens
-- First drop the policy if it exists
DROP POLICY IF EXISTS admin_all_issued_tokens ON org_identity_provider.issued_tokens;

CREATE POLICY admin_all_issued_tokens ON org_identity_provider.issued_tokens
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata')::jsonb -> 'role')::text = '"admin"');

-- Services table policies
ALTER TABLE org_identity_provider.services ENABLE ROW LEVEL SECURITY;

-- Everyone can read services
CREATE POLICY read_all_services ON org_identity_provider.services
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify services
-- First drop the policy if it exists
DROP POLICY IF EXISTS admin_modify_services ON org_identity_provider.services;

CREATE POLICY admin_modify_services ON org_identity_provider.services
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata')::jsonb -> 'role')::text = '"admin"');
