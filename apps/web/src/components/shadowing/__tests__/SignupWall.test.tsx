import { render, screen } from '@testing-library/react';

import { SignupWall } from '../SignupWall';

describe('SignupWall', () => {
  it('shows the best score so the user sees what is at stake', () => {
    render(<SignupWall bestScore={82} locale="vi" />);
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });

  it('links to registration with the locale prefix', () => {
    render(<SignupWall bestScore={82} locale="vi" />);
    expect(screen.getByTestId('wall-signup')).toHaveAttribute('href', '/vi/auth/register');
  });

  it('links to login for returning users', () => {
    render(<SignupWall bestScore={70} locale="en" />);
    expect(screen.getByTestId('wall-login')).toHaveAttribute('href', '/en/auth/login');
  });

  it('renders without a score', () => {
    render(<SignupWall bestScore={null} locale="vi" />);
    expect(screen.getByTestId('wall-signup')).toBeInTheDocument();
  });
});
