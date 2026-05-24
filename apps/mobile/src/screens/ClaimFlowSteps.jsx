import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Describe' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Submit' },
];

function activeLineWidth(currentStep) {
  if (currentStep <= 1) return '50%';
  if (currentStep === 2) return '50%';
  return '100%';
}

export default function ClaimFlowSteps({ currentStep = 1 }) {
  return (
    <nav className="claim-flow-steps" aria-label="Claim progress">
      <div className="claim-flow-steps__track" aria-hidden="true">
        <span className="claim-flow-steps__line" />
        <span
          className="claim-flow-steps__line claim-flow-steps__line--active"
          style={{ width: activeLineWidth(currentStep) }}
        />
      </div>
      <ol className="claim-flow-steps__list">
        {STEPS.map((step) => {
          const active = step.id === currentStep;
          const complete = step.id < currentStep;
          return (
            <li
              key={step.id}
              className={`claim-flow-steps__item${active ? ' claim-flow-steps__item--active' : ''}${complete ? ' claim-flow-steps__item--complete' : ''}`}
            >
              <span className="claim-flow-steps__circle">
                {complete ? <Check size={16} strokeWidth={2.75} aria-hidden="true" /> : step.id}
              </span>
              <span className="claim-flow-steps__label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
