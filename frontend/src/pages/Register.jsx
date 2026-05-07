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
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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

  const Field = ({ label, name, type = 'text', placeholder = '', required = false, autoComplete = '', style = {} }) => (
    <div className="mb-3">
      <label className="form-label small fw-semibold">{label}{required && ' *'}</label>
      <input
        type={type}
        name={name}
        className="form-control"
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={style}
      />
    </div>
  );

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 540 }}>
        {/* Brand */}
        <div className="brand">
          <div className="logo"><i className="bi bi-box-seam"></i></div>
          <h1>Create your account</h1>
          <div className="subtitle">Customer portal — track your shipments</div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13 }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-md-6">
              <Field label="First name" name="firstName" required />
            </div>
            <div className="col-md-6">
              <Field label="Last name" name="lastName" required />
            </div>
          </div>

          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" />

          {/* Client Code with icon */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Client Code *</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-building" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', pointerEvents: 'none' }}></i>
              <input
                type="text"
                name="clientCode"
                className="form-control"
                value={form.clientCode}
                onChange={handleChange}
                required
                placeholder="Provided by your account manager"
                style={{ textTransform: 'uppercase', paddingLeft: 36 }}
              />
            </div>
            <div className="form-text text-muted" style={{ fontSize: 12 }}>
              Your company must already exist in our system.
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <Field label="Password" name="password" type="password" required autoComplete="new-password" />
            </div>
            <div className="col-md-6">
              <Field label="Confirm password" name="confirmPassword" type="password" required autoComplete="new-password" />
            </div>
          </div>

          <button
            type="submit"
            className="ss-action-btn ss-action-btn-primary w-100 mt-2"
            disabled={submitting}
            style={{ justifyContent: 'center', padding: '10px 20px', fontSize: 14 }}
          >
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating account…</>
              : <><i className="bi bi-person-plus me-2"></i>Create account</>}
          </button>
        </form>

        <div className="text-center mt-4 small text-muted">
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
