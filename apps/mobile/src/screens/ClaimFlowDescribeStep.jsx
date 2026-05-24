import { useState } from 'react';
import { ArrowLeft, ArrowRight, FilePenLine } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Describe' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Submit' },
];

export default function ClaimFlowDescribeStep({
  incidentNarrative = '',
  onNarrativeChange,
  onBack,
  onNext,
}) {
  const [touched, setTouched] = useState(false);
  const [attemptedNext, setAttemptedNext] = useState(false);

  const chars = incidentNarrative.length;
  const isValid = chars >= 10;
  const showValidation = (touched || attemptedNext) && !isValid;

  const handleNext = () => {
    if (!isValid) {
      setAttemptedNext(true);
      return;
    }
    onNext?.();
  };

  return (
    <main className="screen claim-flow-screen claim-flow-screen--describe">
      <header className="claim-flow-screen__header">
        <button type="button" className="claim-flow-screen__back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="claim-flow-screen__header-title">Describe Incident</h1>
        <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
      </header>

      <nav className="claim-flow-steps" aria-label="Claim progress">
        <div className="claim-flow-steps__track" aria-hidden="true">
          <span className="claim-flow-steps__line" />
          <span className="claim-flow-steps__line claim-flow-steps__line--active" />
        </div>
        <ol className="claim-flow-steps__list">
          {STEPS.map((step) => {
            const active = step.id === 1;
            const complete = step.id < 1;
            return (
              <li
                key={step.id}
                className={`claim-flow-steps__item${active ? ' claim-flow-steps__item--active' : ''}${complete ? ' claim-flow-steps__item--complete' : ''}`}
              >
                <span className="claim-flow-steps__circle">{step.id}</span>
                <span className="claim-flow-steps__label">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="claim-flow-screen__intro">
        <h2 className="claim-flow-screen__heading">What happened?</h2>
        <p className="claim-flow-screen__subheading">
          Describe the trip, accident time, injuries, and what happened.
        </p>
      </section>

      <article className="claim-flow-narrative-card">
        <div className="claim-flow-narrative-card__head">
          <div className="claim-flow-narrative-card__icon" aria-hidden="true">
            <FilePenLine size={22} strokeWidth={2} color="#007A3D" />
          </div>
          <div className="claim-flow-narrative-card__titles">
            <h3 className="claim-flow-narrative-card__title">Accident Narrative</h3>
            <p className="claim-flow-narrative-card__hint">Minimum 10 characters required</p>
          </div>
        </div>

        <div className="claim-flow-narrative-card__field">
          <textarea
            className={`claim-flow-narrative-card__textarea${showValidation ? ' claim-flow-narrative-card__textarea--invalid' : ''}`}
            maxLength={500}
            value={incidentNarrative}
            onChange={(event) => onNarrativeChange?.(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Describe the minibus journey, what time the accident happened, and any injuries sustained…"
            aria-invalid={showValidation}
            aria-describedby={showValidation ? 'claim-narrative-error' : undefined}
          />
          <span className="claim-flow-narrative-card__counter">{chars}/500</span>
        </div>

        {showValidation && (
          <p id="claim-narrative-error" className="claim-flow-narrative-card__error" role="alert">
            Please enter at least 10 characters describing the incident.
          </p>
        )}
      </article>

      <button
        type="button"
        className="claim-flow-screen__next"
        disabled={!isValid}
        onClick={handleNext}
      >
        <span>Next: Upload Documents</span>
        <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </main>
  );
}
