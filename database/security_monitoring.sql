-- Security Monitoring Tables
-- Handles security events, threat detection, and incident response

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- SECURITY EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'suspicious_login', 'rate_limit_exceeded', 'malicious_content', 
        'data_breach_attempt', 'unauthorized_access', 'spam_detected',
        'sql_injection', 'xss_attempt', 'bot_activity', 'account_takeover'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NUL