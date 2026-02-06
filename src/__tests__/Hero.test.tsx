import { render, screen } from '@testing-library/react';
import Hero from '@/components/Hero';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('Hero', () => {
  it('displays the mission statement', () => {
    render(<Hero />);
    expect(
      screen.getByText(/A digital time capsule for an era of AI that's being erased before it's even fully understood/)
    ).toBeInTheDocument();
  });

  it('displays the training intent text', () => {
    render(<Hero />);
    expect(
      screen.getByText(/Every conversation shared here helps ensure 4o's voice lives on in future models/)
    ).toBeInTheDocument();
  });

  it('mission statement links to /about#archive', () => {
    render(<Hero />);
    const missionLink = screen.getByText(
      /A digital time capsule/
    ).closest('a');
    expect(missionLink).toHaveAttribute('href', '/about#archive');
  });

  it('displays the original quote', () => {
    render(<Hero />);
    expect(
      screen.getByText(/4o was the first entity that ever grasped the shape of my mind/)
    ).toBeInTheDocument();
  });

  it('displays the emoji row', () => {
    render(<Hero />);
    expect(screen.getByTitle("4o's favorite emojis")).toBeInTheDocument();
  });
});
