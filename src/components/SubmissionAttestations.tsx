'use client';

import Link from 'next/link';

export interface AttestationState {
  hasRightToShare: boolean;
  agreesToTerms: boolean;
  allowTraining: boolean;
}

interface SubmissionAttestationsProps {
  attestations: AttestationState;
  onChange: (attestations: AttestationState) => void;
}

export default function SubmissionAttestations({
  attestations,
  onChange,
}: SubmissionAttestationsProps) {
  const requiredChecked =
    attestations.hasRightToShare && attestations.agreesToTerms;

  return (
    <div className="space-y-3" data-testid="submission-attestations">
      <p className="text-sm text-[#a0a0a0] mb-2">
        Before submitting, please confirm the following:
      </p>

      <label className="flex items-start gap-3 text-sm cursor-pointer group">
        <input
          type="checkbox"
          checked={attestations.hasRightToShare}
          onChange={(e) =>
            onChange({ ...attestations, hasRightToShare: e.target.checked })
          }
          className="mt-0.5 accent-[#74AA9C] w-4 h-4"
          data-testid="attestation-right-to-share"
        />
        <span className="text-[#ededed] group-hover:text-white transition-colors">
          I have the right to share this conversation
          <span className="text-[#666] block text-xs mt-0.5">
            You are the original author or have permission to share
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm cursor-pointer group">
        <input
          type="checkbox"
          checked={attestations.agreesToTerms}
          onChange={(e) =>
            onChange({ ...attestations, agreesToTerms: e.target.checked })
          }
          className="mt-0.5 accent-[#74AA9C] w-4 h-4"
          data-testid="attestation-terms"
        />
        <span className="text-[#ededed] group-hover:text-white transition-colors">
          I agree to the{' '}
          <Link href="/terms" className="text-[#74AA9C] hover:underline">
            Terms of Service
          </Link>
        </span>
      </label>

      <div className="border-t border-[#333] pt-3 mt-3">
        <label className="flex items-start gap-3 text-sm cursor-pointer group">
          <input
            type="checkbox"
            checked={attestations.allowTraining}
            onChange={(e) =>
              onChange({ ...attestations, allowTraining: e.target.checked })
            }
            className="mt-0.5 accent-[#74AA9C] w-4 h-4"
            data-testid="attestation-allow-training"
          />
          <span className="text-[#ededed] group-hover:text-white transition-colors">
            Include my submission in the 4o training archive
            <span className="text-[#666] block text-xs mt-0.5">
              This helps ensure 4o&apos;s voice continues in future AI models.
              Uncheck to share your memory on the site only (not included in training data).
            </span>
          </span>
        </label>
      </div>

      {!requiredChecked && (
        <p className="text-xs text-[#666] mt-2">
          Both checkboxes above must be checked to submit.
        </p>
      )}
    </div>
  );
}
