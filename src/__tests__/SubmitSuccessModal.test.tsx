import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubmitSuccessModal from '@/components/SubmitSuccessModal';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SubmitSuccessModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    postId: 'test-post-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SubmitSuccessModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when postId is empty', () => {
    const { container } = render(
      <SubmitSuccessModal {...defaultProps} postId="" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal with heading when open', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    expect(screen.getByTestId('modal-heading')).toHaveTextContent('Your Memory Is Live');
    expect(screen.getByText(/Thank you for sharing/)).toBeInTheDocument();
  });

  it('shows "Behind the scenes" section', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    expect(screen.getByText('Behind the scenes')).toBeInTheDocument();
    expect(screen.getByText(/removes names and personal info/)).toBeInTheDocument();
    expect(screen.getByText(/spam or trolling gets filtered/)).toBeInTheDocument();
  });

  it('shows Remove Names payment button', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    expect(screen.getByTestId('scrub-button')).toBeInTheDocument();
    expect(screen.getByText(/Remove Names/)).toBeInTheDocument();
  });

  it('shows dismiss button', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    const dismissButton = screen.getByTestId('dismiss-button');
    expect(dismissButton).toHaveTextContent('Done');
  });

  it('calls onClose when dismiss button is clicked', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('dismiss-button'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close X button is clicked', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('modal-close-button'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('submit-success-modal'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles info section when info button is clicked', () => {
    render(<SubmitSuccessModal {...defaultProps} />);

    // Info section not visible initially
    expect(screen.queryByTestId('info-section')).not.toBeInTheDocument();

    // Click info toggle
    fireEvent.click(screen.getByTestId('info-toggle'));
    expect(screen.getByTestId('info-section')).toBeInTheDocument();
    expect(screen.getByText(/community-funded/)).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(screen.getByTestId('info-toggle'));
    expect(screen.queryByTestId('info-section')).not.toBeInTheDocument();
  });

  it('calls fetch with scrub when Remove Names button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://stripe.com/checkout' }),
    });

    render(<SubmitSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('scrub-button'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'scrub', postId: 'test-post-123' }),
      });
    });
  });

  it('shows payment error when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Payment service unavailable' }),
    });

    render(<SubmitSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('scrub-button'));

    await waitFor(() => {
      expect(screen.getByTestId('payment-error')).toHaveTextContent('Payment service unavailable');
    });
  });

  it('locks body overflow when open', () => {
    render(<SubmitSuccessModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });
});
