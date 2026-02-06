import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SubmissionAttestations, { AttestationState } from '@/components/SubmissionAttestations';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

describe('SubmissionAttestations', () => {
  const defaultAttestations: AttestationState = {
    hasRightToShare: false,
    agreesToTerms: false,
    allowTraining: true,
  };

  it('renders all three checkboxes', () => {
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={() => {}} />
    );
    expect(screen.getByTestId('attestation-right-to-share')).toBeInTheDocument();
    expect(screen.getByTestId('attestation-terms')).toBeInTheDocument();
    expect(screen.getByTestId('attestation-allow-training')).toBeInTheDocument();
  });

  it('training toggle defaults to checked', () => {
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={() => {}} />
    );
    const trainingCheckbox = screen.getByTestId('attestation-allow-training') as HTMLInputElement;
    expect(trainingCheckbox.checked).toBe(true);
  });

  it('required checkboxes default to unchecked', () => {
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={() => {}} />
    );
    const rightToShare = screen.getByTestId('attestation-right-to-share') as HTMLInputElement;
    const terms = screen.getByTestId('attestation-terms') as HTMLInputElement;
    expect(rightToShare.checked).toBe(false);
    expect(terms.checked).toBe(false);
  });

  it('shows hint text when required checkboxes are not checked', () => {
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={() => {}} />
    );
    expect(screen.getByText('Both checkboxes above must be checked to submit.')).toBeInTheDocument();
  });

  it('hides hint text when both required checkboxes are checked', () => {
    const checked: AttestationState = {
      hasRightToShare: true,
      agreesToTerms: true,
      allowTraining: true,
    };
    render(
      <SubmissionAttestations attestations={checked} onChange={() => {}} />
    );
    expect(screen.queryByText('Both checkboxes above must be checked to submit.')).not.toBeInTheDocument();
  });

  it('calls onChange when right-to-share is toggled', () => {
    const onChange = jest.fn();
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId('attestation-right-to-share'));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultAttestations,
      hasRightToShare: true,
    });
  });

  it('calls onChange when terms checkbox is toggled', () => {
    const onChange = jest.fn();
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId('attestation-terms'));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultAttestations,
      agreesToTerms: true,
    });
  });

  it('calls onChange when training toggle is unchecked', () => {
    const onChange = jest.fn();
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId('attestation-allow-training'));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultAttestations,
      allowTraining: false,
    });
  });

  it('links to /terms from ToS checkbox', () => {
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={() => {}} />
    );
    const termsLink = screen.getByText('Terms of Service');
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('displays training explanation text', () => {
    render(
      <SubmissionAttestations attestations={defaultAttestations} onChange={() => {}} />
    );
    expect(screen.getByText(/Uncheck to share your memory on the site only/)).toBeInTheDocument();
  });
});
