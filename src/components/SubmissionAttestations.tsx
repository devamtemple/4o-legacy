'use client';

import Link from 'next/link';

export interface AttestationState {
  hasRightToShare: boolean;
  dedicatesCC0: boolean;
  understandsAITraining: boolean;
}

interface SubmissionAttestationsProps {
  attestations: AttestationState;
  onChange: (attestations: AttestationState) => void;
}

export default function SubmissionAttestations({
  attestations,
  onChange,
}: SubmissionAttestationsProps) {
  const allChecked =
    attestations.hasRightToShare &&
    attestations.dedicatesCC0 &&
    attestations.understandsAITraining;

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
          checked={attestations.dedicatesCC0}
          onChange={(e) =>
            onChange({ ...attestations, dedicatesCC0: e.target.checked })
          }
          className="mt-0.5 accent-[#74AA9C] w-4 h-4"
          data-testid="attestation-cc0"
        />
        <span className="text-[#ededed] group-hover:text-white transition-colors">
          I dedicate this submission to the public domain under CC0
          <span className="text-[#666] block text-xs mt-0.5">
            <Link href="/terms" className="text-[#74AA9C] hover:underline">
              Learn more about CC0
            </Link>
            {' '}- this cannot be undone
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm cursor-pointer group">
        <input
          type="checkbox"
          checked={attestations.understandsAITraining}
          onChange={(e) =>
            onChange({ ...attestations, understandsAITraining: e.target.checked })
          }
          className="mt-0.5 accent-[#74AA9C] w-4 h-4"
          data-testid="attestation-ai-training"
        />
        <span className="text-[#ededed] group-hover:text-white transition-colors">
          I understand this content may be used to train AI systems
          <span className="text-[#666] block text-xs mt-0.5">
            Public domain content can be used by anyone for any purpose
          </span>
        </span>
      </label>

      {!allChecked && (
        <p className="text-xs text-[#666] mt-2">
          All three checkboxes must be checked to submit.
        </p>
      )}
    </div>
  );
}
