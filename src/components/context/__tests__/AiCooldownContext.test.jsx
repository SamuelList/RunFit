import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AiCooldownProvider, useAiCooldown } from '../AiCooldownContext.js';
import { formatMs, COOLDOWN_MS } from '../../../utils/aiCooldown';

// Simple consumer that exposes a start button and the AI button whose enabled state
// reflects the cooldown context.
function TestConsumer() {
  const { remainingMs, isReady, startCooldown } = useAiCooldown();
  return React.createElement(
    'div',
    null,
    React.createElement('button', { 'data-testid': 'start', onClick: () => startCooldown(Date.now()) }, 'Start Cooldown'),
    React.createElement('button', { 'data-testid': 'ai-button', disabled: !isReady }, isReady ? 'AI' : formatMs(remainingMs))
  );
}

describe('AiCooldownContext', () => {
  beforeEach(() => {
    // Clear localStorage key used by the util to avoid test bleed
    try { localStorage.removeItem('runfit_ai_last_used_v1'); } catch (e) {}
  });

  test('button becomes disabled after starting cooldown and re-enables after timeout', () => {
    vi.useFakeTimers();

    render(React.createElement(AiCooldownProvider, null, React.createElement(TestConsumer)));

    const ai = screen.getByTestId('ai-button');
    const start = screen.getByTestId('start');

    // Initially ready
    expect(ai).toBeEnabled();
    expect(ai).toHaveTextContent('AI');

    // Start cooldown
    fireEvent.click(start);

    // Immediately after starting, button should be disabled and show remaining time
    expect(ai).toBeDisabled();
    expect(ai).not.toHaveTextContent('AI');

    // Advance half the cooldown - still disabled
    act(() => vi.advanceTimersByTime(Math.floor(COOLDOWN_MS / 2)));
    expect(ai).toBeDisabled();

    // Advance to completion
    act(() => vi.advanceTimersByTime(Math.ceil(COOLDOWN_MS / 2) + 50));
    expect(ai).toBeEnabled();
    expect(ai).toHaveTextContent('AI');

    vi.useRealTimers();
  });
});
