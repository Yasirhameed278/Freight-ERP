import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    clientCode: '', password: '', confirmPassword: '',
  });
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="auth-shell">

      {/* ── Left panel ── */}
      <div className="auth-left">
        <svg className="auth-bg-pattern" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cyard2" x="0" y="0" width="240" height="68"
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
              <line x1="18"  y1="2"  x2="18"  y2="24" stroke="rgba(0,30,120,.30)" strokeWidth="1"/>
              <line x1="36"  y1="2"  x2="36"  y2="24" stroke="rgba(0,30,120,.25)" strokeWidth="1"/>
              <line x1="74"  y1="2"  x2="74"  y2="24" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="92"  y1="2"  x2="92"  y2="24" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="130" y1="2"  x2="130" y2="24" stroke="rgba(0,30,120,.28)" strokeWidth="1"/>
              <line x1="148" y1="2"  x2="148" y2="24" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="74"  y1="28" x2="74"  y2="50" stroke="rgba(0,30,120,.22)" strokeWidth="1"/>
              <line x1="130" y1="28" x2="130" y2="50" stroke="rgba(0,30,120,.28)" strokeWidth="1"/>
              <rect x="1"   y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
              <rect x="49"  y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
              <rect x="57"  y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.24)"/>
              <rect x="105" y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
              <rect x="113" y="3"  width="4" height="4" rx="1" fill="rgba(255,255,255,.24)"/>
              <rect x="1"   y="29" width="4" height="4" rx="1" fill="rgba(255,255,255,.24)"/>
              <rect x="57"  y="29" width="4" height="4" rx="1" fill="rgba(255,255,255,.30)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cyard2)"/>
        </svg>

        <div className="auth-left-content">
          <div className="auth-logo">
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <h2 className="auth-hero-title">Track your cargo.<br />In real time.</h2>
            <p className="auth-hero-sub">
              Create a customer account to track your shipments, view invoices, and stay connected with your freight team.
            </p>
          </div>

          <div className="auth-features">
            {[
              { icon: 'bi-geo-alt',       text: 'Live milestone updates for every shipment' },
              { icon: 'bi-receipt',       text: 'View and download your invoices anytime' },
              { icon: 'bi-chat-dots',     text: 'Direct communication with your ops team' },
              { icon: 'bi-bell',          text: 'Instant alerts on cargo arrivals & customs' },
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
            <span style={{ opacity: .4, fontSize: 12 }}>AI-DRIVEN CRM · ERP · GORELIQ.COM</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card" style={{ maxWidth: 460 }}>
          <div className="auth-card-header">
            <h1 className="auth-card-title">Create your account</h1>
            <p className="auth-card-sub">Customer portal — track your shipments</p>
          </div>

          {error && (
            <div className="auth-error">
              <i className="bi bi-exclamation-triangle-fill" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-grid-2">
              <div className="auth-field">
                <label className="auth-label">First name *</label>
                <input className="auth-input" name="firstName" value={form.firstName}
                  onChange={handleChange} required placeholder="Ali" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Last name *</label>
                <input className="auth-input" name="lastName" value={form.lastName}
                  onChange={handleChange} required placeholder="Ahmed" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email *</label>
              <div className="auth-input-wrap">
                <i className="bi bi-envelope auth-input-icon" />
                <input className="auth-input" type="email" name="email" value={form.email}
                  onChange={handleChange} required placeholder="you@company.com" autoComplete="email" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Phone</label>
              <div className="auth-input-wrap">
                <i className="bi bi-telephone auth-input-icon" />
                <input className="auth-input" type="tel" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="+971 4 000 0000" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Client Code *</label>
              <div className="auth-input-wrap">
                <i className="bi bi-building auth-input-icon" />
                <input className="auth-input" type="text" name="clientCode" value={form.clientCode}
                  onChange={handleChange} required placeholder="Provided by your account manager"
                  style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="auth-hint">Your company must already exist in our system.</div>
            </div>

            <div className="auth-grid-2">
              <div className="auth-field">
                <label className="auth-label">Password *</label>
                <input className="auth-input" type="password" name="password" value={form.password}
                  onChange={handleChange} required autoComplete="new-password" placeholder="Min. 8 characters" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirm password *</label>
                <input className="auth-input" type="password" name="confirmPassword" value={form.confirmPassword}
                  onChange={handleChange} required autoComplete="new-password" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting
                ? <><span className="auth-spinner" />Creating account…</>
                : <><i className="bi bi-person-plus" />Create account</>}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
