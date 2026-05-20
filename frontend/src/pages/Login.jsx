import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const from        = location.state?.from?.pathname || '/';

  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="auth-shell">

      {/* ── Left panel ── */}
      <div className="auth-left">
        {/* Container yard SVG pattern */}
        <svg className="auth-bg-pattern" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cyard" x="0" y="0" width="240" height="68"
              patternUnits="userSpaceOnUse" patternTransform="rotate(-32 800 400)">
              <rect x="0"   y="2"  width="52" height="22" rx="3" fill="rgba(255,255,255,.18)"/>
              <rect x="56"  y="2"  width="52" height="22" rx="3" fill="rgba(255,255,255,.12)"/>
              <rect x="112" y="2"  width="52" height="22" rx="3" fill="rgba(255,255,255,.20)"/>
              <rect x="168" y="2"  width="52" height="22" rx="3" fill="rgba(255,255,255,.13)"/>
              <rect x="0"   y="28" width="52" height="22" rx="3" fill="rgba(255,255,255,.13)"/>
              <rect x="56"  y="28" width="52" height="22" rx="3" fill="rgba(255,255,255,.22)"/>
              <rect x="112" y="28" width="52" height="22" rx="3" fill="rgba(255,255,255,.15)"/>
              <rect x="168" y="28" width="52" height="22" rx="3" fill="rgba(255,255,255,.18)"/>
              <rect x="0"   y="54" width="52" height="12" rx="2" fill="rgba(255,255,255,.10)"/>
              <rect x="56"  y="54" width="52" height="12" rx="2" fill="rgba(255,255,255,.14)"/>
              <rect x="112" y="54" width="52" height="12" rx="2" fill="rgba(255,255,255,.10)"/>
              <rect x="168" y="54" width="52" height="12" rx="2" fill="rgba(255,255,255,.16)"/>
              {/* Divider lines */}
              <line x1="18"  y1="2"  x2="18"  y2="24" stroke="rgba(0,30,120,.30)" strokeWidth="1"/>
              <line x1="36"  y1="2"  x2="36"  y2="24" stroke="rgba(0,30,120,.25)" strokeWidth="1"/>
              <line x1="74"  y1="2"  x2="74"  y2="24" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="92"  y1="2"  x2="92"  y2="24" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="130" y1="2"  x2="130" y2="24" stroke="rgba(0,30,120,.28)" strokeWidth="1"/>
              <line x1="148" y1="2"  x2="148" y2="24" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="74"  y1="28" x2="74"  y2="50" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="130" y1="28" x2="130" y2="50" stroke="rgba(0,30,120,.28)" strokeWidth="1"/>
              {/* Corner marks (container anchors) */}
              <rect x="1"   y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
              <rect x="49"  y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
              <rect x="57"  y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.24)"/>
              <rect x="105" y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
              <rect x="113" y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.24)"/>
              <rect x="1"   y="29" width="4" height="4" rx="1" fill="rgba(255,255,255,.24)"/>
              <rect x="57"  y="29" width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cyard)"/>
        </svg>

        {/* Content */}
        <div className="auth-left-content">
          <div className="auth-logo">
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
              <rect x="0"  y="18" width="5" height="10" rx="0.5" fill="rgba(255,255,255,0.30)"/>
              <rect x="6"  y="11" width="5" height="17" rx="0.5" fill="rgba(255,255,255,0.55)"/>
              <rect x="12" y="3"  width="5" height="25" rx="0.5" fill="rgba(255,255,255,0.85)"/>
              <rect x="18" y="0"  width="5" height="28" rx="0.5" fill="#F97316"/>
              <rect x="24" y="6"  width="5" height="22" rx="0.5" fill="rgba(255,255,255,0.55)"/>
              <rect x="30" y="13" width="5" height="15" rx="0.5" fill="rgba(255,255,255,0.30)"/>
            </svg>
            <span className="auth-wordmark">reliq</span>
          </div>

          <div className="auth-hero">
            <h2 className="auth-hero-title">Your freight.<br />Fully in control.</h2>
            <p className="auth-hero-sub">
              End-to-end visibility across shipments, finance, and customer relationships — all in one platform.
            </p>
          </div>

          <div className="auth-features">
            {[
              { icon: 'bi-boxes',          text: 'Live shipment tracking across all modes' },
              { icon: 'bi-wallet2',        text: 'Automated AR collections & invoicing' },
              { icon: 'bi-graph-up-arrow', text: 'Real-time revenue and margin analytics' },
              { icon: 'bi-shield-check',   text: 'Enterprise-grade security & compliance' },
            ].map(({ icon, text }) => (
              <div key={text} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <i className={`bi ${icon}`} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="auth-left-foot">
            <span>AI-DRIVEN CRM · ERP · GORELIQ.COM</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-card-title">Welcome back</h1>
            <p className="auth-card-sub">Sign in to your Reliq account</p>
          </div>

          {error && (
            <div className="auth-error">
              <i className="bi bi-exclamation-triangle-fill" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <i className="bi bi-envelope auth-input-icon" />
                <input type="email" name="email" className="auth-input"
                  value={form.email} onChange={handleChange}
                  placeholder="you@company.com" required autoComplete="email" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <i className="bi bi-lock auth-input-icon" />
                <input type={showPwd ? 'text' : 'password'} name="password" className="auth-input"
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" required autoComplete="current-password" minLength={8}
                  style={{ paddingRight: 40 }} />
                <button type="button" className="auth-pwd-toggle" tabIndex={-1} onClick={() => setShowPwd(v => !v)}>
                  <i className={`bi bi-eye${showPwd ? '-slash' : ''}`} />
                </button>
              </div>
            </div>

            <div className="auth-row-between">
              <label className="auth-checkbox-label">
                <input type="checkbox" className="auth-checkbox" />
                Remember me
              </label>
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting
                ? <><span className="auth-spinner" />Signing in…</>
                : <><i className="bi bi-box-arrow-in-right" />Sign in</>}
            </button>
          </form>

          <div className="auth-feat-list">
            {[
              { icon: 'bi-shield-check', text: 'Enterprise-grade security' },
              { icon: 'bi-graph-up',     text: 'Real-time freight analytics' },
              { icon: 'bi-bell',         text: 'Automated AR collections' },
            ].map(({ icon, text }) => (
              <div key={text} className="auth-feat-row">
                <i className={`bi ${icon}`} />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="auth-switch">
            Don't have an account? <Link to="/register" className="auth-link">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
