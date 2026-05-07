import { useState } from 'react';
import { Modal, Form, Button, Alert, InputGroup } from 'react-bootstrap';

const SendDocumentModal = ({ title, defaultEmail = '', onSend, onClose, onPreview }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [cc, setCc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onSend({ email, cc: cc || undefined });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Recipient Email</Form.Label>
            <InputGroup>
              <InputGroup.Text><i className="bi bi-envelope"></i></InputGroup.Text>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@company.com"
                required
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cc <small className="text-muted">(optional)</small></Form.Label>
            <Form.Control
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="manager@your-company.com"
            />
          </Form.Group>

          <div className="d-flex gap-2 small">
            <Button variant="link" className="p-0" onClick={onPreview} type="button">
              <i className="bi bi-file-earmark-pdf me-1"></i>Preview PDF
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? <><i className="bi bi-hourglass-split me-1"></i>Sending…</> : <><i className="bi bi-send me-1"></i>Send</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default SendDocumentModal;
