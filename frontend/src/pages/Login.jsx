import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
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
      <div className="auth-card">
        {/* Brand */}
        <div className="brand">
          <div className="logo"><i className="bi bi-truck"></i></div>
          <h1>Welcome back</h1>
          <div className="subtitle">Sign in to your Freight ERP account</div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger py-2 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Email address</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-envelope" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', pointerEvents: 'none' }}></i>
              <input
                type="email"
                name="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                autoComplete="email"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Password</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-lock" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', pointerEvents: 'none' }}></i>
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                className="form-control"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                minLength={8}
                style={{ paddingLeft: 36, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--bs-secondary-color)', cursor: 'pointer', padding: 2,
                }}
              >
                <i className={`bi bi-eye${showPwd ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Remember / forgot */}
          <div className="d-flex justify-content-between align-items-center mb-4 small">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" className="form-check-input m-0" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-decoration-none" style={{ color: 'var(--brand)' }}>
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="ss-action-btn ss-action-btn-primary w-100"
            disabled={submitting}
            style={{ justifyContent: 'center', padding: '10px 20px', fontSize: 14 }}
          >
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Signing in…</>
              : <><i className="bi bi-box-arrow-in-right me-2"></i>Sign in</>}
          </button>
        </form>

        {/* Feature list */}
        <div className="auth-feature-list">
          {[
            { icon: 'bi-shield-check', text: 'Enterprise-grade security' },
            { icon: 'bi-graph-up',     text: 'Real-time freight analytics' },
            { icon: 'bi-bell',         text: 'Automated AR collections' },
          ].map(({ icon, text }) => (
            <div key={text} className="auth-feature-item">
              <i className={`bi ${icon}`} style={{ color: 'var(--brand)', fontSize: 14 }}></i>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-3 small text-muted">
          Don't have an account? <Link to="/register" style={{ color: 'var(--brand)' }}>Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
