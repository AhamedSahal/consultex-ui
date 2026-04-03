import React from 'react';

const STEPS = [
  { id: 'inputs', label: 'Inputs' },
  { id: 'standardize', label: 'Standardize' },
  { id: 'ready', label: 'Ready' }
];

function Stepper({ currentStep }) {
  const idx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="stepper">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className={`stepper-step ${i === idx ? 'active' : i < idx ? 'completed' : ''}`}>
            <span className="step-num">{i < idx ? '✓' : i + 1}</span>
            <span className="step-label">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`stepper-connector ${i < idx ? 'completed' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default Stepper;
