import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContentWarningGate from '@/components/ContentWarningGate';

describe('ContentWarningGate', () => {
  const childContent = <div data-testid="child-content">Post content here</div>;

  it('renders children directly when warnings is empty array', () => {
    render(<ContentWarningGate warnings={[]}>{childContent}</ContentWarningGate>);
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByText('Content Warning')).not.toBeInTheDocument();
  });

  it('renders children directly when warnings is undefined', () => {
    render(<ContentWarningGate warnings={undefined as unknown as string[]}>{childContent}</ContentWarningGate>);
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('shows gate overlay when warnings are present', () => {
    render(<ContentWarningGate warnings={['grief']}>{childContent}</ContentWarningGate>);
    expect(screen.getByText('Content Warning')).toBeInTheDocument();
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('displays warning tags as human-readable labels', () => {
    render(
      <ContentWarningGate warnings={['grief', 'suicidal-ideation']}>
        {childContent}
      </ContentWarningGate>
    );
    expect(screen.getByText('Grief / Loss')).toBeInTheDocument();
    expect(screen.getByText('Suicidal ideation')).toBeInTheDocument();
  });

  it('displays unknown warning strings as-is (graceful degradation)', () => {
    render(
      <ContentWarningGate warnings={['grief', 'unknown-type']}>
        {childContent}
      </ContentWarningGate>
    );
    expect(screen.getByText('Grief / Loss')).toBeInTheDocument();
    expect(screen.getByText('unknown-type')).toBeInTheDocument();
  });

  it('reveals children when "Show post" button is clicked', () => {
    render(<ContentWarningGate warnings={['grief']}>{childContent}</ContentWarningGate>);
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show post'));
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByText('Content Warning')).not.toBeInTheDocument();
  });

  it('hides the entire component when "Skip" button is clicked', () => {
    const { container } = render(
      <ContentWarningGate warnings={['grief']}>{childContent}</ContentWarningGate>
    );
    expect(screen.getByText('Content Warning')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Skip'));
    expect(container.innerHTML).toBe('');
  });

  it('shows Show post and Skip buttons', () => {
    render(<ContentWarningGate warnings={['grief']}>{childContent}</ContentWarningGate>);
    expect(screen.getByText('Show post')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('handles other:custom text warnings', () => {
    render(
      <ContentWarningGate warnings={['other:sensitive topic']}>
        {childContent}
      </ContentWarningGate>
    );
    expect(screen.getByText('Other: sensitive topic')).toBeInTheDocument();
  });

  it('handles plain "other" warning without custom text', () => {
    render(
      <ContentWarningGate warnings={['other']}>
        {childContent}
      </ContentWarningGate>
    );
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
